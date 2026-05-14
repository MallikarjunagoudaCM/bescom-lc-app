import { useState, useEffect } from 'react';
import { FEEDERS, WORK_NATURES, STATION_FEEDERS } from '../../utils/constants';

const inp = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--c-border)', fontSize: 13, background: 'var(--c-bg)', color: 'var(--c-text)', outline: 'none' };

export default function LCFormModal({ workType, onSubmit, onClose, initialValues = {}, feederOptions = FEEDERS, stationFeeders = {}, stationFeedersLoaded = false }) {
  const [form, setForm] = useState(initialValues);
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  useEffect(() => {
    setForm(initialValues);
  }, [initialValues]);

  const stationData = stationFeedersLoaded && Object.keys(stationFeeders || {}).length ? stationFeeders : STATION_FEEDERS;
  const availableStationKeys = Object.keys(stationData).sort();
  const selectedStation = form.station || '';
  const availableFeeders = selectedStation
    ? (stationData[selectedStation] ?? [])
    : feederOptions;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.station || !form.feeder || !form.natureOfWork || !form.estimatedDuration) return alert('Please fill all required fields');
    setLoading(true);
    try { await onSubmit(form); } finally { setLoading(false); }
  }; 

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
      <div style={{ background: 'var(--c-surface)', borderRadius: 16, border: '1px solid var(--c-border)', width: '100%', maxWidth: 520, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--c-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: 'var(--c-surface)', zIndex: 1 }}>
          <div>
            <div style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 2 }}>{workType} WORK</div>
            <div style={{ fontSize: 17, fontWeight: 700 }}>New LC Request</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: 'var(--c-text3)' }}>✕</button>
        </div>
        <form onSubmit={handleSubmit} style={{ padding: '1.25rem 1.5rem' }}>
          <Field label="KPTCL Station *">
            <select value={form.station || ''} onChange={e => { set('station', e.target.value); set('feeder', ''); }} style={inp}>
              <option value="">Select station...</option>
              {availableStationKeys.map(station => <option key={station} value={station}>{station}</option>)}
            </select>
          </Field>
          <Field label="Feeder *">
            <select value={form.feeder || ''} onChange={e => set('feeder', e.target.value)} style={inp} disabled={!form.station}>
              <option value="">{form.station ? 'Select feeder...' : 'Select station first'}</option>
              {availableFeeders.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </Field>
          <Field label="Nature of Work *">
            <select onChange={e => set('natureOfWork', e.target.value)} style={inp}>
              <option value="">Select type...</option>
              {WORK_NATURES.map(n => <option key={n}>{n}</option>)}
            </select>
          </Field>
          <Field label="Section / Location">
            <input value={form.section || ''} onChange={e => set('section', e.target.value)} placeholder="e.g. Pole No. 45 to 52" style={inp} />
          </Field>
          <Field label="Estimated Duration (hours) *">
            <input type="number" min={0.5} max={48} step={0.5} onChange={e => set('estimatedDuration', e.target.value)} placeholder="e.g. 4" style={inp} />
          </Field>
          {workType === 'PLANNED' && (
            <Field label="Planned Start Date & Time">
              <input type="datetime-local" onChange={e => set('plannedStartAt', e.target.value)} style={inp} />
            </Field>
          )}
          <Field label="Description">
            <textarea onChange={e => set('description', e.target.value)} placeholder="Brief description of work required..." rows={3}
              style={{ ...inp, resize: 'vertical' }} />
          </Field>
          <button type="submit" disabled={loading} style={{ width: '100%', padding: '10px', borderRadius: 8, border: 'none', background: loading ? 'var(--c-text3)' : 'var(--c-primary)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer' }}>
            {loading ? 'Submitting...' : 'Submit to KPTCL →'}
          </button>
        </form>
      </div>
    </div>
  );
}

const Field = ({ label, children }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--c-text2)', display: 'block', marginBottom: 5 }}>{label}</label>
    {children}
  </div>
);
