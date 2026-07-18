import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { lcApi } from '../api/lc.api';
import { userApi } from '../api/user.api';
import { STAGES, FEEDERS, canPerformAction } from '../utils/constants';
import { useAuth } from '../contexts/AuthContext';
import LCFormModal from '../components/lc/LCFormModal';
import toast from 'react-hot-toast';

const Badge = ({ status }) => {
  const stage = STAGES.find(s => s.key === status);
  return (
    <span style={{ fontSize: 11, padding: '3px 8px', borderRadius: 20, background: stage?.bg || '#f3f4f6', color: stage?.color || '#374151', fontWeight: 500, whiteSpace: 'nowrap' }}>
      {stage?.icon} {stage?.label}
    </span>
  );
};

export default function LCListPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lcs, setLcs] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('UNPLANNED');
  const [filters, setFilters] = useState({ status: '', workType: '', page: 1 });
  const [feederOptions, setFeederOptions] = useState([]);
  const [stationFeeders, setStationFeeders] = useState({});
  const [stationFeedersLoaded, setStationFeedersLoaded] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const params = { limit: 15, ...filters };
      Object.keys(params).forEach(k => !params[k] && delete params[k]);
      const { data } = await lcApi.getAll(params);
      setLcs(data.lcs);
      setTotal(data.total);
    } catch {} finally { setLoading(false); }
  };

  const loadKptclStations = async () => {
    try {
      const { data } = await userApi.getKptclStations();
      setStationFeeders(data.stationFeeders || {});
    } catch {
      setStationFeeders({});
    } finally {
      setStationFeedersLoaded(true);
    }
  };

  useEffect(() => { load(); }, [filters]);

  useEffect(() => {
    const loadFeederOptions = () => {
      if (!user) return;

      if (Array.isArray(user.feeders) && user.feeders.length) {
        setFeederOptions(user.feeders);
        return;
      }

      setFeederOptions(FEEDERS);
    };

    loadFeederOptions();
    if (user) loadKptclStations();
  }, [user]);

  const handleCreate = async (formData) => {
    try {
      const { data } = await lcApi.create({ ...formData, workType: formType });
      toast.success(`Request ${data?.lc?.requestNumber || data?.lc?.lcNumber || 'submitted'} created!`);
      setShowForm(false);
      navigate(`/lc/${data.lc._id}`);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Unable to create LC request');
    }
  };

  // Keep `feederOptions` state for linemen mapped through their AE
  const effectiveFeederOptions = Array.isArray(feederOptions) && feederOptions.length ? feederOptions : FEEDERS;
  const formDefaults = {
    station: user?.station || '',
    section: user?.section || '',
    feeder: '',
  };

  const sel = { padding: '8px 12px', borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 13, background: 'var(--c-surface)', color: 'var(--c-text)', cursor: 'pointer' };

  return (
    <div style={{ padding: '1.5rem', maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.25rem', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 20, fontWeight: 700 }}>Line Clear Requests</h1>
          <p style={{ color: 'var(--c-text3)', fontSize: 13, marginTop: 2 }}>{total} total records</p>
        </div>
        {canPerformAction(user?.role, 'createLC') && (
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setFormType('UNPLANNED'); setShowForm(true); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--c-primary)', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
              + Unplanned LC
            </button>
            <button onClick={() => { setFormType('PLANNED'); setShowForm(true); }} style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid var(--c-border)', background: 'var(--c-surface)', fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
              + Planned LC
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: '1rem', flexWrap: 'wrap' }}>
        <select value={filters.status} onChange={e => setFilters(f => ({ ...f, status: e.target.value, page: 1 }))} style={sel}>
          <option value="">All statuses</option>
          {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <select value={filters.workType} onChange={e => setFilters(f => ({ ...f, workType: e.target.value, page: 1 }))} style={sel}>
          <option value="">All types</option>
          <option value="UNPLANNED">Unplanned</option>
          <option value="PLANNED">Planned</option>
        </select>
        <button onClick={() => setFilters({ status: '', workType: '', page: 1 })} style={{ ...sel, background: 'none', color: 'var(--c-text3)' }}>
          Clear
        </button>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--c-text3)' }}>Loading...</div>
        ) : lcs.length === 0 ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: 'var(--c-text3)' }}>No records found</div>
        ) : (
          <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
            <table style={{ width: '100%', minWidth: 760, borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--c-surface2)', borderBottom: '1px solid var(--c-border)' }}>
                  {['LC Number', 'Feeder', 'Nature of Work', 'Type', 'Status', 'Initiated', ''].map(h => (
                    <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--c-text3)', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lcs.map((lc, i) => (
                  <tr key={lc._id} style={{ borderBottom: i < lcs.length - 1 ? '1px solid var(--c-border)' : 'none' }}>
                    <td style={{ padding: '12px 14px' }}>
                      <div style={{ fontWeight: 600, fontSize: 13, fontFamily: 'monospace' }}>{lc.lcNumber || lc.requestNumber}</div>
                      {lc.requestNumber && lc.lcNumber && (
                        <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>REQ: {lc.requestNumber}</div>
                      )}
                      <div style={{ fontSize: 11, color: 'var(--c-text3)' }}>{lc.initiatedBy?.name}</div>
                    </td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{lc.feeder}</td>
                    <td style={{ padding: '12px 14px', fontSize: 13 }}>{lc.natureOfWork}</td>
                    <td style={{ padding: '12px 14px' }}>
                      <span style={{ fontSize: 11, padding: '2px 7px', borderRadius: 4, background: lc.workType === 'PLANNED' ? 'var(--c-primary-light)' : '#FFF7ED', color: lc.workType === 'PLANNED' ? 'var(--c-primary)' : 'var(--c-warning)', fontWeight: 500 }}>
                        {lc.workType}
                      </span>
                    </td>
                    <td style={{ padding: '12px 14px' }}><Badge status={lc.status} /></td>
                    <td style={{ padding: '12px 14px', fontSize: 12, color: 'var(--c-text3)' }}>
                      {new Date(lc.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ padding: '12px 14px' }}>
                      <Link to={`/lc/${lc._id}`} style={{ fontSize: 12, color: 'var(--c-primary)', fontWeight: 500 }}>View →</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {total > 15 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button onClick={() => setFilters(f => ({ ...f, page: f.page - 1 }))} disabled={filters.page === 1}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-surface)', cursor: 'pointer', fontSize: 13 }}>
            ← Prev
          </button>
          <span style={{ padding: '6px 12px', fontSize: 13, color: 'var(--c-text3)' }}>Page {filters.page}</span>
          <button onClick={() => setFilters(f => ({ ...f, page: f.page + 1 }))} disabled={lcs.length < 15}
            style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'var(--c-surface)', cursor: 'pointer', fontSize: 13 }}>
            Next →
          </button>
        </div>
      )}

      {showForm && <LCFormModal workType={formType} onSubmit={handleCreate} onClose={() => setShowForm(false)} initialValues={formDefaults} feederOptions={effectiveFeederOptions} stationFeeders={stationFeeders} stationFeedersLoaded={stationFeedersLoaded} />}
    </div>
  );
}
