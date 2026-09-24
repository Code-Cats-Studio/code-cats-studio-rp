import { useEffect } from 'react';
import Hero from '../components/home/Hero';
import CourseCard from '../components/home/CourseCard';
import { getAllCourses } from '../services/courses';
import { setPageMeta } from '../utils/seo';

export default function HomePage() {
  const courses = getAllCourses();

  useEffect(() => {
    setPageMeta(
      'Inicio',
      'Aprende desarrollo web con cursos prácticos en español',
    );
  }, []);

  return (
    <>
      <Hero />

      <section id="cursos" className="py-16 px-6" style={{ background: 'var(--bg-secondary)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-1 w-8 rounded-full" style={{ background: 'var(--verde-limon)' }} />
              <span
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                  color: 'var(--text-muted)',
                }}
              >
                Cursos disponibles
              </span>
            </div>
            <h2
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '2.5rem',
                color: 'var(--text-primary)',
                margin: 0,
              }}
            >
              ELIGE TU CAMINO
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {courses.map((course) => (
              <CourseCard
                key={course.slug}
                slug={course.slug}
                title={course.title}
                subtitle={course.subtitle}
                description={course.description}
                duration={course.duration}
                level={course.level}
                lessons={course.lessons}
                sections={course.sections}
                accentColor={course.accentColor}
                mascotImage={course.mascotImage}
                comingSoon={course.comingSoon}
                startDate={course.startDate}
              />
            ))}
          </div>
        </div>
      </section>

      <section className="py-16 px-6" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center p-6">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{ background: 'var(--bg-accent-soft)' }}
              >
                💻
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                }}
              >
                100% Práctico
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Aprende construyendo proyectos reales desde el primer día.
              </p>
            </div>
            <div className="text-center p-6">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{ background: 'var(--bg-lime-soft)' }}
              >
                🇪🇸
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                }}
              >
                En Español
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Contenido claro y directo, sin barreras de idioma.
              </p>
            </div>
            <div className="text-center p-6">
              <div
                className="w-14 h-14 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl"
                style={{ background: 'var(--bg-accent-soft)' }}
              >
                🎯
              </div>
              <h3
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.125rem',
                  fontWeight: 700,
                  margin: '0 0 0.5rem',
                }}
              >
                A tu ritmo
              </h3>
              <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', margin: 0, lineHeight: 1.6 }}>
                Sin fechas límite. Tu progreso se guarda automáticamente.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
