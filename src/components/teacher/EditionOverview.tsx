import { useCallback, useEffect, useState } from 'react';
import { fetchTeam, type MyEdition, type TeamMember } from '../../services/teacherPanel';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { MOMENT_LABEL, classMoment, fmtFull } from './helpers';

// Resumen del curso para todo el equipo: quiénes dictan, qué grupo tiene cada quien y cómo va la edición.
export default function EditionOverview({ edition, onGo }: { edition: MyEdition; onGo: (tab: string) => void }) {
  const [team, setTeam] = useState<TeamMember[] | null>(null);
  const isLead = edition.role === 'lead';

  const load = useCallback(async () => setTeam(await fetchTeam(edition.id)), [edition.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(['offering_staff', 'offering_groups'], () => void load());

  const moment = classMoment(edition.nextClass);
  const mine = edition.groups.filter((g) => g.mine);

  return (
    <div className="pn-stack-lg">
      <dl className="pn-stats" style={{ margin: 0 }}>
        <div className="pn-stat"><dt>{isLead ? 'Estudiantes' : 'Mis estudiantes'}</dt><dd>{edition.students}</dd></div>
        <div className="pn-stat"><dt>Grupos</dt><dd>{edition.groups.length}</dd></div>
        <div className="pn-stat"><dt>Cupo de la edición</dt><dd>{edition.capacity}</dd></div>
        <div className={`pn-stat ${edition.toGrade ? 'pn-stat-warn' : ''}`}><dt>Por calificar</dt><dd>{edition.toGrade}</dd></div>
      </dl>

      {mine.some((g) => !g.schedule_label) && (
        <div className="pn-callout pn-callout-warn pn-between" role="status">
          <span>Tu grupo todavía no tiene horario. Los estudiantes lo necesitan para elegir y recibir los avisos.</span>
          <button type="button" className="pn-btn pn-btn-sm pn-btn-primary" onClick={() => onGo('horario')}>Definir mi horario</button>
        </div>
      )}

      <section className="pn-card" aria-labelledby="ov-next">
        <h3 id="ov-next" className="pn-title">Próxima clase</h3>
        {edition.nextClass ? (
          <div className="pn-between mt-2">
            <p className="m-0">
              <strong>{edition.nextClass.title}</strong>
              <span className="pn-muted"> · {edition.nextClass.group_name ?? 'Toda la edición'}</span>
              <span className="block pn-subtitle">{moment && `${MOMENT_LABEL[moment]} · `}{fmtFull(edition.nextClass.starts_at)}</span>
            </p>
            <button type="button" className="pn-btn pn-btn-primary" onClick={() => onGo('clases')}>Ir a clases y asistencia</button>
          </div>
        ) : (
          <p className="pn-hint mt-2">
            No hay clases programadas.{' '}
            <button type="button" className="underline cursor-pointer" style={{ color: 'var(--azul-gatuno)' }} onClick={() => onGo('clases')}>Programar una clase</button>
          </p>
        )}
      </section>

      <section aria-labelledby="ov-team">
        <h3 id="ov-team" className="pn-title mb-3">Equipo docente</h3>
        {team === null ? (
          <div className="pn-skeleton" />
        ) : team.length === 0 ? (
          <p className="pn-hint">Aún no hay docentes en esta edición.</p>
        ) : (
          <ul className="pn-grid list-none p-0 m-0">
            {team.map((t) => (
              <li key={t.user_id} className="pn-card">
                <div className="pn-row" style={{ marginBottom: '0.3rem' }}>
                  <span className={`pn-badge ${t.staff_role === 'lead' ? 'pn-badge-blue' : ''}`}>{t.staff_role === 'lead' ? 'Docente principal' : 'Docente de apoyo'}</span>
                </div>
                <p className="m-0 font-semibold">{t.full_name ?? 'Sin nombre'}</p>
                {t.headline && <p className="pn-subtitle">{t.headline}</p>}
                <p className="pn-hint mt-2">
                  {t.group_names ? <>Grupo: <strong>{t.group_names}</strong></> : <span className="pn-muted">Sin grupo asignado</span>}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="ov-groups">
        <h3 id="ov-groups" className="pn-title mb-3">Grupos y horarios</h3>
        {edition.groups.length === 0 ? (
          <p className="pn-hint">Esta edición aún no tiene grupos. Un administrador los crea en Administración → Ediciones.</p>
        ) : (
          <div className="pn-table-wrap">
            <table className="pn-table">
              <thead><tr><th>Grupo</th><th>Docente</th><th>Horario</th><th>Estudiantes</th></tr></thead>
              <tbody>
                {edition.groups.map((g) => (
                  <tr key={g.id}>
                    <td><strong>{g.name}</strong>{g.mine && <span className="pn-badge pn-badge-lime ml-2">Mi grupo</span>}</td>
                    <td>{g.teacher_name ?? '—'}</td>
                    <td>{g.schedule_label ?? <span className="pn-muted">Sin definir</span>}</td>
                    <td>{isLead || g.mine ? `${g.students}${g.capacity ? ` / ${g.capacity}` : ''}` : <span className="pn-muted">—</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
