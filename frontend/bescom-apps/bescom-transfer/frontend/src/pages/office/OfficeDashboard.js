import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { vacancyAPI, hrAPI } from '../../services/api';
import { getZones, getCircles, getDivisions, getSubDivisions, getSections } from '../../utils/hierarchy';
import toast from 'react-hot-toast';

const DESIGNATIONS = ['Junior Lineman','Lineman','Senior Lineman','Meter Reader','Helper','Junior Engineer','Assistant Engineer','Senior Assistant Engineer','Executive Engineer'];

const inp = { width:'100%', padding:'8px 10px', border:'1.5px solid #D3D1C7', borderRadius:'7px', fontSize:'13px', boxSizing:'border-box', background:'#fff', color:'#2c2c2a', outline:'none' };
const lbl = { display:'block', fontSize:'12px', fontWeight:'500', color:'#5F5E5A', marginBottom:'4px' };

export default function OfficeDashboard() {
  const { user } = useAuth();
  const [cycles, setCycles]           = useState([]);
  const [myVacancies, setMyVacancies] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [showForm, setShowForm]       = useState(false);
  const [saving, setSaving]           = useState(false);
  const [form, setForm] = useState({
    unitType:'section', zone:'', circle:'', division:'',
    subDivision:'', section:'', postDesignation:'', group:'C', totalVacancies:1
  });

  const handleChange = useCallback((e) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  }, []);

  // Cascade resets — each is a stable separate callback
  const handleZone = useCallback((e) => {
    setForm(p => ({ ...p, zone:e.target.value, circle:'', division:'', subDivision:'', section:'' }));
  }, []);
  const handleCircle = useCallback((e) => {
    setForm(p => ({ ...p, circle:e.target.value, division:'', subDivision:'', section:'' }));
  }, []);
  const handleDivision = useCallback((e) => {
    setForm(p => ({ ...p, division:e.target.value, subDivision:'', section:'' }));
  }, []);
  const handleSubDiv = useCallback((e) => {
    setForm(p => ({ ...p, subDivision:e.target.value, section:'' }));
  }, []);

  const load = () => {
    hrAPI.getCycles().then(r => {
      const open = (r.data.cycles||[]).filter(c => ['vacancy_collection','application_open'].includes(c.status));
      setCycles(open);
      if (open.length === 1) setSelectedCycle(open[0]._id);
    });
    vacancyAPI.getMy({}).then(r => setMyVacancies(r.data.vacancies||[]));
  };
  useEffect(() => { load(); }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) { toast.error('Select a cycle'); return; }
    setSaving(true);
    try {
      await vacancyAPI.submit({ ...form, cycleId:selectedCycle, totalVacancies:parseInt(form.totalVacancies) });
      toast.success('Vacancy submitted successfully');
      setShowForm(false); load();
    } catch (err) { toast.error(err.response?.data?.message||'Submission failed'); }
    finally { setSaving(false); }
  };

  const S = ({ label, name, required, options, onChange: customOnChange }) => (
    <div style={{ marginBottom:'12px' }}>
      <label style={lbl}>{label}{required && <span style={{ color:'#A32D2D' }}> *</span>}</label>
      <select name={name} value={form[name]} onChange={customOnChange||handleChange} required={required} style={{ ...inp }}>
        <option value="">— Select —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div style={{ background:'linear-gradient(135deg,#0F6E56,#085041)', borderRadius:'14px', padding:'24px 28px', color:'#fff', marginBottom:'24px' }}>
        <h1 style={{ fontSize:'20px', fontWeight:'700', margin:'0 0 4px' }}>Office Vacancy Portal</h1>
        <p style={{ opacity:0.85, fontSize:'14px', margin:'0 0 8px' }}>{user?.name}</p>
        <p style={{ fontSize:'13px', opacity:0.75, background:'rgba(255,255,255,0.15)', borderRadius:'6px', padding:'8px 12px', margin:0 }}>
          Submit vacancies for <strong>your unit only</strong>. Each office submits directly to the system.
        </p>
      </div>

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
        <h2 style={{ fontSize:'17px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>My Submitted Vacancies ({myVacancies.length})</h2>
        <button onClick={() => setShowForm(s=>!s)} style={{ background:'#0F6E56', color:'#fff', border:'none', borderRadius:'8px', padding:'9px 18px', fontSize:'13px', fontWeight:'500', cursor:'pointer' }}>
          {showForm ? '✕ Cancel' : '+ Add Vacancy'}
        </button>
      </div>

      {showForm && (
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'22px', marginBottom:'20px' }}>
          <h3 style={{ fontSize:'15px', fontWeight:'600', color:'#2c2c2a', margin:'0 0 16px' }}>New Vacancy Entry</h3>
          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom:'12px' }}>
              <label style={lbl}>Transfer Cycle *</label>
              <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} required style={{ ...inp }}>
                <option value="">— Select cycle —</option>
                {cycles.map(c => <option key={c._id} value={c._id}>{c.name} ({c.financialYear})</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'0 14px' }}>
              <S label="Unit Type"        name="unitType"        required options={['section','subdivision','division','circle','zone','corporate']} />
              <S label="Zone"             name="zone"            required options={getZones()}                                                          onChange={handleZone} />
              <S label="Circle"           name="circle"                   options={getCircles(form.zone)}                                              onChange={handleCircle} />
              <S label="Division"         name="division"        required options={getDivisions(form.zone, form.circle)}                               onChange={handleDivision} />
              <S label="Sub-Division"     name="subDivision"              options={getSubDivisions(form.zone, form.circle, form.division)}             onChange={handleSubDiv} />
              <S label="Section"          name="section"                  options={getSections(form.zone, form.circle, form.division, form.subDivision)} />
              <S label="Post Designation" name="postDesignation" required options={DESIGNATIONS} />
              <S label="Group"            name="group"           required options={['C','D']} />
            </div>
            <div style={{ marginBottom:'16px' }}>
              <label style={lbl}>No. of Vacancies *</label>
              <input type="number" name="totalVacancies" min="1" max="50"
                value={form.totalVacancies} onChange={handleChange} required
                style={{ width:'120px', padding:'8px 10px', border:'1.5px solid #D3D1C7', borderRadius:'7px', fontSize:'14px', outline:'none', color:'#2c2c2a' }} />
            </div>
            <button type="submit" disabled={saving} style={{ background:'#0F6E56', color:'#fff', border:'none', borderRadius:'8px', padding:'10px 24px', fontSize:'14px', fontWeight:'500', cursor:'pointer', opacity:saving?0.7:1 }}>
              {saving ? 'Submitting...' : 'Submit Vacancy'}
            </button>
          </form>
        </div>
      )}

      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'hidden' }}>
        {myVacancies.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>
            <p style={{ fontSize:'28px', marginBottom:'8px' }}>📋</p>
            <p style={{ fontWeight:'500' }}>No vacancies submitted yet</p>
            <p style={{ fontSize:'13px' }}>Click "Add Vacancy" to submit vacancies for your unit.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'700px' }}>
              <thead>
                <tr style={{ background:'#f9f8f5' }}>
                  {['Cycle','Location','Post Designation','Group','Total','Filled','Available','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myVacancies.map((v, i) => (
                  <tr key={v._id} style={{ borderTop:'1px solid #f1efe8', background:i%2===0?'#fff':'#fafaf8' }}>
                    <td style={{ padding:'12px 14px', fontSize:'12px', color:'#888780' }}>{v.cycle?.name||'—'}</td>
                    <td style={{ padding:'12px 14px', fontSize:'13px', color:'#2c2c2a', fontWeight:'500' }}>{v.section||v.subDivision||v.division}</td>
                    <td style={{ padding:'12px 14px', fontSize:'13px' }}>{v.postDesignation}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ padding:'2px 8px', background:v.group==='C'?'#EEEDFE':'#E6F1FB', color:v.group==='C'?'#3C3489':'#0C447C', borderRadius:'4px', fontSize:'11px', fontWeight:'500' }}>Group {v.group}</span>
                    </td>
                    <td style={{ padding:'12px 14px', fontWeight:'600' }}>{v.totalVacancies}</td>
                    <td style={{ padding:'12px 14px', color:'#3B6D11', fontWeight:'500' }}>{v.filledVacancies}</td>
                    <td style={{ padding:'12px 14px', fontWeight:'700', color:(v.totalVacancies-v.filledVacancies)>0?'#534AB7':'#A32D2D' }}>{v.totalVacancies-v.filledVacancies}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ padding:'2px 8px', borderRadius:'20px', fontSize:'11px', fontWeight:'500', background:v.status==='submitted'?'#EAF3DE':'#F1EFE8', color:v.status==='submitted'?'#27500A':'#5F5E5A' }}>{v.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
