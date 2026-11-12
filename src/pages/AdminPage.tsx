import { useCallback, useEffect, useState } from 'react';
import { fetchAdminOfferings, fetchPendingApplications, reviewApplication, type AdminOffering, type PendingApplication } from '../services/admin';
import { fetchPendingEnrollmentRequests, reviewEnrollmentRequest, type EnrollmentRequestRow } from '../services/enrollmentRequests';
import CoursesAdmin from '../components/admin/CoursesAdmin';
import EditionsAdmin from '../components/admin/EditionsAdmin';
import EventsAdmin from '../components/admin/EventsAdmin';
import EmailsAdmin from '../components/admin/EmailsAdmin';
import StaffAdmin from '../components/admin/StaffAdmin';
import PeopleAdmin from '../components/admin/PeopleAdmin';
import PanelTabs, { usePanelTab, type PanelTab } from '../components/ui/PanelTabs';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { setPageMeta } from '../utils/seo';
import { useToast } from '../context/ToastContext';

type Section = 'resumen' | 'solicitudes' | 'cursos' | 'ediciones' | 'personas' | 'eventos' | 'correos';

const PERMISSIONS: { who: string; can: string }[] = [
  { who: 'Administrador', can: 'Todo: cursos, ediciones, equipos, grupos, personas, eventos y correos.' },
  { who: 'Docente principal de una edición', can: 'Edita el contenido del curso, los cupos de la edición y de cada grupo, programa clases de toda la edición, ve a todos los estudiantes y crea tareas y material.' },
  { who: 'Docente de apoyo / con grupo', can: 'Ve el curso y el equipo (sin editar el contenido general). Edita el horario de su grupo y gestiona clases, asistencia, tareas y calificaciones de su grupo.' },
];

