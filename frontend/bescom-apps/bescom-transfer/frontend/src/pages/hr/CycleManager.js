import React, { useState, useEffect, useCallback } from 'react';
import { hrAPI } from '../../services/api';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const STATUS_ORDER = ['vacancy_collection','application_open','application_closed','merit_generated','approval_in_progress','completed'];
const STATUS_NEXT  = { vacancy_collection:'application_open', application_open:'application_closed', application_closed:'merit_generated', merit_generated:'approval_in_progress', approval_in_progress:'completed' };

const inp = { width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', outline:'none', boxSizing:'border-box', color:'#2c2c2a', background:'#fff' };
const lbl = { display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'5px' };

export default function CycleManager() {
  const [cycles, setCycles]     = useState([]);
  const [loading, setLoading]   = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving]     = useState(false);
  const [form, setForm] = useState({ name:'', financialYear:'', vacancyDeadline:'', applicationStartDate:'', applicationEndDate:'', notes:'' });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  const load = () => hrAPI.getCycles().then(r => setCycles(r.data.cycles||[])).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault(); setSaving(true);
    try {
      await hrAPI.createCycle(form);
      toast.success('Cycle created');
      setShowForm(false);
      setForm({ name:'', financialYear:'', vacancyDeadline:'', applicationStartDate:'', applicationEndDate:'', notes:'' });
      load();
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to create cycle'); }
    finally { setSaving(false); }
  };

  const advanceStatus = async (cycle) => {
    const next = STATUS_NEXT[cycle.status];
    if (!next) return;
    try { await hrAPI.updateCycleStatus(cycle._id, next); toast.success(`Moved to: ${next.replace(/_/g,' ')}`); load(); }
    catch { toast.error('Failed to update status'); }
  };

  const generateMerit = async (cycleId) => {
    try { const res = await hrAPI.generateMeritList(cycleId); toast.success(res.data.message||'Merit list generated'); load(); }
    catch (err) { toast.error(err.response?.data?.message||'Failed'); }
  };

  const F = ({ label, name, type, required }) => (
    <div style={{ marginBottom:'14px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <input type={type||'text'} name={name} value={form[name]} onChange={handleChange} required={required} style={inp} />
    </div>
  );

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Transfer Cycles</h1>
          <p style={{ color:'#888780', fontSize:'14px' }}>Create and manage annual transfer cycles.</p>
        </div>
        <button onClick={() => setShowForm(s=>!s)} style={{ background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 20px', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
          {showForm ? '✕ Cancel' : '+ New Cycle'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'24px', marginBottom:'24px' }}>
          <h3 style={{ fontSize:'16px', fontWeight:'600', color:'#2c2c2a', margin:'0 0 18px' }}>Create New Transfer Cycle</h3>
          <form onSubmit={handleCreate}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 16px' }}>
              <F label="Cycle Name"                     name="name"                 required />
              <F label="Financial Year (e.g. 2025-26)"  name="financialYear"        required />
              <F label="Vacancy Submission Deadline"    name="vacancyDeadline"      type="date" required />
              <F label="Application Start Date"         name="applicationStartDate" type="date" required />
              <F label="Application End Date"           name="applicationEndDate"   type="date" required />
              <F label="Notes"                          name="notes" />
            </div>
            <button type="submit" disabled={saving} style={{ background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'14px', fontWeight:'500', cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Creating...' : 'Create Cycle'}
            </button>
          </form>
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading cycles...</div>
      ) : cycles.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'50px', textAlign:'center', color:'#888780' }}>
          <p style={{ fontSize:'36px', marginBottom:'12px' }}>🔄</p>
          <p style={{ fontWeight:'500', marginBottom:'6px', color:'#2c2c2a' }}>No cycles created yet</p>
          <p style={{ fontSize:'13px' }}>Click "New Cycle" to create the first transfer cycle.</p>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {cycles.map(cycle => {
            const nextStatus = STATUS_NEXT[cycle.status];
            const currentIdx = STATUS_ORDER.indexOf(cycle.status);
            return (
              <div key={cycle._id} style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'20px 24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                      <h3 style={{ fontSize:'16px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>{cycle.name}</h3>
                      <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'500', background: cycle.status==='application_open'?'#EAF3DE':cycle.status==='completed'?'#F1EFE8':'#FAEEDA', color: cycle.status==='application_open'?'#27500A':cycle.status==='completed'?'#5F5E5A':'#633806' }}>
                        {cycle.status.replace(/_/g,' ')}
                      </span>
                    </div>
                    <p style={{ fontSize:'13px', color:'#888780', margin:'0 0 10px' }}>FY {cycle.financialYear}</p>
                    <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', fontSize:'13px', color:'#5F5E5A' }}>
                      <span>📅 Vacancy deadline: {format(new Date(cycle.vacancyDeadline),'dd MMM yyyy')}</span>
                      <span>📝 Applications: {format(new Date(cycle.applicationStartDate),'dd MMM')} – {format(new Date(cycle.applicationEndDate),'dd MMM yyyy')}</span>
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                    {cycle.status === 'application_closed' && (
                      <button onClick={() => generateMerit(cycle._id)} style={{ padding:'8px 16px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>⚡ Generate Merit</button>
                    )}
                    {nextStatus && cycle.status !== 'application_closed' && (
                      <button onClick={() => advanceStatus(cycle)} style={{ padding:'8px 16px', background:'#EAF3DE', color:'#27500A', border:'1px solid #97C459', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>→ {nextStatus.replace(/_/g,' ')}</button>
                    )}
                  </div>
                </div>
                <div style={{ marginTop:'16px' }}>
                  <div style={{ display:'flex', gap:'2px' }}>
                    {STATUS_ORDER.map((s, i) => (
                      <div key={s} style={{ flex:1, height:'4px', borderRadius:'2px', background: i<=currentIdx ? '#534AB7' : '#D3D1C7', transition:'background 0.3s' }} />
                    ))}
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between', marginTop:'4px' }}>
                    <span style={{ fontSize:'10px', color:'#888780' }}>Vacancy Collection</span>
                    <span style={{ fontSize:'10px', color:'#888780' }}>Completed</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
