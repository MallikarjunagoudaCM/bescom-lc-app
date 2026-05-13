import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';

export default function OfficeLogin() {
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
      if (user.accountType !== 'office_account') {
        toast.error('This login is for office/HR accounts only. Please use the Employee login.');
        localStorage.removeItem('bescom_token');
        localStorage.removeItem('bescom_user');
        setLoading(false);
        return;
      }
      toast.success(`Welcome, ${user.name}!`);
      if (user.role === 'hr_corporate')  return navigate('/hr/dashboard');
      if (user.role === 'office_admin')  return navigate('/office/dashboard');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Invalid credentials. Please try again.');
    } finally { setLoading(false); }
  };

  const inp = { width:'100%', padding:'11px 14px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', color:'#2c2c2a', background:'#fff' };

  return (
    <div style={{ minHeight:'100vh', background:'linear-gradient(135deg,#0F6E56 0%,#085041 100%)', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ background:'#fff', borderRadius:'16px', padding:'40px', width:'100%', maxWidth:'400px', boxShadow:'0 20px 60px rgba(0,0,0,0.15)' }}>

        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:'52px', height:'52px', background:'#E1F5EE', borderRadius:'13px', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'24px', marginBottom:'14px' }}>🏢</div>
          <h1 style={{ fontSize:'20px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Office / HR Login</h1>
          <p style={{ fontSize:'13px', color:'#888780', margin:0 }}>For HR team and division office accounts</p>
        </div>

        <div style={{ background:'#E1F5EE', borderRadius:'8px', padding:'10px 14px', marginBottom:'20px', fontSize:'13px', color:'#085041' }}>
          Use the <strong>username</strong> assigned to your office account (e.g. <code style={{ background:'#9FE1CB', padding:'1px 5px', borderRadius:'3px' }}>hr.admin</code> or <code style={{ background:'#9FE1CB', padding:'1px 5px', borderRadius:'3px' }}>jayanagar.div</code>)
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom:'14px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Office Username</label>
            <input value={username} onChange={handleUsernameChange} placeholder="e.g. hr.admin or jayanagar.div" required style={inp} autoComplete="username" />
          </div>
          <div style={{ marginBottom:'24px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Password</label>
            <input type="password" value={password} onChange={handlePasswordChange} placeholder="Enter your password" required style={inp} autoComplete="current-password" />
          </div>
          <button type="submit" disabled={loading}
            style={{ width:'100%', padding:'12px', background:'#0F6E56', color:'#fff', border:'none', borderRadius:'8px', fontSize:'15px', fontWeight:'600', cursor:'pointer', opacity:loading?0.7:1 }}>
            {loading ? 'Signing in...' : 'Sign In to Office Portal'}
          </button>
        </form>

        <div style={{ marginTop:'20px', textAlign:'center' }}>
          <p style={{ fontSize:'13px', color:'#5F5E5A', margin:'0 0 8px' }}>
            Are you an employee? <Link to="/login" style={{ color:'#534AB7', fontWeight:'500' }}>Employee login →</Link>
          </p>
          <Link to="/" style={{ fontSize:'12px', color:'#B4B2A9' }}>← Back to home</Link>
        </div>
      </div>
    </div>
  );
}
