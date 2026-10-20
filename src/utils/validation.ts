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
export const isValidPhone = (value: string) => new RegExp(`^\d{${PHONE_LENGTH}}$`).test(value);
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
