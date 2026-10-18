import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import SubmissionFiles from '../components/course/SubmissionFiles';
import SubmissionUploader from '../components/course/SubmissionUploader';
import {
  fetchAssignments,
  fetchMaterials,
  toDrivePreviewUrl,
  type AssignmentItem,
  type MaterialItem,
  type SubmissionFile,
} from '../services/submissions';
import { setPageMeta } from '../utils/seo';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;

const formatDue = (iso: string | null) =>
  iso
    ? new Date(iso).toLocaleString('es-BO', { timeZone: 'America/La_Paz', dateStyle: 'medium', timeStyle: 'short' })
    : 'Sin fecha límite';

export default function TareasPage() {
  const { offeringId } = useParams();
  const { user, isLoading } = useAuth();
  const [assignments, setAssignments] = useState<AssignmentItem[]>([]);
  const [materials, setMaterials] = useState<MaterialItem[]>([]);
  const [openMaterial, setOpenMaterial] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta('Tareas y material', 'Material del curso y entrega de tareas en Code Cats Studio');
  }, []);

  const load = useCallback(async () => {
    if (!offeringId || !user) return;
    const [a, m] = await Promise.all([fetchAssignments(offeringId, user.id), fetchMaterials(offeringId)]);
    setAssignments(a);
    setMaterials(m);
    setLoading(false);
  }, [offeringId, user]);

  useEffect(() => {
    void load();
  }, [load]);

  const addFile = (assignmentId: string, file: SubmissionFile) =>
    setAssignments((prev) =>
      prev.map((a) =>
        a.id !== assignmentId
          ? a
          : {
              ...a,
              submission: {
                id: a.submission?.id ?? '',
                score: a.submission?.score ?? null,
                feedback: a.submission?.feedback ?? null,
                files: [...(a.submission?.files ?? []), file],
              },
            }
      )
    );

  const removeFile = (assignmentId: string, fileId: string) =>
    setAssignments((prev) =>
      prev.map((a) =>
        a.id !== assignmentId || !a.submission
          ? a
          : { ...a, submission: { ...a.submission, files: a.submission.files.filter((f) => f.id !== fileId) } }
      )
    );

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <main className="max-w-4xl mx-auto px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <Link to="/mis-cursos" className="text-sm underline" style={{ color: 'var(--azul-gatuno)' }}>← Mis cursos</Link>
      <h1 className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>
        Tareas y material
      </h1>

      {loading ? (
        <p className="mt-8">Cargando…</p>
      ) : (
        <>
          <section className="mt-8" aria-labelledby="mat-title">
            <h2 id="mat-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Material</h2>
            {materials.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay material publicado.</p>
            ) : (
              <ul className="mt-3 grid gap-3">
                {materials.map((m) => {
                  const preview = toDrivePreviewUrl(m.url);
                  return (
                    <li key={m.id} className="p-4 rounded-xl" style={card}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold">{m.title}</span>
                        <span className="flex gap-3 text-sm">
                          {preview && (
                            <button type="button" className="underline cursor-pointer" style={{ color: 'var(--azul-gatuno)' }}
                              onClick={() => setOpenMaterial(openMaterial === m.id ? null : m.id)}>
                              {openMaterial === m.id ? 'Cerrar' : 'Ver aquí'}
                            </button>
                          )}
                          <a href={m.url} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--azul-gatuno)' }}>
                            {preview ? 'Abrir / descargar en Drive' : 'Abrir enlace'}
                          </a>
                        </span>
                      </div>
                      {preview && openMaterial === m.id && (
                        <iframe title={m.title} src={preview} className="mt-3 w-full h-[70vh] rounded-lg border border-gray-200"
                          allow="autoplay" loading="lazy" />
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="mt-12" aria-labelledby="task-title">
            <h2 id="task-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Tareas</h2>
            {assignments.length === 0 ? (
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No hay tareas para esta edición.</p>
            ) : (
              <ul className="mt-3 grid gap-4">
                {assignments.map((a) => {
                  const graded = a.submission?.score !== null && a.submission?.score !== undefined;
                  const files = a.submission?.files ?? [];
                  return (
                    <li key={a.id} className="p-5 rounded-2xl" style={card}>
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div>
                          <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{a.title}</h3>
                          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                            Entrega hasta: {formatDue(a.due_at)} · {a.max_score} pts
                          </p>
                        </div>
                        {graded && (
                          <span className="px-3 py-1 rounded-full text-xs font-semibold"
                            style={{ background: 'var(--bg-lime-soft)' }}>
                            Nota: {a.submission!.score} / {a.max_score}
                          </span>
                        )}
                      </div>
                      {a.description && <p className="mt-2 text-sm whitespace-pre-wrap">{a.description}</p>}

                      <div className="mt-4">
                        <SubmissionFiles files={files} canDelete={!graded} onDeleted={(id) => removeFile(a.id, id)} />
                      </div>

                      {graded ? (
                        a.submission?.feedback && (
                          <p className="mt-3 text-sm"><strong>Comentario del docente:</strong> {a.submission.feedback}</p>
                        )
                      ) : (
                        <div className="mt-4">
                          <SubmissionUploader assignmentId={a.id} existingCount={files.length}
                            onUploaded={(f) => addFile(a.id, f)} />
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </main>
  );
}
