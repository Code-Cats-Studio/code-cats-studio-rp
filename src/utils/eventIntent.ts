// Recuerda en este navegador si la persona ya pasó por la inscripción de Code Cats Days,
// para que la página principal le ofrezca continuar donde se quedó.
const KEY = 'ccd-inscripcion';

export type EventIntent = 'pending' | 'done';

export function setEventIntent(value: EventIntent) {
  try {
    localStorage.setItem(KEY, value);
  } catch {
    // sin almacenamiento local: el banner solo muestra la invitación general
  }
}

export function getEventIntent(): EventIntent | null {
  try {
    const value = localStorage.getItem(KEY);
    return value === 'pending' || value === 'done' ? value : null;
  } catch {
    return null;
  }
}
