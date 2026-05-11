import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { notifApi } from '../../api/notification.api';
import { ROLES } from '../../utils/constants';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    const fetchUnread = async () => {
      try {
        const { data } = await notifApi.getAll({ unreadOnly: 'true', limit: 1 });
        setUnread(data.unreadCount || 0);
      } catch {}
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, []);

  const navItems = [
    { to: '/', label: 'Dashboard', icon: '🏠', exact: true },
    { to: '/lc', label: 'Line Clears', icon: '⚡' },
    ...(user?.role === 'ADMIN' ? [{ to: '/admin', label: 'Admin', icon: '⚙️' }] : []),
    ...(['ADMIN', 'AE_BESCOM', 'AE_KPTCL'].includes(user?.role) ? [{ to: '/users', label: user?.role === 'ADMIN' ? 'Users' : user?.role === 'AE_BESCOM' ? 'My Linemen' : 'My Shift JEs', icon: '👥' }] : []),
    ...(['ADMIN', 'AE_BESCOM', 'AE_KPTCL'].includes(user?.role) ? [{ to: '/register', label: 'Create User', icon: '➕' }] : []),
    { to: '/notifications', label: 'Notifications', icon: '🔔', badge: unread },
  ];

  const getLocation = (user) => {
    if (!user) return '';
    const locations = [user.division, user.subdivision, user.section, user.substation].filter(Boolean);
    return locations.join(' • ');
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--c-bg)' }}>
      {/* Sidebar */}
      <aside style={{ width: 220, background: 'var(--c-surface)', borderRight: '1px solid var(--c-border)', display: 'flex', flexDirection: 'column', position: 'sticky', top: 0, height: '100vh' }}>
        {/* Logo */}
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary)' }}>BESCOM LC</div>
              <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Line Clear System</div>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '9px 12px',
                borderRadius: 8, marginBottom: 2, fontSize: 13, fontWeight: 500,
                background: isActive ? 'var(--c-primary-light)' : 'transparent',
                color: isActive ? 'var(--c-primary)' : 'var(--c-text2)',
                transition: 'all 0.15s',
                textDecoration: 'none',
              })}>
              <span>{item.icon}</span>
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge > 0 && (
                <span style={{ background: 'var(--c-danger)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 10 }}>{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User info */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{getLocation(user) || `${ROLES[user?.role]} · ${user?.phone}`}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 8 }}>{getLocation(user) ? `${ROLES[user?.role]} · ${user?.phone}` : ''}</div>
          <button onClick={logout} style={{ fontSize: 12, color: 'var(--c-text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out →
          </button>
        </div>
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto' }}>
        <Outlet />
      </main>
    </div>
  );
}
