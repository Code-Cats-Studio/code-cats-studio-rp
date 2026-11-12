import type { NextClass } from '../../services/teacherPanel';

export const STATUS_LABEL: Record<string, string> = {
  draft: 'Borrador',
  open: 'Inscripciones abiertas',
  in_progress: 'En curso',
  finished: 'Finalizada',
  cancelled: 'Cancelada',
};

export const statusBadge = (status: string) =>
  status === 'open' ? 'pn-badge-lime' : status === 'in_progress' ? 'pn-badge-ok' : status === 'draft' ? 'pn-badge-warn' : status === 'cancelled' ? 'pn-badge-off' : '';

const TZ = 'America/La_Paz';

export const fmtDateTime = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { weekday: 'short', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', timeZone: TZ });

export const fmtFull = (iso: string) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: TZ });

const dayKey = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: TZ });

// live = en curso; soon = empieza en menos de 90 min; today = es hoy; later = otro día
export type ClassMoment = 'live' | 'soon' | 'today' | 'later';

export function classMoment(c: Pick<NextClass, 'starts_at' | 'ends_at'> | null, now = new Date()): ClassMoment | null {
  if (!c) return null;
  const start = new Date(c.starts_at);
  const end = c.ends_at ? new Date(c.ends_at) : new Date(start.getTime() + 2 * 3600_000);
  if (now >= start && now <= end) return 'live';
  if (start.getTime() - now.getTime() <= 90 * 60_000 && start > now) return 'soon';
  if (dayKey(start) === dayKey(now)) return 'today';
  return 'later';
}

export const MOMENT_LABEL: Record<ClassMoment, string> = {
  live: 'Clase en curso',
  soon: 'Empieza pronto',
  today: 'Hoy',
  later: 'Próxima clase',
};
