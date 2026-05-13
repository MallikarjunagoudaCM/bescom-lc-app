import React, { useState, useEffect } from 'react';
import { hrAPI } from '../../services/api';
import toast from 'react-hot-toast';
import Badge from '../../components/common/Badge';

export default function MeritList() {
  const [cycles, setCycles] = useState([]);
  const [selectedCycle, setSelectedCycle] = useState('');
  const [applications, setApplications] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [filters, setFilters] = useState({ group:'', status:'' });
  const [modal, setModal] = useState(null); // { app, action }
  const [hrNote, setHrNote] = useState('');
  const [approvedPref, setApprovedPref] = useState(1);
  const [processing, setProcessing] = useState(false);

  useEffect(() => { hrAPI.getCycles().then(r => setCycles(r.data.cycles || [])); }, []);

  const loadMerit = async (cycleId) => {
    if (!cycleId) return;
    setLoading(true);
    try {
      const res = await hrAPI.getMeritList(cycleId, { group: filters.group, status: filters.status, limit: 100 });
      setApplications(res.data.applications || []);
      setTotal(res.data.total || 0);
    } catch (err) { toast.error('Failed to load merit list'); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadMerit(selectedCycle); }, [selectedCycle, filters]);

  const generateMerit = async () => {
    if (!selectedCycle) { toast.error('Select a cycle first'); return; }
    setGenerating(true);
    try {
      const res = await hrAPI.generateMeritList(selectedCycle);
      toast.success(res.data.message);
      await loadMerit(selectedCycle);
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to generate'); }
    finally { setGenerating(false); }
  };

  const processApp = async () => {
    if (!modal) return;
    setProcessing(true);
    try {
      await hrAPI.processApplication(modal.app._id, { action: modal.action, approvedPreference: approvedPref, hrNote });
      toast.success(`Application ${modal.action}d successfully`);
      setModal(null); setHrNote(''); setApprovedPref(1);
      await loadMerit(selectedCycle);
    } catch (err) { toast.error(err.response?.data?.message || 'Action failed'); }
    finally { setProcessing(false); }
  };

  const cycle = cycles.find(c => c._id === selectedCycle);

  return (
    <div>
      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>Merit List</h1>
          <p style={{ color:'#888780', fontSize:'14px' }}>{total} applications {selectedCycle ? 'in this cycle' : '— select a cycle'}</p>
        </div>
        <div style={{ display:'flex', gap:'10px', flexWrap:'wrap' }}>
          <select value={selectedCycle} onChange={e => setSelectedCycle(e.target.value)}
            style={{ padding:'8px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', background:'#fff', minWidth:'220px' }}>
            <option value="">— Select cycle —</option>
            {cycles.map(c => <option key={c._id} value={c._id}>{c.name} ({c.financialYear})</option>)}
          </select>
          {selectedCycle && (
            <button onClick={generateMerit} disabled={generating}
              style={{ padding:'8px 18px', background:'#534AB7', color:'#fff', border:'none', borderRadius:'8px', fontSize:'13px', fontWeight:'500', cursor:'pointer', opacity: generating ? 0.7 : 1 }}>
              {generating ? 'Generating...' : '⚡ Generate Merit List'}
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      {selectedCycle && (
        <div style={{ display:'flex', gap:'10px', marginBottom:'16px', flexWrap:'wrap' }}>
          {[
            { label:'All Groups', key:'group', options:[{v:'',l:'All Groups'},{v:'C',l:'Group C'},{v:'D',l:'Group D'}] },
            { label:'All Statuses', key:'status', options:[{v:'',l:'All Statuses'},{v:'submitted',l:'Submitted'},{v:'merit_generated',l:'Merit Generated'},{v:'approved',l:'Approved'},{v:'waitlisted',l:'Waitlisted'}] }
          ].map(f => (
            <select key={f.key} value={filters[f.key]} onChange={e => setFilters(x => ({...x,[f.key]:e.target.value}))}
              style={{ padding:'7px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'13px', background:'#fff' }}>
              {f.options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
            </select>
          ))}
        </div>
      )}

      {/* Table */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'auto' }}>
        {loading ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>Loading merit list...</div>
        ) : !selectedCycle ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>Select a transfer cycle to view the merit list.</div>
        ) : applications.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center', color:'#888780' }}>
            <p style={{ fontSize:'28px', marginBottom:'8px' }}>📊</p>
            <p style={{ fontWeight:'500', marginBottom:'4px' }}>No applications yet</p>
            <p style={{ fontSize:'13px' }}>Generate the merit list after the application window closes.</p>
          </div>
        ) : (
          <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'860px' }}>
            <thead><tr style={{ background:'#f9f8f5' }}>
              {['Rank','Employee','Group','Service','Score Breakdown','Preferred Postings','Status','Action'].map(h => (
                <th key={h} style={{ padding:'10px 14px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {applications.map((app, i) => (
                <tr key={app._id} style={{ borderTop:'1px solid #f1efe8', background: i%2===0 ? '#fff' : '#fafaf8' }}>
                  <td style={{ padding:'12px 14px', fontWeight:'700', color:'#534AB7', fontSize:'15px' }}>#{app.meritRank || '—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <p style={{ fontWeight:'500', color:'#2c2c2a', margin:'0 0 2px', fontSize:'13px' }}>{app.snapshot?.name || app.employee?.name}</p>
                    <p style={{ fontSize:'11px', color:'#888780', margin:0 }}>{app.snapshot?.employeeId || app.employee?.employeeId}</p>
                    <p style={{ fontSize:'11px', color:'#888780', margin:0 }}>{app.snapshot?.designation}</p>
                  </td>
                  <td style={{ padding:'12px 14px' }}><Badge type={app.snapshot?.group} label={`Group ${app.snapshot?.group}`} /></td>
                  <td style={{ padding:'12px 14px', fontSize:'12px', color:'#5F5E5A', whiteSpace:'nowrap' }}>{app.snapshot?.serviceYears ? `${Math.floor(app.snapshot.serviceYears)}y ${Math.round((app.snapshot.serviceYears % 1)*12)}m` : '—'}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ fontSize:'11px', lineHeight:1.8 }}>
                      <span style={{ color:'#534AB7', fontWeight:'600', fontSize:'15px' }}>{app.meritScore || '—'}</span>
                      {app.meritBreakdown && (
                        <div style={{ color:'#888780' }}>
                          Svc: {app.meritBreakdown.serviceYearsScore} · Join: {app.meritBreakdown.joiningDateScore} · DOB: {app.meritBreakdown.dobScore}
                        </div>
                      )}
                    </div>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    {app.preferences?.map(p => (
                      <div key={p.priority} style={{ fontSize:'11px', color:'#5F5E5A', marginBottom:'2px' }}>
                        <strong style={{ color:'#534AB7' }}>{p.priority}.</strong> {p.section || p.division}
                      </div>
                    ))}
                  </td>
                  <td style={{ padding:'12px 14px' }}><Badge type={app.status} label={app.status.replace(/_/g,' ')} /></td>
                  <td style={{ padding:'12px 14px' }}>
                    {['merit_generated','submitted'].includes(app.status) && (
                      <div style={{ display:'flex', gap:'6px', flexDirection:'column' }}>
                        <button onClick={() => { setModal({app, action:'approve'}); setApprovedPref(1); }}
                          style={{ padding:'5px 12px', background:'#3B6D11', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Approve</button>
                        <button onClick={() => setModal({app, action:'waitlist'})}
                          style={{ padding:'5px 12px', background:'#854F0B', color:'#fff', border:'none', borderRadius:'6px', fontSize:'12px', cursor:'pointer' }}>Waitlist</button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {modal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:'20px' }}>
          <div style={{ background:'#fff', borderRadius:'14px', padding:'28px', maxWidth:'440px', width:'100%', boxShadow:'0 20px 60px rgba(0,0,0,0.2)' }}>
            <h3 style={{ fontSize:'16px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 6px', textTransform:'capitalize' }}>{modal.action} Application</h3>
            <p style={{ fontSize:'13px', color:'#888780', marginBottom:'18px' }}>{modal.app.snapshot?.name} — {modal.app.applicationNumber}</p>
            {modal.action === 'approve' && (
              <div style={{ marginBottom:'14px' }}>
                <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>Approved Preference</label>
                <select value={approvedPref} onChange={e => setApprovedPref(parseInt(e.target.value))}
                  style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', background:'#fff' }}>
                  {modal.app.preferences?.map(p => (
                    <option key={p.priority} value={p.priority}>Priority {p.priority}: {p.section || p.division}</option>
                  ))}
                </select>
              </div>
            )}
            <div style={{ marginBottom:'18px' }}>
              <label style={{ display:'block', fontSize:'13px', fontWeight:'500', color:'#5F5E5A', marginBottom:'6px' }}>HR Note (optional)</label>
              <textarea value={hrNote} onChange={e => setHrNote(e.target.value)} rows={3}
                placeholder="Add a note visible to the employee..."
                style={{ width:'100%', padding:'9px 12px', border:'1.5px solid #D3D1C7', borderRadius:'8px', fontSize:'14px', resize:'vertical', boxSizing:'border-box' }} />
            </div>
            <div style={{ display:'flex', gap:'10px' }}>
              <button onClick={() => { setModal(null); setHrNote(''); }}
                style={{ flex:1, padding:'10px', border:'1.5px solid #D3D1C7', borderRadius:'8px', background:'#fff', color:'#5F5E5A', cursor:'pointer' }}>Cancel</button>
              <button onClick={processApp} disabled={processing}
                style={{ flex:2, padding:'10px', background: modal.action==='approve' ? '#3B6D11' : '#854F0B', color:'#fff', border:'none', borderRadius:'8px', fontWeight:'600', cursor:'pointer', opacity: processing ? 0.7 : 1, textTransform:'capitalize' }}>
                {processing ? 'Processing...' : `Confirm ${modal.action}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
