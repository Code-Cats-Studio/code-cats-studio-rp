import { useCallback, useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  certificatePdfUrl,
  dropMyEnrollment,
  fetchMyCertificates,
  fetchMyEnrollments,
  fetchMyProgress,
  type MyCertificate,
  type MyEnrollment,
  type MyProgress,
} from '../services/account';
import CheckinForm from '../components/course/CheckinForm';
import { buildGoogleCalendarUrl } from '../services/liveSessions';
import { fetchMyUpcomingClasses, type UpcomingClass } from '../services/schedules';
import { setPageMeta } from '../utils/seo';

const STATUS_LABEL: Record<MyEnrollment['status'], string> = {
  active: 'En curso',
  waitlisted: 'Lista de espera',
  pending_payment: 'Pago pendiente',
  completed: 'Aprobado',
  failed: 'No aprobado',
  dropped: 'Baja',
};

export default function MisCursosPage() {
  const { user, isLoading } = useAuth();
  const [enrollments, setEnrollments] = useState<MyEnrollment[]>([]);
  const [progress, setProgress] = useState<Record<string, MyProgress | null>>({});
  const [certificates, setCertificates] = useState<MyCertificate[]>([]);
  const [classes, setClasses] = useState<UpcomingClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta('Mis cursos', 'Tus inscripciones, avance y certificados en Code Cats Studio');
  }, []);

  const load = useCallback(async (userId: string) => {
    setLoading(true);
    const [list, certs, upcoming] = await Promise.all([
      fetchMyEnrollments(userId),
      fetchMyCertificates(),
      fetchMyUpcomingClasses(),
    ]);
    setEnrollments(list);
    setCertificates(certs);
    setClasses(upcoming);
    const entries = await Promise.all(
      list
        .filter((e) => e.offering && (e.status === 'active' || e.status === 'completed'))
        .map(async (e) => [e.offering!.id, await fetchMyProgress(e.offering!.id)] as const)
    );
    setProgress(Object.fromEntries(entries));
    setLoading(false);
  }, []);

  useEffect(() => {
    if (user) void load(user.id);
  }, [user, load]);

  if (isLoading) return null;
  if (!user) return <Navigate to="/login" replace />;

  const handleDrop = async (offeringId: string, title: string) => {
    if (!window.confirm(`¿Darte de baja de «${title}»?`)) return;
    const { error } = await dropMyEnrollment(offeringId);
    setMessage(error ?? 'Te diste de baja del curso.');
    await load(user.id);
  };

  const visible = enrollments.filter((e) => e.status !== 'dropped');

  return (
    <main className="max-w-4xl mx-auto px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>
        Mis cursos
      </h1>

      {message && (
        <p role="status" className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      )}

      {classes.length > 0 && (
        <section className="mt-8" aria-labelledby="classes-title">
          <h2 id="classes-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', letterSpacing: '0.05em' }}>
            Próximas clases
          </h2>
          <ul className="mt-4 grid gap-3">
            {classes.map((c) => (
              <li
                key={c.id}
                className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-3"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                <div>
                  <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700 }}>{c.title}</p>
                  <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                    {c.course_title}{c.group_name ? ` · ${c.group_name}` : ''}
                  </p>
                  <p className="text-sm capitalize" style={{ color: 'var(--text-secondary)' }}>
                    {new Date(c.starts_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' })}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {c.join_url ? (
                    <a href={c.join_url} target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl text-sm font-semibold no-underline"
                      style={{ fontFamily: 'var(--font-heading)', background: 'var(--azul-gatuno)', color: '#fff' }}>
                      Entrar a la clase
                    </a>
                  ) : (
                    <span className="px-3 py-2 text-xs" style={{ color: 'var(--text-muted)' }}>El docente aún no puso el enlace de la clase</span>
                  )}
                  <a href={buildGoogleCalendarUrl({ ...c, meet_url: c.join_url }, c.course_title)} target="_blank" rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl text-sm font-semibold no-underline"
                    style={{ fontFamily: 'var(--font-heading)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Agregar al calendario
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <div className="mt-6 max-w-md">
            <CheckinForm />
          </div>
        </section>
      )}

      {loading ? (
        <p className="mt-8">Cargando…</p>
      ) : visible.length === 0 ? (
        <p className="mt-8" style={{ color: 'var(--text-secondary)' }}>
          Todavía no estás inscrito en ningún curso.{' '}
          <Link to="/cursos" className="underline" style={{ color: 'var(--azul-gatuno)' }}>
            Ver catálogo
          </Link>
        </p>
      ) : (
        <ul className="mt-8 grid gap-4">
          {visible.map((e) => {
            const p = e.offering ? progress[e.offering.id] : null;
            const title = e.offering?.course?.title ?? 'Curso';
            return (
              <li
                key={e.id}
                className="p-5 rounded-2xl"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h2 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.15rem', fontWeight: 700 }}>
                      {e.offering?.course ? (
                        <Link to={`/${e.offering.course.slug}`}>{title}</Link>
                      ) : (
                        title
                      )}
                    </h2>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                      {e.offering?.label}
                    </p>
                  </div>
                  <span
                    className="px-3 py-1 rounded-full text-xs font-semibold"
                    style={{ background: 'var(--bg-accent-soft)', color: 'var(--azul-gatuno)' }}
                  >
                    {STATUS_LABEL[e.status]}
                  </span>
                </div>

                {p && (
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                    <div>
                      <dt style={{ color: 'var(--text-muted)' }}>Avance</dt>
                      <dd className="font-semibold">{Math.round(p.progress_pct)}%</dd>
                    </div>
                    <div>
                      <dt style={{ color: 'var(--text-muted)' }}>Asistencia</dt>
                      <dd className="font-semibold">{Math.round(p.attendance_pct)}%</dd>
                    </div>
                    {e.final_score !== null && (
                      <div>
                        <dt style={{ color: 'var(--text-muted)' }}>Nota final</dt>
                        <dd className="font-semibold">{e.final_score}</dd>
                      </div>
                    )}
                  </dl>
                )}

                {e.offering && (e.status === 'active' || e.status === 'completed') && (
                  <Link to={`/tareas/${e.offering.id}`} className="mt-4 mr-4 inline-block text-sm font-semibold underline"
                    style={{ color: 'var(--azul-gatuno)' }}>
                    Tareas y material
                  </Link>
                )}

                {e.offering && (e.status === 'active' || e.status === 'waitlisted') && (
                  <button
                    type="button"
                    onClick={() => void handleDrop(e.offering!.id, title)}
                    className="mt-4 text-xs underline cursor-pointer"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Darme de baja
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {certificates.length > 0 && (
        <section className="mt-12" aria-labelledby="certs-title">
          <h2 id="certs-title" style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', letterSpacing: '0.05em' }}>
            Mis certificados
          </h2>
          <ul className="mt-4 grid gap-3">
            {certificates.map((c) => (
              <li
                key={c.id}
                className="p-4 rounded-xl flex flex-wrap items-center justify-between gap-2"
                style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
              >
                <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 600 }}>
                  {c.course_title_snapshot}
                  {c.revoked_at && ' (revocado)'}
                </span>
                <span className="flex gap-4 text-sm">
                  <a href={certificatePdfUrl(c.verification_code)} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--azul-gatuno)' }}>
                    Descargar PDF
                  </a>
                  <Link to={`/verificar/${c.verification_code}`} style={{ color: 'var(--azul-gatuno)' }}>
                    Verificar
                  </Link>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
