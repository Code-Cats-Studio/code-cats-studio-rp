import { clampInt } from '../../utils/validation';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  createAssignment,
  createMaterial,
  deleteAssignment,
  deleteMaterial,
  fetchEditionAssignments,
  fetchEditionGroups,
  fetchEditionMaterials,
  type AssignmentRow,
  type EditionGroup,
  type MaterialRow,
} from '../../services/courseAdmin';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const field = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const KINDS: { value: MaterialRow['kind']; label: string }[] = [
  { value: 'drive', label: 'Google Drive' },
  { value: 'link', label: 'Enlace' },
  { value: 'github', label: 'GitHub' },
  { value: 'other', label: 'Otro' },
];

// Tareas (que los estudiantes entregan) y material (enlaces a Drive u otros) de la edición.
export default function EditionWork({ offeringId }: { offeringId: string }) {
  const [assignments, setAssignments] = useState<AssignmentRow[]>([]);
  const [materials, setMaterials] = useState<MaterialRow[]>([]);
  const [groups, setGroups] = useState<EditionGroup[]>([]);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const [aTitle, setATitle] = useState('');
  const [aDesc, setADesc] = useState('');
  const [aDue, setADue] = useState('');
  const [aMax, setAMax] = useState(100);
  const [aWeight, setAWeight] = useState(1);
  const [aGroup, setAGroup] = useState('');

  const [mTitle, setMTitle] = useState('');
  const [mKind, setMKind] = useState<MaterialRow['kind']>('drive');
  const [mUrl, setMUrl] = useState('');
  const [mGroup, setMGroup] = useState('');

  const load = useCallback(async () => {
    const [a, m, g] = await Promise.all([fetchEditionAssignments(offeringId), fetchEditionMaterials(offeringId), fetchEditionGroups(offeringId)]);
    setAssignments(a);
    setMaterials(m);
    setGroups(g);
  }, [offeringId]);

  useEffect(() => {
    void load();
  }, [load]);

  const groupName = (id: string | null) => (id ? groups.find((g) => g.id === id)?.name ?? 'Grupo' : 'Toda la edición');

  const addAssignment = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await createAssignment(offeringId, { title: aTitle, description: aDesc, dueLocal: aDue, maxScore: aMax, weight: aWeight, groupId: aGroup || null });
    setMessage(error ?? 'Tarea creada. Los estudiantes la ven en «Tareas y material».');
    if (!error) { setATitle(''); setADesc(''); setADue(''); }
    await load();
    setBusy(false);
  };

  const addMaterial = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const error = await createMaterial(offeringId, { title: mTitle, kind: mKind, url: mUrl, groupId: mGroup || null });
    setMessage(error ?? 'Material agregado.');
    if (!error) { setMTitle(''); setMUrl(''); }
    await load();
    setBusy(false);
  };

  return (
    <div className="grid gap-8">
      {message && <p role="status" className="text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}

      <section aria-labelledby={`as-${offeringId}`}>
        <h3 id={`as-${offeringId}`} className="font-semibold">Tareas</h3>
        <form onSubmit={(e) => void addAssignment(e)} className="mt-3 p-4 rounded-xl grid gap-3 text-sm" style={card}>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1 sm:col-span-2">Título<input className={field} required maxLength={150} value={aTitle} onChange={(e) => setATitle(e.target.value)} /></label>
            <label className="grid gap-1">Para
              <select className={field} value={aGroup} onChange={(e) => setAGroup(e.target.value)}>
                <option value="">Toda la edición</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1">Indicaciones<textarea className={field} rows={2} value={aDesc} onChange={(e) => setADesc(e.target.value)} /></label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1">Fecha límite (Bolivia)<input type="datetime-local" className={field} value={aDue} onChange={(e) => setADue(e.target.value)} /></label>
            <label className="grid gap-1">Puntaje máximo<input type="number" min={1} max={1000} step={1} className={field} value={aMax} onChange={(e) => setAMax(clampInt(e.target.value, 1, 1000, 100))} /></label>
            <label className="grid gap-1">Peso en la nota final<input type="number" min={0} max={100} step="0.5" className={field} value={aWeight} onChange={(e) => setAWeight(Math.min(100, Math.max(0, Number(e.target.value) || 0)))} /></label>
          </div>
          <div><button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Crear tarea</button></div>
        </form>
        <ul className="mt-3 grid gap-2">
          {assignments.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay tareas.</li>}
          {assignments.map((a) => (
            <li key={a.id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
              <span className="text-sm"><strong>{a.title}</strong>
                <span className="block text-xs" style={{ color: 'var(--text-muted)' }}>
                  {groupName(a.group_id)} · {a.max_score} pts · peso {a.weight}{a.due_at ? ` · entrega ${new Date(a.due_at).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' })}` : ''}
                </span>
              </span>
              <button type="button" className={btn} style={{ border: '1px solid var(--border)' }}
                onClick={() => window.confirm('¿Eliminar la tarea? También se borran las entregas.') && void deleteAssignment(a.id).then((e) => { setMessage(e ?? 'Tarea eliminada.'); return load(); })}>
                Eliminar
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby={`ma-${offeringId}`}>
        <h3 id={`ma-${offeringId}`} className="font-semibold">Material</h3>
        <form onSubmit={(e) => void addMaterial(e)} className="mt-3 p-4 rounded-xl grid gap-3 text-sm" style={card}>
          <div className="grid sm:grid-cols-4 gap-3">
            <label className="grid gap-1 sm:col-span-2">Título<input className={field} required maxLength={150} value={mTitle} onChange={(e) => setMTitle(e.target.value)} /></label>
            <label className="grid gap-1">Tipo
              <select className={field} value={mKind} onChange={(e) => setMKind(e.target.value as MaterialRow['kind'])}>
                {KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}
              </select>
            </label>
            <label className="grid gap-1">Para
              <select className={field} value={mGroup} onChange={(e) => setMGroup(e.target.value)}>
                <option value="">Toda la edición</option>
                {groups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
              </select>
            </label>
          </div>
          <label className="grid gap-1">Enlace (Drive, GitHub…)<input className={field} required value={mUrl} placeholder="https://drive.google.com/…" onChange={(e) => setMUrl(e.target.value)} /></label>
          <div><button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Agregar material</button></div>
        </form>
        <ul className="mt-3 grid gap-2">
          {materials.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay material.</li>}
          {materials.map((m) => (
            <li key={m.id} className="p-3 rounded-xl flex flex-wrap items-center justify-between gap-2" style={card}>
              <span className="text-sm min-w-0"><strong>{m.title}</strong> <span style={{ color: 'var(--text-muted)' }}>· {groupName(m.group_id)}</span>
                <a href={m.url} target="_blank" rel="noopener noreferrer" className="block text-xs truncate" style={{ color: 'var(--azul-gatuno)' }}>{m.url}</a>
              </span>
              <button type="button" className={btn} style={{ border: '1px solid var(--border)' }}
                onClick={() => window.confirm('¿Quitar este material?') && void deleteMaterial(m.id).then((e) => { setMessage(e ?? 'Material quitado.'); return load(); })}>
                Quitar
              </button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
