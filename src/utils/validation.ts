// Limpieza y validación de entradas de formularios (el backend vuelve a validar; esto solo da respuesta inmediata)

export const onlyDigits = (value: string, max?: number) => {
  const digits = value.replace(/\D/g, '');
  return max ? digits.slice(0, max) : digits;
};

// Letras (con tildes y ñ), espacios, apóstrofe, punto y guion
export const cleanName = (value: string) =>
  value.replace(/[^\p{L}\s'.-]/gu, '').replace(/\s{2,}/g, ' ').slice(0, 100);

// Complemento del CI: dígito y letra, p. ej. 1A
export const cleanComplement = (value: string) => value.replace(/[^0-9a-zA-Z]/g, '').toUpperCase().slice(0, 3);

export const CI_MIN = 5;
export const CI_MAX = 10;
export const PHONE_LENGTH = 8;

export const isValidCI = (value: string) => /^\d+$/.test(value) && value.length >= CI_MIN && value.length <= CI_MAX;
export const isValidPhone = (value: string) => new RegExp(`^\\d{${PHONE_LENGTH}}$`).test(value);
export const isValidName = (value: string) => value.trim().length >= 3 && /\p{L}/u.test(value);

export const isHttpsUrl = (value: string) => {
  try {
    const url = new URL(value.trim());
    return url.protocol === 'https:' && url.hostname.includes('.');
  } catch {
    return false;
  }
};

export const clampInt = (value: string | number, min: number, max: number, fallback = min) => {
  const n = Math.trunc(Number(value));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
};

export const todayISO = () => new Date().toISOString().slice(0, 10);
export const MIN_BIRTH_DATE = '1920-01-01';
export const isValidBirthDate = (value: string) => value >= MIN_BIRTH_DATE && value <= todayISO();

// ─── Duraciones ("1h 20min") ────────────────────────────────────────────────
export const MAX_LESSON_HOURS = 5;
export const MAX_MODULE_HOURS = 80;

export interface DurationParts {
  hours: string;
  minutes: string;
}

// Lee etiquetas como "1h 30min", "1h20m" o "9 horas"; lo que no se entiende queda vacío
export const parseDurationLabel = (label: string): DurationParts => {
  const h = /(\d{1,3})\s*h/i.exec(label);
  const m = /(\d{1,3})\s*m/i.exec(label);
  return { hours: h ? String(Number(h[1])) : '', minutes: m && Number(m[1]) > 0 ? String(Number(m[1])) : '' };
};

// Horas obligatorias, minutos opcionales; sin horas no hay duración
export const formatDurationLabel = ({ hours, minutes }: DurationParts) => {
  if (hours === '') return '';
  const min = Number(minutes);
  return min > 0 ? `${Number(hours)}h ${min}min` : `${Number(hours)}h`;
};

// Limita horas a 0..maxHours y minutos a 0..59 (con el máximo de horas, los minutos se anulan)
export const clampDuration = ({ hours, minutes }: DurationParts, maxHours: number): DurationParts => {
  const h = onlyDigits(hours, 2);
  const hNum = h === '' ? null : Math.min(maxHours, Number(h));
  let m = onlyDigits(minutes, 2);
  if (m !== '') m = String(Math.min(59, Number(m)));
  if (hNum === maxHours) m = '';
  return { hours: hNum === null ? '' : String(hNum), minutes: m };
};

export const isValidDurationLabel = (label: string, maxHours: number) => {
  const p = parseDurationLabel(label);
  if (p.hours === '') return false;
  const h = Number(p.hours);
  const m = Number(p.minutes || 0);
  return h <= maxHours && m <= 59 && (h < maxHours || m === 0) && (h > 0 || m > 0);
};
