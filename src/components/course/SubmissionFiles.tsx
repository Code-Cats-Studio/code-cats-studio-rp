import { useEffect, useRef, useState } from 'react';
import {
  deleteSubmissionFile,
  fetchFileBlob,
  formatSize,
  INLINE_TYPES,
  type SubmissionFile,
} from '../../services/submissions';

interface Props {
  files: SubmissionFile[];
  /** El estudiante puede borrar sus archivos mientras no esté calificada la entrega */
  canDelete?: boolean;
  onDeleted?: (fileId: string) => void;
}

type Preview =
  | { kind: 'pdf' | 'image'; name: string; url: string }
  | { kind: 'text'; name: string; text: string };

const btn = 'px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';

export default function SubmissionFiles({ files, canDelete = false, onDeleted }: Props) {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const urlRef = useRef<string | null>(null);

  const closePreview = () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
    urlRef.current = null;
    setPreview(null);
  };

  useEffect(() => () => {
    if (urlRef.current) URL.revokeObjectURL(urlRef.current);
  }, []);

  const open = async (file: SubmissionFile) => {
    setError(null);
    setBusyId(file.id);
    try {
      const blob = await fetchFileBlob(file.id, 'inline');
      const type = (file.mime_type ?? '').toLowerCase();
      if (type === 'text/plain') {
        setPreview({ kind: 'text', name: file.file_name, text: (await blob.text()).slice(0, 200_000) });
      } else {
        const url = URL.createObjectURL(blob);
        urlRef.current = url;
        setPreview({ kind: type === 'application/pdf' ? 'pdf' : 'image', name: file.file_name, url });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo abrir el archivo.');
    } finally {
      setBusyId(null);
    }
  };

  const download = async (file: SubmissionFile) => {
    setError(null);
    setBusyId(file.id);
    try {
      const blob = await fetchFileBlob(file.id, 'attachment');
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 10_000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo descargar el archivo.');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (file: SubmissionFile) => {
    if (!window.confirm(`¿Eliminar «${file.file_name}»?`)) return;
    setError(null);
    setBusyId(file.id);
    try {
      await deleteSubmissionFile(file.id);
      onDeleted?.(file.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo eliminar el archivo.');
    } finally {
      setBusyId(null);
    }
  };

  if (files.length === 0) {
    return <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin archivos entregados.</p>;
  }

  return (
    <div>
      <ul className="grid gap-2">
        {files.map((f) => {
          const canPreview = INLINE_TYPES.includes((f.mime_type ?? '').toLowerCase());
          return (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 p-2.5 rounded-lg"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
              <span className="text-sm min-w-0 break-all">
                {f.file_name} <span style={{ color: 'var(--text-muted)' }}>{formatSize(f.size_bytes)}</span>
              </span>
              <span className="flex gap-2">
                {canPreview && (
                  <button type="button" disabled={busyId === f.id} onClick={() => void open(f)} className={btn}
                    style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Ver</button>
                )}
                <button type="button" disabled={busyId === f.id} onClick={() => void download(f)} className={btn}
                  style={{ border: '1px solid var(--border)' }}>Descargar</button>
                {canDelete && (
                  <button type="button" disabled={busyId === f.id} onClick={() => void remove(f)} className={btn}
                    style={{ border: '1px solid var(--border)', color: 'var(--error)' }}>Eliminar</button>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      {error && <p role="alert" className="mt-2 text-sm" style={{ color: 'var(--error)' }}>{error}</p>}

      {preview && (
        <div role="dialog" aria-modal="true" aria-label={`Vista de ${preview.name}`}
          className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/60"
          onClick={closePreview}>
          <div className="bg-white rounded-2xl w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <p className="text-sm font-semibold truncate">{preview.name}</p>
              <button type="button" onClick={closePreview} className="text-gray-500 text-lg px-2 cursor-pointer"
                aria-label="Cerrar">✕</button>
            </div>
            <div className="flex-1 overflow-auto bg-gray-50">
              {preview.kind === 'pdf' && (
                <iframe title={preview.name} src={preview.url} className="w-full h-full border-0" />
              )}
              {preview.kind === 'image' && (
                <img src={preview.url} alt={preview.name} className="max-w-full mx-auto" />
              )}
              {preview.kind === 'text' && (
                <pre className="p-4 text-xs whitespace-pre-wrap break-words" style={{ fontFamily: 'var(--font-mono)' }}>
                  {preview.text}
                </pre>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
