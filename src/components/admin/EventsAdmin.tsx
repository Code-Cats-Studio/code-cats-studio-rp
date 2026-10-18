import { useCallback, useEffect, useState, type FormEvent } from 'react';
import {
  exportEventRegistrations,
  fetchAdminEvents,
  fetchEventRegistrants,
  setEventAttended,
  type EventRegistrant,
  saveEvent,
  setEventPublished,
  type AdminEvent,
} from '../../services/admin';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const field = 'w-full px-2 py-1.5 rounded border border-gray-300';

// Bolivia es UTC-4 todo el año: se guarda siempre con ese desfase
const BO_OFFSET_MS = 4 * 60 * 60 * 1000;
const toInputValue = (iso: string) => new Date(new Date(iso).getTime() - BO_OFFSET_MS).toISOString().slice(0, 16);
const fromInputValue = (local: string) => new Date(`${local}:00-04:00`).toISOString();

// Lista de asistencia del día del evento: el equipo marca quién llegó
function Registrants({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<EventRegistrant[]>([]);
  const [query, setQuery] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void fetchEventRegistrants(eventId).then(setRows);
  }, [eventId]);

  const toggle = async (r: EventRegistrant) => {
    setRows((all) => all.map((x) => (x.user_id === r.user_id ? { ...x, attended: !x.attended } : x)));
    const error = await setEventAttended(eventId, r.user_id, !r.attended);
    if (error) {
      setMessage(error);
      setRows((all) => all.map((x) => (x.user_id === r.user_id ? { ...x, attended: r.attended } : x)));
    }
  };

  const active = rows.filter((r) => r.status !== 'cancelled');
  const shown = active.filter((r) => `${r.full_name ?? ''} ${r.email ?? ''}`.toLowerCase().includes(query.toLowerCase()));
  return (
    <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <strong>Llegaron {active.filter((r) => r.attended).length} de {active.length}</strong>
        <input className="px-2 py-1 rounded border border-gray-300 text-sm" placeholder="Buscar por nombre o correo" value={query} onChange={(e) => setQuery(e.target.value)} />
        {message && <span role="alert" style={{ color: 'var(--error)' }}>{message}</span>}
      </div>
      <ul className="mt-2 grid gap-1 sm:grid-cols-2">
        {shown.map((r) => (
          <li key={r.user_id}>
            <label className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm cursor-pointer" style={{ border: '1px solid var(--border)' }}>
              <input type="checkbox" checked={r.attended} onChange={() => void toggle(r)} />
              <span className="min-w-0 truncate">{r.full_name ?? r.email}</span>
              {r.status === 'waitlisted' && <span className="text-xs" style={{ color: 'var(--text-muted)' }}>(espera)</span>}
            </label>
          </li>
        ))}
        {shown.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Sin resultados.</li>}
      </ul>
    </div>
  );
}

const slugify = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

interface FormState {
  id: string | null;
  title: string;
  slug: string;
  description: string;
  starts_at: string;
  location: string;
  capacity: string;
  is_published: boolean;
}

const EMPTY: FormState = {
  id: null, title: '', slug: '', description: '', starts_at: '', location: '', capacity: '', is_published: false,
};

