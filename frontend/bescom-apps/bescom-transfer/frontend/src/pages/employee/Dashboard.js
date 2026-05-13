import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { transferAPI, cycleAPI } from '../../services/api';
import { format, differenceInYears, differenceInMonths } from 'date-fns';
import Badge from '../../components/common/Badge';

const Stat = ({ label, value, sub, color = '#534AB7' }) => (
  <div style={{ background:'#fff', borderRadius:'12px', padding:'18px 20px', border:'1px solid #e8e6df' }}>
    <p style={{ fontSize:'12px', color:'#888780', marginBottom:'6px', textTransform:'uppercase', letterSpacing:'0.05em' }}>{label}</p>
    <p style={{ fontSize:'26px', fontWeight:'700', color, margin:'0 0 4px' }}>{value}</p>
    {sub && <p style={{ fontSize:'12px', color:'#888780' }}>{sub}</p>}
  </div>
);

export default function Dashboard() {
  const { user } = useAuth();
  const [applications, setApplications] = useState([]);
  const [activeCycle, setActiveCycle]   = useState(null);
  const [loading, setLoading]           = useState(true);

  useEffect(() => {
    Promise.all([
      transferAPI.getMyApplications(),
      cycleAPI.getActive().catch(() => ({ data: { cycle: null } }))
    ]).then(([appRes, cycleRes]) => {
      setApplications(appRes.data.applications || []);
      setActiveCycle(cycleRes.data.cycle || null);
    }).finally(() => setLoading(false));
  }, []);

  const postingSince  = user?.currentPosting?.postingSince;
  const serviceYears  = postingSince ? differenceInYears(new Date(), new Date(postingSince)) : 0;
  const serviceMonths = postingSince ? differenceInMonths(new Date(), new Date(postingSince)) % 12 : 0;
  const latestApp     = applications[0];

  if (loading) return <div style={{ textAlign:'center', padding:'60px', color:'#888780' }}>Loading dashboard...</div>;

  return (
    <div>
      {/* Welcome banner */}
      <div style={{ background:'linear-gradient(135deg,#534AB7,#3C3489)', borderRadius:'14px', padding:'28px 30px', color:'#fff', marginBottom:'24px' }}>
        <h1 style={{ fontSize:'22px', fontWeight:'700', margin:'0 0 6px' }}>Welcome, {user?.name}</h1>
        <p style={{ opacity:0.85, fontSize:'14px', margin:'0 0 14px' }}>
          {user?.designation} · Group {user?.group} · {user?.employeeId}
        </p>
        <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', fontSize:'13px', opacity:0.9 }}>
          <span>📍 {user?.currentPosting?.section || '—'}, {user?.currentPosting?.division || '—'}</span>
          <span>⏱ {serviceYears}y {serviceMonths}m at current posting</span>
          <span>📅 Joined: {user?.joiningDate ? format(new Date(user.joiningDate), 'dd MMM yyyy') : '—'}</span>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:'14px', marginBottom:'24px' }}>
        <Stat label="Total Applications" value={applications.length} sub="Across all cycles" />
        <Stat label="Service at Posting"  value={`${serviceYears}y ${serviceMonths}m`} sub="Current location" color="#0F6E56" />
        <Stat label="Latest Status"
          value={latestApp ? latestApp.status.replace(/_/g,' ') : '—'}
          sub={latestApp ? latestApp.applicationNumber : 'No applications yet'}
          color="#854F0B" />
        <Stat label="Active Cycle"
          value={activeCycle ? 'Open' : 'None'}
          sub={activeCycle?.name || 'No active transfer cycle'}
          color={activeCycle ? '#3B6D11' : '#888780'} />
      </div>

      {/* Active cycle apply banner */}
      {activeCycle && activeCycle.status === 'application_open' && !latestApp && (
        <div style={{ background:'#EAF3DE', border:'1px solid #97C459', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:'12px' }}>
          <div>
            <p style={{ fontWeight:'600', color:'#27500A', margin:'0 0 4px' }}>
              Transfer window is open — {activeCycle.name}
            </p>
            <p style={{ fontSize:'13px', color:'#3B6D11', margin:0 }}>
              Window closes: {format(new Date(activeCycle.applicationEndDate), 'dd MMM yyyy')}
            </p>
          </div>
          <Link to="/apply" style={{ background:'#3B6D11', color:'#fff', padding:'9px 20px', borderRadius:'8px', fontSize:'14px', fontWeight:'500', textDecoration:'none' }}>
            Apply Now →
          </Link>
        </div>
      )}

      {/* Already applied notice */}
      {activeCycle && activeCycle.status === 'application_open' && latestApp && (
        <div style={{ background:'#E6F1FB', border:'1px solid #85B7EB', borderRadius:'12px', padding:'14px 18px', marginBottom:'24px', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <p style={{ fontSize:'13px', color:'#0C447C', margin:0 }}>
            ✅ You have applied in the current cycle — <strong>{latestApp.applicationNumber}</strong>
          </p>
          <Link to={`/application/${latestApp._id}`} style={{ fontSize:'13px', color:'#0C447C', fontWeight:'500' }}>Track →</Link>
        </div>
      )}

      {/* Applications table */}
      <div style={{ background:'#fff', borderRadius:'14px', border:'1px solid #e8e6df', overflow:'hidden' }}>
        <div style={{ padding:'18px 20px', borderBottom:'1px solid #f1efe8', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <h2 style={{ fontSize:'16px', fontWeight:'600', color:'#2c2c2a', margin:0 }}>My Applications</h2>
          <Link to="/my-applications" style={{ fontSize:'13px', color:'#534AB7', fontWeight:'500' }}>View all →</Link>
        </div>
        {applications.length === 0 ? (
          <div style={{ padding:'48px', textAlign:'center', color:'#888780' }}>
            <p style={{ fontSize:'36px', marginBottom:'10px' }}>📋</p>
            <p style={{ fontWeight:'500', color:'#2c2c2a', marginBottom:'6px' }}>No applications yet</p>
            <p style={{ fontSize:'13px' }}>When a transfer cycle opens, you can apply here.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', minWidth:'600px' }}>
              <thead>
                <tr style={{ background:'#f9f8f5' }}>
                  {['Application No.','Cycle','Submitted','Merit Score','Rank','Status'].map(h => (
                    <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontSize:'12px', fontWeight:'600', color:'#888780', textTransform:'uppercase', letterSpacing:'0.04em', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {applications.map((app, i) => (
                  <tr key={app._id} style={{ borderTop:'1px solid #f1efe8', background: i % 2 === 0 ? '#fff' : '#fafaf8' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <Link to={`/application/${app._id}`} style={{ color:'#534AB7', fontWeight:'500', fontSize:'14px' }}>
                        {app.applicationNumber}
                      </Link>
                    </td>
                    <td style={{ padding:'12px 16px', fontSize:'13px', color:'#5F5E5A' }}>{app.cycle?.name || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:'13px', color:'#5F5E5A', whiteSpace:'nowrap' }}>{format(new Date(app.createdAt), 'dd MMM yyyy')}</td>
                    <td style={{ padding:'12px 16px', fontWeight:'600', color:'#534AB7' }}>{app.meritScore || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:'13px', color:'#5F5E5A' }}>#{app.meritRank || '—'}</td>
                    <td style={{ padding:'12px 16px' }}><Badge type={app.status} label={app.status.replace(/_/g,' ')} /></td>
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
