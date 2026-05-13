import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { userApi } from '../api/user.api';
import { getRoleLabel } from '../utils/constants';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 13, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' };

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [filters, setFilters] = useState({ name: '', phone: '', role: '', division: '', subdivision: '' });
  const [filteredUsers, setFilteredUsers] = useState([]);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const setFilter = (k, v) => setFilters(f => ({ ...f, [k]: v }));

  const isSO = authUser?.role === 'SO_AE' || authUser?.role === 'JE_OPERATOR';

  const load = async () => {
    if (!authUser) return;
    try { 
      const { data } = await userApi.getAll(); 
      
      // Filter users based on logged-in user's role
      let filtered = data.users;
      if (authUser.role === 'AE_BESCOM') {
        // Show only linemen in the same section
        filtered = data.users.filter(u => 
          u.role === 'LINEMAN' && 
          u.division === authUser.division &&
          u.subdivision === authUser.subdivision &&
          u.section === authUser.section &&
          u.substation === authUser.substation
        );
      } else if (authUser.role === 'AE_KPTCL') {
        // Show only shift JEs assigned to this AE
        filtered = data.users.filter(u => {
          const assigned = u.assignedToAEKPTCL ? u.assignedToAEKPTCL.toString() : '';
          const sameStation = u.station === authUser.station;
          return u.role === 'SHIFT_JE_KPTCL' && sameStation && (
            assigned === authUser._id || !assigned
          );
        });
      }
      
      setUsers(filtered);
      setFilteredUsers(filtered);
    }
    catch {} finally { setLoading(false); }
  };

  const handleSearch = () => {
    const result = users.filter(u => {
      const nameMatch = u.name.toLowerCase().includes(filters.name.toLowerCase());
      const phoneMatch = u.phone.includes(filters.phone);
      const roleMatch = !filters.role || u.role === filters.role;
      const divisionMatch = !filters.division || (u.division && u.division.toLowerCase().includes(filters.division.toLowerCase()));
      const subdivisionMatch = !filters.subdivision || (u.subdivision && u.subdivision.toLowerCase() === filters.subdivision.toLowerCase());
      return nameMatch && phoneMatch && roleMatch && divisionMatch && subdivisionMatch;
    });
    setFilteredUsers(result);
  };

  const handleClearFilters = () => {
    setFilters({ name: '', phone: '', role: '', division: '', subdivision: '' });
    setFilteredUsers(users);
  };

  useEffect(() => { load(); }, [authUser]);

  const handleCreate = async (e) => {
    e.preventDefault();
    const payload = { ...form, role: isSO ? 'LINEMAN' : form.role };

    if (!payload.name || !payload.email || !payload.phone || !payload.role || !payload.password) {
      return toast.error('Fill all required fields');
    }

    setSaving(true);
    try {
      await userApi.create(payload);
      toast.success('User created');
      setShowForm(false);
      setForm({});
      setFilters({ name: '', phone: '', role: '', division: '', subdivision: '' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to create user');
    } finally { setSaving(false); }
  };

  const toggleActive = async (user) => {
    try {
      await userApi.update(user._id, { isActive: !user.isActive });
      const updatedUser = { ...user, isActive: !user.isActive };
      const updated = users.map(x => x._id === user._id ? updatedUser : x);
      setUsers(updated);
      setFilteredUsers(updated.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(filters.name.toLowerCase());
        const phoneMatch = u.phone.includes(filters.phone);
        const roleMatch = !filters.role || u.role === filters.role;
        const divisionMatch = !filters.division || (u.division && u.division.toLowerCase().includes(filters.division.toLowerCase()));
        const subdivisionMatch = !filters.subdivision || (u.subdivision && u.subdivision.toLowerCase() === filters.subdivision.toLowerCase());
        return nameMatch && phoneMatch && roleMatch && divisionMatch && subdivisionMatch;
      }));
      toast.success(`User ${user.isActive ? 'deactivated' : 'activated'}`);
    } catch {}
  };

  const deleteUser = async (user) => {
    if (!window.confirm(`Delete ${user.name}? This cannot be undone.`)) return;
    try {
      await userApi.delete(user._id);
      const updated = users.filter(x => x._id !== user._id);
      setUsers(updated);
      setFilteredUsers(updated.filter(u => {
        const nameMatch = u.name.toLowerCase().includes(filters.name.toLowerCase());
        const phoneMatch = u.phone.includes(filters.phone);
        const roleMatch = !filters.role || u.role === filters.role;
        const divisionMatch = !filters.division || (u.division && u.division.toLowerCase().includes(filters.division.toLowerCase()));
        const subdivisionMatch = !filters.subdivision || (u.subdivision && u.subdivision.toLowerCase() === filters.subdivision.toLowerCase());
        return nameMatch && phoneMatch && roleMatch && divisionMatch && subdivisionMatch;
      }));
      toast.success('User deleted');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Unable to delete user');
    }
  };

  const getLocation = (user) => {
    // For KPTCL users, prioritize station
    if (user.role === 'AE_KPTCL' || user.role === 'SHIFT_JE_KPTCL') {
      return user.station || 'No station';
    }
    // For BESCOM users, show hierarchy
    const parts = [];
    if (user.division) parts.push(user.division);
    if (user.subdivision) parts.push(user.subdivision);
    if (user.section) parts.push(user.section);
    if (user.substation) parts.push(user.substation);
    return parts.join(' • ') || 'No location';
  };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.25rem' }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>
            {authUser?.role === 'AE_BESCOM' ? 'My Linemen' : authUser?.role === 'AE_KPTCL' ? 'My Shift JEs' : 'User Management'}
          </h1>
          <p style={{ color: 'var(--c-text3)', fontSize: 13 }}>{filteredUsers.length} {authUser?.role === 'AE_BESCOM' ? 'linemen' : authUser?.role === 'AE_KPTCL' ? 'shift JEs' : 'users'}</p>
        </div>
        {authUser?.role === 'ADMIN' && (
          <button onClick={() => setShowForm(true)} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            + Add User
          </button>
        )}
      </div>

      {/* Filter Section */}
      {authUser?.role === 'ADMIN' && (
        <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem', color: 'var(--c-text2)' }}>🔍 Filter Users</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '0.75rem', marginBottom: '1rem' }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text3)', display: 'block', marginBottom: 4 }}>Name</label>
              <input type="text" placeholder="Search by name..." value={filters.name} onChange={e => setFilter('name', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text3)', display: 'block', marginBottom: 4 }}>Phone</label>
              <input type="text" placeholder="Search by phone..." value={filters.phone} onChange={e => setFilter('phone', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text3)', display: 'block', marginBottom: 4 }}>Role</label>
              <select value={filters.role} onChange={e => setFilter('role', e.target.value)} style={inp}>
                <option value="">All Roles</option>
                {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text3)', display: 'block', marginBottom: 4 }}>Division</label>
              <input type="text" placeholder="Search by division..." value={filters.division} onChange={e => setFilter('division', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--c-text3)', display: 'block', marginBottom: 4 }}>Subdivision</label>
              <input type="text" placeholder="Search by subdivision..." value={filters.subdivision} onChange={e => setFilter('subdivision', e.target.value)} style={inp} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button onClick={handleSearch} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>
              🔍 Search
            </button>
            <button onClick={handleClearFilters} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface2)', color: 'var(--c-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer', flex: 1 }}>
              Clear Filters
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        {loading ? <div style={{ padding: '2rem', color: 'var(--c-text3)' }}>Loading...</div> : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                  {['Name', 'Role', 'Phone', 'Email', 'Status', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
              {filteredUsers.map((u, i) => (
                <tr key={u._id} style={{ borderBottom: i < filteredUsers.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ fontSize: 13, fontWeight: 500 }}>{u.name}</div>
                    <div style={{ marginTop: 4, fontSize: 12, color: 'var(--c-text3)' }}>{getLocation(u) || 'No location'}</div>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: 'var(--c-primary-light)', color: 'var(--c-primary)', fontWeight: 500 }}>{getRoleLabel(u.role, u)}</span>
                  </td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--c-text3)' }}>{u.phone}</td>
                  <td style={{ padding: '11px 14px', fontSize: 12, color: 'var(--c-text3)' }}>{u.email}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: u.isActive ? 'var(--c-success-light)' : 'var(--c-danger-light)', color: u.isActive ? 'var(--c-success)' : 'var(--c-danger)', fontWeight: 500 }}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <button onClick={() => toggleActive(u)} style={{ fontSize: 12, color: 'var(--c-text3)', background: 'none', border: '1px solid var(--c-border)', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                      {u.isActive ? 'Deactivate' : 'Activate'}
                    </button>
                    {authUser?.role === 'ADMIN' && (
                      <button onClick={() => deleteUser(u)} style={{ fontSize: 12, color: '#B91C1C', background: 'none', border: '1px solid #FCA5A5', borderRadius: 6, padding: '3px 8px', cursor: 'pointer' }}>
                        Delete
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {authUser?.role === 'ADMIN' && showForm && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'var(--c-surface)', borderRadius: 16, border: '1px solid var(--c-border)', width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h2 style={{ fontSize: 17, fontWeight: 700 }}>Create New User</h2>
              <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--c-text3)' }}>✕</button>
            </div>
            <form onSubmit={handleCreate} style={{ padding: '1.25rem 1.5rem' }}>
              {[['name', 'Full Name *', 'Name'], ['email', 'Email *', 'email@bescom.in'], ['phone', 'Phone *', '+91 ...']].map(([k, label, ph]) => (
                <div key={k} style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>{label}</label>
                  <input type={k === 'email' ? 'email' : k === 'phone' ? 'tel' : 'text'} onChange={e => set(k, e.target.value)} placeholder={ph} style={inp} />
                </div>
              ))}

              {!isSO && (
                <>
                  {[['division', 'Division', 'South'], ['subdivision', 'Subdivision', 'South-1'], ['section', 'Section', 'Section A'], ['substation', 'Substation', 'Koramangala']].map(([k, label, ph]) => (
                    <div key={k} style={{ marginBottom: 12 }}>
                      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>{label}</label>
                      <input type="text" onChange={e => set(k, e.target.value)} placeholder={ph} style={inp} />
                    </div>
                  ))}
                </>
              )}

              {isSO && (
                <div style={{ marginBottom: 14, background: 'var(--c-surface2)', borderRadius: 12, padding: 12, color: 'var(--c-text3)', fontSize: 13 }}>
                  You are creating a Lineman account for your section.
                  <div style={{ marginTop: 8, fontSize: 12 }}>
                    <div>Division: {authUser?.division || '—'}</div>
                    <div>Subdivision: {authUser?.subdivision || '—'}</div>
                    <div>Section: {authUser?.section || '—'}</div>
                    <div>Substation: {authUser?.substation || '—'}</div>
                  </div>
                </div>
              )}

              {!isSO && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Role *</label>
                  <select onChange={e => set('role', e.target.value)} style={inp}>
                    <option value="">Select role...</option>
                    {Object.entries(ROLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
              )}

              {!isSO && ['SO_AE', 'JE_OPERATOR'].includes(form.role) && (
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Feeders *</label>
                  <input type="text" onChange={e => set('feeders', e.target.value)} placeholder="Comma separated feeders" style={inp} />
                </div>
              )}

              <div style={{ marginBottom: 16 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 4 }}>Password *</label>
                <input type="password" onChange={e => set('password', e.target.value)} placeholder="Min 8 chars" style={inp} />
              </div>
              <button type="submit" disabled={saving} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: saving ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: saving ? 'not-allowed' : 'pointer' }}>
                {saving ? 'Creating...' : 'Create User'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
