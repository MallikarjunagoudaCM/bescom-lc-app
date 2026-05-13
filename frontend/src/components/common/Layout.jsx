import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useEffect, useState } from 'react';
import { notifApi } from '../../api/notification.api';
import { getRoleLabel } from '../../utils/constants';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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

  const closeMenu = () => setMenuOpen(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--c-bg)', flexDirection: isMobile ? 'column' : 'row' }}>
      {isMobile && (
        <header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', background: 'var(--c-surface)', borderBottom: '1px solid var(--c-border)', position: 'sticky', top: 0, zIndex: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => setMenuOpen(open => !open)} style={{ width: 36, height: 36, borderRadius: 12, border: '1px solid var(--c-border)', background: 'var(--c-surface)', fontSize: 18, cursor: 'pointer' }}>
              ☰
            </button>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary)' }}>BESCOM LC</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>Line Clear System</div>
            </div>
          </div>
          <button onClick={logout} style={{ border: 'none', background: 'none', color: 'var(--c-text2)', fontSize: 13, cursor: 'pointer' }}>
            Sign out
          </button>
        </header>
      )}

      <aside style={{
        width: isMobile ? '85%' : 220,
        maxWidth: isMobile ? 320 : 'none',
        background: 'var(--c-surface)',
        borderRight: isMobile ? 'none' : '1px solid var(--c-border)',
        display: 'flex',
        flexDirection: 'column',
        position: isMobile ? 'fixed' : 'sticky',
        top: 0,
        left: isMobile ? (menuOpen ? 0 : '-100%') : 0,
        height: '100vh',
        zIndex: 30,
        transition: 'left 0.2s ease',
        boxShadow: isMobile ? '2px 0 18px rgba(15, 23, 42, 0.16)' : 'none',
      }}>
        <div style={{ padding: '20px 16px', borderBottom: '1px solid var(--c-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>⚡</div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--c-primary)' }}>BESCOM LC</div>
              <div style={{ fontSize: 10, color: 'var(--c-text3)' }}>Line Clear System</div>
            </div>
          </div>
        </div>

        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {navItems.map(item => (
            <NavLink key={item.to} to={item.to} end={item.exact} onClick={closeMenu}
              style={({ isActive }) => ({
                display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                borderRadius: 10, marginBottom: 4, fontSize: 14, fontWeight: 500,
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

        <div style={{ padding: '12px 16px', borderTop: '1px solid var(--c-border)' }}>
          <div style={{ fontSize: 12, fontWeight: 600 }}>{user?.name}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginTop: 4 }}>{getLocation(user) || `${getRoleLabel(user?.role, user)} · ${user?.phone}`}</div>
          <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 8 }}>{getLocation(user) ? `${getRoleLabel(user?.role, user)} · ${user?.phone}` : ''}</div>
          <button onClick={logout} style={{ fontSize: 12, color: 'var(--c-text3)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            Sign out →
          </button>
        </div>
      </aside>

      {isMobile && menuOpen && (
        <div onClick={closeMenu} style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.35)', zIndex: 25 }} />
      )}

      <main style={{ flex: 1, overflow: 'auto', padding: isMobile ? '16px 14px 20px' : '24px 28px' }}>
        <Outlet />
      </main>
    </div>
  );
}
