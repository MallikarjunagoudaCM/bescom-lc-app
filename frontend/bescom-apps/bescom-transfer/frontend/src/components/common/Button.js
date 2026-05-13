import React from 'react';

const variants = {
  primary:   'background:#534AB7;color:#fff;border:none;',
  secondary: 'background:#fff;color:#534AB7;border:1.5px solid #534AB7;',
  danger:    'background:#A32D2D;color:#fff;border:none;',
  ghost:     'background:transparent;color:#534AB7;border:none;',
  success:   'background:#3B6D11;color:#fff;border:none;'
};

const sizes = {
  sm: 'padding:6px 14px;font-size:12px;',
  md: 'padding:9px 20px;font-size:14px;',
  lg: 'padding:12px 28px;font-size:15px;'
};

export default function Button({ children, variant='primary', size='md', loading, disabled, style, ...props }) {
  const base = `display:inline-flex;align-items:center;gap:6px;border-radius:8px;font-weight:500;transition:opacity 0.15s,transform 0.1s;cursor:pointer;${variants[variant]}${sizes[size]}`;
  return (
    <button
      style={{ ...Object.fromEntries(base.split(';').filter(Boolean).map(s => { const [k,...v]=s.split(':'); return [k.trim().replace(/-([a-z])/g,(_,c)=>c.toUpperCase()), v.join(':').trim()]; })), opacity: disabled||loading ? 0.6 : 1, ...style }}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? '⏳ ' : ''}{children}
    </button>
  );
}
