import { useEffect, useState } from 'react';
import Hero from '../components/home/Hero';
import CourseCard from '../components/home/CourseCard';
import { fetchPublishedCourses, type Course } from '../services/courses';
import { setPageMeta } from '../utils/seo';

export default function HomePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta(
      'Inicio',
      'Aprende desarrollo web con cursos prácticos en español'
    );

    let isMounted = true;

    async function loadCourses() {
      setIsLoading(true);
      setError(null);
      try {
        const data = await fetchPublishedCourses();
        if (isMounted) {
          setCourses(data);
        }
      } catch (err) {
        if (isMounted) {
          setError(
            err instanceof Error ? err.message : 'Error al cargar los cursos disponibles'
          );
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourses();

    return () => {
      isMounted = false;
    };
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

          {/* Estado de Carga */}
          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((skeleton) => (
                <div
                  key={skeleton}
                  className="rounded-2xl p-6 h-80 animate-pulse flex flex-col justify-between"
                  style={{
                    background: 'var(--bg-primary)',
                    border: '1.5px solid var(--border)',
                  }}
                >
                  <div>
                    <div className="h-4 w-24 rounded bg-gray-200 mb-3" />
                    <div className="h-6 w-3/4 rounded bg-gray-200 mb-2" />
                    <div className="h-3 w-1/2 rounded bg-gray-100" />
                  </div>
                  <div className="space-y-2">
                    <div className="h-3 w-full rounded bg-gray-100" />
                    <div className="h-3 w-5/6 rounded bg-gray-100" />
                  </div>
                  <div className="h-4 w-1/3 rounded bg-gray-200" />
                </div>
              ))}
            </div>
          )}

          {/* Estado de Error */}
          {!isLoading && error && (
            <div
              className="p-6 rounded-2xl text-center"
              style={{
                background: '#FEF2F2',
                border: '1.5px solid #FCA5A5',
                color: '#991B1B',
              }}
            >
              <p className="font-semibold mb-2">No se pudieron cargar los cursos</p>
              <p className="text-sm text-red-600 mb-4">{error}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white cursor-pointer"
                style={{ background: 'var(--azul-gatuno)' }}
              >
                Reintentar
              </button>
            </div>
          )}

          {/* Lista de Cursos Renderizados Dinámicamente */}
          {!isLoading && !error && (
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
          )}
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
