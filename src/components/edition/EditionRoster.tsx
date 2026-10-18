import { useCallback, useEffect, useState } from 'react';
import { assignStudentToGroup, fetchEditionGroups, removeStudent, type EditionGroup } from '../../services/courseAdmin';
import { fetchTeacherRoster, type RosterStudent } from '../../services/teacher';
import { useAuth } from '../../context/AuthContext';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const STATUS: Record<string, string> = { active: 'Activo', waitlisted: 'En espera', completed: 'Aprobado', failed: 'No aprobado', dropped: 'Baja', pending_payment: 'Pago pendiente' };

// Estudiantes de la edición con su avance y asistencia. Solo el admin cambia grupos o da de baja.
export default function EditionRoster({ offeringId }: { offeringId: string }) {
  const { roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [rows, setRows] = useState<RosterStudent[]>([]);
  const [groups, setGroups] = useState<EditionGroup[]>([]);
  const [showDropped, setShowDropped] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [r, g] = await Promise.all([fetchTeacherRoster(offeringId, null), fetchEditionGroups(offeringId)]);
    setRows(r.data);
    setGroups(g);
    if (r.error) setMessage(r.error);
    setLoading(false);
  }, [offeringId]);

  useEffect(() => {
    void load();
  }, [load]);

  const changeGroup = async (row: RosterStudent, groupId: string) => {
    const error = await assignStudentToGroup(row.enrollment_id, groupId || null);
    setMessage(error ?? 'Grupo actualizado.');
    await load();
  };

  const drop = async (row: RosterStudent) => {
    const reason = window.prompt(`Motivo para dar de baja a ${row.full_name}:`);
    if (!reason?.trim()) return;
    const error = await removeStudent(row.enrollment_id, reason.trim());
    setMessage(error ?? 'Estudiante dado de baja.');
    await load();
  };

  const visible = rows.filter((r) => showDropped || r.status !== 'dropped');
  const active = rows.filter((r) => r.status === 'active').length;

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <strong>{active} activos</strong>
        <span style={{ color: 'var(--text-muted)' }}>{rows.filter((r) => r.status === 'waitlisted').length} en espera</span>
        <label className="flex items-center gap-2"><input type="checkbox" checked={showDropped} onChange={(e) => setShowDropped(e.target.checked)} /> Mostrar bajas</label>
      </div>
      {message && <p role="status" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}
      {loading ? <p className="text-sm">Cargando…</p> : visible.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Todavía no hay estudiantes en esta edición.</p>
      ) : (
        <ul className="grid gap-2">
          {visible.map((r) => (
            <li key={r.enrollment_id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-3" style={card}>
              <span className="text-sm min-w-0">
                <strong>{r.full_name}</strong> <span style={{ color: 'var(--text-muted)' }}>{r.email}</span>
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                  {STATUS[r.status ?? 'active']} · avance {Math.round(r.progress_pct)}% · asistencia {Math.round(r.attendance_pct)}%
                </span>
              </span>
              {isAdmin && r.status !== 'dropped' && (
                <span className="flex flex-wrap items-center gap-2">
                  <select className="px-2 py-1 rounded border border-gray-300 text-xs" value={r.group_id ?? ''} onChange={(e) => void changeGroup(r, e.target.value)} aria-label={`Grupo de ${r.full_name}`}>
                    <option value="">Sin grupo</option>
                    {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
                  </select>
                  <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void drop(r)}>Dar de baja</button>
                </span>
              )}
              {!isAdmin && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{r.group_name ?? 'Sin grupo'}</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
