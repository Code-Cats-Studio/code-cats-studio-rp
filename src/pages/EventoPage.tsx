import { useCallback, useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { buildGoogleCalendarUrl } from '../services/liveSessions';
import { setPageMeta } from '../utils/seo';
import {
  CODE_CATS_DAYS_SLUG,
  EXPERIENCE_LEVELS,
  INTEREST_OPTIONS,
  PARTICIPANT_TYPES,
  TSHIRT_SIZES,
  cancelEventRegistration,
  fetchEventBySlug,
  fetchMyEventRegistration,
  registerForEvent,
  updateMyEventProfile,
  type EventInfo,
  type EventProfileInput,
  type MyEventRegistration,
} from '../services/events';

const EMPTY_FORM: EventProfileInput = {
  participant_type: 'attendee',
  organization: '',
  tshirt_size: '',
  experience_level: '',
  interests: [],
  dietary_notes: '',
  how_found_us: '',
  accepts_photos: false,
};

const card: CSSProperties = { background: 'var(--bg-primary)', border: '1px solid var(--border)' };
const label: CSSProperties = { fontFamily: 'var(--font-heading)', fontWeight: 600, fontSize: '0.875rem', color: 'var(--text-primary)' };
const input: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
};
const primaryBtn: CSSProperties = {
  fontFamily: 'var(--font-heading)',
  background: 'var(--azul-gatuno)',
  color: '#fff',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('es-BO', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit',
    timeZone: 'America/La_Paz',
  });
}

