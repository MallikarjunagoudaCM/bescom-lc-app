import React from 'react';

export default function Select({ label, error, required, children, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'5px' }}>
          {label}{required && <span style={{ color:'#A32D2D', marginLeft:'3px' }}>*</span>}
        </label>
      )}
      <select
        style={{
          width:'100%', padding:'9px 12px', border:`1.5px solid ${error ? '#A32D2D' : '#D3D1C7'}`,
          borderRadius:'8px', fontSize:'14px', color:'#2c2c2a', background:'#fff',
          outline:'none', appearance:'none', backgroundImage:`url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23888780' d='M6 8L1 3h10z'/%3E%3C/svg%3E")`,
          backgroundRepeat:'no-repeat', backgroundPosition:'right 12px center', paddingRight:'36px', boxSizing:'border-box'
        }}
        {...props}
      >
        {children}
      </select>
      {error && <p style={{ color:'#A32D2D', fontSize:'12px', marginTop:'4px' }}>{error}</p>}
    </div>
  );
}
