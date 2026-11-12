import type { MyEdition } from '../../services/teacherPanel';
import type { TeacherGroup } from '../../services/schedules';
import GroupScheduleForm from '../schedule/GroupScheduleForm';

// Cada docente edita el horario y el enlace de Meet de su propio grupo.
export default function MySchedule({ edition, onSaved }: { edition: MyEdition; onSaved: () => void }) {
  const mine = edition.groups.filter((g) => g.mine);

  if (mine.length === 0) {
    return (
      <div className="pn-empty">
        <strong>No tienes un grupo propio en esta edición</strong>
        <p>El horario lo define cada docente para su grupo. Si necesitas uno, pídele a un administrador que cree tu grupo desde Administración → Ediciones.</p>
      </div>
    );
  }

  return (
    <div className="pn-stack-lg">
      <p className="pn-hint">
        Este horario lo ven los estudiantes al inscribirse y sirve para los avisos por correo. Cada docente edita solo el de su grupo.
      </p>
      {mine.map((g) => {
        const group: TeacherGroup = {
          id: g.id,
          name: g.name,
          offering_id: edition.id,
          schedule_label: g.schedule_label,
          weekdays: g.weekdays,
          start_time: g.start_time,
          end_time: g.end_time,
          meet_url: g.meet_url,
          capacity: g.capacity,
          course_title: edition.course_title,
          offering_label: edition.label,
        };
        return (
          <section key={g.id} className="pn-card" aria-label={`Horario de ${g.name}`}>
            <div className="pn-between mb-3">
              <h3 className="pn-title">{g.name}</h3>
              <span className="pn-badge">{g.students} estudiantes</span>
            </div>
            <GroupScheduleForm key={`${g.id}-${g.schedule_label}-${g.meet_url}`} group={group} onSaved={onSaved} />
          </section>
        );
      })}
    </div>
  );
}
