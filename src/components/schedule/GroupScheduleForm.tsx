import { useState, type FormEvent } from 'react';
import { WEEKDAYS, saveGroupSchedule, type TeacherGroup } from '../../services/schedules';

const field = 'w-full px-2 py-1.5 rounded border border-gray-300';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';

// Horario fijo del grupo (días, hora y enlace de Meet). Lo ven los estudiantes al inscribirse.
export default function GroupScheduleForm({ group, onSaved }: { group: TeacherGroup; onSaved: () => void }) {
  const [label, setLabel] = useState(group.schedule_label ?? '');
  const [weekdays, setWeekdays] = useState<number[]>(group.weekdays);
  const [start, setStart] = useState(group.start_time?.slice(0, 5) ?? '');
  const [end, setEnd] = useState(group.end_time?.slice(0, 5) ?? '');
  const [meet, setMeet] = useState(group.meet_url ?? '');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const toggleDay = (d: number) => setWeekdays((w) => (w.includes(d) ? w.filter((x) => x !== d) : [...w, d].sort()));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await saveGroupSchedule(group.id, { label, weekdays, start, end, meet });
    setMessage(error ?? 'Horario guardado.');
    setBusy(false);
    if (!error) onSaved();
  };

  return (
    <form onSubmit={(e) => void submit(e)} className="grid gap-3 text-sm">
      <label className="grid gap-1">Texto del horario (lo ve el estudiante)
        <input className={field} value={label} maxLength={80} placeholder="Viernes 19:00 a 21:00" onChange={(e) => setLabel(e.target.value)} />
      </label>
      <fieldset className="flex flex-wrap items-center gap-2">
        <legend className="mb-1">Días de clase</legend>
        {WEEKDAYS.map((d) => (
          <button key={d.value} type="button" aria-pressed={weekdays.includes(d.value)} onClick={() => toggleDay(d.value)}
            className="px-2.5 py-1 rounded-full text-xs cursor-pointer"
            style={{ border: '1px solid var(--border)', background: weekdays.includes(d.value) ? 'var(--azul-gatuno)' : 'transparent', color: weekdays.includes(d.value) ? '#fff' : 'var(--text-secondary)' }}>
            {d.label}
          </button>
        ))}
      </fieldset>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">Hora de inicio (Bolivia)
          <input type="time" className={field} value={start} onChange={(e) => setStart(e.target.value)} />
        </label>
        <label className="grid gap-1">Hora de fin
          <input type="time" className={field} value={end} onChange={(e) => setEnd(e.target.value)} />
        </label>
      </div>
      <label className="grid gap-1">Enlace de la clase del grupo (Meet, Zoom, Teams…)
        <input className={field} value={meet} placeholder="https://meet.google.com/abc-defg-hij" onChange={(e) => setMeet(e.target.value)} />
      </label>
      <div className="flex items-center gap-3">
        <button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Guardar horario</button>
        {message && <span role="status" className="text-xs" style={{ color: 'var(--text-secondary)' }}>{message}</span>}
      </div>
    </form>
  );
}