export default function AdminPage() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [requests, setRequests] = useState<EnrollmentRequestRow[]>([]);
  const [offerings, setOfferings] = useState<AdminOffering[] | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  useEffect(() => {
    setPageMeta('Panel de administración', 'Gestión de cursos, ediciones, docentes, solicitudes y eventos');
  }, []);

  const load = useCallback(async () => {
    const [apps, reqs, offs] = await Promise.all([fetchPendingApplications(), fetchPendingEnrollmentRequests(), fetchAdminOfferings()]);
    setApplications(apps);
    setRequests(reqs);
    setOfferings(offs);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(['teacher_applications', 'enrollment_requests', 'course_offerings'], () => void load());

  const run = async (action: () => Promise<string | null>, okText: string) => {
    setBusy(true);
    toast.result(await action(), okText);
    await load();
    setBusy(false);
  };

  const pending = applications.length + requests.length;
  const tabs: PanelTab<Section>[] = [
    { id: 'resumen', label: 'Resumen', icon: '🏠' },
    { id: 'solicitudes', label: 'Solicitudes', icon: '📨', count: pending },
    { id: 'cursos', label: 'Cursos', icon: '📚' },
    { id: 'ediciones', label: 'Ediciones y grupos', icon: '🗓️' },
    { id: 'personas', label: 'Personas y roles', icon: '👥' },
    { id: 'eventos', label: 'Eventos', icon: '🎟️' },
    { id: 'correos', label: 'Correos', icon: '✉️' },
  ];
  const [section, setSection] = usePanelTab<Section>('seccion', tabs, 'resumen');
  const open = offerings?.filter((o) => o.status === 'open' || o.status === 'in_progress').length ?? 0;

  return (
    <main className="pn-page">
      <header className="pn-hero">
        <span className="pn-eyebrow">Administración</span>
        <h1>Panel de administración</h1>
        <p>Cursos, ediciones, docentes, solicitudes y eventos. Todo se gestiona desde aquí, sin tocar la base de datos.</p>
        <span className="pn-live-pill mt-3"><i /> Se actualiza solo cuando algo cambia</span>
      </header>

      <PanelTabs label="Secciones de administración" tabs={tabs} value={section} onChange={setSection} />

      <div className="pn-scope pn-admin-section">
        {section === 'resumen' && (
          <div className="pn-stack-lg">
            <dl className="pn-stats" style={{ margin: 0 }}>
              <div className={`pn-stat ${applications.length ? 'pn-stat-warn' : ''}`}><dt>Solicitudes de docente</dt><dd>{applications.length}</dd></div>
              <div className={`pn-stat ${requests.length ? 'pn-stat-warn' : ''}`}><dt>Solicitudes para cursar</dt><dd>{requests.length}</dd></div>
              <div className="pn-stat"><dt>Ediciones activas</dt><dd>{offerings ? open : '…'}</dd></div>
              <div className="pn-stat"><dt>Ediciones en total</dt><dd>{offerings ? offerings.length : '…'}</dd></div>
            </dl>

            {pending > 0 && (
              <div className="pn-callout pn-callout-warn pn-between" role="status">
                <span>Tienes {pending} {pending === 1 ? 'solicitud pendiente' : 'solicitudes pendientes'} de revisar.</span>
                <button type="button" className="pn-btn pn-btn-sm pn-btn-primary" onClick={() => setSection('solicitudes')}>Revisar</button>
              </div>
            )}

            <section className="pn-card pn-stack" aria-labelledby="ad-steps">
              <div>
                <h2 id="ad-steps" className="pn-title">Cómo dar acceso a un docente, paso a paso</h2>
                <p className="pn-subtitle">Si un docente no ve su curso, revisa que se haya hecho cada paso.</p>
              </div>
              <ol className="m-0 pl-5 grid gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                <li><button type="button" className="underline cursor-pointer font-semibold" style={{ color: 'var(--azul-gatuno)' }} onClick={() => setSection('personas')}>Personas y roles</button>: dale el rol de <strong>docente</strong> (o aprueba su solicitud).</li>
                <li><button type="button" className="underline cursor-pointer font-semibold" style={{ color: 'var(--azul-gatuno)' }} onClick={() => setSection('cursos')}>Cursos</button>: crea el curso y su edición (o usa una existente).</li>
                <li><button type="button" className="underline cursor-pointer font-semibold" style={{ color: 'var(--azul-gatuno)' }} onClick={() => setSection('ediciones')}>Ediciones y grupos</button> → «Docentes y horarios»: agrégalo como <strong>docente principal</strong> o <strong>de apoyo</strong>.</li>
                <li>En la misma pantalla crea su <strong>grupo</strong> (por ejemplo «Grupo de Carla»). Quien tiene un grupo entra al equipo automáticamente y lo verá en su panel.</li>
                <li>Pídele que defina el horario de su grupo en su panel docente → «Mi horario».</li>
              </ol>
            </section>

            <section className="pn-card pn-stack" aria-labelledby="ad-perms">
              <h2 id="ad-perms" className="pn-title">Qué puede hacer cada rol</h2>
              <div className="pn-table-wrap">
                <table className="pn-table">
                  <thead><tr><th>Rol</th><th>Permisos</th></tr></thead>
                  <tbody>{PERMISSIONS.map((p) => <tr key={p.who}><td><strong>{p.who}</strong></td><td>{p.can}</td></tr>)}</tbody>
                </table>
              </div>
            </section>
          </div>
        )}

        {section === 'solicitudes' && (
          <div className="pn-stack-lg">
            <section aria-labelledby="adm-apps">
              <h2 id="adm-apps" className="pn-title">Solicitudes para ser docente ({applications.length})</h2>
              {applications.length === 0 ? (
                <p className="pn-hint mt-2">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="pn-stack list-none p-0 m-0 mt-3">
                  {applications.map((a) => (
                    <li key={a.id} className="pn-card">
                      <p className="m-0 font-semibold">{a.full_name ?? 'Sin nombre'} <span className="font-normal pn-muted text-sm">{a.email}</span></p>
                      <p className="mt-2 text-sm whitespace-pre-wrap">{a.motivation}</p>
                      {a.experience && <p className="mt-2 text-sm whitespace-pre-wrap"><strong>Experiencia:</strong> {a.experience}</p>}
                      {a.links && <p className="mt-2 text-sm break-all"><strong>Enlaces:</strong> {a.links}</p>}
                      <div className="pn-row mt-3">
                        <button type="button" disabled={busy} className="pn-btn pn-btn-primary" onClick={() => void run(() => reviewApplication(a.id, true), 'Solicitud aprobada: ya es docente.')}>Aprobar</button>
                        <button type="button" disabled={busy} className="pn-btn" onClick={() => void run(() => reviewApplication(a.id, false), 'Solicitud rechazada.')}>Rechazar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section aria-labelledby="adm-reqs">
              <h2 id="adm-reqs" className="pn-title">Solicitudes para cursar ({requests.length})</h2>
              <p className="pn-hint mt-1">Un docente o administrador necesita tu permiso para inscribirse como estudiante en un curso que no dicta.</p>
              {requests.length === 0 ? (
                <p className="pn-hint mt-2">No hay solicitudes pendientes.</p>
              ) : (
                <ul className="pn-stack list-none p-0 m-0 mt-3">
                  {requests.map((r) => (
                    <li key={r.id} className="pn-card">
                      <p className="m-0 font-semibold">{r.full_name ?? 'Sin nombre'} <span className="font-normal pn-muted text-sm">{r.email}</span></p>
                      <p className="mt-1 text-sm">Quiere cursar: <strong>{r.course}</strong> · {r.offering}</p>
                      {r.message && <p className="mt-1 text-sm whitespace-pre-wrap">{r.message}</p>}
                      <div className="pn-row mt-3">
                        <button type="button" disabled={busy} className="pn-btn pn-btn-primary" onClick={() => void run(() => reviewEnrollmentRequest(r.id, true), 'Solicitud aprobada: ya puede inscribirse.')}>Aprobar</button>
                        <button type="button" disabled={busy} className="pn-btn" onClick={() => void run(() => reviewEnrollmentRequest(r.id, false), 'Solicitud rechazada.')}>Rechazar</button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        )}

        {section === 'cursos' && <CoursesAdmin />}
        {section === 'ediciones' && <EditionsAdmin />}
        {section === 'personas' && (
          <div className="pn-stack-lg">
            <StaffAdmin />
            <PeopleAdmin />
          </div>
        )}
        {section === 'eventos' && <EventsAdmin />}
        {section === 'correos' && <EmailsAdmin />}
      </div>
    </main>
  );
}
