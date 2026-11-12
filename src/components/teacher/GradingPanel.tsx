import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react';
import { fetchAssignmentSubmissions, fetchTeacherRoster, gradeAssignmentSubmission, type AssignmentSubmission } from '../../services/teacher';
import { fetchEditionAssignments, type AssignmentRow } from '../../services/courseAdmin';
import { fetchFilesBySubmission, type SubmissionFile } from '../../services/submissions';
import SubmissionFiles from '../course/SubmissionFiles';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { useToast } from '../../context/ToastContext';
import { fmtDateTime } from './helpers';

const isSafeUrl = (url: string) => {
  try {
    const u = new URL(url);
    return u.protocol === 'https:';
  } catch {
    return false;
  }
};

// Entregas de la edición: pendientes de calificar y ya calificadas, con el nombre del estudiante.
export default function GradingPanel({ offeringId }: { offeringId: string }) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [subs, setSubs] = useState<AssignmentSubmission[] | null>(null);
  const [names, setNames] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState('');
  const [view, setView] = useState<'pending' | 'graded'>('pending');
  const [open, setOpen] = useState<AssignmentSubmission | null>(null);
  const [files, setFiles] = useState<SubmissionFile[]>([]);
  const [score, setScore] = useState('');
  const [feedback, setFeedback] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const load = useCallback(async () => {
    const [a, r] = await Promise.all([fetchEditionAssignments(offeringId), fetchTeacherRoster(offeringId, null)]);
    const ids = new Set(a.map((x) => x.id));
    const s = await fetchAssignmentSubmissions();
    setAssignments(a);
    setNames(Object.fromEntries(r.data.filter((x) => x.user_id).map((x) => [x.user_id as string, x.full_name])));
    setSubs(s.data.filter((x) => ids.has(x.assignment_id)));
    if (s.error) toast.error(s.error);
  }, [offeringId]);

  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(['submissions', 'assignments'], () => void load());

  const shown = useMemo(
    () =>
      (subs ?? [])
        .filter((s) => (filter ? s.assignment_id === filter : true))
        .filter((s) => (view === 'pending' ? s.score == null : s.score != null))
        .sort((a, b) => +new Date(b.submitted_at) - +new Date(a.submitted_at)),
    [subs, filter, view],
  );
  const pendingCount = (subs ?? []).filter((s) => s.score == null).length;
  const assignmentOf = (id: string) => assignments.find((a) => a.id === id);

  const openGrade = (s: AssignmentSubmission) => {
    setOpen(s);
    setFiles([]);
    setError(null);
    setScore(s.score != null ? String(s.score) : '');
    setFeedback(s.feedback ?? '');
    void fetchFilesBySubmission(s.id).then(setFiles);
  };

  const save = async (e: FormEvent) => {
    e.preventDefault();
    if (!open) return;
    const max = assignmentOf(open.assignment_id)?.max_score ?? open.assignments?.max_score ?? 100;
    const n = Number(score);
    if (score.trim() === '' || Number.isNaN(n)) return setError('Escribe una nota numérica.');
    if (n < 0 || n > max) return setError(`La nota debe estar entre 0 y ${max}.`);
    setSaving(true);
    setError(null);
    const r = await gradeAssignmentSubmission(open.id, n, feedback.trim());
    setSaving(false);
    if (!r.success) return setError(r.error ?? 'No se pudo guardar la calificación.');
    toast.success(`Calificada: ${n}/${max} pts.`);
    setOpen(null);
    await load();
  };

  return (
    <section className="pn-stack" aria-labelledby="gp-title">
      <div className="pn-section-head">
        <div>
          <h3 id="gp-title" className="pn-title">Entregas de tareas</h3>
          <p className="pn-subtitle">Revisa lo que enviaron tus estudiantes y asigna la nota con comentarios.</p>
        </div>
        <label className="grid gap-1" style={{ minWidth: '14rem' }}>
          <span className="sr-only">Tarea</span>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filtrar por tarea">
            <option value="">Todas las tareas</option>
            {assignments.map((a) => <option key={a.id} value={a.id}>{a.title}</option>)}
          </select>
        </label>
      </div>

      <div className="pn-row" role="group" aria-label="Estado de las entregas">
        <button type="button" className={`pn-btn pn-btn-sm ${view === 'pending' ? 'pn-btn-primary' : ''}`} onClick={() => setView('pending')}>Por calificar ({pendingCount})</button>
        <button type="button" className={`pn-btn pn-btn-sm ${view === 'graded' ? 'pn-btn-primary' : ''}`} onClick={() => setView('graded')}>Calificadas</button>
      </div>

      {subs === null ? (
        <div className="pn-skeleton" />
      ) : shown.length === 0 ? (
        <div className="pn-empty">
          <strong>{view === 'pending' ? 'No hay entregas por calificar' : 'Todavía no calificaste entregas'}</strong>
          <p>{view === 'pending' ? 'Cuando un estudiante entregue una tarea, aparece aquí al instante.' : 'Las entregas calificadas se listan aquí y puedes corregir su nota.'}</p>
        </div>
      ) : (
        <ul className="pn-stack list-none p-0 m-0">
          {shown.map((s) => {
            const a = assignmentOf(s.assignment_id);
            return (
              <li key={s.id} className="pn-card pn-between">
                <div className="min-w-0">
                  <p className="m-0 font-semibold">{names[s.user_id] ?? 'Estudiante'}</p>
                  <p className="pn-subtitle">{a?.title ?? s.assignments?.title ?? 'Tarea'} · entregada {fmtDateTime(s.submitted_at)}</p>
                  {s.score != null && <span className="pn-badge pn-badge-ok mt-1">{s.score}/{a?.max_score ?? s.assignments?.max_score ?? 100} pts</span>}
                </div>
                <div className="pn-row">
                  {s.file_url && isSafeUrl(s.file_url) && <a className="pn-btn pn-btn-sm" href={s.file_url} target="_blank" rel="noopener noreferrer">Abrir enlace ↗</a>}
                  <button type="button" className="pn-btn pn-btn-sm pn-btn-primary" onClick={() => openGrade(s)}>{s.score != null ? 'Corregir nota' : 'Calificar'}</button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {open && (
        <div role="dialog" aria-modal="true" aria-labelledby="gp-modal" className="fixed inset-0 z-50 grid place-items-center p-4" style={{ background: 'rgba(15,16,55,0.5)' }}
          onKeyDown={(e) => e.key === 'Escape' && !saving && setOpen(null)}>
          <div className="pn-card pn-scope w-full overflow-y-auto" style={{ maxWidth: '40rem', maxHeight: '90vh' }}>
            <div className="pn-between">
              <div>
                <h3 id="gp-modal" className="pn-title">Calificar entrega</h3>
                <p className="pn-subtitle">{names[open.user_id] ?? 'Estudiante'} · {assignmentOf(open.assignment_id)?.title}</p>
              </div>
              <button type="button" className="pn-btn pn-btn-sm" onClick={() => setOpen(null)} disabled={saving} aria-label="Cerrar">✕</button>
            </div>
            {open.content_text && <p className="pn-callout mt-3" style={{ whiteSpace: 'pre-wrap' }}>{open.content_text}</p>}
            {open.file_url && isSafeUrl(open.file_url) && <p className="mt-3"><a href={open.file_url} target="_blank" rel="noopener noreferrer">Abrir el enlace entregado ↗</a></p>}
            <div className="mt-3"><SubmissionFiles files={files} /></div>
            <form onSubmit={(e) => void save(e)} className="pn-stack mt-4">
              {error && <p role="alert" className="pn-callout pn-callout-warn m-0">{error}</p>}
              <label className="grid gap-1">Nota (máximo {assignmentOf(open.assignment_id)?.max_score ?? 100})
                <input type="number" inputMode="decimal" step="any" min={0} value={score} onChange={(e) => setScore(e.target.value)} required autoFocus />
              </label>
              <label className="grid gap-1">Comentarios para el estudiante
                <textarea rows={3} value={feedback} onChange={(e) => setFeedback(e.target.value)} placeholder="Qué hizo bien y qué puede mejorar" />
              </label>
              <div className="pn-row" style={{ justifyContent: 'flex-end' }}>
                <button type="button" className="pn-btn" onClick={() => setOpen(null)} disabled={saving}>Cancelar</button>
                <button type="submit" className="pn-btn pn-btn-primary" disabled={saving}>{saving ? 'Guardando…' : 'Guardar nota'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
