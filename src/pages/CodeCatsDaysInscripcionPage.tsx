import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearRedirect, rememberRedirect } from '../components/auth/PostLoginRedirect';
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
import '../styles/code-cats-days.css';
import '../styles/ccd-inscripcion.css';

const ASSETS = '/code-cats-days';
const PATH = '/code-cats-days/inscripcion';
const EMPTY: EventProfileInput = {
  participant_type: 'attendee', organization: '', tshirt_size: '', experience_level: '', interests: [],
  dietary_notes: '', how_found_us: '', accepts_photos: false,
};

const fmt = (iso: string) =>
  new Date(iso).toLocaleString('es-BO', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' });

export default function CodeCatsDaysInscripcionPage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, isProfileComplete } = useAuth();
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MyEventRegistration | null>(null);
  const [form, setForm] = useState<EventProfileInput>(EMPTY);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPageMeta('Inscripción · Code Cats Days', 'Inscríbete a Code Cats Days y consigue tu Cat Pass. Gratis, en el Auditorio de Informática de la UMSA.');
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = `${ASSETS}/favicon-gato.png`;
    document.head.appendChild(icon);
    return () => icon.remove();
  }, []);

  // Ya llegó a la inscripción: el destino recordado cumplió su trabajo
  useEffect(() => {
    if (!authLoading && user && isProfileComplete) clearRedirect();
  }, [authLoading, user, isProfileComplete]);

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

  const set = <K extends keyof EventProfileInput>(key: K, value: EventProfileInput[K]) => setForm((f) => ({ ...f, [key]: value }));
  const toggleInterest = (name: string) =>
    set('interests', form.interests.includes(name) ? form.interests.filter((i) => i !== name) : [...form.interests, name]);

  const goLogin = (to: string) => {
    rememberRedirect(PATH);
    navigate(to);
  };

  const active = mine && mine.status !== 'cancelled' ? mine : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!event || !user) return;
    setBusy(true);
    setMessage(null);
    try {
      if (active) {
        await updateMyEventProfile(event.id, user.id, form);
        setMessage({ type: 'ok', text: 'Actualizamos tus datos del evento.' });
        setEditing(false);
      } else {
        const status = await registerForEvent(event.id, form);
        setMessage({
          type: 'ok',
          text: status === 'waitlisted'
            ? 'El cupo está lleno: quedaste en lista de espera. Te avisaremos si se libera un lugar.'
            : '¡Listo! Ya tienes tu Cat Pass. Te enviamos un correo de confirmación.',
        });
      }
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo completar la inscripción.' });
    } finally {
      setBusy(false);
    }
  };

  const cancel = async () => {
    if (!event || !window.confirm('¿Cancelar tu inscripción al evento?')) return;
    setBusy(true);
    setMessage(null);
    try {
      await cancelEventRegistration(event.id);
      setMessage({ type: 'ok', text: 'Cancelaste tu inscripción. Si cambias de idea puedes volver a inscribirte.' });
      await load();
    } catch (err) {
      setMessage({ type: 'error', text: err instanceof Error ? err.message : 'No se pudo cancelar.' });
    } finally {
      setBusy(false);
    }
  };

  const typeLabel = PARTICIPANT_TYPES.find((t) => t.value === (mine?.profile?.participant_type ?? form.participant_type))?.label ?? 'Asistente';
  const calendarUrl = event
    ? buildGoogleCalendarUrl({
        title: event.title,
        starts_at: event.starts_at,
        ends_at: new Date(new Date(event.starts_at).getTime() + 8 * 3600 * 1000).toISOString(),
        meet_url: event.location,
        description: 'Evento de Code Cats Studio',
      }, event.title)
    : '#';

  return (
    <div className="ccd">
      <a className="ccd-skip" href="#contenido-inscripcion">Saltar al contenido</a>
      <header className="ccd-nav">
        <div className="ccd-container ccd-nav__inner">
          <Link className="ccd-nav__logo" to="/code-cats-days" aria-label="Code Cats Days, volver a la página del evento">
            <img src={`${ASSETS}/Logo_Navbar.svg`} width={117} height={78} alt="" />
          </Link>
          <nav className="ccd-nav__links" aria-label="Secciones">
            <Link className="ccd-nav__link" to="/code-cats-days">El evento</Link>
            <Link className="ccd-nav__link" to={PATH} aria-current="page">Mi inscripción</Link>
          </nav>
        </div>
      </header>

      <main id="contenido-inscripcion" tabIndex={-1} className="ccd-tex ccd-page">
        <div className="ccd-container ccd-page__grid">
          <div>
            <p className="ccd-eyebrow">Expedition 01</p>
            <h1 className="ccd-title">Tu <span>Cat Pass</span></h1>
            <p className="ccd-text" style={{ marginTop: 18 }}>
              Inscríbete gratis, cuéntanos un poco sobre ti y prepara tu expedición. Con tu cuenta de Code Cats Studio
              también guardas tus insignias y certificados.
            </p>
            {event && (
              <p className="ccd-meta">
                <time dateTime={event.starts_at} style={{ textTransform: 'capitalize' }}>{fmt(event.starts_at)}</time>
                <span>{event.location ?? 'Auditorio de Informática, UMSA'}</span>
              </p>
            )}
            <img className="ccd-art" src={`${ASSETS}/sponsor_gato.png`} alt="" width={420} height={420} loading="lazy" />
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`ccd-msg${message.type === 'error' ? ' ccd-msg--error' : ''}`}>{message.text}</p>}

            {loading || authLoading ? (
              <div className="ccd-panel"><p className="ccd-note">Cargando…</p></div>
            ) : !event ? (
              <div className="ccd-panel">
                <h2>Inscripciones próximamente</h2>
                <p className="ccd-note">Estamos preparando todo. Sigue nuestras redes para enterarte cuando abramos.</p>
                <div className="ccd-actions"><Link className="ccd-btn" to="/code-cats-days">Volver al evento</Link></div>
              </div>
            ) : !user ? (
              <div className="ccd-panel">
                <h2>Entra para inscribirte</h2>
                <p className="ccd-note">Usa tu cuenta de Code Cats Studio (Google o correo). Si no tienes, la creas en un minuto.</p>
                <div className="ccd-actions"><button type="button" className="ccd-btn ccd-btn--blue" onClick={() => goLogin('/login')}>Entrar o crear cuenta</button></div>
              </div>
            ) : !isProfileComplete ? (
              <div className="ccd-panel">
                <h2>Completa tu perfil primero</h2>
                <p className="ccd-note">Necesitamos tu nombre, documento y fecha de nacimiento una sola vez. Al terminar vuelves aquí.</p>
                <div className="ccd-actions"><button type="button" className="ccd-btn ccd-btn--blue" onClick={() => goLogin('/perfil')}>Completar mi perfil</button></div>
              </div>
            ) : active && !editing ? (
              <>
                <article className="ccd-pass-card" aria-label="Tu Cat Pass">
                  <div className="ccd-pass-card__head"><span>Cat Pass</span><span>Expedition 01</span></div>
                  <div className="ccd-pass-card__body">
                    <p className="ccd-pass-card__name">{profile?.full_name ?? 'Explorador/a'}</p>
                    <div className="ccd-pass-card__row">
                      <span className="ccd-tag">{typeLabel}</span>
                      <span className={`ccd-tag ${active.status === 'registered' ? 'ccd-tag--ok' : 'ccd-tag--wait'}`}>
                        {active.status === 'registered' ? 'Inscrito/a' : 'Lista de espera'}
                      </span>
                    </div>
                    <dl>
                      <dt>Cuándo</dt><dd style={{ textTransform: 'capitalize' }}>{fmt(event.starts_at)}</dd>
                      <dt>Dónde</dt><dd>{event.location ?? 'Auditorio de Informática, UMSA'}</dd>
                    </dl>
                    <p className="ccd-pass-card__code">Código: {user.id.slice(0, 8).toUpperCase()}</p>
                  </div>
                  <img className="ccd-pass-card__cat" src={`${ASSETS}/pronto.png`} alt="" width={112} height={112} />
                </article>
                <div className="ccd-actions">
                  {active.status === 'registered' && (
                    <a className="ccd-btn ccd-btn--ghost" href={calendarUrl} target="_blank" rel="noopener noreferrer">Agregar al calendario</a>
                  )}
                  <button type="button" className="ccd-btn ccd-btn--ghost" disabled={busy} onClick={() => setEditing(true)}>Editar mis datos</button>
                  <button type="button" className="ccd-btn ccd-btn--ghost" disabled={busy} onClick={() => void cancel()}>Cancelar inscripción</button>
                </div>
              </>
            ) : (
              <form className="ccd-panel ccd-form" onSubmit={(e) => void submit(e)}>
                <h2>{active ? 'Tus datos del evento' : 'Inscríbete'}</h2>
                <label className="ccd-field"><span>Voy a participar como</span>
                  <select value={form.participant_type} onChange={(e) => set('participant_type', e.target.value as EventProfileInput['participant_type'])}>
                    {PARTICIPANT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </label>
                <label className="ccd-field"><span>Institución u organización (opcional)</span>
                  <input type="text" maxLength={120} value={form.organization} onChange={(e) => set('organization', e.target.value)} />
                </label>
                <div className="ccd-row2">
                  <label className="ccd-field"><span>Talla de polera</span>
                    <select value={form.tshirt_size} onChange={(e) => set('tshirt_size', e.target.value as EventProfileInput['tshirt_size'])}>
                      <option value="">Sin elegir</option>
                      {TSHIRT_SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </label>
                  <label className="ccd-field"><span>Experiencia programando</span>
                    <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value as EventProfileInput['experience_level'])}>
                      <option value="">Sin elegir</option>
                      {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </label>
                </div>
                <fieldset className="ccd-field">
                  <legend>Temas que te interesan</legend>
                  <div className="ccd-chips">
                    {INTEREST_OPTIONS.map((name) => (
                      <button key={name} type="button" className="ccd-chip" aria-pressed={form.interests.includes(name)} onClick={() => toggleInterest(name)}>{name}</button>
                    ))}
                  </div>
                </fieldset>
                <label className="ccd-field"><span>Alimentación o alergias (opcional)</span>
                  <textarea rows={2} maxLength={300} value={form.dietary_notes} onChange={(e) => set('dietary_notes', e.target.value)} />
                </label>
                <label className="ccd-field"><span>¿Cómo te enteraste? (opcional)</span>
                  <input type="text" maxLength={120} value={form.how_found_us} onChange={(e) => set('how_found_us', e.target.value)} />
                </label>
                <label className="ccd-check">
                  <input type="checkbox" checked={form.accepts_photos} onChange={(e) => set('accepts_photos', e.target.checked)} />
                  <span>Acepto que se tomen fotos y se usen en las comunicaciones de Code Cats Studio.</span>
                </label>
                <div className="ccd-actions">
                  <button type="submit" className="ccd-btn ccd-btn--blue" disabled={busy}>{busy ? 'Enviando…' : active ? 'Guardar cambios' : 'Inscribirme'}</button>
                  {editing && <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>}
                </div>
                <p className="ccd-note" style={{ fontSize: 13 }}>
                  Usamos estos datos solo para organizar el evento. Mira la <Link className="ccd-link" to="/privacidad">política de privacidad</Link>.
                </p>
              </form>
            )}
          </div>
        </div>
      </main>

      <footer className="ccd-footer">
        <div className="ccd-container">
          <div className="ccd-footer__bar" style={{ marginTop: 0, paddingTop: 0, borderTop: 0 }}>
            <span>Code Cats Days · Sábado 7 de noviembre · Auditorio de Informática, UMSA</span>
            <span className="ccd-footer__mark" role="img" aria-label="Code Cats Studio" />
          </div>
        </div>
      </footer>
    </div>
  );
}
