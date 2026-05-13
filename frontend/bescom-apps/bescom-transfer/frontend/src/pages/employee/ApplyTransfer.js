import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { transferAPI, cycleAPI } from '../../services/api';
import { getZones, getCircles, getDivisions, getSubDivisions, getSections } from '../../utils/hierarchy';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { format, differenceInYears, differenceInMonths } from 'date-fns';

const sel = { width:'100%', padding:'8px 10px', border:'1.5px solid #D3D1C7', borderRadius:'7px', fontSize:'13px', background:'#fff', boxSizing:'border-box', color:'#2c2c2a', outline:'none' };
const lbl = { display:'block', fontSize:'12px', fontWeight:'500', color:'#5F5E5A', marginBottom:'4px' };

const emptyPref = { zone:'', circle:'', division:'', subDivision:'', section:'' };

// Defined outside — stable reference
function PrioritySlot({ num, pref, onUpdate, onRemove, canRemove }) {
  // All handlers defined in parent and passed as stable props
  return (
    <div style={{ border:'1.5px solid #D3D1C7', borderRadius:'12px', padding:'16px', marginBottom:'14px', background:'#fafaf8' }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'14px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{ width:'28px', height:'28px', borderRadius:'50%', background:'#534AB7', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'13px', fontWeight:'700' }}>{num}</div>
          <span style={{ fontWeight:'600', fontSize:'14px', color:'#2c2c2a' }}>Priority {num}</span>
        </div>
        {canRemove && <button type="button" onClick={onRemove} style={{ background:'none', border:'none', color:'#A32D2D', fontSize:'13px', cursor:'pointer' }}>✕ Remove</button>}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'10px' }}>
        <div>
          <label style={lbl}>Zone</label>
          <select value={pref.zone} onChange={e => onUpdate('zone', e.target.value)} style={sel}>
            <option value="">— Select —</option>
            {getZones().map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Circle</label>
          <select value={pref.circle} onChange={e => onUpdate('circle', e.target.value)} style={sel}>
            <option value="">— Select —</option>
            {getCircles(pref.zone).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Division *</label>
          <select value={pref.division} onChange={e => onUpdate('division', e.target.value)} style={sel}>
            <option value="">— Select —</option>
            {getDivisions(pref.zone, pref.circle).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Sub-Division</label>
          <select value={pref.subDivision} onChange={e => onUpdate('subDivision', e.target.value)} style={sel}>
            <option value="">— Select —</option>
            {getSubDivisions(pref.zone, pref.circle, pref.division).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
        <div>
          <label style={lbl}>Section</label>
          <select value={pref.section} onChange={e => onUpdate('section', e.target.value)} style={sel}>
            <option value="">— Select —</option>
            {getSections(pref.zone, pref.circle, pref.division, pref.subDivision).map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      </div>
    </div>
  );
}

export default function ApplyTransfer() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [cycles, setCycles]               = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [preferences, setPreferences]     = useState([{ ...emptyPref }]);
  const [loading, setLoading]             = useState(false);
  const [pageLoading, setPageLoading]     = useState(true);

  useEffect(() => {
    cycleAPI.getOpenCycles()
      .then(res => {
        const open = res.data.cycles || [];
        setCycles(open);
        if (open.length === 1) setSelectedCycle(open[0]._id);
      })
      .finally(() => setPageLoading(false));
  }, []);

  // Stable updater for a single preference field with cascade resets
  const updatePrefField = useCallback((index, field, value) => {
    setPreferences(prev => prev.map((p, i) => {
      if (i !== index) return p;
      const updated = { ...p, [field]: value };
      if (field === 'zone')        { updated.circle=''; updated.division=''; updated.subDivision=''; updated.section=''; }
      if (field === 'circle')      { updated.division=''; updated.subDivision=''; updated.section=''; }
      if (field === 'division')    { updated.subDivision=''; updated.section=''; }
      if (field === 'subDivision') { updated.section=''; }
      return updated;
    }));
  }, []);

  const removePref = useCallback((index) => {
    setPreferences(prev => prev.filter((_, i) => i !== index));
  }, []);

  const postingSince  = user?.currentPosting?.postingSince;
  const serviceYears  = postingSince ? differenceInYears(new Date(), new Date(postingSince))  : 0;
  const serviceMonths = postingSince ? differenceInMonths(new Date(), new Date(postingSince)) % 12 : 0;
  const meritIndicator = Math.min(Math.round((serviceYears / 20) * 50), 50);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedCycle) { toast.error('Please select a transfer cycle'); return; }
    const valid = preferences.filter(p => p.division);
    if (valid.length === 0) { toast.error('Add at least one preference with a Division selected'); return; }
    setLoading(true);
    try {
      const res = await transferAPI.apply({ cycleId: selectedCycle, preferences: valid.map((p, i) => ({ priority: i+1, ...p })) });
      toast.success(`Application submitted! No: ${res.data.application.applicationNumber}`);
      navigate('/my-applications');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Submission failed');
    } finally { setLoading(false); }
  };

  if (pageLoading) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading...</div>;

  return (
    <div style={{ maxWidth:'760px', margin:'0 auto' }}>
      <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', marginBottom:'6px' }}>Apply for Transfer</h1>
      <p style={{ color:'#888780', fontSize:'14px', marginBottom:'24px' }}>All employees may apply. Your service years are scored in the merit list.</p>

      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'18px 20px', marginBottom:'20px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', marginBottom:'12px' }}>Your Current Posting Details</h3>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'14px' }}>
          {[
            ['Current Location', `${user?.currentPosting?.section||'—'}, ${user?.currentPosting?.division||'—'}`],
            ['Service at Posting', `${serviceYears} yrs ${serviceMonths} months`],
            ['Joining Date (BESCOM)', user?.joiningDate ? format(new Date(user.joiningDate),'dd MMM yyyy') : '—'],
            ['Group', `Group ${user?.group}`],
          ].map(([l,v]) => (
            <div key={l}>
              <p style={{ fontSize:'12px', color:'#888780', marginBottom:'3px' }}>{l}</p>
              <p style={{ fontSize:'14px', fontWeight:'500', color:'#2c2c2a', margin:0 }}>{v}</p>
            </div>
          ))}
        </div>
        <div style={{ marginTop:'14px', background:'#E6F1FB', borderRadius:'8px', padding:'10px 14px' }}>
          <p style={{ fontSize:'13px', color:'#0C447C', margin:0 }}>
            <strong>Indicative service score: ~{meritIndicator}/50 points</strong> (50% of total merit score). Higher years = higher rank.
          </p>
        </div>
      </div>

      {cycles.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'40px', textAlign:'center' }}>
          <p style={{ fontSize:'32px', marginBottom:'10px' }}>🚫</p>
          <p style={{ fontWeight:'600', color:'#2c2c2a', marginBottom:'6px' }}>No active transfer cycle</p>
          <p style={{ fontSize:'13px', color:'#888780' }}>Applications can only be submitted when HR opens a transfer window.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'18px 20px', marginBottom:'16px' }}>
            <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Transfer Cycle *</label>
            <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)} required
              style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', background:'#fff', outline:'none', color:'#2c2c2a' }}>
              <option value="">— Select cycle —</option>
              {cycles.map(c => (
                <option key={c._id} value={c._id}>{c.name} ({c.financialYear}) — Closes {format(new Date(c.applicationEndDate),'dd MMM yyyy')}</option>
              ))}
            </select>
          </div>

          <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'18px 20px', marginBottom:'16px' }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
              <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>Preferred Postings (up to 3)</h3>
              {preferences.length < 3 && (
                <button type="button" onClick={() => setPreferences(p => [...p, { ...emptyPref }])}
                  style={{ background:'none', border:'1.5px solid #534AB7', borderRadius:'7px', color:'#534AB7', padding:'5px 14px', fontSize:'13px', cursor:'pointer' }}>
                  + Add Preference
                </button>
              )}
            </div>
            {preferences.map((pref, i) => (
              <PrioritySlot
                key={i}
                num={i + 1}
                pref={pref}
                onUpdate={(field, value) => updatePrefField(i, field, value)}
                onRemove={() => removePref(i)}
                canRemove={preferences.length > 1}
              />
            ))}
          </div>

          <div style={{ display:'flex', gap:'12px' }}>
            <button type="button" onClick={() => navigate(-1)}
              style={{ flex:1, padding:'12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', background:'#fff', color:'#5F5E5A', fontSize:'14px', fontWeight:'500', cursor:'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex:2, padding:'12px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontSize:'14px', fontWeight:'600', cursor:'pointer', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Submitting...' : 'Submit Application'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
