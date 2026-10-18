import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminCourses, type AdminCourseRow } from '../../services/courseAdmin';
import { importLocalCourse, localCoursesPending } from '../../services/courseImport';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold no-underline';

// Lista de cursos con acceso al editor. Aquí se crean los cursos nuevos (sin SQL).
export default function CoursesAdmin() {
  const [courses, setCourses] = useState<AdminCourseRow[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = () => fetchAdminCourses().then(setCourses);
  useEffect(() => {
    void load();
  }, []);

  const pending = courses ? localCoursesPending(courses.map((c) => c.slug)) : [];

  const importCourse = async (slug: string) => {
    setBusy(slug);
    setMessage(null);
    const r = await importLocalCourse(slug);
    setMessage(r.error ?? 'Curso importado: ya se puede editar, asignarle docentes y abrir ediciones.');
    await load();
    setBusy(null);
  };

  return (
    <section className="mt-10" aria-labelledby="adm-courses">
      <div className="flex items-center justify-between gap-3">
        <h2 id="adm-courses" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Cursos</h2>
        <Link to="/admin/cursos/nuevo" className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Crear curso</Link>
      </div>
      {message && <p role="status" className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
      {pending.length > 0 && (
        <div className="mt-4 p-4 rounded-xl" style={{ background: 'var(--bg-lime-soft)', border: '1px solid var(--border)' }}>
          <p className="text-sm font-semibold">Cursos que todavía viven en el código</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Se ven en la página pero no se pueden editar ni abrir inscripciones. Impórtalos a la base de datos con un clic
            (se copian sus módulos y lecciones) y desde ahí los editas.
          </p>
          <ul className="mt-3 grid gap-2">
            {pending.map((c) => (
              <li key={c.slug} className="flex flex-wrap items-center justify-between gap-2 text-sm">
                <span><strong>{c.title}</strong> <span style={{ color: 'var(--text-muted)' }}>/{c.slug}</span></span>
                <button type="button" disabled={busy !== null} onClick={() => void importCourse(c.slug)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50" style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>
                  {busy === c.slug ? 'Importando…' : 'Importar a la base'}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 grid gap-2">
        {courses === null && <li className="text-sm">Cargando…</li>}
        {courses?.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay cursos en la base de datos.</li>}
        {courses?.map((c) => {
          const open = c.editions.some((e) => e.status === 'open');
          return (
            <li key={c.id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
              <span className="text-sm">
                <strong>{c.title}</strong>{' '}
                <span style={{ color: 'var(--text-muted)' }}>
                  /{c.slug} · {c.is_published ? 'publicado' : 'borrador'} · {c.editions.length} edición(es){open ? ' · inscripciones abiertas' : ''}
                </span>
              </span>
              <Link to={`/admin/cursos/${c.id}`} className={btn} style={{ border: '1px solid var(--border)', color: 'inherit' }}>Editar</Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
