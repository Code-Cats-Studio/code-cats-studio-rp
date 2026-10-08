import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import TableOfContents from '../components/course/TableOfContents';
import Instructors from '../components/course/Instructors';
import {
  fetchCourseBySlug,
  fetchOfferingAvailability,
  enrollInOffering,
  checkMyEnrollment,
  getCourseSections,
  type Course,
  type CourseOffering,
  type OfferingAvailability,
} from '../services/courses';
import { useAuth } from '../context/AuthContext';
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
  const navigate = useNavigate();
  const { user, isProfileComplete, signInWithGoogle } = useAuth();

  const [course, setCourse] = useState<Course | undefined>(undefined);
  const [activeOffering, setActiveOffering] = useState<CourseOffering | null>(null);
  const [availability, setAvailability] = useState<OfferingAvailability | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Estados de inscripción
  const [isEnrolled, setIsEnrolled] = useState<boolean>(false);
  const [isEnrolling, setIsEnrolling] = useState<boolean>(false);
  const [enrollmentStatus, setEnrollmentStatus] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{
    type: 'success' | 'warning' | 'error';
    text: string;
  } | null>(null);

  const sections = courseSlug ? getCourseSections(courseSlug) : [];

  // 1. Cargar curso y oferta activa
  useEffect(() => {
    if (!courseSlug) return;

    let isMounted = true;

    async function loadCourseData() {
      setIsLoading(true);
      try {
        const foundCourse = await fetchCourseBySlug(courseSlug!);
        if (!isMounted) return;

        setCourse(foundCourse);

        if (foundCourse) {
          setPageMeta(foundCourse.title, foundCourse.description);

          // Buscar la edición abierta o la primera disponible
          const offerings = foundCourse.course_offerings || [];
          const openOffering = offerings.find((o) => o.status === 'open') || offerings[0] || null;
          setActiveOffering(openOffering);

          // Si hay una edición, consultar su disponibilidad de cupos
          if (openOffering) {
            const avail = await fetchOfferingAvailability(openOffering.id);
            if (isMounted) {
              setAvailability(avail);
            }

            // Verificar si el usuario ya está inscrito en esta edición
            if (user) {
              const myEnroll = await checkMyEnrollment(openOffering.id);
              if (isMounted && myEnroll.isEnrolled) {
                setIsEnrolled(true);
                setEnrollmentStatus(myEnroll.status || 'active');
              }
            }
          }
        }
      } catch (err) {
        console.error('[CoursePage] Error cargando información del curso:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    }

    void loadCourseData();

    return () => {
      isMounted = false;
    };
  }, [courseSlug, user]);

  if (!courseSlug) {
    return <Navigate to="/" replace />;
  }

  if (!isLoading && !course) {
    return <Navigate to="/" replace />;
  }

  const mascotSrc = `/images/mascot/${course?.mascotImage || 'cat-sitting'}.png`;
  const firstLesson = sections[0]?.lessons[0];
  const isWaitlisted = availability !== null && availability.available === 0;

  // 2. Manejador de Inscripción (Paso 4 de la guía)
  const handleEnrollment = async () => {
    setFeedbackMessage(null);

    // Si el usuario no ha iniciado sesión
    if (!user) {
      void signInWithGoogle();
      return;
    }

    // Si el perfil no está completo, redirigir a /registro con aviso
    if (!isProfileComplete) {
      setFeedbackMessage({
        type: 'warning',
        text: 'Completa tu perfil antes de inscribirte en el curso. Redirigiendo...',
      });
      setTimeout(() => {
        navigate('/registro');
      }, 1500);
      return;
    }

    if (!activeOffering) {
      setFeedbackMessage({
        type: 'error',
        text: 'No hay ediciones abiertas disponibles para este curso en este momento.',
      });
      return;
    }

    setIsEnrolling(true);

    try {
      const response = await enrollInOffering(activeOffering.id);

      if (response.error) {
        // Si el backend rechaza por perfil incompleto
        if (
          response.error.toLowerCase().includes('perfil') ||
          response.error.toLowerCase().includes('completa')
        ) {
          setFeedbackMessage({
            type: 'warning',
            text: `${response.error}. Redirigiendo a tu perfil...`,
          });
          setTimeout(() => {
            navigate('/registro');
          }, 1500);
        } else {
          setFeedbackMessage({
            type: 'error',
            text: response.error,
          });
        }
        return;
      }

      // Proceso exitoso
      if (response.status === 'active') {
        setIsEnrolled(true);
        setEnrollmentStatus('active');
        setFeedbackMessage({
          type: 'success',
          text: '¡Inscripción confirmada con éxito! Ya tienes acceso completo a las clases.',
        });
      } else if (response.status === 'waitlisted') {
        setIsEnrolled(true);
        setEnrollmentStatus('waitlisted');
        setFeedbackMessage({
          type: 'warning',
          text: 'Has quedado registrado en la Lista de espera. Si se libera un cupo, subirás automáticamente y recibirás un correo.',
        });
      }

      // Actualizar disponibilidad
      const updatedAvail = await fetchOfferingAvailability(activeOffering.id);
      if (updatedAvail) setAvailability(updatedAvail);
    } catch (err) {
      setFeedbackMessage({
        type: 'error',
        text:
          err instanceof Error
            ? err.message
            : 'Ocurrió un error inesperado al procesar la inscripción.',
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  return (
    <main>
      {/* ── Cabecera del Curso ─────────────────────────────────────────────── */}
      <div style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-5xl mx-auto px-6 py-12 flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1">
            {/* Badges y Cupos */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--verde-limon)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course?.level || 'Principiante'}
              </span>

              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course?.duration || '6 semanas'}
              </span>

              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: 'var(--bg-tertiary)',
                  color: 'var(--text-secondary)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {course?.lessons} lecciones · {course?.sections} secciones
              </span>

              {/* Indicador de Disponibilidad / Lista de Espera */}
              {availability && (
                <span
                  className="px-2.5 py-1 rounded-full text-xs font-bold transition-all"
                  style={{
                    background: isWaitlisted ? '#FEF2F2' : '#DCFCE7',
                    color: isWaitlisted ? '#DC2626' : '#16A34A',
                    border: `1px solid ${isWaitlisted ? '#FCA5A5' : '#86EFAC'}`,
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {isWaitlisted
                    ? '⚠️ Lista de espera'
                    : `🔥 ${availability.available} cupos disponibles`}
                </span>
              )}
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
              {course?.title}
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
              {course?.description}
            </p>

            {/* Mensajes de Feedback de Inscripción */}
            {feedbackMessage && (
              <div
                className="mb-4 p-3.5 rounded-xl text-xs md:text-sm font-medium flex items-center gap-2 max-w-lg"
                style={{
                  background:
                    feedbackMessage.type === 'success'
                      ? '#F0FDF4'
                      : feedbackMessage.type === 'warning'
                      ? '#FEF2F2'
                      : '#FFF1F2',
                  border: `1px solid ${
                    feedbackMessage.type === 'success'
                      ? '#86EFAC'
                      : feedbackMessage.type === 'warning'
                      ? '#FCA5A5'
                      : '#FDA4AF'
                  }`,
                  color:
                    feedbackMessage.type === 'success'
                      ? '#166534'
                      : feedbackMessage.type === 'warning'
                      ? '#991B1B'
                      : '#9F1239',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                <span>
                  {feedbackMessage.type === 'success' ? '✓' : feedbackMessage.type === 'warning' ? '⚠️' : '✕'}
                </span>
                <span>{feedbackMessage.text}</span>
              </div>
            )}

            {/* ── Botones de Acción (Inscripción / Acceso a Clases) ────────── */}
            {course?.comingSoon ? (
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
            ) : isEnrolled ? (
              // Usuario ya inscrito
              <div className="flex items-center gap-3 flex-wrap">
                {firstLesson && (
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
                      boxShadow: '0 4px 14px rgba(65,66,245,0.3)',
                    }}
                  >
                    Continuar curso →
                  </Link>
                )}
                <span
                  className="px-3.5 py-2.5 rounded-xl text-xs font-bold"
                  style={{
                    background: enrollmentStatus === 'waitlisted' ? '#FEF2F2' : '#DCFCE7',
                    color: enrollmentStatus === 'waitlisted' ? '#DC2626' : '#16A34A',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {enrollmentStatus === 'waitlisted'
                    ? 'Estás en Lista de Espera'
                    : '✓ Ya estás inscrito'}
                </span>
              </div>
            ) : (
              // Usuario no inscrito aún
              <div className="flex items-center gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={() => void handleEnrollment()}
                  disabled={isEnrolling}
                  className="inline-flex items-center justify-center gap-2 text-white font-semibold cursor-pointer rounded-xl transition-all duration-150 select-none disabled:opacity-50"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    background: isWaitlisted ? '#EF4444' : 'var(--azul-gatuno)',
                    padding: '0.875rem 1.75rem',
                    fontSize: '0.9375rem',
                    border: 'none',
                    boxShadow: isWaitlisted
                      ? '0 4px 12px rgba(239,68,68,0.25)'
                      : '0 4px 14px rgba(65,66,245,0.3)',
                  }}
                >
                  {isEnrolling ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Procesando...</span>
                    </>
                  ) : !user ? (
                    <span>Iniciar sesión para inscribirme</span>
                  ) : isWaitlisted ? (
                    <span>Unirme a la lista de espera →</span>
                  ) : (
                    <span>Inscribirme gratis al curso →</span>
                  )}
                </button>

                {firstLesson && (
                  <Link
                    to={`/${courseSlug}/${sections[0].slug}/${firstLesson.slug}`}
                    className="inline-flex items-center px-4 py-3 rounded-xl text-xs font-semibold no-underline"
                    style={{
                      background: 'var(--bg-secondary)',
                      color: 'var(--text-secondary)',
                      border: '1.5px solid var(--border)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    Ver vista previa
                  </Link>
                )}
              </div>
            )}
          </div>

          <div className="flex-shrink-0">
            <div
              className="w-52 h-52 rounded-2xl flex items-center justify-center"
              style={{
                background: `linear-gradient(135deg, ${course?.accentColor || '#4142F5'}20, ${
                  course?.accentColor || '#4142F5'
                }05)`,
                border: `1.5px solid ${course?.accentColor || '#4142F5'}30`,
              }}
            >
              <img
                src={mascotSrc}
                alt={course?.title || 'Mascota del curso'}
                className="w-44 h-44 object-contain"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ── Contenido y Temario ───────────────────────────────────────────── */}
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

      {course?.instructors && course.instructors.length > 0 && (
        <div className="max-w-5xl mx-auto px-6">
          <Instructors instructors={course.instructors} />
        </div>
      )}
    </main>
  );
}
