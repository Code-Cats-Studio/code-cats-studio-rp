import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchAdminCourses, type AdminCourseRow } from '../../services/courseAdmin';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold no-underline';

// Lista de cursos con acceso al editor. Aquí se crean los cursos nuevos (sin SQL).
export default function CoursesAdmin() {
  const [courses, setCourses] = useState<AdminCourseRow[] | null>(null);

  useEffect(() => {
    void fetchAdminCourses().then(setCourses);
  }, []);

  return (
    <section className="mt-10" aria-labelledby="adm-courses">
      <div className="flex items-center justify-between gap-3">
        <h2 id="adm-courses" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>Cursos</h2>
        <Link to="/admin/cursos/nuevo" className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Crear curso</Link>
      </div>
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
