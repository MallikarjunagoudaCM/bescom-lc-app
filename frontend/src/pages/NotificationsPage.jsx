import { Link } from 'react-router-dom';
import { useNotifications } from '../contexts/NotificationContext';
import toast from 'react-hot-toast';

const TYPE_STYLE = {
  ACTION_REQUIRED: { bg: '#FFF7ED', color: '#C2410C', icon: '🔔' },
  INFO: { bg: 'var(--c-surface2)', color: 'var(--c-text2)', icon: '💬' },
  SUCCESS: { bg: 'var(--c-success-light)', color: 'var(--c-success)', icon: '✅' },
  ALERT: { bg: 'var(--c-danger-light)', color: 'var(--c-danger)', icon: '⚠️' },
};

export default function NotificationsPage() {
  const { notifs, unreadCount, loading, markRead, markAllRead } = useNotifications();

  const handleMarkAll = async () => {
    await markAllRead();
    toast.success('All notifications cleared');
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Notifications</h1>
          {unreadCount > 0 && (
            <p style={{ color: 'var(--c-text3)', fontSize: 13, marginTop: 2 }}>
              {unreadCount} unread
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAll}
            style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface)', fontSize: 13, cursor: 'pointer' }}
          >
            Clear all
          </button>
        )}
      </div>

      {loading ? (
        <div style={{ color: 'var(--c-text3)' }}>Loading…</div>
      ) : notifs.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--c-text3)' }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔔</div>
          No notifications
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {notifs.map(n => {
            const s = TYPE_STYLE[n.type] || TYPE_STYLE.INFO;
            return (
              <div
                key={n._id}
                style={{
                  background: n.isRead ? 'var(--c-surface)' : s.bg,
                  border: '1px solid var(--c-border)',
                  borderRadius: 10,
                  padding: '1rem',
                  display: 'flex',
                  gap: 12,
                  alignItems: 'flex-start',
                }}
              >
                <div style={{ fontSize: 20, flexShrink: 0 }}>{s.icon}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: n.isRead ? 400 : 600, fontSize: 13 }}>{n.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2 }}>{n.message}</div>
                  <div style={{ display: 'flex', gap: 10, marginTop: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>
                      {new Date(n.createdAt).toLocaleString('en-IN')}
                    </span>
                    {n.lc && (
                      <Link to={`/lc/${n.lc}`} style={{ fontSize: 11, color: 'var(--c-primary)', fontWeight: 500 }}>
                        {n.lcNumber || 'LC'} →
                      </Link>
                    )}
                    {!n.isRead && (
                      <button
                        onClick={() => markRead(n._id)}
                        style={{ fontSize: 11, color: 'var(--c-text3)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                      >
                        Dismiss
                      </button>
                    )}
                  </div>
                </div>
                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
