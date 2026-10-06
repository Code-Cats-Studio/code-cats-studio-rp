import { useEffect } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import TableOfContents from '../components/course/TableOfContents';
import Instructors from '../components/course/Instructors';
import { getCourseBySlug, getCourseSections } from '../services/courses';
import { setPageMeta } from '../utils/seo';

const schedule = [
  { week: '1', content: 'Fundamentos HTML + Primeros Estilos', instructor: 'Jhona' },
  { week: '2', content: 'CSS Intermedio & Box Model', instructor: 'Jhona' },
  { week: '3', content: 'Flexbox Completo', instructor: 'Jhona' },
  { week: '4', content: 'HTML Semántico & Posicionamiento', instructor: 'Arturo' },
  { week: '5', content: 'CSS Grid', instructor: 'Arturo' },
  { week: '6', content: 'Proyecto Final Integrador', instructor: 'Instructor C' },
];

const learningItems = [
  'HTML semántico y accesible',
  'CSS desde cero hasta positioning',
  'Flexbox para layouts 1D',
  'CSS Grid para layouts 2D',
  'Buenas prácticas del mundo real',
  'Herramientas de desarrollo',
];

export default function CoursePage() {
  const { courseSlug } = useParams();
  const course = courseSlug ? getCourseBySlug(courseSlug) : undefined;
  const sections = courseSlug ? getCourseSections(courseSlug) : [];

  useEffect(() => {
    if (course) {
      setPageMeta(course.title, course.description);
    }
  }, [course]);

  if (!courseSlug || !course) {
    return <Navigate to="/" replace />;
  }

  const mascotSrc = `/images/mascot/${course.mascotImage}.png`;
  const firstLesson = sections[0]?.lessons[0];

  return (
    <main>
      <div style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            <div className="flex flex-wrap gap-2 mb-4">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--verde-limon)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course.level}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course.duration}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course.lessons} lecciones · {course.sections} secciones
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(2rem, 5vw, 3.5rem)',
                color: 'var(--text-primary)',
                margin: '0 0 0.75rem',
                lineHeight: 1.05,
                letterSpacing: '0.02em',
              }}
            >
              {course.title}
            </h1>
            <p
              style={{
                fontSize: '1.125rem',
                color: 'var(--text-secondary)',
                margin: '0 0 1.5rem',
                lineHeight: 1.6,
                maxWidth: '50ch',
              }}
            >
              {course.description}
            </p>

            {course.comingSoon ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                  style={{
                    background: 'var(--bg-tertiary)',
                    color: 'var(--text-muted)',
                    fontFamily: 'var(--font-heading)',
                    border: '1.5px dashed var(--border-hover)',
                  }}
                >
                  🔔 Próximamente
                </span>
                {course.startDate && (
                  <span
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-semibold"
                    style={{
                      background: 'var(--bg-accent-soft)',
                      color: 'var(--azul-gatuno)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    📅 Inicio: {course.startDate}
                  </span>
                )}
              </div>
            ) : (
              firstLesson && (
                <Link
                  to={`/${courseSlug}/${sections[0].slug}/${firstLesson.slug}`}
                  className="inline-flex items-center no-underline"
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    background: 'var(--azul-gatuno)',
                    color: 'white',
                    fontFamily: 'var(--font-heading)',
                    fontWeight: 600,
                    padding: '0.875rem 1.75rem',
                    borderRadius: '0.625rem',
                    fontSize: '0.9375rem',
                  }}
                >
                  Comenzar el curso →
                </Link>
              )
            )}
          </div>

          <div className="flex-shrink-0">
            <div
              className="w-52 h-52 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${course.accentColor}20, ${course.accentColor}05)`,
                border: `1.5px solid ${course.accentColor}30`,
              }}
            >
              <img src={mascotSrc} alt={course.title} className="w-44 h-44 object-contain" />
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
          <div className="lg:col-span-2">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-1 w-6 rounded-full" style={{ background: 'var(--verde-limon)' }} />
              <h2
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.25rem',
                  fontWeight: 700,
                  margin: 0,
                  color: 'var(--text-primary)',
                }}
              >
                Contenido del curso
              </h2>
            </div>
            <TableOfContents courseSlug={courseSlug} sections={sections} />
          </div>

          <div className="space-y-6">
            <div
              className="rounded-xl p-5"
              style={{ background: 'var(--bg-secondary)', border: '1.5px solid var(--border)' }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  margin: '0 0 1rem',
                  color: 'var(--text-primary)',
                }}
              >
                📅 Cronograma (6 semanas)
              </h3>
              <div className="space-y-3">
                {schedule.map((item) => (
                  <div key={item.week} className="flex gap-3">
                    <span
                      className="flex-shrink-0 w-16 text-xs font-bold py-1 px-2 rounded-md text-center"
                      style={{
                        background: 'var(--verde-limon)',
                        color: 'var(--text-primary)',
                        fontFamily: 'var(--font-heading)',
                      }}
                    >
                      Sem. {item.week}
                    </span>
                    <div>
                      <span style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>
                        {item.content}
                      </span>
                      <span
                        style={{
                          fontSize: '0.6875rem',
                          color: 'var(--text-muted)',
                          display: 'block',
                          fontFamily: 'var(--font-heading)',
                        }}
                      >
                        — {item.instructor}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div
              className="rounded-xl p-5"
              style={{
                background: 'var(--bg-accent-soft)',
                border: '1.5px solid color-mix(in srgb, var(--azul-gatuno) 19%, transparent)',
              }}
            >
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.9375rem',
                  fontWeight: 700,
                  margin: '0 0 0.75rem',
                  color: 'var(--azul-gatuno)',
                }}
              >
                ✨ Qué aprenderás
              </h3>
              <ul className="m-0 p-0 list-none space-y-2">
                {learningItems.map((item) => (
                  <li
                    key={item}
                    className="flex items-start gap-2"
                    style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}
                  >
                    <span style={{ color: 'var(--azul-gatuno)', fontWeight: 'bold', flexShrink: 0 }}>✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>

      {course.instructors && course.instructors.length > 0 && (
        <div className="max-w-5xl mx-auto px-6">
          <Instructors instructors={course.instructors} />
        </div>
      )}
    </main>
  );
}
