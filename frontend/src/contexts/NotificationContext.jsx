import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { notifApi } from '../api/notification.api';
import { useAuth } from './AuthContext';

const NotificationContext = createContext(null);

const POLL_INTERVAL = 30_000; // 30 s

export function NotificationProvider({ children }) {
  const { user } = useAuth();
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

  // Initial load + polling — gated on `user` so this never fires while
  // logged out or mid-login. Without this, it was firing immediately on
  // mount regardless of route (NotificationProvider wraps the whole app,
  // including /callback), using whatever token happened to be sitting in
  // localStorage. A stale/invalid one there would 401, axios's interceptor
  // would then try a silent refresh, and on failure hard-navigate to
  // /login (window.location.href) — killing an in-flight SSO callback on
  // /callback that had nothing to do with notifications at all.
  useEffect(() => {
    if (!user) {
      setNotifs([]);
      setUnreadCount(0);
      setLoading(false);
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    refresh();
    timerRef.current = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(timerRef.current);
  }, [user, refresh]);

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