export default function EventsAdmin() {
  const [events, setEvents] = useState<AdminEvent[]>([]);
  const [form, setForm] = useState<FormState | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [openList, setOpenList] = useState<string | null>(null);

  const load = useCallback(async () => setEvents(await fetchAdminEvents()), []);
  useEffect(() => {
    void load();
  }, [load]);

  const edit = (e: AdminEvent) =>
    setForm({
      id: e.id, title: e.title, slug: e.slug, description: e.description ?? '', starts_at: toInputValue(e.starts_at),
      location: e.location ?? '', capacity: e.capacity ? String(e.capacity) : '', is_published: e.is_published,
    });

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim() || !form.starts_at) {
      setMessage('Completa título, enlace (slug) y fecha.');
      return;
    }
    setBusy(true);
    const error = await saveEvent(form.id, {
      title: form.title,
      slug: form.slug,
      description: form.description,
      starts_at: fromInputValue(form.starts_at),
      location: form.location,
      capacity: form.capacity ? Math.max(1, Number(form.capacity)) : null,
      is_published: form.is_published,
    });
    setMessage(error ?? 'Evento guardado.');
    if (!error) setForm(null);
    await load();
    setBusy(false);
  };

  const togglePublish = async (e: AdminEvent) => {
    setBusy(true);
    const error = await setEventPublished(e.id, !e.is_published);
    setMessage(error ?? (e.is_published ? 'Evento oculto.' : 'Evento publicado: ya se puede inscribir.'));
    await load();
    setBusy(false);
  };

  const download = async (e: AdminEvent) => {
    const csv = await exportEventRegistrations(e.id);
    if (csv === null) {
      setMessage('No se pudo exportar la lista.');
      return;
    }
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos-${e.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <section className="mt-12" aria-labelledby="adm-events">
      <div className="flex items-center justify-between gap-3">
        <h2 id="adm-events" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem' }}>
          Eventos
        </h2>
        {!form && (
          <button type="button" className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}
            onClick={() => setForm(EMPTY)}>Crear evento</button>
        )}
      </div>

      {message && <p role="status" className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>{message}</p>}

      {form && (
        <form onSubmit={(e) => void submit(e)} className="mt-4 p-4 rounded-xl grid gap-3 text-sm" style={card}>
          <label className="grid gap-1">Título
            <input className={field} value={form.title} maxLength={150}
              onChange={(e) => setForm({ ...form, title: e.target.value, slug: form.id ? form.slug : slugify(e.target.value) })} />
          </label>
          <label className="grid gap-1">Enlace (slug, único)
            <input className={field} value={form.slug} onChange={(e) => setForm({ ...form, slug: slugify(e.target.value) })} />
          </label>
          <label className="grid gap-1">Descripción
            <textarea className={field} rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </label>
          <div className="grid sm:grid-cols-3 gap-3">
            <label className="grid gap-1">Fecha y hora (Bolivia)
              <input type="datetime-local" className={field} value={form.starts_at} onChange={(e) => setForm({ ...form, starts_at: e.target.value })} />
            </label>
            <label className="grid gap-1">Lugar
              <input className={field} value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </label>
            <label className="grid gap-1">Cupo (vacío = sin límite)
              <input type="number" min={1} className={field} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: e.target.value })} />
            </label>
          </div>
          <label className="flex items-center gap-2">
            <input type="checkbox" checked={form.is_published} onChange={(e) => setForm({ ...form, is_published: e.target.checked })} />
            Publicado (visible y con inscripciones abiertas)
          </label>
          <div className="flex gap-2">
            <button type="submit" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Guardar</button>
            <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => setForm(null)}>Cancelar</button>
          </div>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Para Code Cats Days usa el enlace <code>code-cats-days</code>: la inscripción de la página del evento busca ese enlace.
          </p>
        </form>
      )}

      <ul className="mt-4 grid gap-3">
        {events.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay eventos.</li>}
        {events.map((e) => (
          <li key={e.id} className="p-4 rounded-xl" style={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{e.title} {!e.is_published && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(borrador)</span>}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(e.starts_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' })}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                <p className="text-sm mt-1">Inscritos: <strong>{e.registered}{e.capacity ? ` / ${e.capacity}` : ''}</strong> · En espera: <strong>{e.waitlisted}</strong></p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => edit(e)}>Editar</button>
                <button type="button" className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => setOpenList(openList === e.id ? null : e.id)}>
                  {openList === e.id ? 'Ocultar asistencia' : 'Asistencia del evento'}
                </button>
                <button type="button" disabled={busy} className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void download(e)}>Descargar inscritos</button>
                <button type="button" disabled={busy} className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }} onClick={() => void togglePublish(e)}>
                  {e.is_published ? 'Ocultar' : 'Publicar'}
                </button>
              </div>
            </div>
            {openList === e.id && <Registrants eventId={e.id} />}
          </li>
        ))}
      </ul>
    </section>
  );
}
