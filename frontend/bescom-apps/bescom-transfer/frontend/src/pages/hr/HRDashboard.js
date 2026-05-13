import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { hrAPI } from '../../services/api';
import { format } from 'date-fns';

const Stat = ({ label, value, color='#534AB7', sub }) => (
  <div style={{ background:'#fff', borderRadius:'12px', padding:'18px 20px', border:'1px solid #e8e6df' }}>
    <p style={{ fontSize:'12px', color:'#888780', marginBottom:'4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
    <p style={{ fontSize:'28px', fontWeight:'700', color, margin:'0 0 4px' }}>{value}</p>
    {sub && <p style={{ fontSize:'12px', color:'#888780' }}>{sub}</p>}
  </div>
);

export default function HRDashboard() {
  const [stats, setStats] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([hrAPI.getDashboard(), hrAPI.getCycles()])
      .then(([sRes, cRes]) => { setStats(sRes.data.stats); setCycles(cRes.data.cycles || []); })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading...</div>;

  return (
    <div>
      <div style={{ marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'700', color:'#2c2c2a', margin:'0 0 4px' }}>HR Dashboard</h1>
        <p style={{ color:'#888780', fontSize:'14px' }}>Manage transfer cycles, merit lists and approvals.</p>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'14px', marginBottom:'24px' }}>
        <Stat label="Active Cycle" value={stats?.activeCycle ? 'Open' : 'None'} color={stats?.activeCycle ? '#3B6D11' : '#888780'} sub={stats?.activeCycle?.name || 'No active cycle'} />
        <Stat label="Total Applications" value={stats?.totalApplications ?? '—'} />
        <Stat label="Approved" value={stats?.approved ?? '—'} color="#3B6D11" />
        <Stat label="Pending" value={stats?.pending ?? '—'} color="#854F0B" />
        <Stat label="Waitlisted" value={stats?.waitlisted ?? '—'} color="#A32D2D" />
        <Stat label="Vacancies" value={stats?.totalVacancies ?? '—'} color="#0F6E56" sub={stats?.filledVacancies != null ? `${stats.filledVacancies} filled` : ''} />
      </div>

      {/* Quick actions */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:'14px', marginBottom:'24px' }}>
        {[
          { to:'/hr/cycles', label:'Manage Cycles', icon:'🔄', desc:'Create and manage transfer cycles' },
          { to:'/hr/merit-list', label:'Merit List', icon:'📊', desc:'View and process merit rankings' },
          { to:'/hr/vacancies', label:'View Vacancies', icon:'📋', desc:'See all submitted vacancies' }
        ].map(a => (
          <Link key={a.to} to={a.to} style={{ background:'#fff', borderRadius:'12px', border:'1px solid #e8e6df', padding:'20px', textDecoration:'none', transition:'border-color 0.15s', display:'block' }}
            onMouseEnter={e => e.currentTarget.style.borderColor='#534AB7'}
            onMouseLeave={e => e.currentTarget.style.borderColor='#e8e6df'}>
            <p style={{ fontSize:'24px', marginBottom:'8px' }}>{a.icon}</p>
            <p style={{ fontWeight:'600', color:'#2c2c2a', margin:'0 0 4px' }}>{a.label}</p>
            <p style={{ fontSize:'13px', color:'#888780', margin:0 }}>{a.desc}</p>
          </Link>
        ))}
      </div>

      {/* Cycles table */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'hidden' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1efe8', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:'16px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>Transfer Cycles</h2>
          <Link to="/hr/cycles/new" style={{ background:'#534AB7', color:'#fff', padding:'8px 18px', borderRadius:'8px', fontSize:'13px', fontWeight:'500', textDecoration:'none' }}>+ New Cycle</Link>
        </div>
        <table style={{ width:'100%', borderCollapse:'collapse' }}>
          <thead><tr style={{ background:'#f9f8f5' }}>
            {['Name','FY','Status','App. Window','Actions'].map(h => (
              <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase' }}>{h}</th>
            ))}
          </tr></thead>
          <tbody>
            {cycles.length === 0 && <tr><td colSpan={5} style={{ padding:'30px', textAlign:'center', color:'#888780' }}>No cycles yet. Create one to get started.</td></tr>}
            {cycles.map((c, i) => (
              <tr key={c._id} style={{ borderTop:'1px solid #f1efe8', background: i%2===0 ? '#fff' : '#fafaf8' }}>
                <td style={{ padding:'12px 16px', fontWeight:'500', color:'#2c2c2a' }}>{c.name}</td>
                <td style={{ padding:'12px 16px', fontSize:'13px', color:'#5F5E5A' }}>{c.financialYear}</td>
                <td style={{ padding:'12px 16px' }}>
                  <span style={{ padding:'3px 10px', borderRadius:'20px', fontSize:'12px', fontWeight:'500', background: c.status==='application_open'?'#EAF3DE': c.status==='completed'?'#F1EFE8':'#FAEEDA', color: c.status==='application_open'?'#27500A': c.status==='completed'?'#5F5E5A':'#633806' }}>
                    {c.status.replace(/_/g,' ')}
                  </span>
                </td>
                <td style={{ padding:'12px 16px', fontSize:'13px', color:'#5F5E5A' }}>
                  {format(new Date(c.applicationStartDate),'dd MMM')} – {format(new Date(c.applicationEndDate),'dd MMM yyyy')}
                </td>
                <td style={{ padding:'12px 16px' }}>
                  <Link to={`/hr/cycles/${c._id}`} style={{ color:'#534AB7', fontSize:'13px', fontWeight:'500' }}>Manage →</Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
