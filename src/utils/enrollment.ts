// Motivo legible por el que una edición no admite inscripciones (null = sí admite)
export interface OfferingLike {
  status: 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
  enrollment_closes_at?: string | null;
  starts_on?: string | null;
}

const fmtDate = (iso: string) =>
  new Date(iso).toLocaleDateString('es-BO', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'America/La_Paz' });

export function getClosedReason(o: OfferingLike, now: number = Date.now()): string | null {
  switch (o.status) {
    case 'draft':
      return 'Esta edición todavía no abrió inscripciones. Vuelve pronto.';
    case 'in_progress':
      return 'Esta edición ya comenzó y no recibe nuevas inscripciones. Revisa si abrirá una próxima edición.';
    case 'finished':
      return 'Esta edición ya terminó. Revisa si abrirá una próxima edición.';
    case 'cancelled':
      return 'Esta edición fue cancelada.';
    case 'open':
      if (o.enrollment_closes_at && new Date(o.enrollment_closes_at).getTime() <= now) {
        return `El plazo de inscripción terminó el ${fmtDate(o.enrollment_closes_at)}.`;
      }
      return null;
  }
}

const time = (iso?: string | null) => {
  const t = iso ? new Date(iso).getTime() : NaN;
  return Number.isFinite(t) ? t : null;
};

// 0 = acepta inscripciones · 1 = abierta pero vencida o en curso · 2 = borrador · 3 = terminada · 4 = cancelada
const rank = (o: OfferingLike, now: number) =>
  o.status === 'open' ? (getClosedReason(o, now) === null ? 0 : 1) : o.status === 'in_progress' ? 1 : o.status === 'draft' ? 2 : o.status === 'finished' ? 3 : 4;

/**
 * Edición que se muestra en la página del curso: la que acepta inscripciones (la que empieza antes);
 * si no hay, la más reciente en curso/vencida, luego borrador, terminada o cancelada.
 * Tolera listas vacías, nulas y fechas inválidas.
 */
export function pickActiveOffering<T extends OfferingLike>(offerings: T[] | null | undefined, now: number = Date.now()): T | null {
  const list = (offerings ?? []).filter((o): o is T => Boolean(o));
  if (list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    const byRank = rank(a, now) - rank(b, now);
    if (byRank !== 0) return byRank;
    const ta = time(a.starts_on);
    const tb = time(b.starts_on);
    if (ta === null && tb === null) return 0;
    if (ta === null) return 1; // sin fecha al final
    if (tb === null) return -1;
    return rank(a, now) === 0 ? ta - tb : tb - ta; // abierta: la próxima a empezar; resto: la más reciente
  });
  return sorted[0];
}
