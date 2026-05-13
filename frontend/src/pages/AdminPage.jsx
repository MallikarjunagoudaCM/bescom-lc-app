import { useAuth } from '../contexts/AuthContext';
import { useEffect, useState } from 'react';
import api from '../api/axios';
import toast from 'react-hot-toast';

export default function AdminPage() {
  const { user } = useAuth();
  const [hierarchy, setHierarchy] = useState(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);

  useEffect(() => {
    fetchHierarchy();
  }, []);

  const fetchHierarchy = async () => {
    try {
      const { data } = await api.get('/admin/office-hierarchy');
      setHierarchy(data.hierarchy);
    } catch (err) {
      toast.error('Failed to load office hierarchy');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const csvText = await file.text();
      setUploading(true);
      const { data } = await api.post('/admin/bulk-import', { csvText });
      toast.success(data.message);
      if (data.results.updated) {
        toast.success(`Updated ${data.results.updated} existing records`);
      }
      if (data.results.errors.length > 0) {
        toast.error(`${data.results.errors.length} rows had errors`);
      }
      setShowUpload(false);
      fetchHierarchy();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (user?.role !== 'ADMIN') {
    return <div style={{ padding: '2rem', color: 'var(--c-text3)' }}>Admin access only</div>;
  }

  return (
    <div style={{ padding: '2rem', maxWidth: 1200, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700 }}>Admin Dashboard</h1>
          <p style={{ color: 'var(--c-text3)', fontSize: 13 }}>Office hierarchy and bulk imports</p>
        </div>
        <button
          onClick={() => setShowUpload(true)}
          style={{
            padding: '10px 16px',
            borderRadius: 8,
            border: 'none',
            background: 'var(--c-primary)',
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          📤 Upload Officers
        </button>
      </div>

      {showUpload && (
        <div style={{
          background: 'var(--c-surface)',
          border: '1px solid var(--c-border)',
          borderRadius: 12,
          padding: '1.5rem',
          marginBottom: '2rem',
        }}>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Bulk Import Officers</h2>
          <h2 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12 }}>Bulk Import Officers & KPTCL AE</h2>
          <p style={{ color: 'var(--c-text3)', fontSize: 13, marginBottom: 16 }}>
            Upload a single CSV sheet with both BESCOM officer and KPTCL AE rows. Columns are auto-detected:
            <br /> • BESCOM: EE Mobile, EE Name, AEE Mobile, AEE Name, SO Mobile, SO Name, Division, Subdivision, Section, Feeders, KPTCL Substation
            <br /> • KPTCL AE: KPTCL AE, KPTCL AE Mobile, Station, MaxShiftJEs, ShiftPattern
          </p>
          <pre style={{ margin: 0, padding: '12px', background: 'var(--c-surface2)', borderRadius: 8, overflowX: 'auto', WebkitOverflowScrolling: 'touch', fontSize: 12, color: 'var(--c-text3)', marginBottom: 16 }}>
{`BESCOM Row Example:
Division,Subdivision,Section,KPTCL Substation,Feeders,EE Mobile,EE Name,AEE Mobile,AEE Name,SO Mobile,SO Name
South,South-1,Section A,Koramangala,F01;F02,8888888888,Prakash,7777777777,Suresh,6666666666,Manoj

KPTCL AE Row Example:
KPTCL AE,KPTCL AE Mobile,Station,MaxShiftJEs,ShiftPattern
Ramesh,9876543210,Bangalore South,2,WEEKLY`}
          </pre>
          <div style={{ display: 'flex', gap: 12 }}>
            <label style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 8,
              border: '2px dashed var(--c-border)',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'var(--c-surface2)',
              color: 'var(--c-text2)',
              fontSize: 13,
              fontWeight: 500,
            }}>
              Choose CSV File
              <input
                type="file"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={uploading}
                style={{ display: 'none' }}
              />
            </label>
            <button
              onClick={() => setShowUpload(false)}
              style={{
                padding: '12px 16px',
                borderRadius: 8,
                border: '1px solid var(--c-border)',
                background: 'none',
                color: 'var(--c-text2)',
                fontSize: 13,
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      <div style={{ background: 'var(--c-surface)', border: '1px solid var(--c-border)', borderRadius: 12, padding: '1.5rem' }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: '1.5rem' }}>Office Hierarchy</h2>
        
        {loading ? (
          <div style={{ color: 'var(--c-text3)' }}>Loading...</div>
        ) : !hierarchy || Object.keys(hierarchy).length === 0 ? (
          <div style={{ color: 'var(--c-text3)', fontSize: 13 }}>No office hierarchy data</div>
        ) : (
          <div>
            {Object.entries(hierarchy).map(([divisionName, division]) => (
              <div key={divisionName} style={{ marginBottom: '2rem', borderLeft: '3px solid var(--c-primary)', paddingLeft: '16px' }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: 'var(--c-primary)', marginBottom: 12 }}>
                  Division: {divisionName}
                </h3>
                
                {Object.entries(division.subdivisions || {}).map(([subdivisionName, subdivision]) => (
                  <div key={subdivisionName} style={{ marginBottom: '1.5rem', marginLeft: '16px', borderLeft: '2px solid var(--c-text3)', paddingLeft: '12px' }}>
                    <h4 style={{ fontSize: 13, fontWeight: 600, color: 'var(--c-text2)', marginBottom: 12 }}>
                      Subdivision: {subdivisionName}
                    </h4>
                    
                    {Object.entries(subdivision.sections || {}).map(([sectionName, section]) => (
                      <div key={sectionName} style={{ marginBottom: '12px', marginLeft: '12px', padding: '10px 12px', background: 'var(--c-surface2)', borderRadius: 6 }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--c-text)', marginBottom: 8 }}>
                          Section: {sectionName}
                        </div>
                        {section.officers && section.officers.map((officer, idx) => (
                          <div key={idx} style={{ fontSize: 11, color: 'var(--c-text3)', marginBottom: 4, paddingLeft: 8 }}>
                            • {officer.name} ({officer.phone}) - Feeders: {officer.feeders?.join(', ') || '—'}
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
