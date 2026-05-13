import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { lcApi } from '../api/lc.api';
import { STAGES, getRoleLabel } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import { format } from 'date-fns';

const StatCard = ({ label, value, color, bg, icon }) => (
  <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1rem 1.25rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <div>
      <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 28, fontWeight: 700, color }}>{value}</div>
    </div>
    <div style={{ width: 42, height: 42, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{icon}</div>
  </div>
);

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try {
        const [statsRes, lcRes] = await Promise.all([lcApi.getStats(), lcApi.getAll({ limit: 6 })]);
        setStats(statsRes.data);
        setRecent(lcRes.data.lcs);
      } catch {} finally { setLoading(false); }
    };
    load();
  }, []);

  const s = stats?.byStatus || {};

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700 }}>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user?.name?.split(' ')[0]} 👋</h1>
        <p style={{ color: 'var(--c-text3)', fontSize: 13, marginTop: 2 }}>{getRoleLabel(user?.role, user)} · {new Date().toDateString()}</p>
      </div>

      {loading ? <div style={{ color: 'var(--c-text3)' }}>Loading dashboard...</div> : (
        <>
          {/* Stat cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
            <StatCard label="Total LCs" value={(stats?.byStatus ? Object.values(s).reduce((a, b) => a + b, 0) : 0)} color="var(--c-primary)" bg="var(--c-primary-light)" icon="📋" />
            <StatCard label="Active" value={(s.INITIATED || 0) + (s.APPROVED || 0) + (s.JE_REVIEWED || 0) + (s.DELEGATED || 0) + (s.IN_PROGRESS || 0)} color="var(--c-warning)" bg="var(--c-warning-light)" icon="🔧" />
            <StatCard label="Released" value={s.RELEASED || 0} color="var(--c-success)" bg="var(--c-success-light)" icon="⚡" />
            <StatCard label="Pending Action" value={(s.CLOSE_REQUESTED || 0) + (s.APPROVED || 0)} color="var(--c-purple)" bg="#FDF4FF" icon="🔒" />
          </div>

          {/* Stage breakdown */}
          <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem', marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: '1rem' }}>LC Status Breakdown</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {STAGES.filter(st => s[st.key] > 0).map(stage => {
                const total = Object.values(s).reduce((a, b) => a + b, 0);
                const pct = total > 0 ? Math.round((s[stage.key] || 0) / total * 100) : 0;
                return (
                  <div key={stage.key}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                      <span>{stage.icon} {stage.label}</span>
                      <span style={{ fontWeight: 600 }}>{s[stage.key] || 0}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--c-surface2)' }}>
                      <div style={{ height: '100%', borderRadius: 3, background: stage.color, width: `${pct}%`, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent LCs */}
          <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h2 style={{ fontSize: 14, fontWeight: 600 }}>Recent Line Clears</h2>
              <Link to="/lc" style={{ fontSize: 12, color: 'var(--c-primary)' }}>View all →</Link>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {recent.map(lc => {
                const stage = STAGES.find(s => s.key === lc.status);
                return (
                  <Link to={`/lc/${lc._id}`} key={lc._id} style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    padding: '10px 12px', borderRadius: 8, background: 'var(--c-surface2)',
                    textDecoration: 'none', color: 'inherit',
                  }}>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600 }}>{lc.lcNumber}</div>
                      <div style={{ fontSize: 12, color: 'var(--c-text3)' }}>{lc.feeder}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 20, background: stage?.bg, color: stage?.color, fontWeight: 500 }}>{stage?.label}</span>
                      <span style={{ fontSize: 11, color: 'var(--c-text3)' }}>{lc.workType}</span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
