import { useId, useState, type ChangeEvent } from 'react';
import {
  MAX_FILES,
  uploadSubmissionFile,
  validateFiles,
  type SubmissionFile,
} from '../../services/submissions';

interface Props {
  assignmentId: string;
  existingCount: number;
  onUploaded: (file: SubmissionFile) => void;
}

interface UploadState {
  name: string;
  pct: number;
  error?: string;
}

export default function SubmissionUploader({ assignmentId, existingCount, onUploaded }: Props) {
  const inputId = useId();
  const [uploads, setUploads] = useState<UploadState[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    e.target.value = '';
    if (files.length === 0) return;

    const problem = validateFiles(existingCount, files);
    if (problem) {
      setError(problem);
      return;
    }
    setError(null);
    setBusy(true);
    setUploads(files.map((f) => ({ name: f.name, pct: 0 })));

    // Uno a uno: así el límite de 10 se comprueba en el servidor con cada archivo
    for (let i = 0; i < files.length; i++) {
      try {
        const saved = await uploadSubmissionFile(assignmentId, files[i], (pct) =>
          setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, pct } : u)))
        );
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, pct: 100 } : u)));
        onUploaded(saved);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Error al subir.';
        setUploads((prev) => prev.map((u, idx) => (idx === i ? { ...u, error: message } : u)));
      }
    }
    setBusy(false);
  };

  const remaining = MAX_FILES - existingCount;

  return (
    <div>
      <label htmlFor={inputId}
        className={`inline-block px-4 py-2 rounded-xl text-sm font-semibold ${busy || remaining <= 0 ? 'opacity-50' : 'cursor-pointer'}`}
        style={{ background: 'var(--azul-gatuno)', color: '#fff', fontFamily: 'var(--font-heading)' }}>
        {busy ? 'Subiendo…' : 'Subir archivos'}
      </label>
      <input id={inputId} type="file" multiple className="sr-only" disabled={busy || remaining <= 0}
        onChange={(e) => void handleChange(e)} />
      <span className="ml-3 text-xs" style={{ color: 'var(--text-muted)' }}>
        Hasta {MAX_FILES} archivos de 50 MB ({Math.max(remaining, 0)} disponibles)
      </span>

      {error && <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

      {uploads.length > 0 && (
        <ul className="mt-3 grid gap-2" aria-live="polite">
          {uploads.map((u, i) => (
            <li key={`${u.name}-${i}`} className="text-sm">
              <div className="flex justify-between gap-2">
                <span className="truncate">{u.name}</span>
                <span style={{ color: u.error ? 'var(--error)' : 'var(--text-muted)' }}>
                  {u.error ? 'Error' : `${u.pct}%`}
                </span>
              </div>
              {u.error ? (
                <p className="text-xs" style={{ color: 'var(--error)' }}>{u.error}</p>
              ) : (
                <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'var(--bg-tertiary)' }}>
                  <div className="h-full" style={{ width: `${u.pct}%`, background: 'var(--azul-gatuno)', transition: 'width .2s' }} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
