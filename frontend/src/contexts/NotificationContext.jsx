import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { notifApi } from '../api/notification.api';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 s

export function NotificationProvider({ children }) {
  const [notifs, setNotifs] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const timerRef = useRef(null);

  const refresh = useCallback(async () => {
    try {
      const { data } = await notifApi.getAll({ limit: 50 });
      setNotifs(data.notifications);
      setUnreadCount(data.unreadCount ?? 0);
    } catch {
      // silently ignore network errors
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial load + polling
  useEffect(() => {
    refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [refresh]);

  // Mark a single notification as read and REMOVE it from the list
  const markRead = useCallback(async (id) => {
    try {
      await notifApi.markRead(id);
      setNotifs((prev) => prev.filter((n) => n._id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {}
  }, []);

  // Mark all as read and CLEAR the list
  const markAllRead = useCallback(async () => {
    try {
      await notifApi.markAllRead();
      setNotifs([]);
      setUnreadCount(0);
    } catch {}
  }, []);

  return (
    <NotificationContext.Provider value={{ notifs, unreadCount, loading, refresh, markRead, markAllRead }}>
      {children}
    </NotificationContext.Provider>
  );
}

export const useNotifications = () => useContext(NotificationContext);
