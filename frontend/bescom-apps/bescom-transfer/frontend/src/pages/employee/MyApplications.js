import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { transferAPI } from '../../services/api';
import { format } from 'date-fns';
import Badge from '../../components/common/Badge';

export default function MyApplications() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transferAPI.getMyApplications().then(r => setApps(r.data.applications||[])).finally(()=>setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <div>
          <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>My Applications</h1>
          <p style={{ color:'#888780', fontSize:'14px' }}>{apps.length} application{apps.length!==1?'s':''} submitted</p>
        </div>
        <Link to="/apply" style={{ background:'#534AB7', color:'#fff', padding:'9px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', textDecoration:'none' }}>
          + New Application
        </Link>
      </div>

      {apps.length === 0 ? (
        <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'60px', textAlign:'center' }}>
          <p style={{ fontSize:'40px', marginBottom:'12px' }}>📋</p>
          <p style={{ fontWeight:'600', color:'#2c2c2a', margin:'0 0 6px' }}>No applications yet</p>
          <p style={{ fontSize:'13px', color:'#888780', marginBottom:'20px' }}>When a transfer cycle opens, apply from the Apply page.</p>
          <Link to="/apply" style={{ background:'#534AB7', color:'#fff', padding:'10px 24px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', textDecoration:'none' }}>Apply for Transfer</Link>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {apps.map(app => (
            <div key={app._id} style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', padding:'20px 24px' }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:'10px' }}>
                <div>
                  <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'6px' }}>
                    <Link to={`/application/${app._id}`} style={{ fontSize:'16px', fontWeight:'600', color:'#534AB7', textDecoration:'none' }}>{app.applicationNumber}</Link>
                    <Badge type={app.status} label={app.status.replace(/_/g,' ')} />
                  </div>
                  <p style={{ fontSize:'13px', color:'#888780', margin:'0 0 10px' }}>
                    {app.cycle?.name} · Submitted {format(new Date(app.createdAt),'dd MMM yyyy')}
                  </p>
                  <div style={{ display:'flex', gap:'16px', fontSize:'13px', color:'#5F5E5A', flexWrap:'wrap' }}>
                    {app.meritScore > 0 && <span>🏆 Merit Score: <strong style={{ color:'#534AB7' }}>{app.meritScore}/100</strong></span>}
                    {app.meritRank   && <span>📊 Rank: <strong>#{app.meritRank}</strong></span>}
                    {app.approvedPosting?.division && <span>✅ Approved: <strong>{app.approvedPosting.division}</strong></span>}
                  </div>
                  <div style={{ marginTop:'10px', display:'flex', gap:'6px', flexWrap:'wrap' }}>
                    {app.preferences?.map(p => (
                      <span key={p.priority} style={{ padding:'2px 10px', background:'#f1efe8', borderRadius:'20px', fontSize:'12px', color:'#5F5E5A' }}>
                        P{p.priority}: {p.section || p.division}
                      </span>
                    ))}
                  </div>
                </div>
                <Link to={`/application/${app._id}`}
                  style={{ padding:'8px 18px', border:'1.5px solid #534AB7', borderRadius:'8px', color:'#534AB7', fontSize:'13px', fontWeight:'500', textDecoration:'none', whiteSpace:'nowrap' }}>
                  View Details →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
