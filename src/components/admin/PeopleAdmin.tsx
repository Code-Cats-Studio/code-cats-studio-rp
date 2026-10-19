import { useCallback, useEffect, useState } from 'react';
import { fetchAdminOfferings, fetchPeople, type AdminOffering, type Person, type PersonRole } from '../../services/admin';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const field = 'px-2 py-1.5 rounded border border-gray-300 text-sm';

const TABS: { id: PersonRole | 'all'; label: string }[] = [
  { id: 'all', label: 'Todos' },
  { id: 'admin', label: 'Administradores' },
  { id: 'teacher', label: 'Docentes' },
  { id: 'student', label: 'Estudiantes' },
];
const ROLE_LABEL: Record<PersonRole, string> = { admin: 'Admin', teacher: 'Docente', student: 'Estudiante' };
const AS_LABEL = { lead: 'docente principal', assistant: 'docente de apoyo', student: 'estudiante' } as const;
const STATUS_LABEL: Record<string, string> = {
  active: 'activo', waitlisted: 'lista de espera', pending_payment: 'pago pendiente', completed: 'aprobó', failed: 'no aprobó', dropped: 'baja',
};

// Directorio de administradores, docentes y estudiantes, filtrable por curso (edición) y por texto.
export default function PeopleAdmin() {
  const [tab, setTab] = useState<PersonRole | 'all'>('all');
  const [offeringId, setOfferingId] = useState('');
  const [search, setSearch] = useState('');
  const [offerings, setOfferings] = useState<AdminOffering[]>([]);
  const [people, setPeople] = useState<Person[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void fetchAdminOfferings().then(setOfferings);
  }, []);

  const load = useCallback(async () => {
    setPeople(null);
    const r = await fetchPeople({ role: tab === 'all' ? undefined : tab, offeringId: offeringId || undefined, search });
    setError(r.error ?? null);
    setPeople(r.people);
  }, [tab, offeringId, search]);

  // la búsqueda espera a que se deje de escribir
  useEffect(() => {
    const t = setTimeout(() => void load(), 300);
    return () => clearTimeout(t);
  }, [load]);

  return (
    <section className="mt-12" aria-labelledby="adm-people">
      <h2 id="adm-people" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
        Personas
      </h2>
      <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
        Quién es quién en la plataforma. Filtra por curso para ver su equipo docente y sus estudiantes.
      </p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <div role="tablist" aria-label="Tipo de persona" className="flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
              style={{ background: tab === t.id ? 'var(--azul-gatuno)' : 'var(--bg-primary)', color: tab === t.id ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
              {t.label}
            </button>
          ))}
        </div>
        <label className="grid gap-1 text-xs">Curso / edición
          <select className={field} value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
            <option value="">Todos</option>
            {offerings.map((o) => <option key={o.id} value={o.id}>{o.course_title} · {o.label}</option>)}
          </select>
        </label>
        <label className="grid gap-1 text-xs">Buscar
          <input className={field} value={search} placeholder="Nombre o correo" onChange={(e) => setSearch(e.target.value)} />
        </label>
      </div>

      {error && <p role="alert" className="mt-3 text-sm" style={{ color: '#DC2626' }}>{error}</p>}
      <p className="mt-3 text-xs" style={{ color: 'var(--text-muted)' }}>{people ? `${people.length} persona(s)${people.length === 500 ? ' (se muestran las primeras 500)' : ''}` : 'Cargando…'}</p>

      <ul className="mt-2 grid gap-2">
        {people?.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>No hay personas con esos filtros.</li>}
        {people?.map((p) => {
          const shown = offeringId ? p.offerings.filter((o) => o.offering_id === offeringId) : p.offerings;
          return (
            <li key={p.user_id} className="p-3 rounded-xl text-sm" style={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span><strong>{p.full_name ?? 'Sin nombre'}</strong> <span style={{ color: 'var(--text-muted)' }}>{p.email}</span></span>
                <span className="flex flex-wrap gap-1">
                  {p.roles.filter((r) => r !== 'student' || p.roles.length === 1).map((r) => (
                    <span key={r} className="px-2 py-0.5 rounded-full text-xs font-semibold" style={{ background: 'var(--bg-accent-soft)', color: 'var(--azul-gatuno)' }}>{ROLE_LABEL[r]}</span>
                  ))}
                  {!p.profile_completed && <span className="px-2 py-0.5 rounded-full text-xs" style={{ border: '1px solid var(--border)' }}>Perfil incompleto</span>}
                  {p.status !== 'active' && <span className="px-2 py-0.5 rounded-full text-xs" style={{ border: '1px solid #DC2626', color: '#DC2626' }}>{p.status}</span>}
                </span>
              </div>
              {shown.length > 0 && (
                <ul className="mt-2 grid gap-0.5 text-xs" style={{ color: 'var(--text-secondary)' }}>
                  {shown.map((o) => (
                    <li key={`${o.offering_id}-${o.as}`}>
                      {o.course} · {o.label} — {AS_LABEL[o.as]}{o.as === 'student' && o.status ? ` (${STATUS_LABEL[o.status] ?? o.status})` : ''}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
