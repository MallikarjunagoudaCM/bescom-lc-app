import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function Login() {
  const { login }  = useAuth();
  const navigate   = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading]   = useState(false);

  const handleUsernameChange = useCallback((e) => setUsername(e.target.value), []);
  const handlePasswordChange = useCallback((e) => setPassword(e.target.value), []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const user = await login(username, password);
      toast.success(`Welcome, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const inp = { width:'100%', padding:'11px 14px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', color:'#2c2c2a', background:'#fff' };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#534AB7 0%,#3C3489 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'52px', height:'52px', background:'#EEEDFE', borderRadius:'13px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'24px', marginBottom:'14px' }}>👤</div>
          <h1 style={{ fontSize:'20px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Employee Login</h1>
          <p style={{ fontSize:'13px', color:'#888780', margin:0 }}>Sign in with your employee ID</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Employee ID</label>
            <input value={username} onChange={handleUsernameChange} placeholder="e.g. EMP001234 or emp001234" required style={inp} />
            <p style={{ fontSize:'11px', color:'#B4B2A9', marginTop:'4px' }}>You can use your Employee ID (EMP001234) or its lowercase form</p>
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Password</label>
            <input type="password" value={password} onChange={handlePasswordChange} placeholder="Enter your password" required style={inp} />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        <div style={{ marginTop:'20px', display:'flex', flexDirection:'column', gap:'10px', textAlign:'center' }}>
          <p style={{ fontSize:'13px', color:'#5F5E5A', margin:0 }}>
            New employee? <Link to="/register" style={{ color:'#534AB7', fontWeight:'500' }}>Register here</Link>
          </p>
          <p style={{ fontSize:'13px', color:'#5F5E5A', margin:0 }}>
            HR / Office staff? <Link to="/office-login" style={{ color:'#0F6E56', fontWeight:'500' }}>Office login →</Link>
          </p>
          <Link to="/" style={{ fontSize:'12px', color:'#B4B2A9' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
