// Helpers puros de horarios de clase (sin red) para sugerir fechas y validar horas

export const MAX_CLASS_MINUTES = 300;
export const SPECIAL_REASON_MIN = 10;
export const SPECIAL_REASON_MAX = 80;

const pad = (n: number) => String(n).padStart(2, '0');
export const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

/** Día de la semana de una fecha YYYY-MM-DD: 1 = lunes … 7 = domingo (igual que WEEKDAYS). */
export const weekdayOfDate = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number);
  const w = new Date(y, m - 1, d).getDay();
  return w === 0 ? 7 : w;
};

/** Próxima fecha (hoy incluido) que cae en alguno de los días del grupo; hoy si el grupo no tiene días. */
export const nextDateForWeekdays = (weekdays: number[], from: Date = new Date()) => {
  const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  if (weekdays.length === 0) return toDateInput(cursor);
  for (let i = 0; i < 7; i++) {
    if (weekdays.includes(weekdayOfDate(toDateInput(cursor)))) break;
    cursor.setDate(cursor.getDate() + 1);
  }
  return toDateInput(cursor);
};

/** Minutos entre dos valores datetime-local (NaN si alguno es inválido). */
export const classMinutes = (startsLocal: string, endsLocal: string) =>
  (new Date(endsLocal).getTime() - new Date(startsLocal).getTime()) / 60000;

/** Agrega el motivo al título para que estudiantes y docentes sepan por qué cambió el horario. */
export const withScheduleNote = (title: string, reason?: string) => {
  const t = title.trim();
  const r = (reason ?? '').trim();
  return r ? `${t} (horario especial: ${r})` : t;
};

/** Separa «Clase 3 (horario especial: feriado)» en título y nota para mostrar la nota como subtítulo. */
export const splitScheduleNote = (title: string): { title: string; note: string | null } => {
  const m = /^(.*?)\s*\(horario especial: (.+)\)$/s.exec(title);
  return m ? { title: m[1], note: m[2] } : { title, note: null };
};
