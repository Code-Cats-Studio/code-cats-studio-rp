import { useEffect, useState } from 'react';
import { WEEKDAYS, fetchOfferingSchedules, timeRange, type OfferingSchedule } from '../../services/schedules';

interface Props {
  offeringId: string;
  /** undefined = todavía no eligió; null = «cualquier horario»; texto = id del grupo */
  value: string | null | undefined;
  onChange: (groupId: string | null) => void;
  /** Cuántos horarios se ofrecen (0 = no hay que elegir) */
  onLoaded?: (count: number) => void;
}

// Elección de grupo y horario al inscribirse: días, hora (Bolivia), docente y lugares libres de cada grupo.
export default function SchedulePicker({ offeringId, value, onChange, onLoaded }: Props) {
  const [schedules, setSchedules] = useState<OfferingSchedule[] | null>(null);

  useEffect(() => {
    let alive = true;
    void fetchOfferingSchedules(offeringId).then((s) => {
      if (!alive) return;
      const usable = s.filter((x) => x.schedule_label || x.weekdays.length > 0);
      setSchedules(usable);
      onLoaded?.(usable.length);
    });
    return () => {
      alive = false;
    };
  }, [offeringId]);

  if (schedules === null || schedules.length === 0) return null;

  return (
    <fieldset className="mb-4 grid gap-2 w-full max-w-xl" aria-describedby="sp-help">
      <legend className="text-base font-bold mb-1" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>
        Elige tu grupo y horario
      </legend>
      <p id="sp-help" className="m-0 mb-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        Estas son las clases en vivo de cada grupo. Todas las horas son de Bolivia. Entrarás siempre con el mismo grupo.
      </p>

      {schedules.map((s) => {
        const on = value === s.group_id;
        const full = s.spots_left === 0;
        const days = WEEKDAYS.filter((d) => s.weekdays.includes(d.value));
        const hours = timeRange(s.start_time, s.end_time);
        return (
          <label
            key={s.group_id}
            className="flex items-start gap-3 p-4 rounded-2xl"
            style={{
              border: `2px solid ${on ? 'var(--azul-gatuno)' : 'var(--border)'}`,
              background: on ? 'var(--bg-accent-soft)' : full ? 'var(--bg-secondary)' : 'var(--bg-primary)',
              opacity: full ? 0.65 : 1,
              cursor: full ? 'not-allowed' : 'pointer',
            }}
          >
            <input type="radio" name="schedule" className="mt-1.5" checked={on} disabled={full} onChange={() => onChange(s.group_id)} />
            <span className="grid gap-1 min-w-0 grow">
              <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-bold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-primary)' }}>{s.name}</span>
                <span
                  className="px-2.5 py-0.5 rounded-full text-xs font-semibold"
                  style={{
                    background: full ? '#FEF2F2' : s.spots_left !== null && s.spots_left <= 5 ? '#FFF7ED' : 'var(--bg-lime-soft)',
                    color: full ? '#991B1B' : s.spots_left !== null && s.spots_left <= 5 ? '#9A3412' : '#3F5A00',
                  }}
                >
                  {full ? 'Grupo lleno' : s.spots_left === null ? 'Hay lugar' : `${s.spots_left} ${s.spots_left === 1 ? 'lugar' : 'lugares'}`}
                </span>
              </span>
              {days.length > 0 && (
                <span className="flex flex-wrap gap-1.5" aria-label={`Días: ${days.map((d) => d.label).join(', ')}`}>
                  {days.map((d) => (
                    <span key={d.value} className="px-2 py-0.5 rounded-md text-xs font-bold" style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>{d.label}</span>
                  ))}
                </span>
              )}
              <span className="text-sm" style={{ color: 'var(--text-primary)' }}>
                {hours ? `${hours} (hora de Bolivia)` : s.schedule_label}
              </span>
              {hours && s.schedule_label && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.schedule_label}</span>}
              {s.teacher_name && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Docente: {s.teacher_name}</span>}
            </span>
          </label>
        );
      })}

      <label
        className="flex items-start gap-3 p-4 rounded-2xl cursor-pointer"
        style={{ border: `2px solid ${value === null ? 'var(--azul-gatuno)' : 'var(--border)'}`, background: value === null ? 'var(--bg-accent-soft)' : 'var(--bg-primary)' }}
      >
        <input type="radio" name="schedule" className="mt-1.5" checked={value === null} onChange={() => onChange(null)} />
        <span>
          <span className="block font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Cualquier horario</span>
          <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>Te asignamos un grupo con lugar y te avisamos por correo cuál es.</span>
        </span>
      </label>
    </fieldset>
  );
}
