import { useCallback, useEffect, useState } from 'react';
import {
  createGroups,
  fetchAdminOfferings,
  fetchOfferingStats,
  fetchPendingApplications,
  fetchTeachers,
  finalizeOffering,
  issueCertificates,
  reviewApplication,
  updateOffering,
  type AdminOffering,
  type OfferingStats,
  type OfferingStatus,
  type PendingApplication,
  type TeacherOption,
} from '../services/admin';
import GroupsAdmin from '../components/admin/GroupsAdmin';
import EventsAdmin from '../components/admin/EventsAdmin';
import StaffAdmin from '../components/admin/StaffAdmin';
import { setPageMeta } from '../utils/seo';

const STATUS_OPTIONS: { value: OfferingStatus; label: string }[] = [
  { value: 'draft', label: 'Borrador (oculta)' },
  { value: 'open', label: 'Inscripciones abiertas' },
  { value: 'in_progress', label: 'En curso' },
  { value: 'finished', label: 'Finalizada' },
  { value: 'cancelled', label: 'Cancelada' },
];

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';

export default function AdminPage() {
  const [applications, setApplications] = useState<PendingApplication[]>([]);
  const [offerings, setOfferings] = useState<AdminOffering[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [stats, setStats] = useState<Record<string, OfferingStats | null>>({});
  const [selectedTeachers, setSelectedTeachers] = useState<Record<string, string[]>>({});
  const [groupSize, setGroupSize] = useState(40);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setPageMeta('Panel de administración', 'Gestión de solicitudes, ediciones y certificados');
  }, []);

  const load = useCallback(async () => {
    const [apps, offs, teach] = await Promise.all([
      fetchPendingApplications(),
      fetchAdminOfferings(),
      fetchTeachers(),
    ]);
    setApplications(apps);
    setOfferings(offs);
    setTeachers(teach);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  // Ejecuta una acción, muestra el resultado y recarga
  const run = async (action: () => Promise<string | null>, okText: string) => {
    setBusy(true);
    const error = await action();
    setMessage(error ?? okText);
    await load();
    setBusy(false);
  };

  const showStats = async (id: string) => {
    setStats((prev) => ({ ...prev, [id]: null }));
    const s = await fetchOfferingStats(id);
    setStats((prev) => ({ ...prev, [id]: s }));
    if (!s) setMessage('No se pudieron cargar las estadísticas.');
  };

  const toggleTeacher = (offeringId: string, teacherId: string) =>
    setSelectedTeachers((prev) => {
      const list = prev[offeringId] ?? [];
      return {
        ...prev,
        [offeringId]: list.includes(teacherId) ? list.filter((t) => t !== teacherId) : [...list, teacherId],
      };
    });

  const handleGroups = async (offeringId: string) => {
    const ids = selectedTeachers[offeringId] ?? [];
    if (ids.length === 0) {
      setMessage('Elige al menos un docente para crear los grupos.');
      return;
    }
    setBusy(true);
    const r = await createGroups(offeringId, ids, groupSize);
    setMessage(r.error ?? `Grupos creados: ${r.assigned} estudiantes asignados, ${r.unassigned} sin grupo.`);
    setBusy(false);
  };

  return (
    <main className="max-w-5xl mx-auto px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>
        Panel de administración
      </h1>

      {message && (
        <p role="status" className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {message}
        </p>
      )}

      {/* Solicitudes de docente */}
      <section className="mt-10" aria-labelledby="adm-apps">
        <h2 id="adm-apps" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
          Solicitudes de docente ({applications.length})
        </h2>
        {applications.length === 0 ? (
          <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>No hay solicitudes pendientes.</p>
        ) : (
          <ul className="mt-4 grid gap-3">
            {applications.map((a) => (
              <li key={a.id} className="p-4 rounded-xl" style={card}>
                <p className="font-semibold">
                  {a.full_name ?? 'Sin nombre'}{' '}
                  <span className="font-normal text-sm" style={{ color: 'var(--text-muted)' }}>{a.email}</span>
                </p>
                <p className="mt-2 text-sm whitespace-pre-wrap">{a.motivation}</p>
                {a.experience && <p className="mt-2 text-sm whitespace-pre-wrap"><strong>Experiencia:</strong> {a.experience}</p>}
                {a.links && <p className="mt-2 text-sm break-all"><strong>Enlaces:</strong> {a.links}</p>}
                <div className="mt-3 flex gap-2">
                  <button type="button" disabled={busy} className={btn}
                    style={{ background: 'var(--azul-gatuno)', color: '#fff' }}
                    onClick={() => void run(() => reviewApplication(a.id, true), 'Solicitud aprobada: ya es docente.')}>
                    Aprobar
                  </button>
                  <button type="button" disabled={busy} className={btn}
                    style={{ border: '1px solid var(--border)' }}
                    onClick={() => void run(() => reviewApplication(a.id, false), 'Solicitud rechazada.')}>
                    Rechazar
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Ediciones */}
      <section className="mt-12" aria-labelledby="adm-offs">
        <h2 id="adm-offs" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
          Ediciones de cursos
        </h2>
        <label className="mt-3 flex items-center gap-2 text-sm">
          Tamaño de grupo
          <input type="number" min={1} max={500} value={groupSize}
            onChange={(e) => setGroupSize(Math.max(1, Number(e.target.value) || 1))}
            className="w-20 px-2 py-1 rounded border border-gray-300" />
        </label>

        <ul className="mt-4 grid gap-4">
          {offerings.map((o) => {
            const s = stats[o.id];
            return (
              <li key={o.id} className="p-4 rounded-xl" style={card}>
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="font-semibold">{o.course_title}</p>
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>{o.label}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <label className="flex items-center gap-1">
                      Estado
                      <select value={o.status} disabled={busy}
                        onChange={(e) => void run(() => updateOffering(o.id, { status: e.target.value as OfferingStatus }), 'Estado actualizado.')}
                        className="px-2 py-1 rounded border border-gray-300">
                        {STATUS_OPTIONS.map((opt) => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </label>
                    <label className="flex items-center gap-1">
                      Cupo
                      <input type="number" min={1} defaultValue={o.capacity} disabled={busy}
                        onBlur={(e) => {
                          const value = Number(e.target.value);
                          if (value > 0 && value !== o.capacity) {
                            void run(() => updateOffering(o.id, { capacity: value }), 'Cupo actualizado.');
                          }
                        }}
                        className="w-20 px-2 py-1 rounded border border-gray-300" />
                    </label>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  <button type="button" className={btn} style={{ border: '1px solid var(--border)' }}
                    onClick={() => void showStats(o.id)}>Ver estadísticas</button>
                  <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }}
                    onClick={() => {
                      if (window.confirm('Esto calcula las notas finales y aprueba o reprueba a cada estudiante. ¿Continuar?')) {
                        void run(() => finalizeOffering(o.id), 'Edición finalizada: notas calculadas.');
                      }
                    }}>Cerrar notas</button>
                  <button type="button" disabled={busy} className={btn}
                    style={{ background: 'var(--azul-gatuno)', color: '#fff' }}
                    onClick={() => {
                      if (window.confirm('Se emitirán los certificados de los aprobados y se les enviará un correo. ¿Continuar?')) {
                        void run(() => issueCertificates(o.id), 'Certificados emitidos.');
                      }
                    }}>Emitir certificados</button>
                </div>

                {s && (
                  <dl className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                    <div><dt style={{ color: 'var(--text-muted)' }}>Activos</dt><dd className="font-semibold">{s.active} / {s.capacity}</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Lista de espera</dt><dd className="font-semibold">{s.waitlisted}</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Aprobados</dt><dd className="font-semibold">{s.completed}</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>No aprobados</dt><dd className="font-semibold">{s.failed}</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Avance medio</dt><dd className="font-semibold">{s.avg_progress_pct ?? '—'}%</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Asistencia media</dt><dd className="font-semibold">{s.avg_attendance_pct ?? '—'}%</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Bajas</dt><dd className="font-semibold">{s.dropped}</dd></div>
                    <div><dt style={{ color: 'var(--text-muted)' }}>Valoración</dt><dd className="font-semibold">{s.avg_rating ?? '—'}</dd></div>
                  </dl>
                )}

                <fieldset className="mt-4">
                  <legend className="text-sm font-medium">Crear grupos (uno por docente)</legend>
                  {teachers.length === 0 ? (
                    <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay docentes.</p>
                  ) : (
                    <div className="mt-2 flex flex-wrap gap-3">
                      {teachers.map((t) => (
                        <label key={t.user_id} className="flex items-center gap-1 text-sm">
                          <input type="checkbox"
                            checked={(selectedTeachers[o.id] ?? []).includes(t.user_id)}
                            onChange={() => toggleTeacher(o.id, t.user_id)} />
                          {t.full_name ?? t.email}
                        </label>
                      ))}
                    </div>
                  )}
                  <button type="button" disabled={busy || teachers.length === 0} className={`${btn} mt-2`}
                    style={{ border: '1px solid var(--border)' }}
                    onClick={() => void handleGroups(o.id)}>Crear grupos</button>
                </fieldset>
              </li>
            );
          })}
        </ul>
      </section>

      <GroupsAdmin />
      <EventsAdmin />
      <StaffAdmin />
    </main>
  );
}
