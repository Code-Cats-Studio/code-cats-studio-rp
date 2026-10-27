import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { buildGoogleCalendarUrl } from '../../services/liveSessions';
import {
  createClassSession,
  deleteClassSession,
  fetchEditionSessions,
  type EditionSession,
} from '../../services/schedules';
import { fetchEditionGroups, type EditionGroup } from '../../services/courseAdmin';
import AttendanceList from '../schedule/AttendanceList';
import SessionTimeFields, { useSessionTiming } from '../schedule/SessionTimeFields';
import { useToast } from '../../context/ToastContext';
import { splitScheduleNote } from '../../utils/schedule';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const field = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const fmt = (iso: string) => new Date(iso).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' });

// Clases de la edición (de cualquier grupo o de todos) y su lista de asistencia.
export default function EditionSessions({ offeringId, courseTitle }: { offeringId: string; courseTitle: string }) {
  const [sessions, setSessions] = useState<EditionSession[]>([]);
  const [groups, setGroups] = useState<EditionGroup[]>([]);
  const [groupId, setGroupId] = useState('');
  const [title, setTitle] = useState('');
  const [meet, setMeet] = useState('');
  const [openAttendance, setOpenAttendance] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const toast = useToast();
  const timing = useSessionTiming(groups.find((g) => g.id === groupId));

  const load = useCallback(async () => {
    const [s, g] = await Promise.all([fetchEditionSessions(offeringId), fetchEditionGroups(offeringId)]);
    setSessions(s);
    setGroups(g);
  }, [offeringId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const when = timing.resolve();
    if ('error' in when) return toast.error(when.error);
    setBusy(true);
    const error = await createClassSession({ offeringId, groupId: groupId || null, title, meet, ...when });
    if (toast.result(error, 'Clase programada. Los estudiantes reciben un correo con el enlace y el calendario.')) {
      setTitle('');
      timing.reset();
    }
    await load();
    setBusy(false);
  };

  const remove = async (s: EditionSession) => {
    if (!window.confirm(`¿Eliminar la clase «${s.title}»? También se borra su asistencia.`)) return;
    toast.result(await deleteClassSession(s.id), 'Clase eliminada.');
    await load();
  };

  return (
    <div className="grid gap-6">
      <form onSubmit={(e) => void submit(e)} className="p-4 rounded-xl grid gap-3 text-sm" style={card}>
        <h3 className="font-semibold">Programar una clase</h3>
        <div className="grid sm:grid-cols-3 gap-3">
          <label className="grid gap-1 sm:col-span-2">Título
            <input className={field} required maxLength={120} value={title} placeholder="Clase 3: funciones" onChange={(e) => setTitle(e.target.value)} />
          </label>
          <label className="grid gap-1">Para
            <select className={field} value={groupId} onChange={(e) => setGroupId(e.target.value)}>
              <option value="">Toda la edición</option>
              {groups.map((g) => <option key={g.id} value={g.id}>{g.name}{g.schedule_label ? ` · ${g.schedule_label}` : ''}</option>)}
            </select>
          </label>
        </div>
        <SessionTimeFields t={timing} />
        <label className="grid gap-1">Enlace (Meet, Zoom, Teams…)
          <input className={field} value={meet} placeholder="Vacío = el del grupo" onChange={(e) => setMeet(e.target.value)} />
        </label>
        <div><button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Programar y avisar por correo</button></div>
      </form>

      <ul className="grid gap-2">
        {sessions.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay clases programadas.</li>}
        {sessions.map((s) => {
          const { title: name, note } = splitScheduleNote(s.title);
          return (
            <li key={s.id} className="p-3 rounded-xl" style={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm min-w-0">
                  <strong>{name}</strong> <span style={{ color: 'var(--text-muted)' }}>· {s.group_name ?? 'Toda la edición'}</span>
                  {note && <span className="block text-xs font-semibold" style={{ color: '#9A3412' }}>Horario especial: {note}</span>}
                  <span className="block" style={{ color: 'var(--text-muted)' }}>{fmt(s.starts_at)}</span>
                </span>
                <span className="flex flex-wrap gap-2">
                  <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => setOpenAttendance(openAttendance === s.id ? null : s.id)}>
                    {openAttendance === s.id ? 'Ocultar asistencia' : 'Asistencia'}
                  </button>
                  <a href={buildGoogleCalendarUrl(s, courseTitle)} target="_blank" rel="noopener noreferrer" className={btn} style={{ border: '1px solid var(--border)' }}>Calendario</a>
                  <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void remove(s)}>Eliminar</button>
                </span>
              </div>
              {openAttendance === s.id && <AttendanceList sessionId={s.id} />}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
