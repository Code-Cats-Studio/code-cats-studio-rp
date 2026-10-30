import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearRedirect, rememberRedirect } from '../components/auth/PostLoginRedirect';
import { buildGoogleCalendarUrl } from '../services/liveSessions';
import { setPageMeta } from '../utils/seo';
import {
  CODE_CATS_DAYS_SLUG,
  EXPERIENCE_LEVELS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  MAX_PROJECTS,
  OPEN_TO_OPTIONS,
  PARTICIPANT_TYPES,
  SOCIAL_FIELDS,
  TALK_ABOUT_MAX,
  TECH_OPTIONS,
  VISIBILITY_FIELDS,
  cancelEventRegistration,
  emptyExtra,
  fetchEventBySlug,
  fetchMyEventRegistration,
  parseExtra,
  registerForEvent,
  updateMyEventProfile,
  type CatPassExtra,
  type EventInfo,
  type EventProfileInput,
  type MyEventRegistration,
} from '../services/events';
import { isHttpsUrl } from '../utils/validation';
import '../styles/code-cats-days.css';
import '../styles/ccd-inscripcion.css';

const ASSETS = '/code-cats-days';
const PATH = '/code-cats-days/inscripcion';
// Solo en desarrollo: /code-cats-days/inscripcion?vista muestra el formulario sin sesión ni evento y sin guardar nada
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('vista');
const EMPTY: EventProfileInput = {
  participant_type: 'attendee', organization: '', experience_level: '', interests: [],
  accepts_photos: false, extra: emptyExtra(),
};
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Devuelve el primer error de los datos del Cat Pass (null = todo bien)
function validateExtra(extra: CatPassExtra): string | null {
  for (const { key, label } of SOCIAL_FIELDS) {
    const url = extra.socials[key].trim();
    if (url && !isHttpsUrl(url)) return `${label}: usa un enlace que empiece con https://`;
  }
  const contact = extra.business_contact.trim();
  if (contact && !EMAIL_RE.test(contact) && !/^\+?\d{8,15}$/.test(contact.replace(/[\s-]/g, ''))) {
    return 'Contacto de negocios: escribe un correo o un número de teléfono válido.';
  }
  for (const [i, p] of extra.projects.entries()) {
    if ((p.description.trim() || p.url.trim()) && !p.name.trim()) return `Proyecto ${i + 1}: falta el nombre.`;
    if (p.url.trim() && !isHttpsUrl(p.url)) return `Proyecto ${i + 1}: usa un enlace que empiece con https://`;
  }
  return null;
}

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
          experience_level: reg.profile.experience_level ?? '',
          organization: reg.profile.organization ?? '',
          extra: parseExtra(reg.profile.extra),
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
  const setExtra = <K extends keyof CatPassExtra>(key: K, value: CatPassExtra[K]) => set('extra', { ...form.extra, [key]: value });
  const toggle = (list: string[], name: string) => (list.includes(name) ? list.filter((i) => i !== name) : [...list, name]);
  const setProject = (index: number, field: 'name' | 'description' | 'url', value: string) =>
    setExtra('projects', form.extra.projects.map((p, i) => (i === index ? { ...p, [field]: value } : p)));

  const chips = (options: readonly string[], selected: string[], onChange: (next: string[]) => void) => (
    <div className="ccd-chips">
      {options.map((name) => (
        <button key={name} type="button" className="ccd-chip" aria-pressed={selected.includes(name)} onClick={() => onChange(toggle(selected, name))}>{name}</button>
      ))}
    </div>
  );

  const goLogin = (to: string) => {
    rememberRedirect(PATH);
    navigate(to);
  };

  const active = mine && mine.status !== 'cancelled' ? mine : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const invalid = validateExtra(form.extra);
    if (invalid) {
      setMessage({ type: 'error', text: invalid });
      return;
    }
    if (PREVIEW) {
      setMessage({ type: 'ok', text: 'Vista previa: los datos son válidos y no se guardó nada.' });
      return;
    }
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

  const extra = form.extra;
  const formEl = (
    <form className="ccd-panel ccd-form" onSubmit={(e) => void submit(e)} noValidate>
      <h2>{PREVIEW ? 'Vista previa del formulario' : active ? 'Tus datos del evento' : 'Inscríbete'}</h2>

      <section className="ccd-section" aria-labelledby="ccd-sec-about">
        <h3 id="ccd-sec-about" className="ccd-section__title">Cuéntanos sobre ti</h3>
        <p className="ccd-note">Esto nos ayuda a crear una mejor experiencia y a conectarte con personas afines.</p>
        <label className="ccd-field"><span>Voy a participar como</span>
          <select value={form.participant_type} onChange={(e) => set('participant_type', e.target.value as EventProfileInput['participant_type'])}>
            {PARTICIPANT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
        </label>
        <fieldset className="ccd-field">
          <legend>Lenguajes y tecnologías que conozco</legend>
          {chips(TECH_OPTIONS, extra.knows, (next) => setExtra('knows', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Quiero aprender sobre</legend>
          {chips(TECH_OPTIONS, extra.wants_to_learn, (next) => setExtra('wants_to_learn', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>¿Qué temas te interesan?</legend>
          {chips(INTEREST_OPTIONS, form.interests, (next) => set('interests', next))}
        </fieldset>
        <label className="ccd-field"><span>¿Cuál es tu experiencia programando?</span>
          <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value as EventProfileInput['experience_level'])}>
            <option value="">Sin elegir</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <fieldset className="ccd-field">
          <legend>¿Qué te gustaría conseguir en el evento?</legend>
          {chips(GOAL_OPTIONS, extra.goals, (next) => setExtra('goals', next))}
        </fieldset>
        <label className="ccd-field"><span>Me gustaría conversar sobre…</span>
          <textarea rows={4} maxLength={TALK_ABOUT_MAX} value={extra.talk_about} onChange={(e) => setExtra('talk_about', e.target.value)} />
        </label>
      </section>

      <section className="ccd-section" aria-labelledby="ccd-sec-pass">
        <h3 id="ccd-sec-pass" className="ccd-section__title">Tu Cat Pass</h3>
        <p className="ccd-note">Quien escanee tu QR verá solo lo que dejes marcado como visible.</p>
        <label className="ccd-field"><span>Rol o título (ej. Estudiante de Informática)</span>
          <input type="text" maxLength={80} value={extra.role_title} onChange={(e) => setExtra('role_title', e.target.value)} />
        </label>
        <label className="ccd-field"><span>Institución u organización</span>
          <input type="text" maxLength={120} value={form.organization} onChange={(e) => set('organization', e.target.value)} />
        </label>
        <div className="ccd-row2">
          {SOCIAL_FIELDS.map(({ key, label, placeholder }) => (
            <label className="ccd-field" key={key}><span>{label}</span>
              <input type="text" inputMode="url" maxLength={200} placeholder={placeholder} value={extra.socials[key]}
                onChange={(e) => setExtra('socials', { ...extra.socials, [key]: e.target.value })} />
            </label>
          ))}
        </div>
        <label className="ccd-field"><span>Contacto de negocios (correo o WhatsApp)</span>
          <input type="text" maxLength={120} value={extra.business_contact} onChange={(e) => setExtra('business_contact', e.target.value)} />
        </label>
        <fieldset className="ccd-field">
          <legend>Proyectos en los que trabajo (hasta {MAX_PROJECTS})</legend>
          {extra.projects.map((p, i) => (
            <div className="ccd-project" key={i}>
              <input type="text" maxLength={80} placeholder="Nombre del proyecto" aria-label={`Proyecto ${i + 1}: nombre`} value={p.name} onChange={(e) => setProject(i, 'name', e.target.value)} />
              <input type="text" maxLength={160} placeholder="Descripción corta" aria-label={`Proyecto ${i + 1}: descripción`} value={p.description} onChange={(e) => setProject(i, 'description', e.target.value)} />
              <input type="text" inputMode="url" maxLength={200} placeholder="https://… (opcional)" aria-label={`Proyecto ${i + 1}: enlace`} value={p.url} onChange={(e) => setProject(i, 'url', e.target.value)} />
              <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setExtra('projects', extra.projects.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
          {extra.projects.length < MAX_PROJECTS && (
            <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setExtra('projects', [...extra.projects, { name: '', description: '', url: '' }])}>+ Agregar proyecto</button>
          )}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Estoy abierto/a a…</legend>
          {chips(OPEN_TO_OPTIONS, extra.open_to, (next) => setExtra('open_to', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Visible en mi Cat Pass</legend>
          {VISIBILITY_FIELDS.map(({ key, label }) => (
            <label className="ccd-check" key={key}>
              <input type="checkbox" checked={extra.visible[key]} onChange={(e) => setExtra('visible', { ...extra.visible, [key]: e.target.checked })} />
              <span>{label}</span>
            </label>
          ))}
        </fieldset>
      </section>

      <label className="ccd-check">
        <input type="checkbox" checked={form.accepts_photos} onChange={(e) => set('accepts_photos', e.target.checked)} />
        <span>Acepto que se tomen fotos y se usen en las comunicaciones de Code Cats Studio.</span>
      </label>
      <div className="ccd-actions">
        <button type="submit" className="ccd-btn ccd-btn--blue" disabled={busy}>{busy ? 'Enviando…' : active ? 'Guardar cambios' : 'Finalizar mi perfil'}</button>
        {editing && <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>}
      </div>
      <p className="ccd-note" style={{ fontSize: 13 }}>
        Usamos estos datos solo para organizar el evento. Mira la <Link className="ccd-link" to="/privacidad">política de privacidad</Link>.
      </p>
    </form>
  );

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
            <img className="ccd-art" src={`${ASSETS}/gato%20code.png`} alt="" width={420} height={420} loading="lazy" />
          </div>

          <div style={{ display: 'grid', gap: 20 }}>
            {message && <p role={message.type === 'error' ? 'alert' : 'status'} className={`ccd-msg${message.type === 'error' ? ' ccd-msg--error' : ''}`}>{message.text}</p>}

            {PREVIEW ? formEl : loading || authLoading ? (
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
              formEl
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
