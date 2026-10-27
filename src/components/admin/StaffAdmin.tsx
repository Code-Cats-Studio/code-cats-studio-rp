import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  cancelRoleInvite,
  fetchRoleInvites,
  fetchStaff,
  grantRole,
  revokeRole,
  type RoleHolder,
  type RoleInvite,
} from '../../services/admin';
import { useToast } from '../../context/ToastContext';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';

export default function StaffAdmin() {
  const { user } = useAuth();
  const [staff, setStaff] = useState<RoleHolder[]>([]);
  const [invites, setInvites] = useState<RoleInvite[]>([]);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'teacher' | 'admin'>('teacher');
  const toast = useToast();
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const [s, i] = await Promise.all([fetchStaff(), fetchRoleInvites()]);
    setStaff(s);
    setInvites(i);
  }, []);
  useEffect(() => {
    void load();
  }, [load]);

  const add = async (e: FormEvent) => {
    e.preventDefault();
    if (!user || !email.trim()) return;
    setBusy(true);
    const { result, error } = await grantRole(email, role);
    toast.result(
      error,
      result === 'granted'
        ? 'Rol asignado: esa persona ya tenía cuenta.'
        : 'Invitación enviada por correo. El rol se activa cuando cree su cuenta con ese correo y lo confirme.'
    );
    if (!error) setEmail('');
    await load();
    setBusy(false);
  };

  const remove = async (h: RoleHolder) => {
    if (h.user_id === user?.id && h.role === 'admin') {
      toast.error('No puedes quitarte tu propio rol de administrador.');
      return;
    }
    if (!window.confirm(`¿Quitar el rol ${h.role === 'admin' ? 'administrador' : 'docente'} a ${h.email ?? 'esta persona'}?`)) return;
    setBusy(true);
    const error = await revokeRole(h.user_id, h.role);
    toast.result(error, 'Rol quitado.');
    await load();
    setBusy(false);
  };

  return (
    <section className="mt-12" aria-labelledby="adm-staff">
      <h2 id="adm-staff" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
        Docentes y administradores
      </h2>

      <form onSubmit={(e) => void add(e)} className="mt-4 p-4 rounded-xl flex flex-wrap items-end gap-3 text-sm" style={card}>
        <label className="grid gap-1 grow">Correo de la persona
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
            placeholder="persona@gmail.com" className="px-2 py-1.5 rounded border border-gray-300" />
        </label>
        <label className="grid gap-1">Rol
          <select value={role} onChange={(e) => setRole(e.target.value as 'teacher' | 'admin')} className="px-2 py-1.5 rounded border border-gray-300">
            <option value="teacher">Docente</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
        <button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Asignar</button>
        <p className="w-full text-xs" style={{ color: 'var(--text-muted)' }}>
          Sirve para cualquier correo, con Google o con contraseña. Si todavía no tiene cuenta, queda como invitación
          pendiente y se le avisa por correo.
        </p>
      </form>

      {invites.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Invitaciones pendientes</h3>
          <ul className="mt-2 grid gap-2">
            {invites.map((i) => (
              <li key={`${i.email}-${i.role}`} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
                <span className="text-sm">{i.email} <span style={{ color: 'var(--text-muted)' }}>· {i.role === 'admin' ? 'Administrador' : 'Docente'}</span></span>
                <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }}
                  onClick={() => void cancelRoleInvite(i.email, i.role).then(() => load())}>
                  Cancelar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <ul className="mt-4 grid gap-2">
        {staff.map((h) => (
          <li key={`${h.user_id}-${h.role}`} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
            <span className="text-sm">
              <strong>{h.full_name ?? 'Sin nombre'}</strong>{' '}
              <span style={{ color: 'var(--text-muted)' }}>{h.email} · {h.role === 'admin' ? 'Administrador' : 'Docente'}</span>
            </span>
            <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void remove(h)}>
              Quitar rol
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
