import { useCallback, useEffect, useState } from 'react';
import { fetchTeachers, type TeacherOption } from '../../services/admin';
import { fetchOfferingStaff, removeOfferingStaff, setOfferingStaff, type StaffRow } from '../../services/courseAdmin';
import { useAuth } from '../../context/AuthContext';
import GroupsAdmin from '../admin/GroupsAdmin';
import { useToast } from '../../context/ToastContext';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const field = 'px-2 py-1.5 rounded border border-gray-300 text-sm';

// Quiénes dictan la edición (docente principal y apoyo) y los grupos con el horario de cada uno.
export default function EditionTeam({ offeringId, onChange }: { offeringId: string; onChange?: () => void }) {
  const { user, roles } = useAuth();
  const [staff, setStaff] = useState<StaffRow[]>([]);
  const [teachers, setTeachers] = useState<TeacherOption[]>([]);
  const [teacherId, setTeacherId] = useState('');
  const [role, setRole] = useState<'lead' | 'assistant'>('lead');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([fetchOfferingStaff(offeringId), fetchTeachers()]);
    // un admin puede ponerse a sí mismo en el equipo para gestionar la edición
    const me: TeacherOption[] = user && roles.includes('admin') && !t.some((x) => x.user_id === user.id)
      ? [{ user_id: user.id, full_name: 'Yo (administrador)', email: user.email ?? null }]
      : [];
    const options = [...t, ...me];
    setStaff(s);
    setTeachers(options);
    setTeacherId((c) => c || options[0]?.user_id || '');
  }, [offeringId, user, roles]);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async () => {
    if (!teacherId) return;
    setBusy(true);
    const error = await setOfferingStaff(offeringId, teacherId, role);
    toast.result(error, 'Equipo actualizado.');
    await load();
    onChange?.();
    setBusy(false);
  };

  const remove = async (s: StaffRow) => {
    if (!window.confirm(`¿Quitar a ${s.full_name ?? s.email} del equipo de esta edición?`)) return;
    setBusy(true);
    const error = await removeOfferingStaff(offeringId, s.user_id);
    toast.result(error, 'Docente quitado de la edición.');
    await load();
    onChange?.();
    setBusy(false);
  };

  return (
    <div className="grid gap-6">
      <section aria-labelledby={`team-${offeringId}`}>
        <h3 id={`team-${offeringId}`} className="font-semibold">Equipo docente</h3>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          El <strong>docente principal</strong> programa clases, tareas y material de toda la edición y puede editar el contenido del curso.
          Los docentes de apoyo trabajan con su grupo. Si aquí no ves a alguien, primero dale el rol de docente en «Docentes y administradores».
        </p>
        <div className="mt-3 flex flex-wrap items-end gap-2">
          <label className="grid gap-1 text-sm">Docente
            <select className={field} value={teacherId} onChange={(e) => setTeacherId(e.target.value)}>
              {teachers.length === 0 && <option value="">Aún no hay docentes</option>}
              {teachers.map((t) => <option key={t.user_id} value={t.user_id}>{t.full_name ?? t.email}</option>)}
            </select>
          </label>
          <label className="grid gap-1 text-sm">Rol
            <select className={field} value={role} onChange={(e) => setRole(e.target.value as 'lead' | 'assistant')}>
              <option value="lead">Docente principal</option>
              <option value="assistant">Docente de apoyo</option>
            </select>
          </label>
          <button type="button" disabled={busy || !teacherId} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }} onClick={() => void add()}>Agregar al equipo</button>
        </div>
        <ul className="mt-3 grid gap-2">
          {staff.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Esta edición todavía no tiene docentes.</li>}
          {staff.map((s) => (
            <li key={s.user_id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
              <span className="text-sm"><strong>{s.full_name ?? 'Sin nombre'}</strong> <span style={{ color: 'var(--text-muted)' }}>{s.email} · {s.staff_role === 'lead' ? 'Principal' : 'Apoyo'}</span></span>
              <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void remove(s)}>Quitar</button>
            </li>
          ))}
        </ul>
      </section>
      <GroupsAdmin offeringId={offeringId} />
    </div>
  );
}
