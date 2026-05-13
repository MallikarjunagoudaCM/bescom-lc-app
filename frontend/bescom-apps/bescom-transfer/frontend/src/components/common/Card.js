import React from 'react';
export default function Card({ children, title, subtitle, style, bodyStyle }) {
  return (
    <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'0', ...style }}>
      {(title||subtitle) && (
        <div style={{ padding:'18px 20px 14px', borderBottom:'1px solid #f1efe8' }}>
          {title && <h3 style={{ fontSize:'16px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>{title}</h3>}
          {subtitle && <p style={{ fontSize:'13px', color:'#888780', margin:'3px 0 0' }}>{subtitle}</p>}
        </div>
      )}
      <div style={{ padding:'18px 20px', ...bodyStyle }}>{children}</div>
    </div>
  );
}
