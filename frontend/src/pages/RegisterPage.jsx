import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../api/user.api';
import { getRoleLabel, ROLES } from '../utils/constants';
import toast from 'react-hot-toast';

const fieldStyle = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 8,
  border: '1px solid var(--c-border)',
  fontSize: 14,
  background: 'var(--c-bg)',
  color: 'var(--c-text)',
  outline: 'none',
};

export default function RegisterPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '', role: '', division: '', subdivision: '', section: '', substation: '', station: '', shiftPattern: 'WEEKLY', maxShiftJEs: 1, feeders: '' });
  const [saving, setSaving] = useState(false);

  // Auto-fill fields from logged-in user's account details
  useEffect(() => {
    if (user && (user.role === 'AE_BESCOM' || user.role === 'AE_KPTCL')) {
      const prefilled = {
        division: user.division || '',
        subdivision: user.subdivision || '',
        section: user.section || '',
        substation: user.substation || '',
        station: user.station || '',
      };
      setForm(prev => ({ ...prev, ...prefilled }));
    }
  }, [user]);

  const allowed = ['ADMIN', 'AE_BESCOM', 'AE_KPTCL'].includes(user?.role);
  const currentRole = user?.role;
  const isAdmin = currentRole === 'ADMIN';
  const isBescomAE = currentRole === 'AE_BESCOM';
  const isKptclAE = currentRole === 'AE_KPTCL';

  const availableRoles = isAdmin
    ? Object.entries(ROLES)
    : isBescomAE
      ? [['LINEMAN', getRoleLabel('LINEMAN', {})], ['JE_BESCOM', getRoleLabel('JE_BESCOM', {createdByAdmin: false})]]
      : isKptclAE
        ? [['SHIFT_JE_KPTCL', getRoleLabel('SHIFT_JE_KPTCL', {})]]
        : [];

  const role = form.role || (isBescomAE ? 'LINEMAN' : isKptclAE ? 'SHIFT_JE_KPTCL' : '');

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }));
  };

  // Initialize default role for AE_BESCOM
  useEffect(() => {
    if (isBescomAE && !form.role) {
      setForm(prev => ({ ...prev, role: 'LINEMAN' }));
    }
    if (isKptclAE && !form.role) {
      setForm(prev => ({ ...prev, role: 'SHIFT_JE_KPTCL' }));
    }
  }, [isBescomAE, isKptclAE]);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!allowed) return toast.error('Only ADMIN, AE_BESCOM, and AE_KPTCL can create users');

    if (!form.name || !form.email || !form.phone || !form.password || !role) {
      return toast.error('Fill all required fields');
    }

    if (isAdmin && role === 'AE_BESCOM') {
      if (!form.division || !form.subdivision || !form.section || !form.substation || !form.feeders) {
        return toast.error('AE_BESCOM requires division, subdivision, section, substation and feeders');
      }
    }

    if (isAdmin && role === 'AE_KPTCL') {
      if (!form.station || !form.maxShiftJEs) {
        return toast.error('AE_KPTCL requires station and maxShiftJEs');
      }
    }

    if ((isAdmin && ['JE_BESCOM', 'AE_BESCOM', 'LINEMAN'].includes(role)) || (isBescomAE && ['AE_BESCOM', 'LINEMAN', 'JE_BESCOM'].includes(role)) || role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') {
      if (!form.division || !form.subdivision || !form.section || !form.substation) {
        return toast.error(`${role} requires division, subdivision, section and substation`);
      }
    }

    if ((isAdmin && role === 'SHIFT_JE_KPTCL') || isKptclAE) {
      if (!form.station && isAdmin) {
        return toast.error('Shift JE requires station');
      }
      if (!form.shiftPattern) {
        return toast.error('Shift JE requires a shift pattern');
      }
    }

    if (isAdmin && role === 'LINEMAN') {
      if (!form.division || !form.subdivision || !form.section || !form.substation) {
        return toast.error('Lineman requires division, subdivision, section and substation');
      }
    }

    const payload = {
      name: form.name,
      email: form.email,
      phone: form.phone,
      password: form.password,
      role,
    };

    if (isAdmin || isBescomAE || isKptclAE) {
      if (role === 'AE_BESCOM' || role === 'JE_BESCOM' || role === 'LINEMAN') {
        payload.division = form.division;
        payload.subdivision = form.subdivision;
        payload.section = form.section;
        payload.substation = form.substation;
      }

      if (role === 'AE_BESCOM') {
        payload.feeders = form.feeders;
      }

      if (role === 'AE_KPTCL') {
        payload.station = form.station;
        payload.maxShiftJEs = Number(form.maxShiftJEs);
      }

      if (role === 'SHIFT_JE_KPTCL') {
        payload.station = form.station;
        payload.shiftPattern = form.shiftPattern;
      }
    }

    setSaving(true);
    try {
      await userApi.create(payload);
      toast.success('User created successfully');
      setForm({ name: '', email: '', phone: '', password: '', role: '', division: '', subdivision: '', section: '', substation: '', station: '', shiftPattern: 'WEEKLY', maxShiftJEs: 1, feeders: '' });
      navigate('/users');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to create user');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: 700, margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
        <div>
          <h1 style={{ fontSize: 22, fontWeight: 700 }}>Create New User</h1>
          <p style={{ color: 'var(--c-text3)', fontSize: 13 }}>Create a new staff account with the correct BESCOM/KPTCL role.</p>
        </div>
      </div>

      {!allowed ? (
        <div style={{ padding: '1.5rem', borderRadius: 16, border: '1px solid var(--c-border)', background: 'var(--c-surface2)', color: 'var(--c-text3)' }}>
          Only ADMIN, AE_BESCOM, and AE_KPTCL roles can access this page.
        </div>
      ) : (
        <form onSubmit={handleSubmit} style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 16, padding: '1.5rem' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Full Name *</label>
              <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} placeholder="John Doe" style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Email *</label>
              <input type="email" value={form.email} onChange={e => handleChange('email', e.target.value)} placeholder="user@bescom.in" style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Mobile Number *</label>
              <input type="tel" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="9999999999" style={fieldStyle} />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Password *</label>
              <input type="password" value={form.password} onChange={e => handleChange('password', e.target.value)} placeholder="Pass@1234" style={fieldStyle} />
            </div>

            {(isAdmin || isBescomAE) && (
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Role *</label>
                <select value={form.role} onChange={e => handleChange('role', e.target.value)} style={fieldStyle}>
                  <option value="">Select role</option>
                  {availableRoles.map(([key, label]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
            )}

            {!isAdmin && !isBescomAE && (
              <div style={{ padding: '14px', borderRadius: 12, background: 'var(--c-surface2)', color: 'var(--c-text3)', fontSize: 13 }}>
                Creating a <strong>{getRoleLabel(role, {createdByAdmin: isAdmin})}</strong> user. Your own profile values may be applied automatically.
              </div>
            )}

            {(isAdmin || role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Division {(role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') ? '*' : ''}</label>
                  <input type="text" value={form.division} onChange={e => handleChange('division', e.target.value)} placeholder="South" style={fieldStyle} disabled={!isAdmin && !isBescomAE} title={(!isAdmin && !isBescomAE) ? 'Auto-filled from your account' : ''} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Subdivision {(role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') ? '*' : ''}</label>
                  <input type="text" value={form.subdivision} onChange={e => handleChange('subdivision', e.target.value)} placeholder="South-1" style={fieldStyle} disabled={!isAdmin && !isBescomAE} title={(!isAdmin && !isBescomAE) ? 'Auto-filled from your account' : ''} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Section {(role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') ? '*' : ''}</label>
                  <input type="text" value={form.section} onChange={e => handleChange('section', e.target.value)} placeholder="Section A" style={fieldStyle} disabled={!isAdmin && !isBescomAE} title={(!isAdmin && !isBescomAE) ? 'Auto-filled from your account' : ''} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Substation {(role === 'AE_BESCOM' || role === 'LINEMAN' || role === 'JE_BESCOM') ? '*' : ''}</label>
                  <input type="text" value={form.substation} onChange={e => handleChange('substation', e.target.value)} placeholder="Koramangala" style={fieldStyle} disabled={!isAdmin && !isBescomAE} title={(!isAdmin && !isBescomAE) ? 'Auto-filled from your account' : ''} />
                </div>
              </>
            )}

            {(isAdmin && role === 'AE_BESCOM') && (
              <div>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Feeders *</label>
                <input type="text" value={form.feeders} onChange={e => handleChange('feeders', e.target.value)} placeholder="Feeder-1, Feeder-2" style={fieldStyle} />
              </div>
            )}

            {(isAdmin && role === 'AE_KPTCL') && (
              <>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Station *</label>
                  <input type="text" value={form.station} onChange={e => handleChange('station', e.target.value)} placeholder="KPTCL Station" style={fieldStyle} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Max Shift JEs *</label>
                  <input type="number" min="1" max="4" value={form.maxShiftJEs} onChange={e => handleChange('maxShiftJEs', e.target.value)} placeholder="1" style={fieldStyle} />
                </div>
              </>
            )}

            {((isAdmin && role === 'SHIFT_JE_KPTCL') || isKptclAE) && (
              <>
                {isAdmin && (
                  <div>
                    <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Station *</label>
                    <input type="text" value={form.station} onChange={e => handleChange('station', e.target.value)} placeholder="KPTCL Station" style={fieldStyle} />
                  </div>
                )}
                <div>
                  <label style={{ display: 'block', marginBottom: 6, fontSize: 12, fontWeight: 600, color: 'var(--c-text2)' }}>Shift Pattern *</label>
                  <select value={form.shiftPattern} onChange={e => handleChange('shiftPattern', e.target.value)} style={fieldStyle}>
                    <option value="WEEKLY">WEEKLY</option>
                    <option value="MONTHLY">MONTHLY</option>
                  </select>
                </div>
              </>
            )}

            <button type="submit" disabled={saving} style={{ width: '100%', padding: '12px 16px', borderRadius: 10, border: 'none', background: saving ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 700, cursor: saving ? 'not-allowed' : 'pointer' }}>
              {saving ? 'Creating user...' : 'Create User'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
