import React, { useState, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { employeeAPI } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', boxSizing:'border-box', color:'#2c2c2a', background:'#fff', outline:'none' };
const lbl = { display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'5px' };

function Row({ label, value }) {
  return (
    <div style={{ display:'flex', padding:'12px 0', borderBottom:'1px solid #f1efe8' }}>
      <div style={{ width:'200px', fontSize:'13px', color:'#888780', flexShrink:0 }}>{label}</div>
      <div style={{ fontSize:'14px', color:'#2c2c2a', fontWeight:'500' }}>{value || '—'}</div>
    </div>
  );
}

export default function Profile() {
  const { user, refreshUser } = useAuth();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving]   = useState(false);
  const [form, setForm] = useState({ name: user?.name || '', phone: user?.phone || '' });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await employeeAPI.updateProfile(form);
      await refreshUser();
      toast.success('Profile updated');
      setEditing(false);
    } catch { toast.error('Update failed'); }
    finally { setSaving(false); }
  };

  return (
    <div style={{ maxWidth:'700px' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:0 }}>My Profile</h1>
        {!editing
          ? <button onClick={() => setEditing(true)} style={{ padding:'9px 20px', border:'1.5px solid #534AB7', borderRadius:'8px', color:'#534AB7', background:'#fff', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>Edit Profile</button>
          : <div style={{ display:'flex', gap:'8px' }}>
              <button onClick={() => setEditing(false)} style={{ padding:'9px 20px', border:'1.5px solid #D3D1C7', borderRadius:'8px', color:'#5F5E5A', background:'#fff', fontSize:'14px', cursor:'pointer' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding:'9px 20px', background:'#534AB7', border:'none', borderRadius:'8px', color:'#fff', fontSize:'14px', fontWeight:'500', cursor:'pointer', opacity:saving?0.7:1 }}>
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
        }
      </div>

      <div style={{ background:'linear-gradient(135deg,#534AB7,#3C3489)', borderRadius:'14px', padding:'24px', color:'#fff', marginBottom:'20px', display:'flex', alignItems:'center', gap:'18px' }}>
        <div style={{ width:'60px', height:'60px', borderRadius:'50%', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'22px', fontWeight:'700', flexShrink:0 }}>
          {user?.name?.charAt(0)}
        </div>
        <div>
          <h2 style={{ fontSize:'18px', fontWeight:'700', margin:'0 0 4px' }}>{user?.name}</h2>
          <p style={{ opacity:0.85, fontSize:'14px', margin:'0 0 4px' }}>{user?.designation} · Group {user?.group}</p>
          <p style={{ opacity:0.75, fontSize:'13px', margin:0 }}>{user?.employeeId}</p>
        </div>
      </div>

      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'20px 24px', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', margin:'0 0 4px' }}>Personal Information</h3>
        {editing ? (
          <div style={{ marginTop:'14px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
            <div style={{ marginBottom:'14px' }}>
              <label style={lbl}>Full Name</label>
              <input name="name" value={form.name} onChange={handleChange} style={inp} />
            </div>
            <div style={{ marginBottom:'14px' }}>
              <label style={lbl}>Phone Number</label>
              <input name="phone" value={form.phone} onChange={handleChange} style={inp} />
            </div>
          </div>
        ) : (
          <>
            <Row label="Full Name"      value={user?.name} />
            <Row label="Employee ID"    value={user?.employeeId} />
            <Row label="Email"          value={user?.email} />
            <Row label="Phone"          value={user?.phone} />
            <Row label="Date of Birth"  value={user?.dateOfBirth ? format(new Date(user.dateOfBirth),'dd MMM yyyy') : '—'} />
            <Row label="Joining Date"   value={user?.joiningDate ? format(new Date(user.joiningDate),'dd MMM yyyy') : '—'} />
            <Row label="Designation"    value={user?.designation} />
            <Row label="Employee Group" value={`Group ${user?.group}`} />
          </>
        )}
      </div>

      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'20px 24px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', margin:'0 0 4px' }}>Current Posting</h3>
        <Row label="Zone"         value={user?.currentPosting?.zone} />
        <Row label="Circle"       value={user?.currentPosting?.circle} />
        <Row label="Division"     value={user?.currentPosting?.division} />
        <Row label="Sub-Division" value={user?.currentPosting?.subDivision} />
        <Row label="Section"      value={user?.currentPosting?.section} />
        <Row label="Posting Since" value={user?.currentPosting?.postingSince ? format(new Date(user.currentPosting.postingSince),'dd MMM yyyy') : '—'} />
        <div style={{ marginTop:'12px', background:'#f1efe8', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#5F5E5A' }}>
          To update your current posting details, please contact the HR department.
        </div>
      </div>
    </div>
  );
}
