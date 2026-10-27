import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { buildGoogleCalendarUrl } from '../../services/liveSessions';
import {
  createClassSession,
  deleteClassSession,
  fetchGroupSessions,
  fetchTeachingGroups,
  type ClassSession,
  type TeacherGroup,
} from '../../services/schedules';
import GroupScheduleForm from './GroupScheduleForm';
import { useToast } from '../../context/ToastContext';
import SessionTimeFields, { useSessionTiming } from './SessionTimeFields';
import { splitScheduleNote } from '../../utils/schedule';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const field = 'w-full px-2 py-1.5 rounded border border-gray-300';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' });

// Pestaña "Clases" del docente: horario fijo de su grupo y programación de clases con aviso por correo.
export default function ClassScheduler() {
  const { user, roles } = useAuth();
  const [groups, setGroups] = useState<TeacherGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [sessions, setSessions] = useState<ClassSession[]>([]);
  const [title, setTitle] = useState('');
  const [meet, setMeet] = useState('');
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const isAdmin = roles.includes('admin');

  const loadGroups = useCallback(async () => {
    if (!user) return;
    const list = await fetchTeachingGroups(isAdmin ? null : user.id);
    setGroups(list);
    setGroupId((current) => current || list[0]?.id || '');
  }, [user, isAdmin]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const loadSessions = useCallback(async () => {
    setSessions(groupId ? await fetchGroupSessions(groupId) : []);
  }, [groupId]);

  useEffect(() => {
    void loadSessions();
  }, [loadSessions]);

  const group = groups.find((g) => g.id === groupId);
  const timing = useSessionTiming(group);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!group) return;
    const when = timing.resolve();
    if ('error' in when) return toast.error(when.error);
    setBusy(true);
    const error = await createClassSession({
      offeringId: group.offering_id,
      groupId: group.id,
      title,
      meet,
      ...when,
    });
    toast.result(error, 'Clase programada. Los estudiantes del grupo recibirán un correo con el enlace y el calendario.');
    if (!error) {
      setTitle('');
      setMeet('');
      timing.reset();
      await loadSessions();
    }
    setBusy(false);
  };

  const remove = async (s: ClassSession) => {
    if (!window.confirm(`¿Eliminar la clase «${s.title}»? Los estudiantes que ya recibieron el correo no serán avisados.`)) return;
    const error = await deleteClassSession(s.id);
    toast.result(error, 'Clase eliminada.');
    await loadSessions();
  };

  if (groups.length === 0) {
    return (
      <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
        Todavía no tienes un grupo asignado. Un administrador debe crear tu grupo en el panel de administración.
      </p>
    );
  }

  return (
    <div className="grid gap-8">
      <label className="grid gap-1 text-sm max-w-md">Grupo
        <select className={field} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
          {groups.map((g) => (
            <option key={g.id} value={g.id}>{g.course_title} · {g.offering_label} · {g.name}</option>
          ))}
        </select>
      </label>


      {group && (
        <>
          <section className="p-4 rounded-xl" style={card} aria-labelledby="cls-schedule">
            <h3 id="cls-schedule" className="font-semibold mb-3">Horario del grupo</h3>
            <GroupScheduleForm key={group.id} group={group} onSaved={() => void loadGroups()} />
          </section>

          <section className="p-4 rounded-xl" style={card} aria-labelledby="cls-new">
            <h3 id="cls-new" className="font-semibold mb-3">Programar una clase</h3>
            <form onSubmit={(e) => void submit(e)} className="grid gap-3 text-sm">
              <label className="grid gap-1">Título
                <input className={field} required maxLength={120} value={title} placeholder="Clase 3: funciones" onChange={(e) => setTitle(e.target.value)} />
              </label>
              <SessionTimeFields t={timing} />
              <label className="grid gap-1">Enlace de la clase (vacío = el del grupo)
                <input className={field} value={meet} placeholder={group.meet_url ?? 'https://meet.google.com/abc-defg-hij'} onChange={(e) => setMeet(e.target.value)} />
              </label>
              <div>
                <button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>
                  Programar y avisar por correo
                </button>
              </div>
            </form>
          </section>

          <section aria-labelledby="cls-list">
            <h3 id="cls-list" className="font-semibold mb-3">Clases del grupo</h3>
            {sessions.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay clases programadas.</p>
            ) : (
              <ul className="grid gap-2">
                {sessions.map((s) => {
                  const { title: name, note } = splitScheduleNote(s.title);
                  return (
                  <li key={s.id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
                    <span className="text-sm min-w-0">
                      <strong>{name}</strong>
                      {note && <span className="block text-xs font-semibold" style={{ color: '#9A3412' }}>Horario especial: {note}</span>}
                      <span className="block" style={{ color: 'var(--text-muted)' }}>{fmt(s.starts_at)}</span>
                    </span>
                    <span className="flex flex-wrap gap-2">
                      <a href={buildGoogleCalendarUrl(s, group.course_title)} target="_blank" rel="noopener noreferrer"
                        className={btn} style={{ border: '1px solid var(--border)' }}>Calendario</a>
                      <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void remove(s)}>Eliminar</button>
                    </span>
                  </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
