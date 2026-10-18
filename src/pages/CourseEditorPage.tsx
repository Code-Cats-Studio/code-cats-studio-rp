import { useCallback, useEffect, useState, type ChangeEvent, type ReactNode } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  LESSON_TYPES,
  LEVELS,
  MASCOTS,
  emptyCourse,
  emptyEdition,
  emptyLesson,
  emptyModule,
  fetchCourseForEdit,
  fetchEditions,
  fetchTopics,
  parseMdxLesson,
  saveCourse,
  saveEdition,
  type CourseForm,
  type EditionForm,
  type EditionStatus,
  type LessonForm,
  type ModuleForm,
} from '../services/courseAdmin';
import { getAllCourses, slugify } from '../services/courses';
import EditionHub from '../components/edition/EditionHub';
import { setPageMeta } from '../utils/seo';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const field = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const primary = { background: 'var(--azul-gatuno)', color: '#fff' } as const;
const outline = { border: '1px solid var(--border)' } as const;

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="grid gap-1 text-sm">
      <span className="font-medium">{label}</span>
      {children}
      {hint && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
    </label>
  );
}

const STATUS_LABEL: Record<EditionStatus, string> = {
  draft: 'Borrador (oculta)',
  open: 'Inscripciones abiertas',
  in_progress: 'En curso',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const copy = [...list];
  const [item] = copy.splice(from, 1);
  copy.splice(to, 0, item);
  return copy;
}

// ─── Ediciones ──────────────────────────────────────────────────────────────

