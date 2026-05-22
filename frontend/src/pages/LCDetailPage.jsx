import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { lcApi } from '../api/lc.api';
import { userApi } from '../api/user.api';
import { useAuth } from '../contexts/AuthContext';
import { STAGES, getRoleLabel, canPerformAction } from '../utils/constants';
import PhotoUpload from '../components/lc/PhotoUpload';
import toast from 'react-hot-toast';

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 13, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' };

const Badge = ({ status }) => {
  const stage = STAGES.find(s => s.key === status);
  return <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: stage?.bg || '#f3f4f6', color: stage?.color || '#374151', fontWeight: 500 }}>{stage?.icon} {stage?.label}</span>;
};

const Section = ({ title, children }) => (
  <div style={{ background: 'var(--c-surface2)', borderRadius: 10, padding: '1rem 1.25rem', marginTop: 12 }}>
    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>{title}</div>
    {children}
  </div>
);

const ActionBtn = ({ label, onClick, color = 'var(--c-primary)', loading }) => (
  <button onClick={onClick} disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: loading ? 'var(--c-text3)' : color, color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', marginTop: 8 }}>
    {loading ? 'Processing...' : label}
  </button>
);

export default function LCDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [lc, setLc] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [linemen, setLinemen] = useState([]);
  const [secretCode, setSecretCode] = useState(null); // shown once on JE review
  const [form, setForm] = useState({});
  const [pinChecking, setPinChecking] = useState(false);
  const [releaseChecking, setReleaseChecking] = useState(false);
  const [energizeReadiness, setEnergizeReadiness] = useState({ loading: false, canEnergize: false, pendingCount: 0, pendingLcs: [], reason: '' });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const shouldCheck = canPerformAction(user?.role, 'energizeFeeder') && lc?.status === 'RELEASED';
    if (!shouldCheck) {
      setEnergizeReadiness({ loading: false, canEnergize: false, pendingCount: 0, pendingLcs: [], reason: '' });
      return;
    }

    let active = true;
    const loadReadiness = async () => {
      try {
        setEnergizeReadiness(s => ({ ...s, loading: true }));
        const { data } = await lcApi.getEnergizeReadiness(id);
        if (!active) return;
        setEnergizeReadiness({
          loading: false,
          canEnergize: !!data.canEnergize,
          pendingCount: data.pendingCount || 0,
          pendingLcs: data.pendingLcs || [],
          reason: data.reason || '',
        });
      } catch {
        if (!active) return;
        setEnergizeReadiness({ loading: false, canEnergize: false, pendingCount: 0, pendingLcs: [], reason: 'Unable to verify feeder readiness' });
      }
    };

    loadReadiness();
    return () => { active = false; };
  }, [id, lc?.status, user?.role]);

  const load = async () => {
    try {
      const { data } = await lcApi.getById(id);
      setLc(data.lc);
    } catch { navigate('/lc'); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [id]);

  useEffect(() => {
    if (canPerformAction(user?.role, 'delegate')) {
      userApi.getLinemen().then(r => setLinemen(r.data.users)).catch(() => {});
    }
  }, [user]);

  const act = async (action, data = {}) => {
    setActing(true);
    try {
      let res;
      switch (action) {
        case 'approve': res = await lcApi.approve(id, data); break;
        case 'approveEE': res = await lcApi.approveEE(id, data); break;
        case 'reject': res = await lcApi.reject(id, data); break;
        case 'jeReview':
          res = await lcApi.jeReview(id, data);
          if (res.data.secretCode) setSecretCode(res.data.secretCode);
          break;
        case 'delegate': res = await lcApi.delegate(id, data); break;
        case 'startWork': res = await lcApi.startWork(id, data); break;
        case 'completeWork': res = await lcApi.completeWork(id, data); break;
        case 'closeRequest': res = await lcApi.closeRequest(id, data); break;
        case 'release': res = await lcApi.release(id, data); break;
        case 'energizeFeeder': res = await lcApi.energizeFeeder(id, data); break;
      }
      toast.success(res.data.message);
      setLc(res.data.lc);
      setForm({});
    } catch {} finally { setActing(false); }
  };

  const reloadPhotos = async () => {
    const { data } = await lcApi.getById(id);
    setLc(data.lc);
  };

  const validatePin = async () => {
    if (!form.callConfirmed) return toast.error('Please confirm the call with Section Officer before validating PIN');
    if (!form.approvalPin || form.approvalPin.length !== 4) return toast.error("Enter the 4-digit Section Officer's Approval PIN");
    try {
      setPinChecking(true);
      await lcApi.validatePin(id, { approvalPin: form.approvalPin });
      toast.success("PIN is valid");
      set('pinValid', true);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Invalid PIN');
      set('pinValid', false);
    } finally {
      setPinChecking(false);
    }
  };

  const validateReleaseCode = async () => {
    if (!form.releaseConfirmed) return toast.error('Please confirm with Section officer before validating PIN');
    if (!form.releaseCode || form.releaseCode.length !== 4) return toast.error('Enter the 4-digit secret code');
    try {
      setReleaseChecking(true);
      await lcApi.validateReleaseCode(id, { secretCode: form.releaseCode });
      toast.success('PIN is valid');
      set('releaseCodeValid', true);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Invalid PIN');
      set('releaseCodeValid', false);
    } finally {
      setReleaseChecking(false);
    }
  };

  const validateSecretCode = async () => {
    if (!form.secretCode || form.secretCode.length !== 4) return toast.error('Enter 4-digit secret code');
    try {
      setPinChecking(true);
      await lcApi.validateSecretCode(id, { secretCode: form.secretCode });
      toast.success('Secret code is valid');
      set('secretCodeValid', true);
    } catch (err) {
      toast.error(err?.response?.data?.error || 'Invalid secret code');
      set('secretCodeValid', false);
    } finally {
      setPinChecking(false);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--c-text3)' }}>Loading...</div>;
  if (!lc) return null;

  const role = user?.role;
  const status = lc.status;
  const stageIdx = STAGES.findIndex(s => s.key === status);

  return (
    <div style={{ padding: '1.5rem', maxWidth: 880, margin: '0 auto' }}>
      {/* Back */}
      <button onClick={() => navigate('/lc')} style={{ background: 'none', border: 'none', color: 'var(--c-text3)', fontSize: 13, cursor: 'pointer', marginBottom: 12 }}>← Back to list</button>

      {/* Header */}
      <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem 1.5rem', marginBottom: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
              <span style={{ fontFamily: 'monospace', fontSize: 13, fontWeight: 700, color: 'var(--c-primary)' }}>{lc.lcNumber}</span>
              <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 4, background: lc.workType === 'PLANNED' ? 'var(--c-primary-light)' : '#FFF7ED', color: lc.workType === 'PLANNED' ? 'var(--c-primary)' : 'var(--c-warning)', fontWeight: 500 }}>{lc.workType}</span>
              {lc.workCompletedAt && status === 'IN_PROGRESS' ? (
                <span style={{ fontSize: 12, padding: '4px 10px', borderRadius: 20, background: '#DBEAFE', color: '#1E40AF', fontWeight: 600 }}>✅ Work Completed - LC to be Returned</span>
              ) : (
                <Badge status={status} />
              )}
            </div>
            <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 2 }}>{lc.feeder}</h1>
            <p style={{ color: 'var(--c-text3)', fontSize: 13 }}>{lc.natureOfWork} · {lc.estimatedDuration}h estimated</p>
          </div>
        </div>

        {/* Progress */}
        <div style={{ display: 'flex', gap: 4, marginTop: 16, flexWrap: 'wrap' }}>
          {STAGES.filter(s => s.key !== 'REJECTED').map((s, i, arr) => {
            const done = STAGES.findIndex(x => x.key === status) >= i;
            return (
              <div key={s.key} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <div title={s.label} style={{ width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, background: done ? 'var(--c-primary)' : 'var(--c-surface2)', color: done ? '#fff' : 'var(--c-text3)', border: `1px solid ${done ? 'var(--c-primary)' : 'var(--c-border)'}`, transition: 'all 0.3s' }}>
                  {i + 1}
                </div>
                {i < arr.length - 1 && <div style={{ width: 24, height: 2, background: done && i < stageIdx ? 'var(--c-primary)' : 'var(--c-border)' }} />}
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 360px', gap: 16, alignItems: 'start' }}>
        {/* Left: Details + Log — rendered second on mobile so Actions appear first */}
        <div style={{ order: isMobile ? 2 : 1 }}>
          {/* LC Details */}
          <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem' }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Request Details</h2>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 24px' }}>
              {[
                ['Initiated by', lc.initiatedBy?.name || '—'],
                ['Phone', lc.initiatedBy?.phone || '—'],
                ['Section', lc.section || '—'],
                ['Substation', lc.substation || '—'],
                ['Duration', `${lc.estimatedDuration} hrs (est.)${lc.actualDuration ? ` | ${lc.actualDuration} hrs (actual)` : ''}`],
                ['Created', new Date(lc.createdAt).toLocaleString('en-IN')],
                ...(lc.plannedStartAt ? [['Planned Start', new Date(lc.plannedStartAt).toLocaleString('en-IN')]] : []),
                ...(lc.assignedLineman ? [['Assigned To', `${lc.assignedLineman.name} (${lc.assignedLineman.phone})`]] : []),
                ...(lc.releasedAt ? [['Released At', new Date(lc.releasedAt).toLocaleString('en-IN')]] : []),
              ].map(([k, v]) => (
                <div key={k}>
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 1 }}>{k}</div>
                  <div style={{ fontSize: 13, fontWeight: 500 }}>{v}</div>
                </div>
              ))}
            </div>
              {lc.approvalPin && user?._id === lc.initiatedBy?._id?.toString() && (
                <div style={{ marginTop: 12, padding: '12px', background: '#EFF6FF', borderRadius: 10, border: '1px solid #BFDBFE', fontSize: 13, color: '#1E40AF', fontWeight: 600 }}>
                  🔑 Section Officer's Approval PIN: <span style={{ fontFamily: 'monospace', letterSpacing: '0.2em' }}>{lc.approvalPin}</span>
                </div>
              )}
              {lc.description && (
              <div style={{ marginTop: 12, padding: '10px', background: 'var(--c-surface2)', borderRadius: 8, fontSize: 13, color: 'var(--c-text2)' }}>
                {lc.description}
              </div>
            )}
          </div>

          {/* Photos */}
          {Object.keys(lc.photos || {}).map(type => {
            const photos = lc.photos[type];
            if (!photos || photos.length === 0) return null;
            return (
              <div key={type} style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem', marginTop: 12 }}>
                <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 10 }}>
                  {type === 'cbIsolation' ? '🔌 CB Isolation Photos' : type === 'earthRod' ? '🪨 Earth Rod Photos' : type === 'fieldPreWork' ? '📸 Pre-Work Photos' : type === 'fieldPostWork' ? '✅ Post-Work Photos' : type === 'earthRemoved' ? '🌍 Earth Removed' : '⚡ CB Restored'}
                </h2>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {photos.map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noreferrer" style={{ display: 'block' }}>
                      <img src={p.url} alt={`Photo ${i + 1}`} style={{ width: 90, height: 90, objectFit: 'cover', borderRadius: 8, border: '1px solid var(--c-border)' }} />
                    </a>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Activity Log */}
          <div style={{ background: 'var(--c-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--c-border)', padding: '1.25rem', marginTop: 12 }}>
            <h2 style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>Activity Log</h2>
            <div style={{ borderLeft: '2px solid var(--c-border)', paddingLeft: 16 }}>
              {(lc.log || []).map((entry, i) => (
                <div key={i} style={{ marginBottom: 14, position: 'relative' }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--c-primary)', position: 'absolute', left: -20, top: 4 }} />
                  <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 1 }}>
                    {new Date(entry.timestamp).toLocaleString('en-IN')} · {entry.performedByName}
                  </div>
                  <div style={{ fontSize: 13 }}>{entry.action}</div>
                  {entry.remarks && <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 2, fontStyle: 'italic' }}>{entry.remarks}</div>}
                  {entry.secretCode && user?._id === lc.initiatedBy?._id?.toString() && (
                    <div style={{ fontSize: 12, color: 'var(--c-warning)', marginTop: 6, padding: '8px', background: '#FFFBEB', borderRadius: 6, border: '1px solid #FCD34D', fontWeight: 500 }}>
                      🔑 Secret Code: <span style={{ fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.15em' }}>{entry.secretCode}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right: Actions — rendered first on mobile */}
        <div style={{ order: isMobile ? 1 : 2 }}>
          {/* Secret code display (shown once after JE review) */}
          {secretCode && (
            <div style={{ background: '#FFFBEB', border: '1px solid #FCD34D', borderRadius: 'var(--radius-lg)', padding: '1rem 1.25rem', marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: 'var(--c-warning)', fontWeight: 600, marginBottom: 6 }}>🔑 SECRET CODE (save now — shown once!)</div>
              <div style={{ fontSize: 44, fontWeight: 700, letterSpacing: '0.3em', color: 'var(--c-warning)', textAlign: 'center', fontFamily: 'monospace', padding: '8px 0' }}>{secretCode}</div>
              <div style={{ fontSize: 11, color: 'var(--c-text3)', textAlign: 'center', marginTop: 4 }}>Share verbally with the assigned Lineman only</div>
              <button onClick={() => setSecretCode(null)} style={{ width: '100%', marginTop: 10, padding: '6px', borderRadius: 6, border: '1px solid var(--c-border)', background: 'none', fontSize: 12, cursor: 'pointer', color: 'var(--c-text3)' }}>
                I've saved it — dismiss
              </button>
            </div>
          )}

          {/* ── APPROVE LC REQUEST */}
          {(status === 'INITIATED' && (
            (role === 'AEE' && lc.initiatedBy?.role === 'AE_BESCOM') ||
            (role === 'AE_BESCOM' && ['LINEMAN', 'JE_BESCOM'].includes(lc.initiatedBy?.role)) ||
            (role === 'JE_BESCOM' && user?.createdByAdmin && ['LINEMAN', 'JE_BESCOM'].includes(lc.initiatedBy?.role) && lc.section === user?.section)
          )) && (
            <Section title="✅ Approve LC Request">
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Approval remarks</label>
              <textarea onChange={e => set('remarks', e.target.value)} placeholder="Optional remarks..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label={lc.workType === 'PLANNED' ? 'First Approval (AEE)' : 'Approve Request'} loading={acting} color="var(--c-success)" onClick={() => act('approve', { remarks: form.remarks })} />
              <button onClick={() => { const r = prompt('Rejection reason:'); if (r) act('reject', { reason: r }); }}
                style={{ width: '100%', padding: '8px', borderRadius: 8, border: '1px solid var(--c-danger)', background: 'none', color: 'var(--c-danger)', fontSize: 13, cursor: 'pointer', marginTop: 6 }}>
                Reject
              </button>
            </Section>
          )}

          {/* ── APPROVE EE (Final approval for PLANNED LC) */}
          {role === 'EE' && status === 'INITIATED' && lc.workType === 'PLANNED' && lc.aeeApprovedBy && (
            <Section title="✅ Final Approval (EE)">
              <p style={{ fontSize: 12, color: 'var(--c-text3)', marginBottom: 12 }}>AEE has approved. Give final approval to proceed to JE review.</p>
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>EE remarks (optional)</label>
              <textarea onChange={e => set('remarks', e.target.value)} placeholder="Optional remarks..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Give Final Approval (EE)" loading={acting} color="var(--c-primary)" onClick={() => act('approveEE', { remarks: form.remarks })} />
            </Section>
          )}

          {/* ── JE REVIEW */}
          {canPerformAction(role, 'jeReview') && status === 'APPROVED' && (
            <Section title="🔌 JE/Operator: Isolate CB and Earth Rod">
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--c-text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={!!form.callConfirmed} onChange={e => set('callConfirmed', e.target.checked)} style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 700, color: 'var(--c-primary)', background: 'rgba(14,165,233,0.08)', padding: '2px 6px', borderRadius: 6 }}>
                    Feeder confirmation over phone call with Section Officer for LC?
                  </span>
                </label>
              </div>
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Section Officer's Approval PIN</label>
                <input
                  maxLength={4}
                  value={form.approvalPin || ''}
                  onChange={e => {
                    set('approvalPin', e.target.value);
                    set('pinValid', false);
                  }}
                  placeholder="Enter 4-digit Section Officer's Approval PIN"
                  style={{ ...inp, marginTop: 4, fontSize: 16, letterSpacing: '0.3em' }}
                />
                <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button onClick={validatePin} disabled={pinChecking || !form.callConfirmed} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: (pinChecking || !form.callConfirmed) ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', cursor: (pinChecking || !form.callConfirmed) ? 'not-allowed' : 'pointer' }}>
                    {pinChecking ? 'Validating...' : 'Validate PIN'}
                  </button>
                  {form.pinValid && <div style={{ color: 'var(--c-success)', fontWeight: 600 }}>PIN valid</div>}
                </div>
              </div>
              <PhotoUpload lcId={id} photoType="cbIsolation" label="CB Isolation Photos (min 2 required)" minRequired={2} existing={lc.photos?.cbIsolation} onUploaded={reloadPhotos} pinValidated={!!form.pinValid} />
              <PhotoUpload lcId={id} photoType="earthRod" label="Earth Rod Photo (min 1 required)" minRequired={1} existing={lc.photos?.earthRod} onUploaded={reloadPhotos} pinValidated={!!form.pinValid} />
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Notify additional officers (optional)</label>
                <input placeholder="Search and select users..." style={{ ...inp, marginTop: 4 }} onChange={e => set('notifyNote', e.target.value)} />
              </div>
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Remarks</label>
              <textarea onChange={e => set('remarks', e.target.value)} placeholder="JE remarks..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Isolate CB & Generate Code" loading={acting} color="var(--c-primary)"
                onClick={() => {
                  if (!form.callConfirmed) return toast.error('Please confirm the call with Section Officer before proceeding');
                  if (!form.approvalPin || form.approvalPin.length !== 4) return toast.error("Enter the 4-digit Section Officer's Approval PIN");
                  if (!form.pinValid) return toast.error('Validate the Section Officer\'s PIN before uploading photos');
                  if ((lc.photos?.cbIsolation?.length || 0) < 2) return toast.error('Upload at least 2 CB isolation photos first');
                  if ((lc.photos?.earthRod?.length || 0) < 1) return toast.error('Upload at least 1 Earth Rod photo first');
                  act('jeReview', { remarks: form.remarks, approvalPin: form.approvalPin });
                }} />
            </Section>
          )}

          {/* ── DELEGATE (SO) */}
          {canPerformAction(role, 'delegate') && status === 'JE_REVIEWED' && user?._id === lc.initiatedBy?._id?.toString() && (
            <Section title="👷 Delegate to Lineman">
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Select Lineman</label>
              <select onChange={e => set('linemanId', e.target.value)} style={{ ...inp, marginTop: 4 }}>
                <option value="">Choose lineman...</option>
                {linemen.map(l => (
                  <option key={l._id} value={l._id} disabled={!!l.busy}>
                    {l.name} ({l.phone}) — {getRoleLabel(l.role, l)}{l.busy ? ' - Working on other LCs' : ''}
                  </option>
                ))}
              </select>
              <ActionBtn label="Assign Work" loading={acting} color="#C2410C"
                onClick={() => {
                  if (!form.linemanId) return toast.error('Select a lineman');
                  act('delegate', { linemanId: form.linemanId });
                }} />
            </Section>
          )}

          {/* ── START WORK (Lineman) */}
          {role === 'LINEMAN' && status === 'DELEGATED' && (lc.assignedLineman?._id?.toString() === user?._id || lc.assignedLineman?.toString() === user?._id) && (
            <Section title="🔧 Start Field Work">
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Enter 4-digit secret code</label>
              <input maxLength={4} onChange={e => { set('secretCode', e.target.value); set('secretCodeValid', false); }} placeholder="_ _ _ _"
                style={{ ...inp, marginTop: 4, fontSize: 26, letterSpacing: '0.5em', textAlign: 'center' }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={validateSecretCode} disabled={pinChecking} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: pinChecking ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', cursor: pinChecking ? 'not-allowed' : 'pointer' }}>
                  {pinChecking ? 'Validating...' : 'Validate Secret Code'}
                </button>
                {form.secretCodeValid && <div style={{ color: 'var(--c-success)', fontWeight: 600 }}>Code valid</div>}
              </div>
              <PhotoUpload lcId={id} photoType="fieldPreWork" label="Pre-Work Site Photos (min 1)" minRequired={1} existing={lc.photos?.fieldPreWork} onUploaded={reloadPhotos} pinValidated={!!form.secretCodeValid} />
              <ActionBtn label="Unlock & Start Work" loading={acting} color="var(--c-warning)"
                onClick={() => {
                  if (!form.secretCode || form.secretCode.length !== 4) return toast.error('Enter 4-digit secret code');
                  if (!form.secretCodeValid) return toast.error('Validate secret code before uploading photos');
                  if ((lc.photos?.fieldPreWork?.length || 0) < 1) return toast.error('Upload at least 1 pre-work photo');
                  act('startWork', { secretCode: form.secretCode });
                }} />
            </Section>
          )}

          {/* ── COMPLETE WORK */}
          {canPerformAction(role, 'completeWork') && status === 'IN_PROGRESS' && !lc.workCompletedAt && (lc.assignedLineman?._id?.toString() === user?._id || lc.assignedLineman?.toString() === user?._id) && (
            <Section title="✅ Complete Field Work">
              <PhotoUpload lcId={id} photoType="fieldPostWork" label="Post-Work Photos (min 1)" minRequired={1} existing={lc.photos?.fieldPostWork} onUploaded={reloadPhotos} />
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Work completion notes</label>
              <textarea onChange={e => set('notes', e.target.value)} placeholder="Describe work done..." rows={3} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Mark Work Complete" loading={acting} color="var(--c-success)"
                onClick={() => {
                  if ((lc.photos?.fieldPostWork?.length || 0) < 1) return toast.error('Upload at least 1 post-work photo');
                  act('completeWork', { notes: form.notes });
                }} />
            </Section>
          )}

          {/* ── WORK COMPLETED - AWAITING AE RETURN (only when lineman is NOT the requestor) */}
          {lc.workCompletedAt && role === 'LINEMAN' &&
            (lc.assignedLineman?._id?.toString() === user?._id || lc.assignedLineman?.toString() === user?._id) &&
            lc.initiatedBy?._id?.toString() !== user?._id && lc.initiatedBy?.toString() !== user?._id && (
            <div style={{ background: '#DBEAFE', border: '1px solid #93C5FD', borderRadius: 'var(--radius-lg)', padding: '1.25rem', marginTop: 12, textAlign: 'center' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: '#1E40AF', marginBottom: 6 }}>✅ Work Completed</div>
              <div style={{ fontSize: 13, color: '#1E3A8A' }}>Field work submitted. Awaiting AE confirmation to proceed with closure.</div>
            </div>
          )}

          {/* ── CLOSE REQUEST (AE_BESCOM who initiated) */}
          {canPerformAction(role, 'closeRequest') && status === 'IN_PROGRESS' && lc.workCompletedAt && role === 'AE_BESCOM' && lc.initiatedBy?._id?.toString() === user?._id && (
            <Section title="🔒 Submit Close Request">
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Re-enter secret code to authorize closure</label>
              <input maxLength={4} onChange={e => set('closeCode', e.target.value)} placeholder="_ _ _ _"
                style={{ ...inp, marginTop: 4, fontSize: 26, letterSpacing: '0.5em', textAlign: 'center' }} />
              <label style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 10, display: 'block' }}>Clearance confirmation</label>
              <textarea onChange={e => set('clearanceNote', e.target.value)} placeholder="Confirm area is clear and safe..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Submit Close Request" loading={acting} color="var(--c-purple)"
                onClick={() => {
                  if (!form.closeCode || form.closeCode.length !== 4) return toast.error('Enter 4-digit code');
                  act('closeRequest', { secretCode: form.closeCode, clearanceNote: form.clearanceNote });
                }} />
            </Section>
          )}

          {/* ── CLOSE REQUEST (Lineman who is also the LC requestor — closes directly) */}
          {role === 'LINEMAN' && status === 'IN_PROGRESS' && lc.workCompletedAt &&
            (lc.assignedLineman?._id?.toString() === user?._id || lc.assignedLineman?.toString() === user?._id) &&
            (lc.initiatedBy?._id?.toString() === user?._id || lc.initiatedBy?.toString() === user?._id) && (
            <Section title="🔒 Return LC (Close Request)">
              <label style={{ fontSize: 12, color: 'var(--c-text3)' }}>Re-enter secret code to authorize return</label>
              <input maxLength={4} onChange={e => set('closeCode', e.target.value)} placeholder="_ _ _ _"
                style={{ ...inp, marginTop: 4, fontSize: 26, letterSpacing: '0.5em', textAlign: 'center' }} />
              <label style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 10, display: 'block' }}>Clearance confirmation</label>
              <textarea onChange={e => set('clearanceNote', e.target.value)} placeholder="Confirm area is clear and safe..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Submit Return LC Request" loading={acting} color="var(--c-purple)"
                onClick={() => {
                  if (!form.closeCode || form.closeCode.length !== 4) return toast.error('Enter 4-digit code');
                  act('closeRequest', { secretCode: form.closeCode, clearanceNote: form.clearanceNote });
                }} />
            </Section>
          )}

          {/* ── RELEASE (JE) */}
          {canPerformAction(role, 'release') && status === 'CLOSE_REQUESTED' && (
            <Section title="⚡ Release LC">
              <div style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, color: 'var(--c-text3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input type="checkbox" checked={!!form.releaseConfirmed} onChange={e => { set('releaseConfirmed', e.target.checked); set('releaseCodeValid', false); }} style={{ width: 16, height: 16 }} />
                  <span style={{ fontWeight: 700, color: 'var(--c-primary)', background: 'rgba(14,165,233,0.08)', padding: '2px 6px', borderRadius: 6 }}>
                    Confirmation with Section officer before releasing LC?
                  </span>
                </label>
              </div>
              <label style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 10, display: 'block' }}>Secret code (confirm verbally with LC requestor)</label>
              <input maxLength={4} onChange={e => { set('releaseCode', e.target.value); set('releaseCodeValid', false); }} placeholder="_ _ _ _"
                style={{ ...inp, marginTop: 4, fontSize: 26, letterSpacing: '0.5em', textAlign: 'center' }} />
              <div style={{ marginTop: 8, display: 'flex', gap: 8, alignItems: 'center' }}>
                <button onClick={validateReleaseCode} disabled={releaseChecking || !form.releaseConfirmed} style={{ padding: '8px 12px', borderRadius: 6, border: 'none', background: (releaseChecking || !form.releaseConfirmed) ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', cursor: (releaseChecking || !form.releaseConfirmed) ? 'not-allowed' : 'pointer' }}>
                  {releaseChecking ? 'Validating...' : 'Validate PIN'}
                </button>
                {form.releaseCodeValid && <div style={{ color: 'var(--c-success)', fontWeight: 600 }}>PIN valid</div>}
              </div>
              <label style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 10, display: 'block' }}>Release remarks</label>
              <textarea onChange={e => set('remarks', e.target.value)} placeholder="Line restored and energized..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <ActionBtn label="Release LC" loading={acting} color="#065F46"
                onClick={() => {
                  if (!form.releaseConfirmed) return toast.error('Please confirm with Section officer before releasing LC');
                  if (!form.releaseCode || form.releaseCode.length !== 4) return toast.error('Enter the 4-digit secret code');
                  if (!form.releaseCodeValid) return toast.error('Validate PIN before releasing LC');
                  act('release', { secretCode: form.releaseCode, remarks: form.remarks });
                }} />
            </Section>
          )}

          {/* ── ENERGIZE FEEDER (Shift JE) */}
          {canPerformAction(role, 'energizeFeeder') && status === 'RELEASED' && (
            <Section title="⚡ Energize Feeder">
              {energizeReadiness.pendingCount > 0 && (
                <div style={{ marginBottom: 10, padding: '10px 12px', borderRadius: 8, background: '#FEF2F2', border: '1px solid #FECACA', color: '#991B1B', fontSize: 12 }}>
                  Energize disabled: {energizeReadiness.pendingCount} pending LC(s) found on feeder {lc.feeder}.
                  {energizeReadiness.pendingLcs?.length > 0 && (
                    <div style={{ marginTop: 6, color: '#7F1D1D' }}>
                      Pending: {energizeReadiness.pendingLcs.map(item => `${item.lcNumber} (${item.status})`).join(', ')}
                    </div>
                  )}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <PhotoUpload lcId={id} photoType="cbRestored" label="CB Restored Photos (min 1 required)" minRequired={1} existing={lc.photos?.cbRestored} onUploaded={reloadPhotos} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: (lc.photos?.cbRestored?.length || 0) >= 1 ? '#065F46' : '#B91C1C' }}>
                    {(lc.photos?.cbRestored?.length || 0) >= 1 ? 'Uploaded' : 'Missing'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 8 }}>
                  <PhotoUpload lcId={id} photoType="earthRemoved" label="Earth Removed Photos (min 1 required)" minRequired={1} existing={lc.photos?.earthRemoved} onUploaded={reloadPhotos} />
                  <div style={{ fontSize: 13, fontWeight: 700, color: (lc.photos?.earthRemoved?.length || 0) >= 1 ? '#065F46' : '#B91C1C' }}>
                    {(lc.photos?.earthRemoved?.length || 0) >= 1 ? 'Uploaded' : 'Missing'}
                  </div>
                </div>
              </div>
              <label style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 10, display: 'block' }}>Energization remarks</label>
              <textarea onChange={e => set('energizeRemarks', e.target.value)} placeholder="Feeder energized after confirming all LCs are released..." rows={2} style={{ ...inp, marginTop: 4, resize: 'vertical' }} />
              <button
                disabled={acting || energizeReadiness.loading || !energizeReadiness.canEnergize || ((lc.photos?.cbRestored?.length || 0) < 1) || ((lc.photos?.earthRemoved?.length || 0) < 1)}
                onClick={() => act('energizeFeeder', { remarks: form.energizeRemarks })}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: 8,
                  border: 'none',
                  marginTop: 8,
                  background: (acting || energizeReadiness.loading || !energizeReadiness.canEnergize) ? 'var(--c-text3)' : '#065F46',
                  color: '#fff',
                  fontSize: 14,
                  fontWeight: 600,
                  cursor: (acting || energizeReadiness.loading || !energizeReadiness.canEnergize) ? 'not-allowed' : 'pointer',
                }}
              >
                {acting ? 'Processing...' : energizeReadiness.loading ? 'Checking feeder status...' : 'Energize Feeder'}
              </button>
            </Section>
          )}

          {/* Released */}
          {status === 'RELEASED' && (
            <div style={{ background: 'var(--c-success-light)', border: '1px solid #86EFAC', borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-success)', marginTop: 6 }}>LC Released</div>
              <div style={{ fontSize: 12, color: 'var(--c-success)', marginTop: 2 }}>Awaiting feeder energization</div>
              {lc.actualDuration && <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 8 }}>Total duration: {lc.actualDuration}h</div>}
            </div>
          )}

          {/* Energized */}
          {status === 'ENERGIZED' && (
            <div style={{ background: 'var(--c-success-light)', border: '1px solid #86EFAC', borderRadius: 'var(--radius-lg)', padding: '1.25rem', textAlign: 'center' }}>
              <div style={{ fontSize: 32 }}>⚡</div>
              <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-success)', marginTop: 6 }}>Feeder Energized</div>
              <div style={{ fontSize: 12, color: 'var(--c-success)', marginTop: 2 }}>All pending LCs on this feeder are cleared</div>
              {lc.actualDuration && <div style={{ fontSize: 12, color: 'var(--c-text3)', marginTop: 8 }}>Total duration: {lc.actualDuration}h</div>}
            </div>
          )}

          {/* Rejected */}
          {status === 'REJECTED' && (
            <div style={{ background: 'var(--c-danger-light)', border: '1px solid #FCA5A5', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--c-danger)' }}>❌ LC Rejected</div>
              <div style={{ fontSize: 13, marginTop: 6, color: 'var(--c-text2)' }}>{lc.rejectionReason || 'No reason provided'}</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
