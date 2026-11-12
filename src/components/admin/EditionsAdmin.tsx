import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  createGroups,
  fetchAdminOfferings,
  fetchOfferingStats,
  fetchTeachers,
  finalizeOffering,
  issueCertificates,
  updateOffering,
  type AdminOffering,
  type OfferingStats,
  type OfferingStatus,
  type TeacherOption,
} from '../../services/admin';
import EditionHub from '../edition/EditionHub';
import { useToast } from '../../context/ToastContext';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { clampInt, onlyDigits } from '../../utils/validation';
import { STATUS_LABEL, statusBadge } from '../teacher/helpers';

const STATUS_OPTIONS = (Object.keys(STATUS_LABEL) as OfferingStatus[]).map((value) => ({ value, label: STATUS_LABEL[value] }));

// Ediciones: se elige una y todo lo suyo (estado, cupo, equipo, grupos, clases, estudiantes) queda en un solo lugar.
export default function EditionsAdmin() {
  const [offerings, setOfferings] = useState<AdminOffering[] | null>(null);
  const [params, setParams] = useSearchParams();
  const [stats, setStats] = useState<OfferingStats | null>(null);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [picked, setPicked] = useState<string[]>([]);
  const [groupSize, setGroupSize] = useState('40');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const [o, t] = await Promise.all([fetchAdminOfferings(), fetchTeachers()]);
    setOfferings(o);
    setTeachers(t);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(['course_offerings', 'enrollments'], () => void load());

  const selectedId = params.get('ed');
  const selected = offerings?.find((o) => o.id === selectedId) ?? null;

  useEffect(() => {
    setStats(null);
    setPicked([]);
  }, [selectedId]);

  const select = (id: string | null) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set('ed', id);
      else next.delete('ed');
      return next;
    });

  const run = async (action: () => Promise<string | null>, okText: string) => {
    setBusy(true);
    toast.result(await action(), okText);
    await load();
    setBusy(false);
  };

  const showStats = async (id: string) => {
    const s = await fetchOfferingStats(id);
    if (!s) toast.error('No se pudieron cargar las estadísticas.');
    setStats(s);
  };

  if (offerings === null) return <div className="pn-skeleton" style={{ minHeight: '10rem' }} />;

  if (offerings.length === 0) {
    return (
      <div className="pn-empty">
        <strong>Todavía no hay ediciones</strong>
        <p>Una edición es una tanda de un curso con fechas, cupos y docentes. Créala en la sección «Cursos», dentro del curso.</p>
      </div>
    );
  }

  if (!selected) {
    return (
      <section aria-labelledby="ed-list">
        <div className="pn-section-head">
          <div>
            <h2 id="ed-list" className="pn-title">Ediciones</h2>
            <p className="pn-subtitle">Elige una edición para ver su equipo docente, sus grupos con horarios, las clases y los estudiantes.</p>
          </div>
        </div>
        <ul className="pn-grid list-none p-0 m-0">
          {offerings.map((o) => (
            <li key={o.id}>
              <button type="button" onClick={() => select(o.id)} className="pn-card pn-card-link w-full text-left cursor-pointer" aria-label={`Abrir ${o.course_title}, ${o.label}`}>
                <span className={`pn-badge ${statusBadge(o.status)}`}>{STATUS_LABEL[o.status]}</span>
                <p className="pn-title mt-2" style={{ fontSize: '1.15rem' }}>{o.course_title}</p>
                <p className="pn-subtitle">{o.label} · cupo {o.capacity}</p>
                <span className="pn-btn pn-btn-sm pn-btn-primary mt-3">Gestionar</span>
              </button>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return (
    <div className="pn-stack">
      <div className="pn-between">
        <button type="button" className="pn-btn pn-btn-sm" onClick={() => select(null)}>← Todas las ediciones</button>
        <label className="flex items-center gap-2 text-sm">
          Edición
          <select value={selected.id} onChange={(e) => select(e.target.value)}>
            {offerings.map((o) => <option key={o.id} value={o.id}>{o.course_title} · {o.label}</option>)}
          </select>
        </label>
      </div>

      <section className="pn-card pn-stack" aria-labelledby="ed-config">
        <div className="pn-between">
          <div>
            <h2 id="ed-config" className="pn-title" style={{ fontSize: '1.4rem' }}>{selected.course_title}</h2>
            <p className="pn-subtitle">{selected.label}</p>
          </div>
          <span className={`pn-badge ${statusBadge(selected.status)}`}>{STATUS_LABEL[selected.status]}</span>
        </div>

        <div className="pn-row" style={{ alignItems: 'end' }}>
          <label className="grid gap-1">Estado
            <select value={selected.status} disabled={busy}
              onChange={(e) => void run(() => updateOffering(selected.id, { status: e.target.value as OfferingStatus }), 'Estado actualizado.')}>
              {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
          </label>
          <label className="grid gap-1">Cupo total de la edición
            <input key={`${selected.id}-${selected.capacity}`} type="text" inputMode="numeric" maxLength={4} style={{ width: '7rem' }} defaultValue={selected.capacity} disabled={busy}
              onChange={(e) => { e.target.value = onlyDigits(e.target.value, 4); }}
              onBlur={(e) => {
                const value = clampInt(e.target.value, 1, 5000, selected.capacity);
                e.target.value = String(value);
                if (value !== selected.capacity) void run(() => updateOffering(selected.id, { capacity: value }), 'Cupo actualizado.');
              }} />
          </label>
          <button type="button" className="pn-btn" onClick={() => void showStats(selected.id)}>Ver estadísticas</button>
          <button type="button" className="pn-btn" disabled={busy}
            onClick={() => window.confirm('Esto calcula las notas finales y aprueba o reprueba a cada estudiante. ¿Continuar?') && void run(() => finalizeOffering(selected.id), 'Edición finalizada: notas calculadas.')}>
            Cerrar notas
          </button>
          <button type="button" className="pn-btn pn-btn-primary" disabled={busy}
            onClick={() => window.confirm('Se emitirán los certificados de los aprobados y se les enviará un correo. ¿Continuar?') && void run(() => issueCertificates(selected.id), 'Certificados emitidos.')}>
            Emitir certificados
          </button>
        </div>

        <p className="pn-hint m-0">El <strong>cupo total</strong> es el máximo de inscritos en la edición. El cupo de <strong>cada grupo</strong> se edita en «Docentes y horarios», dentro de cada grupo.</p>

        {stats && (
          <dl className="pn-stats" style={{ margin: 0 }}>
            <div className="pn-stat"><dt>Activos</dt><dd>{stats.active} / {stats.capacity}</dd></div>
            <div className="pn-stat"><dt>Lista de espera</dt><dd>{stats.waitlisted}</dd></div>
            <div className="pn-stat"><dt>Aprobados</dt><dd>{stats.completed}</dd></div>
            <div className="pn-stat"><dt>No aprobados</dt><dd>{stats.failed}</dd></div>
            <div className="pn-stat"><dt>Bajas</dt><dd>{stats.dropped}</dd></div>
            <div className="pn-stat"><dt>Avance medio</dt><dd>{stats.avg_progress_pct ?? '—'}%</dd></div>
            <div className="pn-stat"><dt>Asistencia media</dt><dd>{stats.avg_attendance_pct ?? '—'}%</dd></div>
            <div className="pn-stat"><dt>Valoración</dt><dd>{stats.avg_rating ?? '—'}</dd></div>
          </dl>
        )}

        <details>
          <summary className="text-sm font-semibold">Avanzado: crear un grupo por docente y repartir estudiantes automáticamente</summary>
          <div className="pn-stack mt-3">
            <p className="pn-hint m-0">Normalmente basta con crear los grupos uno a uno en «Equipo y grupos». Esta opción crea varios de golpe y reparte a los estudiantes inscritos.</p>
            <div className="pn-row">
              {teachers.map((t) => (
                <label key={t.user_id} className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={picked.includes(t.user_id)} onChange={() => setPicked((p) => (p.includes(t.user_id) ? p.filter((x) => x !== t.user_id) : [...p, t.user_id]))} />
                  {t.full_name ?? t.email}
                </label>
              ))}
            </div>
            <div className="pn-row" style={{ alignItems: 'end' }}>
              <label className="grid gap-1">Estudiantes por grupo (solo para este reparto)
                <input type="text" inputMode="numeric" maxLength={3} style={{ width: '6rem' }} value={groupSize} onChange={(e) => setGroupSize(onlyDigits(e.target.value, 3))} />
              </label>
              <button type="button" className="pn-btn" disabled={busy || picked.length === 0}
                onClick={() => void (async () => {
                  setBusy(true);
                  const r = await createGroups(selected.id, picked, clampInt(groupSize, 1, 500, 40));
                  toast.result(r.error, `Grupos creados: ${r.assigned} estudiantes asignados, ${r.unassigned} sin grupo.`);
                  setBusy(false);
                })()}>
                Crear grupos
              </button>
            </div>
          </div>
        </details>
      </section>

      <EditionHub offeringId={selected.id} courseTitle={selected.course_title} canManageTeam />
    </div>
  );
}
