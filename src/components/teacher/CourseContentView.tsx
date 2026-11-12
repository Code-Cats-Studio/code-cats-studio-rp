import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchCourseForEdit, LESSON_TYPES, type CourseForm } from '../../services/courseAdmin';
import MarkdownView from '../course/MarkdownView';

// Contenido del curso visible para todo el equipo. Solo el docente principal puede editarlo.
export default function CourseContentView({ courseId, canEdit }: { courseId: string; canEdit: boolean }) {
  const [course, setCourse] = useState<CourseForm | null | undefined>(undefined);

  useEffect(() => {
    void fetchCourseForEdit(courseId).then(setCourse);
  }, [courseId]);

  if (course === undefined) return <div className="pn-skeleton" style={{ minHeight: '10rem' }} />;
  if (course === null) {
    return (
      <div className="pn-empty">
        <strong>No se pudo cargar el contenido</strong>
        <p>Puede que el curso aún no tenga módulos o que falte aplicar la migración de permisos. Recarga en unos segundos.</p>
      </div>
    );
  }

  const lessons = course.modules.reduce((n, m) => n + m.lessons.length, 0);

  return (
    <div className="pn-stack">
      <div className="pn-between">
        <p className="pn-hint m-0">
          {course.modules.length} módulos · {lessons} lecciones.{' '}
          {canEdit ? 'Eres docente principal: puedes editarlo.' : 'Solo lectura: el contenido general lo edita el docente principal.'}
        </p>
        {canEdit && <Link to={`/docente/cursos/${courseId}`} className="pn-btn pn-btn-primary">Editar contenido del curso</Link>}
      </div>

      {course.modules.length === 0 && <div className="pn-empty"><strong>Este curso aún no tiene módulos</strong></div>}

      {course.modules.map((m, i) => (
        <section key={m.id ?? i} className="pn-card" style={{ borderLeft: `5px solid ${m.color || 'var(--azul-gatuno)'}` }}>
          <h3 className="pn-title">Módulo {i + 1}: {m.title}</h3>
          {m.duration_label && <p className="pn-subtitle">{m.duration_label}</p>}
          <ul className="list-none p-0 m-0 mt-3 grid gap-2">
            {m.lessons.map((l, j) => (
              <li key={l.id ?? j}>
                <details className="pn-card" style={{ padding: '0.65rem 0.9rem', background: 'var(--bg-secondary)' }}>
                  <summary className="font-semibold">
                    {j + 1}. {l.title}
                    <span className="pn-badge ml-2">{LESSON_TYPES.find((t) => t.value === l.lesson_type)?.label ?? l.lesson_type}</span>
                    {l.duration_label && <span className="pn-muted text-xs ml-2">{l.duration_label}</span>}
                  </summary>
                  <div className="mt-3">
                    {l.description && <p className="pn-hint">{l.description}</p>}
                    {l.content_md ? <MarkdownView source={l.content_md} /> : <p className="pn-hint pn-muted">Esta lección no tiene texto.</p>}
                  </div>
                </details>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