export default function EventoPage() {
  const { user, profile, isLoading: authLoading, isProfileComplete, signInWithGoogle } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MyEventRegistration | null>(null);
  const [form, setForm] = useState<EventProfileInput>(EMPTY_FORM);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPageMeta('Inscripción · Code Cats Days', 'Inscríbete a Code Cats Days 2026 con tu cuenta de Code Cats Studio');
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    const ev = await fetchEventBySlug(CODE_CATS_DAYS_SLUG);
    setEvent(ev);
    if (ev && user) {
      const reg = await fetchMyEventRegistration(ev.id, user.id);
      setMine(reg);
      if (reg?.profile) {
        setForm({
          ...reg.profile,
          tshirt_size: reg.profile.tshirt_size ?? '',
          experience_level: reg.profile.experience_level ?? '',
          organization: reg.profile.organization ?? '',
          dietary_notes: reg.profile.dietary_notes ?? '',
          how_found_us: reg.profile.how_found_us ?? '',
        });
      }
    } else {
      setMine(null);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const set = <K extends keyof EventProfileInput>(key: K, value: EventProfileInput[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const toggleInterest = (name: string) =>
    set('interests', form.interests.includes(name) ? form.interests.filter((i) => i !== name) : [...form.interests, name]);

  const active = mine && mine.status !== 'cancelled';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!event || !user) return;
    setBusy(true);
    setMessage(null);
    try {
      if (active) {
        await updateMyEventProfile(event.id, user.id, form);
        setMessage({ type: 'ok', text: 'Tus datos del evento se actualizaron.' });
        setEditing(false);
      } else {
        const status = await registerForEvent(event.id, form);
        setMessage({
          type: 'ok',
          text: status === 'waitlisted'
            ? 'El cupo está lleno: quedaste en lista de espera. Te avisaremos si se libera un lugar.'
            : '¡Listo! Quedaste inscrito/a en Code Cats Days.',
        });
      }
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo completar la inscripción.' });
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async () => {
    if (!event || !window.confirm('¿Cancelar tu inscripción al evento?')) return;
    setBusy(true);
    setMessage(null);
    try {
      await cancelEventRegistration(event.id);
      setMessage({ type: 'ok', text: 'Cancelaste tu inscripción.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo cancelar.' });
    } finally {
      setBusy(false);
    }
  };

  const showForm = user && isProfileComplete && event && (!active || editing);

  return (
    <main className="min-h-[calc(100vh-8rem)] px-6 py-12" style={{ background: 'var(--bg-secondary)' }}>
      <section className="max-w-2xl mx-auto">
        <p style={{ fontFamily: 'var(--font-heading)', fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-muted)', margin: '0 0 0.5rem' }}>
          <Link to="/code-cats-days" style={{ color: 'var(--azul-gatuno)' }}>← Code Cats Days</Link>
        </p>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(2.25rem, 6vw, 3.5rem)', margin: '0 0 0.5rem', color: 'var(--text-primary)' }}>
          Inscripción al evento
        </h1>

        {loading || authLoading ? (
          <p style={{ color: 'var(--text-secondary)' }}>Cargando…</p>
        ) : !event ? (
          <div className="p-6 rounded-2xl" style={card}>
            <p style={{ color: 'var(--text-secondary)' }}>
              Las inscripciones todavía no están abiertas. Vuelve pronto o sigue nuestras redes para enterarte.
            </p>
          </div>
        ) : (
          <>
            <div className="p-5 rounded-2xl mb-6" style={card}>
              <h2 style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.25rem', color: 'var(--text-primary)' }}>{event.title}</h2>
              <p className="mt-1 capitalize" style={{ color: 'var(--text-secondary)' }}>{formatDate(event.starts_at)}</p>
              {event.location && <p style={{ color: 'var(--text-secondary)' }}>{event.location}</p>}
              <p className="mt-2 text-sm" style={{ color: 'var(--text-muted)' }}>Gratis. Cupos limitados: si se llena quedas en lista de espera.</p>
            </div>

            {message && (
              <p role={message.type === 'error' ? 'alert' : 'status'} className="mb-4 p-3 rounded-xl text-sm"
                style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: message.type === 'error' ? 'var(--error)' : 'var(--text-primary)' }}>
                {message.text}
              </p>
            )}

            {!user && (
              <div className="p-6 rounded-2xl text-center" style={card}>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>Para inscribirte entra con tu cuenta de Google. Es la misma que usas para los cursos.</p>
                <button type="button" onClick={() => void signInWithGoogle()} className="px-5 py-3 rounded-xl font-semibold cursor-pointer" style={primaryBtn}>
                  Continuar con Google
                </button>
              </div>
            )}

            {user && !isProfileComplete && (
              <div className="p-6 rounded-2xl" style={card}>
                <p className="mb-4" style={{ color: 'var(--text-secondary)' }}>
                  Antes de inscribirte completa tu perfil (nombre, documento y fecha de nacimiento). Solo se hace una vez.
                </p>
                <Link to="/perfil" className="inline-block px-5 py-3 rounded-xl font-semibold" style={primaryBtn}>Completar mi perfil</Link>
              </div>
            )}

            {user && isProfileComplete && active && !editing && (
              <div className="p-6 rounded-2xl" style={card}>
                <p style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, color: 'var(--text-primary)' }}>
                  {mine?.status === 'waitlisted' ? 'Estás en lista de espera' : 'Estás inscrito/a ✓'}
                </p>
                <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  {profile?.full_name} · {profile?.email}
                </p>
                <div className="mt-4 flex flex-wrap gap-3">
                  {mine?.status === 'registered' && (
                    <a
                      href={buildGoogleCalendarUrl({
                        title: event.title,
                        starts_at: event.starts_at,
                        ends_at: new Date(new Date(event.starts_at).getTime() + 8 * 3600 * 1000).toISOString(),
                        meet_url: event.location,
                        description: 'Evento de Code Cats Studio',
                      }, event.title)}
                      target="_blank" rel="noopener noreferrer"
                      className="px-4 py-2 rounded-xl font-semibold no-underline"
                      style={{ fontFamily: 'var(--font-heading)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
                      Agregar al calendario
                    </a>
                  )}
                  <button type="button" onClick={() => setEditing(true)} disabled={busy} className="px-4 py-2 rounded-xl font-semibold cursor-pointer" style={primaryBtn}>
                    Editar mis datos del evento
                  </button>
                  <button type="button" onClick={() => void handleCancel()} disabled={busy} className="px-4 py-2 rounded-xl font-semibold cursor-pointer"
                    style={{ fontFamily: 'var(--font-heading)', border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                    Cancelar inscripción
                  </button>
                </div>
              </div>
            )}

            {showForm && (
              <form onSubmit={(e) => void handleSubmit(e)} className="p-6 rounded-2xl grid gap-4" style={card}>
                <label className="grid gap-1">
                  <span style={label}>Voy a participar como</span>
                  <select style={input} value={form.participant_type} onChange={(e) => set('participant_type', e.target.value as EventProfileInput['participant_type'])}>
                    {PARTICIPANT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>

                <label className="grid gap-1">
                  <span style={label}>Institución u organización (opcional)</span>
                  <input style={input} maxLength={120} value={form.organization} onChange={(e) => set('organization', e.target.value)} />
                </label>

                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="grid gap-1">
                    <span style={label}>Talla de polera (opcional)</span>
                    <select style={input} value={form.tshirt_size} onChange={(e) => set('tshirt_size', e.target.value as EventProfileInput['tshirt_size'])}>
                      <option value="">Sin elegir</option>
                      {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="grid gap-1">
                    <span style={label}>Experiencia en programación</span>
                    <select style={input} value={form.experience_level} onChange={(e) => set('experience_level', e.target.value as EventProfileInput['experience_level'])}>
                      <option value="">Sin elegir</option>
                      {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </label>
                </div>

                <fieldset className="grid gap-2">
                  <legend style={label}>Temas que te interesan (hasta 10)</legend>
                  <div className="flex flex-wrap gap-2">
                    {INTEREST_OPTIONS.map((name) => {
                      const on = form.interests.includes(name);
                      return (
                        <button key={name} type="button" aria-pressed={on} onClick={() => toggleInterest(name)}
                          className="px-3 py-1.5 rounded-full text-sm cursor-pointer"
                          style={{ border: '1px solid var(--border)', fontFamily: 'var(--font-body)', background: on ? 'var(--azul-gatuno)' : 'transparent', color: on ? '#fff' : 'var(--text-secondary)' }}>
                          {name}
                        </button>
                      );
                    })}
                  </div>
                </fieldset>

                <label className="grid gap-1">
                  <span style={label}>Alimentación o alergias (opcional)</span>
                  <textarea style={input} rows={2} maxLength={300} value={form.dietary_notes} onChange={(e) => set('dietary_notes', e.target.value)} />
                </label>

                <label className="grid gap-1">
                  <span style={label}>¿Cómo te enteraste del evento? (opcional)</span>
                  <input style={input} maxLength={120} value={form.how_found_us} onChange={(e) => set('how_found_us', e.target.value)} />
                </label>

                <label className="flex items-start gap-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
                  <input type="checkbox" className="mt-1" checked={form.accepts_photos} onChange={(e) => set('accepts_photos', e.target.checked)} />
                  Acepto que se tomen fotos y se usen en las comunicaciones de Code Cats Studio.
                </label>

                <div className="flex flex-wrap gap-3">
                  <button type="submit" disabled={busy} className="px-5 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60" style={primaryBtn}>
                    {busy ? 'Enviando…' : active ? 'Guardar cambios' : 'Inscribirme'}
                  </button>
                  {editing && (
                    <button type="button" onClick={() => setEditing(false)} className="px-5 py-3 rounded-xl cursor-pointer" style={{ border: '1px solid var(--border)', color: 'var(--text-secondary)' }}>
                      Cancelar
                    </button>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Usamos estos datos solo para organizar el evento. Ver <Link to="/privacidad" style={{ color: 'var(--azul-gatuno)' }}>política de privacidad</Link>.
                </p>
              </form>
            )}
          </>
        )}
      </section>
    </main>
  );
}
