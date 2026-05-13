import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const navLinks = {
  employee: [
    { to: '/dashboard',        label: 'Dashboard' },
    { to: '/apply',            label: 'Apply for Transfer' },
    { to: '/my-applications',  label: 'My Applications' },
    { to: '/profile',          label: 'Profile' }
  ],
  hr_corporate: [
    { to: '/hr/dashboard',   label: 'Dashboard' },
    { to: '/hr/cycles',      label: 'Cycles' },
    { to: '/hr/merit-list',  label: 'Merit List' },
    { to: '/hr/vacancies',   label: 'Vacancies' },
    { to: '/hr/users',       label: 'User Management' }
  ],
  office_admin: [
    { to: '/office/dashboard', label: 'Dashboard' }
  ]
};

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate  = useNavigate();
  const location  = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const links = navLinks[user?.role] || [];

  const handleLogout = () => { logout(); navigate('/login'); };

  const NavLink = ({ to, label }) => {
    const active = location.pathname === to || location.pathname.startsWith(to + '/');
    return (
      <Link to={to} style={{
        padding:'6px 12px', borderRadius:'6px', fontSize:'13px', fontWeight:'500',
        color:'#fff', textDecoration:'none', whiteSpace:'nowrap',
        background: active ? 'rgba(255,255,255,0.22)' : 'transparent',
        transition:'background 0.15s'
      }}
        onMouseEnter={e => { if (!active) e.target.style.background = 'rgba(255,255,255,0.12)'; }}
        onMouseLeave={e => { if (!active) e.target.style.background = 'transparent'; }}>
        {label}
      </Link>
    );
  };

  return (
    <nav style={{ background:'#534AB7', color:'#fff', position:'sticky', top:0, zIndex:100, boxShadow:'0 2px 10px rgba(0,0,0,0.18)' }}>
      <div style={{ maxWidth:'1280px', margin:'0 auto', padding:'0 20px', display:'flex', alignItems:'center', justifyContent:'space-between', height:'58px' }}>

        {/* Logo */}
        <Link to="/" style={{ display:'flex', alignItems:'center', gap:'10px', textDecoration:'none', flexShrink:0 }}>
          <div style={{ width:'32px', height:'32px', background:'rgba(255,255,255,0.2)', borderRadius:'8px', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:'800', fontSize:'15px', color:'#fff' }}>B</div>
          <span style={{ fontWeight:'700', fontSize:'15px', color:'#fff', letterSpacing:'-0.2px' }}>BESCOM Transfer</span>
        </Link>

        {/* Nav links */}
        <div style={{ display:'flex', alignItems:'center', gap:'2px', overflowX:'auto' }}>
          {links.map(l => <NavLink key={l.to} to={l.to} label={l.label} />)}
        </div>

        {/* User info + logout */}
        {user && (
          <div style={{ display:'flex', alignItems:'center', gap:'10px', flexShrink:0, paddingLeft:'12px', borderLeft:'1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ textAlign:'right' }}>
              <div style={{ fontSize:'13px', fontWeight:'600', color:'#fff', maxWidth:'140px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{user.name}</div>
              <div style={{ fontSize:'11px', color:'rgba(255,255,255,0.7)' }}>
                {user.role === 'hr_corporate' ? '🏢 HR Corporate' : user.role === 'office_admin' ? `🏢 ${user.officeName || 'Office Admin'}` : `👤 Group ${user.group}`}
              </div>
            </div>
            <button onClick={handleLogout}
              style={{ padding:'6px 12px', borderRadius:'6px', border:'1px solid rgba(255,255,255,0.35)', background:'transparent', color:'#fff', fontSize:'12px', cursor:'pointer', flexShrink:0 }}>
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
