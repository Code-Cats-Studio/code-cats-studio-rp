import type { MyEdition } from '../../services/teacherPanel';
import { MOMENT_LABEL, STATUS_LABEL, classMoment, fmtDateTime, statusBadge } from './helpers';

interface Props {
  editions: MyEdition[] | null;
  isAdmin: boolean;
  onOpen: (offeringId: string, tab?: string) => void;
}

// Inicio del panel docente: una tarjeta por curso, con lo que importa hoy (mi grupo, próxima clase, pendientes).
export default function TeacherHome({ editions, isAdmin, onOpen }: Props) {
  if (editions === null) {
    return (
      <div className="pn-grid" aria-busy="true" aria-label="Cargando tus cursos">
        <div className="pn-skeleton" style={{ minHeight: '11rem' }} />
        <div className="pn-skeleton" style={{ minHeight: '11rem' }} />
      </div>
    );
  }

  if (editions.length === 0) {
    return (
      <div className="pn-empty">
        <strong>Todavía no tienes cursos asignados</strong>
        <p>
          Un administrador te agrega al equipo de una edición o te crea un grupo. En cuanto lo haga, tu curso aparece aquí solo; no necesitas recargar la página.
          {isAdmin && ' Como administrador, gestionas todos los cursos desde Administración.'}
        </p>
      </div>
    );
  }

  const urgent = editions
    .map((e) => ({ e, moment: classMoment(e.nextClass) }))
    .filter((x) => x.moment === 'live' || x.moment === 'soon');

  return (
    <div className="pn-stack-lg">
      {urgent.map(({ e, moment }) => (
        <section key={e.id} className="pn-card pn-live" aria-label={MOMENT_LABEL[moment!]}>
          <div className="pn-between">
            <div>
              <span className="pn-badge pn-badge-blue"><span className="pn-dot" /> {MOMENT_LABEL[moment!]}</span>
              <h2 className="pn-title mt-2">{e.nextClass!.title}</h2>
              <p className="pn-subtitle">
                {e.course_title} · {e.nextClass!.group_name ?? 'Toda la edición'} · {fmtDateTime(e.nextClass!.starts_at)}
              </p>
            </div>
            <div className="pn-row">
              {e.nextClass!.meet_url && (
                <a href={e.nextClass!.meet_url} target="_blank" rel="noopener noreferrer" className="pn-btn">Abrir Meet</a>
              )}
              <button type="button" className="pn-btn pn-btn-primary" onClick={() => onOpen(e.id, 'clases')}>Pasar lista y generar código</button>
            </div>
          </div>
        </section>
      ))}

      <section aria-labelledby="th-courses">
        <div className="pn-section-head">
          <div>
            <h2 id="th-courses" className="pn-title">Mis cursos</h2>
            <p className="pn-subtitle">Elige un curso para ver su resumen, tu horario, las clases, los estudiantes y las tareas.</p>
          </div>
        </div>
        <ul className="pn-grid list-none p-0 m-0">
          {editions.map((e) => {
            const mine = e.groups.filter((g) => g.mine);
            const moment = classMoment(e.nextClass);
            return (
              <li key={e.id} className="pn-card pn-card-link pn-stack" style={{ alignContent: 'start' }}>
                <div>
                  <div className="pn-row" style={{ marginBottom: '0.4rem' }}>
                    <span className={`pn-badge ${e.role === 'lead' ? 'pn-badge-blue' : ''}`}>{e.role === 'lead' ? 'Docente principal' : 'Docente de apoyo'}</span>
                    <span className={`pn-badge ${statusBadge(e.status)}`}>{STATUS_LABEL[e.status] ?? e.status}</span>
                  </div>
                  <h3 className="pn-title" style={{ fontSize: '1.25rem' }}>{e.course_title}</h3>
                  <p className="pn-subtitle">{e.label}</p>
                </div>

                <div className="pn-hint">
                  {mine.length > 0 ? (
                    mine.map((g) => (
                      <p key={g.id} className="m-0">
                        <strong>{g.name}</strong>
                        <span className="pn-muted"> · {g.schedule_label ?? 'sin horario definido'}</span>
                      </p>
                    ))
                  ) : (
                    <p className="m-0 pn-muted">{e.groups.length} {e.groups.length === 1 ? 'grupo' : 'grupos'} en la edición</p>
                  )}
                  {mine.some((g) => !g.schedule_label) && (
                    <button type="button" className="pn-btn pn-btn-sm pn-btn-lime mt-2" onClick={() => onOpen(e.id, 'horario')}>Definir mi horario</button>
                  )}
                </div>

                <dl className="pn-stats" style={{ margin: 0 }}>
                  <div className="pn-stat"><dt>Estudiantes</dt><dd>{e.students}</dd></div>
                  <div className={`pn-stat ${e.toGrade > 0 ? 'pn-stat-warn' : ''}`}><dt>Por calificar</dt><dd>{e.toGrade}</dd></div>
                </dl>

                <p className="pn-hint m-0">
                  {e.nextClass ? (
                    <>
                      <strong>{moment ? MOMENT_LABEL[moment] : 'Próxima clase'}:</strong> {e.nextClass.title} · {fmtDateTime(e.nextClass.starts_at)}
                    </>
                  ) : (
                    <span className="pn-muted">No hay clases programadas.</span>
                  )}
                </p>

                <div className="pn-row">
                  <button type="button" className="pn-btn pn-btn-primary" onClick={() => onOpen(e.id)}>Abrir curso</button>
                  {e.toGrade > 0 && <button type="button" className="pn-btn" onClick={() => onOpen(e.id, 'entregas')}>Calificar</button>}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
