import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export default function LoginPage() {
  const [form, setForm] = useState({ phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.phone || !form.password) return toast.error('Please fill all fields');
    setLoading(true);
    try {
      await login(form.phone, form.password);
      toast.success('Welcome back!');
      navigate('/');
    } catch (err) {
      const message = err.response?.data?.error || 'Login failed';
      toast.error(message);
    } finally { setLoading(false); }
  };

  const inp = { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 14, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg, #EFF6FF 0%, #F8FAFC 50%, #F0FDF4 100%)' }}>
      <div style={{ width: '100%', maxWidth: 380, padding: '0 20px' }}>
        <div style={{ background: 'var(--c-surface)', borderRadius: 16, border: '1px solid var(--c-border)', boxShadow: 'var(--c-shadow-md)', padding: '2rem' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
            <div style={{ width: 56, height: 56, borderRadius: 16, background: 'var(--c-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, margin: '0 auto 12px' }}>⚡</div>
            <h1 style={{ fontSize: 20, fontWeight: 700 }}>BESCOM LC System</h1>
            <p style={{ color: 'var(--c-text3)', fontSize: 13, marginTop: 4 }}>KPTCL Line Clear Coordination</p>
          </div>

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Mobile Number</label>
              <input type="tel" value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))}
                placeholder="9999999999" style={inp} />
            </div>
            <div style={{ marginBottom: 20 }}>
              <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Password</label>
              <input type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                placeholder="••••••••" style={inp} />
            </div>
            <button type="submit" disabled={loading} style={{
              width: '100%', padding: '10px', borderRadius: 8, border: 'none',
              background: loading ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff',
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
            }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          {/* Demo credentials */}
          <div style={{ marginTop: 20, padding: '12px', background: 'var(--c-surface2)', borderRadius: 8 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', marginBottom: 6 }}>DEMO CREDENTIALS</div>
            {[
              ['Admin', '9999999999', 'Admin@1234'],
              ['EE', '8888888888', 'Pass@1234'],
              ['AEE', '7777777777', 'Pass@1234'],
              ['AE_BESCOM', '6666666666', 'Pass@1234'],
              ['AE_KPTCL', '5555555555', 'Pass@1234'],
              ['SHIFT_JE_KPTCL', '4444444444', 'Pass@1234'],
              ['LINEMAN', '3333333333', 'Pass@1234'],
            ].map(([role, phone, pass]) => (
              <div key={role} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: 'var(--c-text2)', marginBottom: 2 }}>
                <span style={{ fontWeight: 500 }}>{role}</span>
                <button onClick={() => setForm({ phone, password: pass })}
                  style={{ background: 'none', border: 'none', color: 'var(--c-primary)', fontSize: 11, cursor: 'pointer', textDecoration: 'underline' }}>
                  Use
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