function Editions({ courseId, courseTitle, published }: { courseId: string; courseTitle: string; published: boolean }) {
  const [editions, setEditions] = useState<EditionForm[]>([]);
  const [draft, setDraft] = useState<EditionForm | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [hub, setHub] = useState<string | null>(null);

  const load = useCallback(async () => setEditions(await fetchEditions(courseId)), [courseId]);
  useEffect(() => {
    void load();
  }, [load]);

  const set = <K extends keyof EditionForm>(key: K, value: EditionForm[K]) => setDraft((d) => (d ? { ...d, [key]: value } : d));

  const save = async () => {
    if (!draft) return;
    if (draft.status === 'open') {
      if (!published) {
        setMessage('Publica el curso antes de abrir inscripciones.');
        return;
      }
      const wasOpen = editions.find((e) => e.id === draft.id)?.status === 'open';
      if (!wasOpen && !window.confirm('Al abrir las inscripciones se avisa por correo a todos los usuarios. ¿Continuar?')) return;
    }
    setBusy(true);
    const error = await saveEdition(courseId, draft);
    setMessage(error ?? 'Edición guardada.');
    if (!error) setDraft(null);
    await load();
    setBusy(false);
  };

  return (
    <section className="mt-10" aria-labelledby="ed-title">
      <div className="flex items-center justify-between gap-3">
        <h2 id="ed-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Ediciones</h2>
        {!draft && <button type="button" className={btn} style={primary} onClick={() => setDraft(emptyEdition(editions.length + 1))}>Nueva edición</button>}
      </div>
      <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
        Una edición es una vuelta del curso (fechas y cupos). Los estudiantes se inscriben cuando está en «Inscripciones abiertas».
      </p>
      {message && <p role="status" className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}

      {draft && (
        <div className="mt-4 p-4 rounded-xl grid gap-3" style={card}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Nombre"><input className={field} value={draft.label} onChange={(e) => set('label', e.target.value)} /></Field>
            <Field label="Estado">
              <select className={field} value={draft.status} onChange={(e) => set('status', e.target.value as EditionStatus)}>
                {Object.entries(STATUS_LABEL).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field label="Cupo total"><input type="number" min={1} className={field} value={draft.capacity} onChange={(e) => set('capacity', Number(e.target.value))} /></Field>
          </div>
          <div className="grid sm:grid-cols-4 gap-3">
            <Field label="Abre inscripción (Bolivia)"><input type="datetime-local" className={field} value={draft.enrollment_opens_at} onChange={(e) => set('enrollment_opens_at', e.target.value)} /></Field>
            <Field label="Cierra inscripción"><input type="datetime-local" className={field} value={draft.enrollment_closes_at} onChange={(e) => set('enrollment_closes_at', e.target.value)} /></Field>
            <Field label="Inicio del curso"><input type="date" className={field} value={draft.starts_on} onChange={(e) => set('starts_on', e.target.value)} /></Field>
            <Field label="Fin del curso"><input type="date" className={field} value={draft.ends_on} onChange={(e) => set('ends_on', e.target.value)} /></Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Nota mínima para aprobar" hint="0 a 100"><input type="number" min={0} max={100} className={field} value={draft.pass_score} onChange={(e) => set('pass_score', Number(e.target.value))} /></Field>
            <Field label="Asistencia mínima (%)" hint="0 = no se exige"><input type="number" min={0} max={100} className={field} value={draft.min_attendance_pct} onChange={(e) => set('min_attendance_pct', Number(e.target.value))} /></Field>
            <Field label="Avance mínimo (%)" hint="0 = no se exige"><input type="number" min={0} max={100} className={field} value={draft.min_progress_pct} onChange={(e) => set('min_progress_pct', Number(e.target.value))} /></Field>
          </div>
          <div className="flex gap-2">
            <button type="button" disabled={busy} className={btn} style={primary} onClick={() => void save()}>Guardar edición</button>
            <button type="button" className={btn} style={outline} onClick={() => setDraft(null)}>Cancelar</button>
          </div>
        </div>
      )}

      <ul className="mt-4 grid gap-2">
        {editions.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Este curso aún no tiene ediciones: sin una edición abierta nadie puede inscribirse.</li>}
        {editions.map((e) => (
          <li key={e.id} className="p-3 rounded-xl" style={card}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="text-sm"><strong>{e.label}</strong> <span style={{ color: 'var(--text-muted)' }}>· {STATUS_LABEL[e.status]} · cupo {e.capacity}{e.starts_on ? ` · inicia ${e.starts_on}` : ''}</span></span>
              <span className="flex gap-2">
                <button type="button" className={btn} style={primary} onClick={() => setHub(hub === e.id ? null : (e.id ?? null))}>
                  {hub === e.id ? 'Cerrar gestión' : 'Gestionar'}
                </button>
                <button type="button" className={btn} style={outline} onClick={() => setDraft(e)}>Editar datos</button>
              </span>
            </div>
            {hub === e.id && e.id && <EditionHub offeringId={e.id} courseTitle={courseTitle} canManageTeam />}
          </li>
        ))}
      </ul>
    </section>
  );
}

// ─── Lección ────────────────────────────────────────────────────────────────

function LessonEditor({ lesson, index, total, onChange, onMove, onRemove }: {
  lesson: LessonForm; index: number; total: number;
  onChange: (l: LessonForm) => void; onMove: (to: number) => void; onRemove: () => void;
}) {
  const [open, setOpen] = useState(!lesson.id && !lesson.title);
  const set = <K extends keyof LessonForm>(key: K, value: LessonForm[K]) => onChange({ ...lesson, [key]: value });

  const importMdx = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const parsed = parseMdxLesson(await file.text());
    onChange({ ...lesson, ...Object.fromEntries(Object.entries(parsed).filter(([, v]) => v !== undefined && v !== '')) } as LessonForm);
    setOpen(true);
  };

  return (
    <div className="rounded-lg" style={outline}>
      <div className="flex flex-wrap items-center gap-2 px-3 py-2">
        <button type="button" className="text-left flex-1 min-w-0 cursor-pointer" onClick={() => setOpen(!open)} aria-expanded={open}>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Lección {index + 1}</span>{' '}
          <span className="font-medium text-sm truncate">{lesson.title || 'Sin título'}</span>
        </button>
        <button type="button" className={btn} style={outline} onClick={() => onMove(index - 1)} disabled={index === 0} aria-label="Subir lección">↑</button>
        <button type="button" className={btn} style={outline} onClick={() => onMove(index + 1)} disabled={index === total - 1} aria-label="Bajar lección">↓</button>
        <button type="button" className={btn} style={outline} onClick={onRemove} aria-label="Quitar lección">Quitar</button>
      </div>
      {open && (
        <div className="grid gap-3 p-3" style={{ borderTop: '1px solid var(--border)' }}>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2"><Field label="Título"><input className={field} value={lesson.title} onChange={(e) => set('title', e.target.value)} /></Field></div>
            <Field label="Tipo">
              <select className={field} value={lesson.lesson_type} onChange={(e) => set('lesson_type', e.target.value as LessonForm['lesson_type'])}>
                {LESSON_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2"><Field label="Descripción corta"><input className={field} maxLength={300} value={lesson.description} onChange={(e) => set('description', e.target.value)} /></Field></div>
            <Field label="Duración" hint="Ej.: 1h 30min"><input className={field} value={lesson.duration_label} onChange={(e) => set('duration_label', e.target.value)} /></Field>
          </div>
          <Field label="Temas (uno por línea)"><textarea className={field} rows={3} value={lesson.topics} onChange={(e) => set('topics', e.target.value)} /></Field>
          <Field label="Video de YouTube (opcional)" hint="Pega el enlace del video «No listado». Si lo agregas, el avance se mide por lo que el estudiante ve.">
            <input className={field} value={lesson.youtube} placeholder="https://youtu.be/xxxxxxxxxxx" onChange={(e) => set('youtube', e.target.value)} />
          </Field>
          <Field label="Contenido (Markdown)" hint="Admite títulos (#), listas (-), **negrita**, `código`, bloques ``` y enlaces.">
            <textarea className={`${field} font-mono`} rows={10} value={lesson.content_md} onChange={(e) => set('content_md', e.target.value)} />
          </Field>
          <div className="flex flex-wrap items-center gap-4 text-sm">
            <label className="flex items-center gap-2"><input type="checkbox" checked={lesson.is_preview} onChange={(e) => set('is_preview', e.target.checked)} /> Vista previa gratuita (la ve cualquiera)</label>
            <label className="flex items-center gap-2">Se completa al ver el
              <input type="number" min={5} max={100} className="w-16 px-2 py-1 rounded border border-gray-300" value={Math.round(lesson.completion_threshold * 100)}
                onChange={(e) => set('completion_threshold', Math.min(1, Math.max(0.05, Number(e.target.value) / 100)))} /> % del video
            </label>
            <label className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer" style={outline}>
              Importar archivo .mdx
              <input type="file" accept=".mdx,.md,text/markdown" className="sr-only" onChange={(e) => void importMdx(e)} />
            </label>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Página ─────────────────────────────────────────────────────────────────

export default function CourseEditorPage({ mode = 'admin' }: { mode?: 'admin' | 'teacher' } = {}) {
  const isTeacher = mode === 'teacher';
  const { courseId } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState<CourseForm | null>(courseId ? null : emptyCourse());
  const [slugTouched, setSlugTouched] = useState(Boolean(courseId));
  const [topics, setTopics] = useState<{ id: number; name: string }[]>([]);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const [missing, setMissing] = useState(false);

  useEffect(() => {
    setPageMeta(courseId ? 'Editar curso' : 'Crear curso', 'Crear y editar cursos de Code Cats Studio');
    void fetchTopics().then(setTopics);
    if (courseId) {
      void fetchCourseForEdit(courseId).then((f) => (f ? setForm(f) : setMissing(true)));
    }
  }, [courseId]);

  if (missing) {
    return <main className="max-w-3xl mx-auto px-6 py-12"><p>No encontramos ese curso. <Link to="/admin" style={{ color: 'var(--azul-gatuno)' }}>Volver al panel</Link></p></main>;
  }
  if (!form) return <main className="max-w-3xl mx-auto px-6 py-12"><p>Cargando…</p></main>;

  const set = <K extends keyof CourseForm>(key: K, value: CourseForm[K]) => setForm((f) => (f ? { ...f, [key]: value } : f));
  const setModule = (mi: number, m: ModuleForm) => set('modules', form.modules.map((x, i) => (i === mi ? m : x)));

  const handleSave = async () => {
    setMessage(null);
    if (!isTeacher && !form.id && getAllCourses().some((c) => c.slug === form.slug)) {
      setMessage({ type: 'error', text: 'Ese enlace ya lo usa un curso que vive en el código. Elige otro.' });
      return;
    }
    setBusy(true);
    const result = await saveCourse(form);
    setBusy(false);
    if (result.error) {
      setMessage({ type: 'error', text: result.error });
      return;
    }
    setMessage({ type: 'ok', text: form.is_published ? 'Curso guardado y publicado.' : 'Curso guardado como borrador.' });
    if (!form.id && result.id) {
      navigate(`/admin/cursos/${result.id}`, { replace: true });
    } else if (result.id) {
      const fresh = await fetchCourseForEdit(result.id);
      if (fresh) setForm(fresh);
    }
  };

  const confirmRemove = (what: string) => window.confirm(`¿Quitar ${what}? Se borra al guardar el curso.`);

  return (
    <main className="max-w-4xl mx-auto px-6 py-10 pb-28" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <Link to={isTeacher ? '/docente' : '/admin'} className="text-sm no-underline" style={{ color: 'var(--azul-gatuno)' }}>← {isTeacher ? 'Panel del docente' : 'Panel de administración'}</Link>
      <h1 className="mt-2" style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>
        {form.id ? 'Editar curso' : 'Crear curso'}
      </h1>

      {isTeacher && (
        <p className="mt-3 text-sm p-3 rounded-xl" style={{ background: 'var(--bg-lime-soft)', border: '1px solid var(--border)' }}>
          Como docente principal puedes editar los textos, los módulos y las lecciones. El enlace, el nivel, la publicación y las
          ediciones los administra un administrador.
        </p>
      )}

      {/* Datos del curso */}
      <section className="mt-6 p-5 rounded-2xl grid gap-4" style={card} aria-labelledby="c-data">
        <h2 id="c-data" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem' }}>Datos del curso</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <Field label="Título">
            <input className={field} value={form.title} maxLength={150} placeholder="JavaScript"
              onChange={(e) => { set('title', e.target.value); if (!slugTouched) set('slug', slugify(e.target.value)); }} />
          </Field>
          <Field label="Enlace del curso" hint={`Será la dirección /${form.slug || 'enlace'}. Solo minúsculas, números y guiones.`}>
            <input className={field} value={form.slug} maxLength={60} disabled={isTeacher} onChange={(e) => { setSlugTouched(true); set('slug', slugify(e.target.value)); }} />
          </Field>
        </div>
        <Field label="Subtítulo" hint="Una frase que se ve en la tarjeta del curso."><input className={field} maxLength={160} value={form.subtitle} onChange={(e) => set('subtitle', e.target.value)} /></Field>
        <Field label="Descripción"><textarea className={field} rows={3} value={form.description} onChange={(e) => set('description', e.target.value)} /></Field>
        <div className="grid sm:grid-cols-3 gap-4">
          <Field label="Nivel"><select className={field} value={form.level} disabled={isTeacher} onChange={(e) => set('level', e.target.value)}>{LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}</select></Field>
          <Field label="Tema">
            <select className={field} value={form.topic_id} disabled={isTeacher} onChange={(e) => set('topic_id', e.target.value)}>
              <option value="">Sin tema</option>
              {topics.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </Field>
          <Field label="Duración" hint="Ej.: 4 semanas · 12 clases · 18 horas"><input className={field} maxLength={120} value={form.duration_label} onChange={(e) => set('duration_label', e.target.value)} /></Field>
        </div>
        <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-end">
          <Field label="Mascota de la tarjeta">
            <select className={field} value={form.mascot_image} onChange={(e) => set('mascot_image', e.target.value)}>
              {MASCOTS.map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </Field>
          <img src={`/images/mascot/${form.mascot_image}.png`} alt="" className="h-20 w-auto" />
        </div>
        <Field label="Color de acento"><input type="color" className="h-9 w-20 rounded border border-gray-300" value={form.accent_color} onChange={(e) => set('accent_color', e.target.value.toUpperCase())} /></Field>
        <Field label="Qué aprenderás (uno por línea)" hint="Si lo dejas vacío se muestran los nombres de los módulos.">
          <textarea className={field} rows={4} value={form.learning_outcomes} onChange={(e) => set('learning_outcomes', e.target.value)} />
        </Field>
      </section>

      {/* Módulos y lecciones */}
      <section className="mt-8" aria-labelledby="c-mods">
        <div className="flex items-center justify-between gap-3">
          <h2 id="c-mods" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.15rem' }}>Módulos y lecciones</h2>
          <button type="button" className={btn} style={primary} onClick={() => set('modules', [...form.modules, emptyModule()])}>Agregar módulo</button>
        </div>
        <div className="mt-4 grid gap-4">
          {form.modules.map((mod, mi) => (
            <div key={mod.id ?? `new-${mi}`} className="p-4 rounded-2xl grid gap-3" style={card}>
              <div className="flex flex-wrap items-end gap-3">
                <div className="grow min-w-[12rem]"><Field label={`Módulo ${mi + 1}`}><input className={field} value={mod.title} placeholder="Fundamentos" onChange={(e) => setModule(mi, { ...mod, title: e.target.value })} /></Field></div>
                <div className="w-32"><Field label="Duración"><input className={field} value={mod.duration_label} placeholder="4h 30min" onChange={(e) => setModule(mi, { ...mod, duration_label: e.target.value })} /></Field></div>
                <Field label="Color"><input type="color" className="h-9 w-14 rounded border border-gray-300" value={mod.color || '#4142F5'} onChange={(e) => setModule(mi, { ...mod, color: e.target.value })} /></Field>
                <div className="flex gap-2">
                  <button type="button" className={btn} style={outline} disabled={mi === 0} onClick={() => set('modules', move(form.modules, mi, mi - 1))} aria-label="Subir módulo">↑</button>
                  <button type="button" className={btn} style={outline} disabled={mi === form.modules.length - 1} onClick={() => set('modules', move(form.modules, mi, mi + 1))} aria-label="Bajar módulo">↓</button>
                  <button type="button" className={btn} style={outline} onClick={() => confirmRemove(`el módulo «${mod.title || mi + 1}» y sus lecciones`) && set('modules', form.modules.filter((_, i) => i !== mi))}>Quitar</button>
                </div>
              </div>
              <div className="grid gap-2">
                {mod.lessons.map((lesson, li) => (
                  <LessonEditor key={lesson.id ?? `new-${mi}-${li}`} lesson={lesson} index={li} total={mod.lessons.length}
                    onChange={(l) => setModule(mi, { ...mod, lessons: mod.lessons.map((x, i) => (i === li ? l : x)) })}
                    onMove={(to) => setModule(mi, { ...mod, lessons: move(mod.lessons, li, to) })}
                    onRemove={() => confirmRemove(`la lección «${lesson.title || li + 1}»`) && setModule(mi, { ...mod, lessons: mod.lessons.filter((_, i) => i !== li) })} />
                ))}
              </div>
              <div><button type="button" className={btn} style={outline} onClick={() => setModule(mi, { ...mod, lessons: [...mod.lessons, emptyLesson()] })}>Agregar lección</button></div>
            </div>
          ))}
          {form.modules.length === 0 && <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Agrega al menos un módulo con una lección para poder publicar.</p>}
        </div>
      </section>

      {form.id && !isTeacher ? <Editions courseId={form.id} courseTitle={form.title} published={form.is_published} /> : (
        <p className="mt-8 text-sm" style={{ color: 'var(--text-muted)' }}>Cuando guardes el curso podrás crear sus ediciones (fechas y cupos) para abrir inscripciones.</p>
      )}

      {/* Barra de guardado */}
      <div className="fixed bottom-0 inset-x-0 z-30 px-6 py-3" style={{ background: 'rgba(255,255,255,0.95)', borderTop: '1px solid var(--border)', backdropFilter: 'blur(8px)' }}>
        <div className="max-w-4xl mx-auto flex flex-wrap items-center gap-4">
          {!isTeacher && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={form.is_published} onChange={(e) => set('is_published', e.target.checked)} />
              Publicado (aparece en el catálogo)
            </label>
          )}
          <button type="button" disabled={busy} className="px-5 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50" style={primary} onClick={() => void handleSave()}>
            {busy ? 'Guardando…' : 'Guardar curso'}
          </button>
          {form.id && form.is_published && <Link to={`/${form.slug}`} className="text-sm no-underline" style={{ color: 'var(--azul-gatuno)' }} target="_blank">Ver en la web ↗</Link>}
          {message && <span role={message.type === 'error' ? 'alert' : 'status'} className="text-sm" style={{ color: message.type === 'error' ? 'var(--error)' : 'var(--text-primary)' }}>{message.text}</span>}
        </div>
      </div>
    </main>
  );
}
