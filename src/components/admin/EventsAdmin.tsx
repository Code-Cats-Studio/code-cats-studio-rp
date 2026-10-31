import { onlyDigits } from '../../utils/validation';
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
import { useToast } from '../../context/ToastContext';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer disabled:opacity-50';
const field = 'w-full px-2 py-1.5 rounded border border-gray-300';

// Bolivia es UTC-4 todo el año: se guarda siempre con ese desfase
const BO_OFFSET_MS = 4 * 60 * 60 * 1000;
const toInputValue = (iso: string) => new Date(new Date(iso).getTime() - BO_OFFSET_MS).toISOString().slice(0, 16);
const fromInputValue = (local: string) => new Date(`${local}:00-04:00`).toISOString();

// Check-in del día del evento, persona por persona: se busca a quien llega y se confirma su ingreso
function Registrants({ eventId }: { eventId: string }) {
  const [rows, setRows] = useState<EventRegistrant[]>([]);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'pending' | 'arrived'>('pending');
  const [pendingIds, setPendingIds] = useState<string[]>([]);
  const toast = useToast();

  useEffect(() => {
    void fetchEventRegistrants(eventId).then(setRows);
  }, [eventId]);

  const setAttended = async (r: EventRegistrant, attended: boolean) => {
    setPendingIds((ids) => [...ids, r.user_id]);
    const error = await setEventAttended(eventId, r.user_id, attended);
    setPendingIds((ids) => ids.filter((id) => id !== r.user_id));
    if (error) {
      toast.error(error);
      return;
    }
    setRows((all) => all.map((x) => (x.user_id === r.user_id ? { ...x, attended } : x)));
    toast.success(attended ? `Check-in de ${r.full_name ?? r.email}` : `Se deshizo el check-in de ${r.full_name ?? r.email}`);
  };

  const active = rows.filter((r) => r.status !== 'cancelled');
  const arrived = active.filter((r) => r.attended);
  const text = query.trim().toLowerCase();
  const shown = active
    .filter((r) => r.attended === (tab === 'arrived'))
    .filter((r) => !text || `${r.full_name ?? ''} ${r.email ?? ''}`.toLowerCase().includes(text));
  const percent = active.length ? Math.round((arrived.length / active.length) * 100) : 0;

  return (
    <div className="mt-3 pt-3 grid gap-3" style={{ borderTop: '1px solid var(--border)' }}>
      <div>
        <p className="text-sm"><strong>{arrived.length}</strong> de <strong>{active.length}</strong> ya llegaron</p>
        <div className="mt-1 h-2 rounded-full overflow-hidden" style={{ background: 'var(--border)' }} role="progressbar" aria-valuenow={percent} aria-valuemin={0} aria-valuemax={100} aria-label="Avance del check-in">
          <div className="h-full" style={{ width: `${percent}%`, background: 'var(--azul-gatuno)', transition: 'width .3s ease' }} />
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search" autoFocus className="flex-1 min-w-[14rem] px-3 py-2 rounded-lg border border-gray-300 text-sm"
          placeholder="Busca por nombre o correo" aria-label="Buscar inscrito" value={query} onChange={(e) => setQuery(e.target.value)}
        />
        {([['pending', `Por llegar (${active.length - arrived.length})`], ['arrived', `Ya llegaron (${arrived.length})`]] as const).map(([key, label]) => (
          <button key={key} type="button" aria-pressed={tab === key} className={btn}
            style={tab === key ? { background: 'var(--azul-gatuno)', color: '#fff' } : { border: '1px solid var(--border)' }}
            onClick={() => setTab(key)}>{label}</button>
        ))}
      </div>
      <ul className="grid gap-2">
        {shown.map((r) => (
          <li key={r.user_id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl" style={{ border: '1px solid var(--border)' }}>
            <div className="min-w-0">
              <p className="font-semibold truncate">{r.full_name ?? r.email}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                {r.full_name ? r.email : ''}{r.status === 'waitlisted' ? ' · En lista de espera' : ''}
              </p>
            </div>
            {tab === 'pending' ? (
              <button type="button" disabled={pendingIds.includes(r.user_id)} className="px-4 py-2 rounded-lg text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'var(--azul-gatuno)', color: '#fff' }} onClick={() => void setAttended(r, true)}>
                Hacer check-in
              </button>
            ) : (
              <button type="button" disabled={pendingIds.includes(r.user_id)} className={btn} style={{ border: '1px solid var(--border)' }} onClick={() => void setAttended(r, false)}>
                Deshacer
              </button>
            )}
          </li>
        ))}
        {shown.length === 0 && (
          <li className="text-sm" style={{ color: 'var(--text-muted)' }}>
            {text ? 'Nadie coincide con la búsqueda.' : tab === 'pending' ? 'No queda nadie por llegar.' : 'Todavía no hizo check-in nadie.'}
          </li>
        )}
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
  const toast = useToast();
  const [busy, setBusy] = useState(false);
  const [openList, setOpenList] = useState<string | null>(null);

  const load = useCallback(async () => setEvents(await fetchAdminEvents()), []);
  useEffect(() => {
    void load();
  }, [load]);

  const edit = (e: AdminEvent) => {
    setForm({
      id: e.id, title: e.title, slug: e.slug, description: e.description ?? '', starts_at: toInputValue(e.starts_at),
      location: e.location ?? '', capacity: e.capacity ? String(e.capacity) : '', is_published: e.is_published,
    });
    setOpenList(null);
  };

  const submit = async (ev: FormEvent) => {
    ev.preventDefault();
    if (!form) return;
    if (!form.title.trim() || !form.slug.trim() || !form.starts_at) {
      toast.error('Completa título, enlace (slug) y fecha.');
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
    toast.result(error, 'Evento guardado.');
    if (!error) setForm(null);
    await load();
    setBusy(false);
  };

  const togglePublish = async (e: AdminEvent) => {
    setBusy(true);
    const error = await setEventPublished(e.id, !e.is_published);
    toast.result(error, e.is_published ? 'Evento oculto.' : 'Evento publicado: ya se puede inscribir.');
    await load();
    setBusy(false);
  };

  const download = async (e: AdminEvent) => {
    const csv = await exportEventRegistrations(e.id);
    if (csv === null) {
      toast.error('No se pudo exportar la lista.');
      return;
    }
    const url = URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `inscritos-${e.slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formEl = form ? (
        <form onSubmit={(e) => void submit(e)} className="mt-4 p-4 rounded-xl grid gap-3 text-sm" style={card}>
          <p className="font-semibold">{form.id ? 'Editando evento' : 'Nuevo evento'}</p>
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
            <label className="grid gap-1">Cupo de inscripciones (vacío = sin límite)
              <input type="text" inputMode="numeric" pattern="[0-9]*" maxLength={5} className={field} value={form.capacity} onChange={(e) => setForm({ ...form, capacity: onlyDigits(e.target.value, 5) })} />
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
            El cupo es el tope de personas que pueden inscribirse, no el aforo del lugar: si esperas que algunas no lleguen, puedes dejarlo por encima del aforo.
            Al llegar al tope se cierra la inscripción y no se puede bajar el cupo por debajo de los inscritos.
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Para Code Cats Days usa el enlace <code>code-cats-days</code>: la inscripción de la página del evento busca ese enlace.
          </p>
        </form>
  ) : null;

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


      {!form?.id && formEl}

      <ul className="mt-4 grid gap-3">
        {events.length === 0 && <li className="text-sm" style={{ color: 'var(--text-muted)' }}>Aún no hay eventos.</li>}
        {events.map((e) => (
          form?.id === e.id ? <li key={e.id}>{formEl}</li> : (
          <li key={e.id} className="p-4 rounded-xl" style={card}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{e.title} {!e.is_published && <span className="text-xs font-normal" style={{ color: 'var(--text-muted)' }}>(borrador)</span>}</p>
                <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                  {new Date(e.starts_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' })}
                  {e.location ? ` · ${e.location}` : ''}
                </p>
                <p className="text-sm mt-1">Inscritos: <strong>{e.registered}{e.capacity ? ` / ${e.capacity}` : ''}</strong>
                  {e.capacity && e.registered >= e.capacity && <strong style={{ color: 'var(--azul-gatuno)' }}> · Cupo lleno</strong>}
                  {e.waitlisted > 0 && <> · En espera (heredados): <strong>{e.waitlisted}</strong></>}</p>
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
          )
        ))}
      </ul>
    </section>
  );
}
