import { useState, useCallback } from 'react';
import { useDeckStore } from '../../store/deckStore';
import { openFileDialog } from '../../api/tauri';
import LoadingSpinner from '../ui/LoadingSpinner';

interface Props { onClose: () => void; }

const SUPPORTED = ['.mL', '.json', '.yaml', '.yml', '.toml', '.csv'];

function detectFormat(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase() ?? '';
  const map: Record<string, string> = { ml: '.mL', json: 'JSON', yaml: 'YAML', yml: 'YAML', toml: 'TOML', csv: 'CSV' };
  return map[ext] ?? ext.toUpperCase();
}

export default function ImportModal({ onClose }: Props) {
  const { importFile } = useDeckStore();
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);

  const handleBrowse = async () => {
    const path = await openFileDialog();
    if (path) { setSelectedPath(path); setError(null); }
  };

  const handleImport = async () => {
    if (!selectedPath) return;
    setLoading(true);
    setError(null);
    const result = await importFile(selectedPath);
    setLoading(false);
    if (result) onClose();
    else setError('Import failed. Check the file format.');
  };

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); setDragging(true); }, []);
  const handleDragLeave = useCallback(() => setDragging(false), []);
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) { setSelectedPath(file.name); setError(null); }
  }, []);

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box card" style={{ animation: 'fadeIn 0.2s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-lg)' }}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 700 }}>Import Flashcards</h2>
          <button onClick={onClose} style={{ fontSize: 20, color: 'var(--text-muted)', padding: 4 }}>✕</button>
        </div>

        <div
          className={`drop-zone${dragging ? ' drop-zone--active' : ''}${selectedPath ? ' drop-zone--selected' : ''}`}
          onClick={handleBrowse}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          {selectedPath ? (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📄</div>
              <div style={{ fontWeight: 600, wordBreak: 'break-all' }}>{selectedPath.split(/[\\/]/).pop()}</div>
              <div className="format-badge">{detectFormat(selectedPath)}</div>
            </>
          ) : (
            <>
              <div style={{ fontSize: 32, marginBottom: 8 }}>📂</div>
              <div style={{ fontWeight: 500 }}>Drop file here or click to browse</div>
              <div style={{ fontSize: 'var(--font-size-sm)', color: 'var(--text-muted)', marginTop: 4 }}>
                {SUPPORTED.join(', ')}
              </div>
            </>
          )}
        </div>

        {error && <div style={{ color: '#ef4444', fontSize: 'var(--font-size-sm)', marginTop: 'var(--spacing-sm)' }}>{error}</div>}

        <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end', marginTop: 'var(--spacing-lg)' }}>
          <button className="btn btn--ghost" onClick={onClose} disabled={loading}>Cancel</button>
          <button className="btn" onClick={handleImport} disabled={!selectedPath || loading}>
            {loading ? <LoadingSpinner size={16} /> : 'Import'}
          </button>
        </div>
      </div>

      <style>{`
        .modal-overlay {
          position: fixed; inset: 0; background: rgba(0,0,0,0.6);
          display: flex; align-items: center; justify-content: center;
          z-index: 1000; padding: var(--spacing-lg);
        }
        .modal-box { min-width: 420px; max-width: 540px; width: 100%; }
        .drop-zone {
          border: 2px dashed var(--border); border-radius: var(--border-radius-md);
          padding: var(--spacing-xl); text-align: center; cursor: pointer;
          transition: border-color 0.15s, background 0.15s;
        }
        .drop-zone:hover, .drop-zone--active { border-color: var(--accent); background: var(--bg-tertiary); }
        .drop-zone--selected { border-style: solid; border-color: var(--accent); }
        .format-badge {
          display: inline-block; margin-top: 8px;
          background: var(--accent); color: #fff;
          padding: 2px 10px; border-radius: 20px; font-size: 12px; font-weight: 700;
        }
        @media (max-width: 480px) { .modal-box { min-width: 0; } }
      `}</style>
    </div>
  );
}
