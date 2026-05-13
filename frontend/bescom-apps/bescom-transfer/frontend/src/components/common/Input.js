import React from 'react';

export default function Input({ label, error, required, className, ...props }) {
  return (
    <div style={{ marginBottom: '16px' }}>
      {label && (
        <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'5px' }}>
          {label}{required && <span style={{ color:'#A32D2D', marginLeft:'3px' }}>*</span>}
        </label>
      )}
      <input
        style={{
          width:'100%', padding:'9px 12px', border:`1.5px solid ${error ? '#A32D2D' : '#D3D1C7'}`,
          borderRadius:'8px', fontSize:'14px', color:'#2c2c2a', background:'#fff',
          outline:'none', transition:'border-color 0.15s', boxSizing:'border-box'
        }}
        onFocus={e => { if (!error) e.target.style.borderColor = '#534AB7'; }}
        onBlur={e  => { if (!error) e.target.style.borderColor = '#D3D1C7'; }}
        {...props}
      />
      {error && <p style={{ color:'#A32D2D', fontSize:'12px', marginTop:'4px' }}>{error}</p>}
    </div>
  );
}
