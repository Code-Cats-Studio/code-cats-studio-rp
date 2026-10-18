import { useEffect, useState } from 'react';
import { fetchOfferingSchedules, type OfferingSchedule } from '../../services/schedules';

interface Props {
  offeringId: string;
  value: string | null; // null = cualquier horario
  onChange: (groupId: string | null) => void;
}

// Elección del horario preferido al inscribirse. No aparece si la edición aún no definió horarios.
export default function SchedulePicker({ offeringId, value, onChange }: Props) {
  const [schedules, setSchedules] = useState<OfferingSchedule[]>([]);

  useEffect(() => {
    let alive = true;
    void fetchOfferingSchedules(offeringId).then((s) => {
      if (alive) setSchedules(s.filter((x) => x.schedule_label));
    });
    return () => {
      alive = false;
    };
  }, [offeringId]);

  if (schedules.length === 0) return null;

  const option = (id: string | null, title: string, detail?: string) => {
    const on = value === id;
    return (
      <label
        key={id ?? 'any'}
        className="flex items-start gap-3 p-3 rounded-xl cursor-pointer"
        style={{ border: `1.5px solid ${on ? 'var(--azul-gatuno)' : 'var(--border)'}`, background: on ? 'var(--bg-accent-soft)' : 'var(--bg-primary)' }}
      >
        <input type="radio" name="schedule" className="mt-1" checked={on} onChange={() => onChange(id)} />
        <span>
          <span className="block font-semibold text-sm" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{title}</span>
          {detail && <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>{detail}</span>}
        </span>
      </label>
    );
  };

  return (
    <fieldset className="mb-4 grid gap-2 max-w-md">
      <legend className="text-sm font-semibold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        ¿Qué horario prefieres? (hora de Bolivia)
      </legend>
      {schedules.map((s) =>
        option(
          s.group_id,
          s.schedule_label ?? s.name,
          [s.teacher_name ? `Docente: ${s.teacher_name}` : null, s.spots_left === null ? null : s.spots_left === 0 ? 'Horario lleno: se te asignará otro con lugar' : `${s.spots_left} lugares`]
            .filter(Boolean)
            .join(' · ')
        )
      )}
      {option(null, 'Cualquier horario está bien', 'Te asignaremos un grupo con lugar')}
    </fieldset>
  );
}
