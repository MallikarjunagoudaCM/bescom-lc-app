import { useState, useRef } from 'react';
import { lcApi } from '../../api/lc.api';
import toast from 'react-hot-toast';

export default function PhotoUpload({ lcId, photoType, label, minRequired = 1, existing = [], onUploaded, pinValidated = true }) {
  const [uploading, setUploading] = useState(false);
  const [preview, setPreview] = useState([]);
  const inputRef = useRef();

  const handleFiles = async (files) => {
    if (!files.length) return;
    setUploading(true);
    try {
      const fileArr = Array.from(files);
      const { data } = await lcApi.uploadPhotos(lcId, photoType, fileArr);
      toast.success(`${fileArr.length} photo(s) uploaded`);
      onUploaded && onUploaded(data.photos);
      setPreview([]);
    } catch {
    } finally { setUploading(false); }
  };

  const allPhotos = [...(existing || [])];
  const satisfied = allPhotos.length >= minRequired;

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
        <label style={{ fontSize: 13, fontWeight: 500 }}>{label}</label>
        <span style={{ fontSize: 11, color: satisfied ? 'var(--c-success)' : 'var(--c-danger)' }}>
          {allPhotos.length}/{minRequired} required {satisfied ? '✓' : ''}
        </span>
      </div>

      {/* Existing photos */}
      {allPhotos.length > 0 && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
          {allPhotos.map((p, i) => (
            <a key={i} href={p.url} target="_blank" rel="noreferrer">
              <img src={p.url} alt={`Photo ${i + 1}`} style={{ width: 64, height: 64, objectFit: 'cover', borderRadius: 6, border: '1px solid var(--c-border)' }} />
            </a>
          ))}
        </div>
      )}

      {/* Upload button */}
      <input ref={inputRef} type="file" accept="image/*" multiple style={{ display: 'none' }}
        onChange={e => handleFiles(e.target.files)} />
      <button type="button" onClick={() => {
        if (!pinValidated) {
          toast.error('Validate the Section Officer\'s PIN before uploading photos');
          return;
        }
        inputRef.current.click();
      }} disabled={uploading || !pinValidated}
        style={{ width: '100%', padding: '8px', borderRadius: 8, border: `1.5px dashed ${satisfied ? 'var(--c-border)' : 'var(--c-danger)'}`, background: pinValidated ? 'var(--c-surface2)' : 'var(--c-surface2)', opacity: pinValidated ? 1 : 0.6, fontSize: 12, color: 'var(--c-text3)', cursor: (uploading || !pinValidated) ? 'not-allowed' : 'pointer' }}>
        {uploading ? 'Uploading...' : !pinValidated ? 'Validate PIN first' : `+ Upload Photos ${!satisfied ? '(required)' : '(add more)'}`}
      </button>
    </div>
  );
}
