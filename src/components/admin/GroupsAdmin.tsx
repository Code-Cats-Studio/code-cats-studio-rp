import { onlyDigits } from '../../utils/validation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  assignPendingToGroups,
  createManualGroup,
  deleteGroup,
  fetchAdminOfferings,
  fetchTeachers,
  type AdminOffering,
  type TeacherOption,
} from '../../services/admin';
import { fetchGroupFill, fetchTeachingGroups, type TeacherGroup } from '../../services/schedules';
import { supabase } from '../../lib/supabase';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import GroupScheduleForm from '../schedule/GroupScheduleForm';
import { useToast } from '../../context/ToastContext';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)', borderRadius: '0.9rem' } as const;
const field = 'w-full';
const btn = 'pn-btn pn-btn-sm';

// Grupos con horario: cada docente tiene su grupo, con sus días, hora y Meet. Los estudiantes eligen entre ellos.
export default function GroupsAdmin({ offeringId: fixedOffering }: { offeringId?: string } = {}) {
  const [offerings, setOfferings] = useState<AdminOffering[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [pickedOffering, setOfferingId] = useState('');
  const offeringId = fixedOffering ?? pickedOffering;
  const [teacherId, setTeacherId] = useState('');
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState('40');
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [fill, setFill] = useState<Record<string, number>>({});
  const [caps, setCaps] = useState<Record<string, string>>({});
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [offs, teach, grps] = await Promise.all([fetchAdminOfferings(), fetchTeachers(), fetchTeachingGroups(null)]);
    setOfferings(offs);
    setTeachers(teach);
    setGroups(grps);
    setCaps(Object.fromEntries(grps.map((g) => [g.id, g.capacity ? String(g.capacity) : ''])));
    if (!fixedOffering) setOfferingId((c) => c || offs[0]?.id || '');
    setTeacherId((c) => c || teach[0]?.user_id || '');
  }, [fixedOffering]);

  useEffect(() => {
    void load();
  }, [load]);

  const create = async (e: FormEvent) => {
    e.preventDefault();
    if (!offeringId || !teacherId || !name.trim()) {
      toast.error('Elige edición, docente y un nombre para el grupo.');
      return;
    }
    setBusy(true);
    const error = await createManualGroup(offeringId, name, teacherId, capacity ? Math.max(1, Number(capacity)) : null);
    toast.result(error, 'Grupo creado. Ahora define su horario y el enlace de la clase.');
    if (!error) setName('');
    await load();
    setBusy(false);
  };

  const loadFill = useCallback(async () => {
    if (offeringId) setFill(await fetchGroupFill(offeringId));
  }, [offeringId]);
  useEffect(() => {
    void loadFill();
  }, [loadFill]);
  useLiveRefresh(['offering_groups', 'enrollments'], () => { void load(); void loadFill(); });

  const saveCapacity = async (g: TeacherGroup) => {
    const raw = (caps[g.id] ?? '').trim();
    const value = raw ? Math.max(1, Math.min(5000, Number(raw))) : null;
    if (value !== null && value < (fill[g.id] ?? 0)) {
      toast.error(`«${g.name}» ya tiene ${fill[g.id]} estudiantes; el cupo no puede ser menor.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase.from('offering_groups').update({ capacity: value }).eq('id', g.id);
    toast.result(error?.message, value === null ? `«${g.name}» quedó sin límite de cupo.` : `Cupo de «${g.name}» guardado: ${value}.`);
    await load();
    setBusy(false);
  };

  const remove = async (g: TeacherGroup) => {
    if (!window.confirm(`¿Eliminar el grupo «${g.name}»? Sus estudiantes quedarán sin grupo.`)) return;
    setBusy(true);
    const error = await deleteGroup(g.id);
    toast.result(error, 'Grupo eliminado.');
    await load();
    setBusy(false);
  };

  const assign = async () => {
    setBusy(true);
    const r = await assignPendingToGroups(offeringId);
    toast.result(r.error, `Estudiantes asignados según su horario preferido: ${r.assigned}.`);
    await load();
    setBusy(false);
  };

  const shown = groups.filter((g) => g.offering_id === offeringId);

  return (
    <section className={fixedOffering ? 'mt-2' : 'mt-12'} aria-labelledby="adm-groups">
      <h2 id="adm-groups" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
        Grupos y horarios
      </h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
        Crea un grupo por docente y define su horario. En la página del curso los estudiantes eligen el horario que prefieren.
      </p>

      {!fixedOffering && offerings.length === 0 ? (
        <p className="mt-3 text-sm" style={{ color: 'var(--text-muted)' }}>Primero necesitas una edición de curso.</p>
      ) : (
        <>
          {!fixedOffering && (
            <label className="mt-4 grid gap-1 text-sm max-w-md">Edición
              <select className={field} value={offeringId} onChange={(e) => setOfferingId(e.target.value)}>
                {offerings.map((o) => <option key={o.id} value={o.id}>{o.course_title} · {o.label}</option>)}
              </select>
            </label>
          )}

          <form onSubmit={(e) => void create(e)} className="mt-4 p-4 rounded-xl grid sm:grid-cols-4 gap-3 items-end text-sm" style={card}>
            <label className="grid gap-1">Nombre
              <input className={field} value={name} maxLength={40} placeholder="Grupo A" onChange={(e) => setName(e.target.value)} />
            </label>
            <label className="grid gap-1">Docente
              <select className={field} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
                {teachers.length === 0 && <option value="">Sin docentes</option>}
                {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name ?? t.email}</option>)}
              </select>
            </label>
            <label className="grid gap-1">Cupo del grupo (estudiantes)
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={4} className={field} value={capacity} onChange={(e) => setCapacity(onlyDigits(e.target.value, 4))} />
            </label>
            <button type="submit" disabled={busy || teachers.length === 0} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>
              Crear grupo
            </button>
          </form>

          <ul className="mt-4 grid gap-3">
            {shown.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Esta edición aún no tiene grupos.</li>}
            {shown.map((g) => {
              const used = fill[g.id] ?? 0;
              const full = g.capacity !== null && used >= g.capacity;
              return (
                <li key={g.id} className="p-4 rounded-xl" style={card}>
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm">
                      <strong>{g.name}</strong>
                      <span className={`pn-badge ml-2 ${full ? 'pn-badge-off' : 'pn-badge-lime'}`}>
                        {used} {g.capacity !== null ? `/ ${g.capacity}` : ''} estudiantes{full ? ' · lleno' : ''}
                      </span>
                      <span className="block" style={{ color: 'var(--text-muted)' }}>
                        {g.schedule_label ?? 'Sin horario definido'}{g.meet_url ? ' · con enlace de clase' : ' · sin enlace de clase'}
                      </span>
                    </span>
                    <span className="flex gap-2">
                      <button type="button" className={btn} onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}>
                        {openGroup === g.id ? 'Cerrar' : 'Editar horario'}
                      </button>
                      <button type="button" disabled={busy} className={`${btn} pn-btn-danger`} onClick={() => void remove(g)}>Eliminar</button>
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-end gap-2 text-sm">
                    <label className="grid gap-1">Cupo del grupo
                      <input type="text" inputMode="numeric" maxLength={4} style={{ width: '7rem' }} placeholder="Sin límite"
                        value={caps[g.id] ?? ''} onChange={(e) => setCaps((c) => ({ ...c, [g.id]: onlyDigits(e.target.value, 4) }))} />
                    </label>
                    <button type="button" disabled={busy || (caps[g.id] ?? '') === (g.capacity ? String(g.capacity) : '')} className="pn-btn pn-btn-sm pn-btn-primary" onClick={() => void saveCapacity(g)}>
                      Guardar cupo
                    </button>
                  </div>
                  {openGroup === g.id && (
                    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
                      <GroupScheduleForm group={g} onSaved={() => void load()} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {shown.length > 0 && (
            <p className="pn-hint mt-3">
              Cupos de los grupos: {shown.reduce((n, g) => n + (g.capacity ?? 0), 0)}
              {offerings.find((o) => o.id === offeringId) && ` · cupo total de la edición: ${offerings.find((o) => o.id === offeringId)!.capacity}`}.
              {' '}El estudiante se inscribe si hay lugar en la edición y elige un grupo con lugar.
            </p>
          )}

          {shown.length > 0 && (
            <button type="button" disabled={busy} className={`${btn} mt-3`} style={{ border: '1px solid var(--border)' }} onClick={() => void assign()}>
              Asignar a los estudiantes sin grupo (según su preferencia)
            </button>
          )}
        </>
      )}
    </section>
  );
}
