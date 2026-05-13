import React, { useState, useEffect, useCallback } from 'react';
import { adminAPI } from '../../services/api';
import { getZones, getCircles, getDivisions, getSubDivisions } from '../../utils/hierarchy';
import toast from 'react-hot-toast';

const UNIT_TYPES = ['corporate','zone','circle','division','subdivision','section'];

const inp = {
  width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7',
  borderRadius:'8px', fontSize:'13px', boxSizing:'border-box',
  background:'#fff', color:'#2c2c2a', outline:'none'
};
const lbl = { display:'block', fontSize:'12px', fontWeight:'500', color:'#5F5E5A', marginBottom:'4px' };

const roleColor = (role) => ({
  hr_corporate: { bg:'#EEEDFE', color:'#3C3489', label:'HR Corporate' },
  office_admin: { bg:'#E1F5EE', color:'#085041', label:'Office Admin' },
  employee:     { bg:'#F1EFE8', color:'#5F5E5A', label:'Employee' },
}[role] || { bg:'#F1EFE8', color:'#5F5E5A', label: role });

// ── Stable field components defined outside ───────────────────
function F({ label, name, type, required, placeholder, value, onChange }) {
  return (
    <div style={{ marginBottom:'12px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <input type={type||'text'} name={name} value={value} onChange={onChange}
        required={required} placeholder={placeholder} style={inp} />
    </div>
  );
}

function Sel({ label, name, required, options, value, onChange, disabled }) {
  return (
    <div style={{ marginBottom:'12px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <select name={name} value={value} onChange={onChange} required={required}
        disabled={disabled}
        style={{ ...inp, opacity: disabled ? 0.45 : 1, cursor: disabled ? 'not-allowed' : 'default' }}>
        <option value="">— Select —</option>
        {options.map(o => typeof o === 'string'
          ? <option key={o} value={o}>{o}</option>
          : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
    </div>
  );
}

// ── Unit location fields — renders only the parent hierarchy as dropdowns,
//    own unit name as a plain text field ─────────────────────────────────
function UnitFields({ unitType, form, onChange, onZone, onCircle, onDivision, onSubDiv }) {
  if (!unitType || unitType === 'corporate') return null;

  const showZone      = ['zone','circle','division','subdivision','section'].includes(unitType);
  const showCircle    = ['circle','division','subdivision','section'].includes(unitType);
  const showDivision  = ['subdivision','section'].includes(unitType);
  const showSubDiv    = ['section'].includes(unitType);

  // Label for the "own unit name" text field
  const ownUnitLabels = {
    zone:        'Zone Name',
    circle:      'Circle Name',
    division:    'Division Name',
    subdivision: 'Sub-Division Name',
    section:     'Section Name',
  };
  const ownUnitPlaceholders = {
    zone:        'e.g. Southern Zone',
    circle:      'e.g. Bengaluru South Circle',
    division:    'e.g. Jayanagar Division',
    subdivision: 'e.g. BTM Layout Sub-Division',
    section:     'e.g. BTM 2nd Stage O&M',
  };

  return (
    <div style={{ background:'#f9f8f5', borderRadius:'8px', padding:'14px 16px', marginBottom:'14px' }}>
      <p style={{ fontSize:'12px', fontWeight:'600', color:'#5F5E5A', margin:'0 0 12px', textTransform:'uppercase', letterSpacing:'0.04em' }}>
        Office Location
      </p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>

        {/* Zone — dropdown (parent of everything except corporate/zone itself) */}
        {showZone && unitType !== 'zone' && (
          <Sel label="Zone" name="zone" required
            options={getZones()} value={form.zone} onChange={onZone} />
        )}

        {/* Circle — dropdown (parent of division/subdivision/section) */}
        {showCircle && unitType !== 'circle' && (
          <Sel label="Circle" name="circle" required
            options={getCircles(form.zone)} value={form.circle}
            onChange={onCircle} disabled={!form.zone} />
        )}

        {/* Division — dropdown (parent of subdivision/section) */}
        {showDivision && unitType !== 'division' && (
          <Sel label="Division" name="division" required
            options={getDivisions(form.zone, form.circle)} value={form.division}
            onChange={onDivision} disabled={!form.circle} />
        )}

        {/* Sub-Division — dropdown (parent of section only) */}
        {showSubDiv && unitType !== 'subdivision' && (
          <Sel label="Sub-Division" name="subDivision" required
            options={getSubDivisions(form.zone, form.circle, form.division)}
            value={form.subDivision} onChange={onSubDiv} disabled={!form.division} />
        )}

        {/* Own unit name — always a plain text field */}
        {unitType !== 'corporate' && (
          <F
            label={ownUnitLabels[unitType]}
            name={unitType === 'zone' ? 'zone'
                : unitType === 'circle' ? 'circle'
                : unitType === 'division' ? 'division'
                : unitType === 'subdivision' ? 'subDivision'
                : 'section'}
            required
            placeholder={ownUnitPlaceholders[unitType]}
            value={
              unitType === 'zone'        ? form.zone :
              unitType === 'circle'      ? form.circle :
              unitType === 'division'    ? form.division :
              unitType === 'subdivision' ? form.subDivision :
              form.section
            }
            onChange={onChange}
          />
        )}

      </div>

      {/* Helper text explaining the cascade */}
      <p style={{ fontSize:'11px', color:'#B4B2A9', margin:'4px 0 0' }}>
        {unitType === 'zone'        && 'Enter the zone name. This account will manage all vacancies within this zone.'}
        {unitType === 'circle'      && 'Select the zone this circle belongs to, then type the circle name.'}
        {unitType === 'division'    && 'Select zone and circle this division belongs to, then type the division name.'}
        {unitType === 'subdivision' && 'Select zone, circle and division this sub-division belongs to, then type the sub-division name.'}
        {unitType === 'section'     && 'Select zone, circle, division and sub-division this section belongs to, then type the section name.'}
      </p>
    </div>
  );
}

export default function UserManagement() {
  const [users, setUsers]             = useState([]);
  const [loading, setLoading]         = useState(true);
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [resetModal, setResetModal]   = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [activeTab, setActiveTab]     = useState('office');
  const [search, setSearch]           = useState('');

  const [form, setForm] = useState({
    username:'', name:'', email:'', phone:'', password:'',
    role:'office_admin', officeName:'', unitType:'division',
    zone:'', circle:'', division:'', subDivision:'', section:''
  });

  // ── Stable handlers ──────────────────────────────────────────
  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleUnitTypeChange = useCallback((e) => {
    // Reset all location fields when unit type changes
    setForm(prev => ({
      ...prev,
      unitType: e.target.value,
      zone:'', circle:'', division:'', subDivision:'', section:''
    }));
  }, []);

  // Cascade resets
  const handleZone = useCallback((e) => {
    setForm(p => ({ ...p, zone: e.target.value, circle:'', division:'', subDivision:'', section:'' }));
  }, []);
  const handleCircle = useCallback((e) => {
    setForm(p => ({ ...p, circle: e.target.value, division:'', subDivision:'', section:'' }));
  }, []);
  const handleDivision = useCallback((e) => {
    setForm(p => ({ ...p, division: e.target.value, subDivision:'', section:'' }));
  }, []);
  const handleSubDiv = useCallback((e) => {
    setForm(p => ({ ...p, subDivision: e.target.value, section:'' }));
  }, []);

  const handleSearchChange  = useCallback((e) => setSearch(e.target.value), []);
  const handleNewPassChange = useCallback((e) => setNewPassword(e.target.value), []);

  const load = useCallback(() => {
    setLoading(true);
    const params = { search };
    if (activeTab === 'office')   params.accountType = 'office_account';
    if (activeTab === 'employee') params.accountType = 'employee_account';
    adminAPI.getUsers(params)
      .then(r => setUsers(r.data.users || []))
      .catch(() => toast.error('Failed to load users'))
      .finally(() => setLoading(false));
  }, [activeTab, search]);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await adminAPI.createOfficeAccount({
        username:    form.username.toLowerCase(),
        name:        form.name,
        email:       form.email,
        phone:       form.phone,
        password:    form.password,
        role:        form.role,
        officeName:  form.officeName || form.division || form.circle || form.zone || form.name,
        managedUnit: {
          unitType:    form.unitType,
          zone:        form.zone,
          circle:      form.circle,
          division:    form.division,
          subDivision: form.subDivision,
          section:     form.section
        }
      });
      toast.success('Office account created successfully');
      setShowForm(false);
      setForm({ username:'', name:'', email:'', phone:'', password:'', role:'office_admin',
        officeName:'', unitType:'division', zone:'', circle:'', division:'', subDivision:'', section:'' });
      load();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create account');
    } finally { setSaving(false); }
  };

  const handleResetPassword = async () => {
    if (!newPassword || newPassword.length < 6) { toast.error('Password must be at least 6 characters'); return; }
    try {
      await adminAPI.resetPassword(resetModal._id, { newPassword });
      toast.success(`Password reset for ${resetModal.name}`);
      setResetModal(null); setNewPassword('');
    } catch { toast.error('Password reset failed'); }
  };

  const toggleActive = async (u) => {
    try {
      const r = await adminAPI.toggleActive(u._id);
      toast.success(`${u.name} ${r.data.isActive ? 'activated' : 'deactivated'}`);
      load();
    } catch { toast.error('Action failed'); }
  };

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>User Management</h1>
          <p style={{ color:'#888780', fontSize:'14px' }}>Create and manage office & HR accounts. Employees self-register.</p>
        </div>
        <button onClick={() => setShowForm(s => !s)}
          style={{ background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
          {showForm ? '✕ Cancel' : '+ New Office Account'}
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'24px', marginBottom:'24px' }}>
          <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#2c2c2a', margin:'0 0 4px' }}>Create Office / HR Account</h3>
          <p style={{ fontSize:'13px', color:'#888780', margin:'0 0 18px' }}>No employee-specific details needed — just a username and office unit.</p>

          <form onSubmit={handleCreate}>
            {/* Account credentials */}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <F label="Username"  name="username"  required placeholder="e.g. jayanagar.div or hr.admin" value={form.username}  onChange={handleChange} />
              <F label="Full Name" name="name"      required placeholder="Person or office name"           value={form.name}      onChange={handleChange} />
              <F label="Email"     name="email"     required type="email"                                  value={form.email}     onChange={handleChange} />
              <F label="Phone"     name="phone"     required type="tel"                                    value={form.phone}     onChange={handleChange} />
              <F label="Password"  name="password"  required type="password" placeholder="Min 6 characters" value={form.password} onChange={handleChange} />
              <Sel label="Role" name="role" required value={form.role} onChange={handleChange}
                options={[
                  { value:'office_admin', label:'Office Admin (Vacancy Submission)' },
                  { value:'hr_corporate', label:'HR Corporate (Full Access)' }
                ]} />
            </div>

            <F label="Office / Department Name" name="officeName"
              placeholder="e.g. Jayanagar Division Office (auto-filled if left blank)"
              value={form.officeName} onChange={handleChange} />

            {/* Unit type selector */}
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>Unit Type <span style={{ color:'#A32D2D' }}>*</span></label>
              <select name="unitType" value={form.unitType} onChange={handleUnitTypeChange} style={inp}>
                {UNIT_TYPES.map(o => <option key={o} value={o}>{o.charAt(0).toUpperCase() + o.slice(1)}</option>)}
              </select>
              <p style={{ fontSize:'11px', color:'#B4B2A9', marginTop:'4px' }}>
                Select the level of this office. Parent hierarchy fields will appear as dropdowns; this unit's name will be a text field.
              </p>
            </div>

            {/* Dynamic location fields based on unit type */}
            <UnitFields
              unitType={form.unitType}
              form={form}
              onChange={handleChange}
              onZone={handleZone}
              onCircle={handleCircle}
              onDivision={handleDivision}
              onSubDiv={handleSubDiv}
            />

            <button type="submit" disabled={saving}
              style={{ background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'14px', fontWeight:'500', cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Creating...' : 'Create Account'}
            </button>
          </form>
        </div>
      )}

      {/* Tabs + search */}
      <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', background:'#f1efe8', borderRadius:'8px', padding:'3px' }}>
          {[['office','🏢 Office / HR'],['employee','👤 Employees']].map(([tab, label]) => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              style={{ padding:'6px 16px', borderRadius:'6px', border:'none', fontSize:'13px', fontWeight:'500', cursor:'pointer',
                background: activeTab===tab ? '#fff' : 'transparent',
                color:      activeTab===tab ? '#2c2c2a' : '#888780',
                boxShadow:  activeTab===tab ? '0 1px 3px rgba(0,0,0,0.08)' : 'none' }}>
              {label}
            </button>
          ))}
        </div>
        <input value={search} onChange={handleSearchChange} placeholder="Search by name, username..."
          style={{ flex:1, minWidth:'180px', padding:'8px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', outline:'none', color:'#2c2c2a' }} />
      </div>

      {/* Users table */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'hidden' }}>
        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>Loading...</div>
        ) : users.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>
            <p style={{ fontSize:'28px', marginBottom:'8px' }}>{activeTab==='office'?'🏢':'👤'}</p>
            <p style={{ fontWeight:'500' }}>No {activeTab==='office'?'office':'employee'} accounts found</p>
            {activeTab==='office'   && <p style={{ fontSize:'13px', marginTop:'4px' }}>Create one using the button above.</p>}
            {activeTab==='employee' && <p style={{ fontSize:'13px', marginTop:'4px' }}>Employees self-register via the Employee Registration page.</p>}
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'700px' }}>
              <thead>
                <tr style={{ background:'#f9f8f5' }}>
                  {(activeTab==='office'
                    ? ['Account','Username','Role','Office / Unit','Status','Actions']
                    : ['Employee','Employee ID','Group','Current Posting','Status','Actions']
                  ).map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => {
                  const rc = roleColor(u.role);
                  return (
                    <tr key={u._id} style={{ borderTop:'1px solid #f1efe8', background:i%2===0?'#fff':'#fafaf8' }}>
                      <td style={{ padding:'12px 14px' }}>
                        <p style={{ fontWeight:'500', color:'#2c2c2a', margin:'0 0 2px', fontSize:'13px' }}>{u.name}</p>
                        <p style={{ fontSize:'11px', color:'#888780', margin:0 }}>{u.email}</p>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:'13px', color:'#5F5E5A', fontFamily:'monospace' }}>
                        {u.username || u.employeeId || '—'}
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ padding:'3px 8px', borderRadius:'4px', fontSize:'11px', fontWeight:'500', background:rc.bg, color:rc.color }}>
                          {rc.label}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px', fontSize:'12px', color:'#5F5E5A' }}>
                        <div>
                          <span style={{ fontWeight:'500', color:'#2c2c2a' }}>
                            {u.officeName || u.managedUnit?.section || u.managedUnit?.subDivision || u.managedUnit?.division || u.managedUnit?.circle || u.managedUnit?.zone || '—'}
                          </span>
                          {u.managedUnit?.unitType && (
                            <span style={{ display:'block', fontSize:'11px', color:'#B4B2A9', marginTop:'2px', textTransform:'capitalize' }}>
                              {u.managedUnit.unitType}
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <span style={{ padding:'3px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'500',
                          background: u.isActive?'#EAF3DE':'#FCEBEB',
                          color:      u.isActive?'#27500A':'#791F1F' }}>
                          {u.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding:'12px 14px' }}>
                        <div style={{ display:'flex', gap:'6px', flexWrap:'wrap' }}>
                          <button onClick={() => toggleActive(u)}
                            style={{ padding:'4px 10px', border:`1px solid ${u.isActive?'#A32D2D':'#3B6D11'}`, borderRadius:'6px', fontSize:'11px', cursor:'pointer', background:'#fff', color:u.isActive?'#A32D2D':'#3B6D11', fontWeight:'500' }}>
                            {u.isActive ? 'Deactivate' : 'Activate'}
                          </button>
                          <button onClick={() => { setResetModal(u); setNewPassword(''); }}
                            style={{ padding:'4px 10px', border:'1px solid #534AB7', borderRadius:'6px', fontSize:'11px', cursor:'pointer', background:'#fff', color:'#534AB7', fontWeight:'500' }}>
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Reset password modal */}
      {resetModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'14px', padding:'28px', maxWidth:'380px', width:'100%' }}>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 6px' }}>Reset Password</h3>
            <p style={{ fontSize:'13px', color:'#888780', marginBottom:'18px' }}>
              {resetModal.name} ({resetModal.username || resetModal.employeeId})
            </p>
            <label style={lbl}>New Password *</label>
            <input type="password" value={newPassword} onChange={handleNewPassChange}
              placeholder="Min 6 characters" style={{ ...inp, marginBottom:'18px' }} />
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setResetModal(null); setNewPassword(''); }}
                style={{ flex:1, padding:'10px', border:'1.5px solid #D3D1C7', borderRadius:'8px', background:'#fff', color:'#5F5E5A', cursor:'pointer', fontSize:'14px' }}>
                Cancel
              </button>
              <button onClick={handleResetPassword}
                style={{ flex:2, padding:'10px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer', fontSize:'14px' }}>
                Reset Password
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
