import React from 'react';
import { Link } from 'react-router-dom';

export default function Landing() {
  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#534AB7 0%,#3C3489 100%)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', padding:'20px' }}>

      {/* Header */}
      <div style={{ textAlign:'center', marginBottom:'48px' }}>
        <div style={{ width:'64px', height:'64px', background:'rgba(255,255,255,0.15)', borderRadius:'16px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'28px', fontWeight:'800', color:'#fff', marginBottom:'20px' }}>B</div>
        <h1 style={{ fontSize:'26px', fontWeight:'700', color:'#fff', margin:'0 0 8px' }}>BESCOM Transfer Portal</h1>
        <p style={{ fontSize:'15px', color:'rgba(255,255,255,0.75)', margin:0 }}>Group C & D Employee Transfer Management System</p>
      </div>

      {/* Two login options */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'20px', width:'100%', maxWidth:'560px' }}>

        {/* Employee login card */}
        <Link to="/login" style={{ textDecoration:'none' }}>
          <div style={{
            background:'#fff', borderRadius:'16px', padding:'32px 24px', textAlign:'center',
            boxShadow:'0 8px 32px rgba(0,0,0,0.12)', cursor:'pointer',
            transition:'transform 0.15s, box-shadow 0.15s',
            border:'2px solid transparent'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.12)'; }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'#EEEDFE', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'16px', fontSize:'26px' }}>
              👤
            </div>
            <h2 style={{ fontSize:'16px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 8px' }}>Employee Login</h2>
            <p style={{ fontSize:'13px', color:'#888780', margin:'0 0 20px', lineHeight:1.5 }}>
              Group C & D employees — apply for transfer, track your application
            </p>
            <div style={{ background:'#534AB7', color:'#fff', padding:'10px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500' }}>
              Employee Sign In →
            </div>
          </div>
        </Link>

        {/* Office / HR login card */}
        <Link to="/office-login" style={{ textDecoration:'none' }}>
          <div style={{
            background:'#fff', borderRadius:'16px', padding:'32px 24px', textAlign:'center',
            boxShadow:'0 8px 32px rgba(0,0,0,0.12)', cursor:'pointer',
            transition:'transform 0.15s, box-shadow 0.15s'
          }}
            onMouseEnter={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='0 16px 48px rgba(0,0,0,0.18)'; }}
            onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 8px 32px rgba(0,0,0,0.12)'; }}>
            <div style={{ width:'56px', height:'56px', borderRadius:'14px', background:'#E1F5EE', display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:'16px', fontSize:'26px' }}>
              🏢
            </div>
            <h2 style={{ fontSize:'16px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 8px' }}>Office / HR Login</h2>
            <p style={{ fontSize:'13px', color:'#888780', margin:'0 0 20px', lineHeight:1.5 }}>
              HR team & office admins — manage vacancies, cycles, merit list
            </p>
            <div style={{ background:'#0F6E56', color:'#fff', padding:'10px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500' }}>
              Office Sign In →
            </div>
          </div>
        </Link>
      </div>

      <p style={{ color:'rgba(255,255,255,0.5)', fontSize:'12px', marginTop:'36px' }}>
        New employee? <Link to="/register" style={{ color:'rgba(255,255,255,0.8)', fontWeight:'500' }}>Register here</Link>
      </p>
    </div>
  );
}
