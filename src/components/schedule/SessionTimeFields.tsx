import { useEffect, useState } from 'react';
import { WEEKDAYS } from '../../services/schedules';
import { SPECIAL_REASON_MAX, SPECIAL_REASON_MIN, nextDateForWeekdays, weekdayOfDate } from '../../utils/schedule';

const field = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';

export interface GroupTiming {
  id: string;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
}

export type Resolved = { startsLocal: string; endsLocal: string; reason?: string } | { error: string };

// Estado de «cuándo es la clase»: por defecto el horario del grupo; opcionalmente otro horario con motivo.
export function useSessionTiming(group: GroupTiming | undefined) {
  const start = group?.start_time?.slice(0, 5) ?? '';
  const end = group?.end_time?.slice(0, 5) ?? '';
  const hasSchedule = Boolean(group && start && end);
  const weekdays = group?.weekdays ?? [];
  const [date, setDate] = useState('');
  const [custom, setCustom] = useState(false);
  const [reason, setReason] = useState('');
  const [startsLocal, setStartsLocal] = useState('');
  const [endsLocal, setEndsLocal] = useState('');
  const dayNames = WEEKDAYS.filter((d) => weekdays.includes(d.value)).map((d) => d.label).join(', ');

  // Al cambiar de grupo (o de horario) se vuelve a sugerir el horario del grupo
  const weekdaysKey = weekdays.join(',');
  useEffect(() => {
    setCustom(false);
    setReason('');
    setStartsLocal('');
    setEndsLocal('');
    setDate(hasSchedule ? nextDateForWeekdays(weekdays) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group?.id, start, end, weekdaysKey]);

  const resolve = (): Resolved => {
    if (hasSchedule && !custom) {
      if (!date) return { error: 'Elige la fecha de la clase.' };
      if (weekdays.length > 0 && !weekdays.includes(weekdayOfDate(date))) {
        return { error: `El grupo tiene clase ${dayNames}. Elige otra fecha o usa «Usar otro horario» e indica el motivo.` };
      }
      return { startsLocal: `${date}T${start}`, endsLocal: `${date}T${end}` };
    }
    if (!startsLocal || !endsLocal) return { error: 'Indica la hora de inicio y de fin.' };
    if (hasSchedule && reason.trim().length < SPECIAL_REASON_MIN) {
      return { error: `Explica el motivo del horario distinto (mínimo ${SPECIAL_REASON_MIN} caracteres).` };
    }
    return { startsLocal, endsLocal, reason: hasSchedule ? reason : undefined };
  };

  const reset = () => {
    setStartsLocal('');
    setEndsLocal('');
    setReason('');
    setCustom(false);
    setDate(hasSchedule ? nextDateForWeekdays(weekdays) : '');
  };

  return {
    hasSchedule, custom, setCustom, date, setDate, reason, setReason, startsLocal, setStartsLocal, endsLocal, setEndsLocal,
    dayNames, start, end, resolve, reset,
  };
}

export type SessionTiming = ReturnType<typeof useSessionTiming>;

export default function SessionTimeFields({ t }: { t: SessionTiming }) {
  const link = { color: 'var(--azul-gatuno)' };
  if (t.hasSchedule && !t.custom) {
    return (
      <div className="grid sm:grid-cols-3 gap-3 items-end">
        <label className="grid gap-1">Fecha de la clase
          <input type="date" className={field} required value={t.date} onChange={(e) => t.setDate(e.target.value)} />
        </label>
        <p className="sm:col-span-2 text-xs" style={{ color: 'var(--text-muted)' }}>
          Horario del grupo: <strong>{t.dayNames || 'sin días fijos'} · {t.start} a {t.end}</strong> (hora de Bolivia).{' '}
          <button type="button" className="underline cursor-pointer" style={link} onClick={() => {
            t.setStartsLocal(t.date ? `${t.date}T${t.start}` : '');
            t.setEndsLocal(t.date ? `${t.date}T${t.end}` : '');
            t.setCustom(true);
          }}>Usar otro horario</button>
        </p>
      </div>
    );
  }
  return (
    <>
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="grid gap-1">Inicio (hora de Bolivia)
          <input type="datetime-local" className={field} required value={t.startsLocal} onChange={(e) => t.setStartsLocal(e.target.value)} />
        </label>
        <label className="grid gap-1">Fin (máximo 5 horas de clase)
          <input type="datetime-local" className={field} required min={t.startsLocal || undefined} value={t.endsLocal} onChange={(e) => t.setEndsLocal(e.target.value)} />
        </label>
      </div>
      {t.hasSchedule && (
        <div className="grid gap-1">
          <label className="grid gap-1">Motivo del horario distinto (obligatorio)
            <input className={field} required maxLength={SPECIAL_REASON_MAX} value={t.reason} placeholder="Ej.: feriado del lunes, se recupera el sábado" onChange={(e) => t.setReason(e.target.value)} />
          </label>
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Se muestra como subtítulo de la clase para que los estudiantes sepan por qué cambió.{' '}
            <button type="button" className="underline cursor-pointer" style={link} onClick={() => { t.setCustom(false); t.setReason(''); }}>Volver al horario del grupo</button>
          </span>
        </div>
      )}
    </>
  );
}
