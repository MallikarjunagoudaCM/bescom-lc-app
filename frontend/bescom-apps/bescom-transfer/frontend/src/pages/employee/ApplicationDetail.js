import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { transferAPI } from '../../services/api';
import { format } from 'date-fns';
import Badge from '../../components/common/Badge';

const STATUS_STEPS = ['submitted','under_review','merit_generated','approval_in_progress','approved'];

export default function ApplicationDetail() {
  const { id } = useParams();
  const [app, setApp] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    transferAPI.getById(id).then(res => setApp(res.data.application)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading...</div>;
  if (!app) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Application not found.</div>;

  const currentStep = STATUS_STEPS.indexOf(app.status);

  return (
    <div style={{ maxWidth:'760px', margin:'0 auto' }}>
      <div style={{ display:'flex', alignItems:'center', gap:'12px', marginBottom:'20px' }}>
        <Link to="/my-applications" style={{ color:'#534AB7', fontSize:'14px' }}>← Back</Link>
        <h1 style={{ fontSize:'20px', fontWeight:'700', color:'#2c2c2a', margin:0 }}>{app.applicationNumber}</h1>
        <Badge type={app.status} label={app.status.replace(/_/g,' ')} />
      </div>

      {/* Status timeline */}
      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'20px', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', marginBottom:'18px' }}>Application Timeline</h3>
        <div style={{ display:'flex', gap:'0', position:'relative' }}>
          {STATUS_STEPS.map((step, i) => {
            const done = i <= currentStep;
            const active = i === currentStep;
            const label = step.replace(/_/g,' ');
            return (
              <div key={step} style={{ flex:1, textAlign:'center', position:'relative' }}>
                {i < STATUS_STEPS.length - 1 && (
                  <div style={{ position:'absolute', top:'13px', left:'50%', width:'100%', height:'2px', background: i < currentStep ? '#534AB7' : '#D3D1C7', zIndex:0 }} />
                )}
                <div style={{ width:'26px', height:'26px', borderRadius:'50%', background: done ? '#534AB7' : '#D3D1C7', color:'#fff', display:'inline-flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', position:'relative', zIndex:1, border: active ? '3px solid #AFA9EC' : 'none', boxSizing:'border-box' }}>
                  {done && !active ? '✓' : i+1}
                </div>
                <p style={{ fontSize:'11px', color: done ? '#534AB7' : '#B4B2A9', marginTop:'6px', fontWeight: active ? '600' : '400', lineHeight:1.3 }}>{label}</p>
              </div>
            );
          })}
        </div>
        {/* History log */}
        {app.statusHistory?.length > 0 && (
          <div style={{ marginTop:'20px', borderTop:'1px solid #f1efe8', paddingTop:'14px' }}>
            {app.statusHistory.map((h, i) => (
              <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'8px', alignItems:'flex-start' }}>
                <div style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#534AB7', marginTop:'5px', flexShrink:0 }} />
                <div>
                  <span style={{ fontSize:'13px', fontWeight:'500', color:'#2c2c2a', textTransform:'capitalize' }}>{h.status.replace(/_/g,' ')}</span>
                  {h.note && <span style={{ fontSize:'12px', color:'#888780' }}> — {h.note}</span>}
                  <p style={{ fontSize:'11px', color:'#B4B2A9', margin:'2px 0 0' }}>{format(new Date(h.timestamp), 'dd MMM yyyy, hh:mm a')}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Merit score */}
      {app.meritScore > 0 && (
        <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'20px', marginBottom:'16px' }}>
          <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', marginBottom:'14px' }}>Merit Score Breakdown</h3>
          <div style={{ display:'flex', alignItems:'center', gap:'20px', flexWrap:'wrap' }}>
            <div style={{ textAlign:'center' }}>
              <p style={{ fontSize:'36px', fontWeight:'700', color:'#534AB7', margin:0 }}>{app.meritScore}</p>
              <p style={{ fontSize:'12px', color:'#888780' }}>Total / 100</p>
            </div>
            <div style={{ flex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px' }}>
              {[
                ['Service Years (50%)', app.meritBreakdown?.serviceYearsScore, '#534AB7'],
                ['Joining Date (30%)', app.meritBreakdown?.joiningDateScore, '#0F6E56'],
                ['Date of Birth (20%)', app.meritBreakdown?.dobScore, '#854F0B'],
                ['Merit Rank', `#${app.meritRank || '—'}`, '#A32D2D']
              ].map(([l, v, c]) => (
                <div key={l} style={{ background:'#f9f8f5', borderRadius:'8px', padding:'10px 14px' }}>
                  <p style={{ fontSize:'11px', color:'#888780', marginBottom:'3px' }}>{l}</p>
                  <p style={{ fontSize:'16px', fontWeight:'600', color: c, margin:0 }}>{v}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Preferences */}
      <div style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'20px', marginBottom:'16px' }}>
        <h3 style={{ fontSize:'14px', fontWeight:'600', color:'#2c2c2a', marginBottom:'14px' }}>Preferred Postings</h3>
        {app.preferences?.map(p => (
          <div key={p.priority} style={{ display:'flex', gap:'12px', padding:'12px 14px', borderRadius:'8px', background: app.approvedPreference === p.priority ? '#EAF3DE' : '#f9f8f5', marginBottom:'8px', border: app.approvedPreference === p.priority ? '1px solid #97C459' : '1px solid transparent' }}>
            <div style={{ width:'28px', height:'28px', borderRadius:'50%', background: app.approvedPreference === p.priority ? '#3B6D11' : '#534AB7', color:'#fff', display:'flex', alignItems:'center', justifyContent:'center', fontSize:'12px', fontWeight:'700', flexShrink:0 }}>{p.priority}</div>
            <div>
              <p style={{ fontWeight:'500', color:'#2c2c2a', margin:'0 0 2px', fontSize:'14px' }}>{p.section || p.subDivision || p.division}</p>
              <p style={{ fontSize:'12px', color:'#888780', margin:0 }}>{[p.division, p.circle, p.zone].filter(Boolean).join(' · ')}</p>
              {app.approvedPreference === p.priority && <p style={{ fontSize:'12px', color:'#27500A', fontWeight:'500', marginTop:'4px' }}>✓ Transfer approved to this posting</p>}
            </div>
          </div>
        ))}
      </div>

      {/* HR Note */}
      {app.hrNote && (
        <div style={{ background:'#FAEEDA', borderRadius:'12px', padding:'16px 20px' }}>
          <p style={{ fontSize:'13px', fontWeight:'600', color:'#633806', marginBottom:'4px' }}>HR Note</p>
          <p style={{ fontSize:'13px', color:'#854F0B', margin:0 }}>{app.hrNote}</p>
        </div>
      )}
    </div>
  );
}
