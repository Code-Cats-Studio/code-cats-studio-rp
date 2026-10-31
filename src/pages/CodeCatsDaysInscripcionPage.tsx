import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { clearRedirect, rememberRedirect } from '../components/auth/PostLoginRedirect';
import { buildGoogleCalendarUrl } from '../services/liveSessions';
import { setPageMeta } from '../utils/seo';
import {
  AVAILABILITY_OPTIONS,
  CODE_CATS_DAYS_SLUG,
  EXPERIENCE_LEVELS,
  GOAL_OPTIONS,
  INTEREST_OPTIONS,
  LANGUAGE_LEVELS,
  LANGUAGE_OPTIONS,
  MAX_LANGUAGES,
  MAX_PROJECTS,
  PARTICIPANT_TYPES,
  PROJECT_DESCRIPTION_MAX,
  ROLE_AREAS,
  SOCIAL_FIELDS,
  TECH_OPTIONS,
  WORK_MODES,
  cancelEventRegistration,
  emptyExtra,
  fetchEventBySlug,
  fetchEventSpots,
  fetchMyEventRegistration,
  isFullError,
  parseExtra,
  registerForEvent,
  updateMyEventProfile,
  type CatPassExtra,
  type EventInfo,
  type EventProfileInput,
  type EventSpots,
  type MyEventRegistration,
} from '../services/events';
import { updateMyFullName } from '../services/account';
import { cleanName, isHttpsUrl, isValidName } from '../utils/validation';
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
  const { user, profile, isLoading: authLoading, isProfileComplete, refreshProfile } = useAuth();
  const [fullName, setFullName] = useState('');
  const [event, setEvent] = useState<EventInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [mine, setMine] = useState<MyEventRegistration | null>(null);
  const [spots, setSpots] = useState<EventSpots | null>(null);
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

  useEffect(() => {
    setFullName(profile?.full_name ?? '');
  }, [profile?.full_name]);

  // Ya llegó a la inscripción: el destino recordado cumplió su trabajo
  useEffect(() => {
    if (!authLoading && user && isProfileComplete) clearRedirect();
  }, [authLoading, user, isProfileComplete]);

  const load = useCallback(async () => {
    setLoading(true);
    const ev = await fetchEventBySlug(CODE_CATS_DAYS_SLUG);
    setEvent(ev);
    setSpots(ev ? await fetchEventSpots(ev.id) : null);
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
  const started = Boolean(event && new Date(event.starts_at).getTime() <= Date.now());

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const nameChanged = Boolean(user) && fullName.trim() !== (profile?.full_name ?? '');
    const invalid = (user && !isValidName(fullName) ? 'Escribe tu nombre completo (solo letras, mínimo 3 caracteres).' : null) ?? validateExtra(form.extra);
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
      if (nameChanged) {
        await updateMyFullName(user.id, fullName.trim());
        await refreshProfile();
      }
      if (active) {
        await updateMyEventProfile(event.id, user.id, form);
        setMessage({ type: 'ok', text: 'Actualizamos tus datos del evento.' });
        setEditing(false);
      } else {
        await registerForEvent(event.id, form);
        setMessage({ type: 'ok', text: '¡Listo! Ya tienes tu Cat Pass. Te enviamos un correo de confirmación.' });
      }
      await load();
    } catch (err) {
      const text = err instanceof Error ? err.message : 'No se pudo completar la inscripción.';
      if (isFullError(text)) {
        // Los últimos lugares se fueron mientras llenabas el formulario: se muestra el aviso de cupo lleno
        setMessage(null);
        await load();
      } else {
        setMessage({ type: 'error', text });
      }
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
  const accountEmail = user?.email ?? profile?.email ?? '';
  const choice = (options: readonly { value: string; label: string }[], selected: string, onChange: (next: string) => void) => (
    <div className="ccd-chips">
      {options.map((o) => (
        <button key={o.value} type="button" className="ccd-chip" aria-pressed={selected === o.value} onClick={() => onChange(selected === o.value ? '' : o.value)}>{o.label}</button>
      ))}
    </div>
  );
  const setLanguage = (index: number, field: 'name' | 'level', value: string) =>
    setExtra('languages', extra.languages.map((l, i) => (i === index ? { ...l, [field]: value } : l)));

  const formEl = (
    <form className="ccd-panel ccd-form" onSubmit={(e) => void submit(e)} noValidate>
      <h2>{PREVIEW ? 'Vista previa del formulario' : active ? 'Tu Cat Pass' : 'Crea tu Cat Pass'}</h2>
      <p className="ccd-note">
        Con estos datos armamos tu Cat Pass y podrás generar tu CV en PDF para Twintro. Tu cuenta ya aporta lo demás.
      </p>

      <section className="ccd-section" aria-labelledby="ccd-sec-account">
        <h3 id="ccd-sec-account" className="ccd-section__title">Tu cuenta</h3>
        {user ? (
          <>
            <div className="ccd-row2">
              <label className="ccd-field"><span>Nombre completo</span>
                <input type="text" maxLength={100} autoComplete="name" value={fullName} onChange={(e) => setFullName(cleanName(e.target.value))} />
              </label>
              <label className="ccd-field"><span>Correo</span>
                <input type="text" value={accountEmail} readOnly aria-readonly="true" className="ccd-readonly" />
              </label>
            </div>
            <p className="ccd-note">Tomamos estos datos de tu cuenta. Si el nombre no es correcto, cámbialo aquí.</p>
          </>
        ) : (
          <div className="ccd-account-cta">
            <p className="ccd-note">Tu nombre y correo salen de tu cuenta de Code Cats Studio.</p>
            <div className="ccd-actions">
              <button type="button" className="ccd-btn ccd-btn--blue" onClick={() => goLogin('/login')}>Iniciar sesión</button>
              <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => goLogin('/login?modo=registro')}>Crear cuenta</button>
            </div>
          </div>
        )}
      </section>

      <section className="ccd-section" aria-labelledby="ccd-sec-pass">
        <h3 id="ccd-sec-pass" className="ccd-section__title">Tu perfil profesional</h3>
        <fieldset className="ccd-field">
          <legend>Mi rol en el área</legend>
          {choice(ROLE_AREAS, extra.role_area, (next) => setExtra('role_area', next))}
        </fieldset>
        <div className="ccd-row2">
          <label className="ccd-field"><span>Titular (ej. Estudiante de Informática)</span>
            <input type="text" maxLength={80} value={extra.role_title} onChange={(e) => setExtra('role_title', e.target.value)} />
          </label>
          <label className="ccd-field"><span>Institución, universidad o empresa</span>
            <input type="text" maxLength={120} value={form.organization} onChange={(e) => set('organization', e.target.value)} />
          </label>
        </div>
        <label className="ccd-field"><span>Nivel de experiencia</span>
          <select value={form.experience_level} onChange={(e) => set('experience_level', e.target.value as EventProfileInput['experience_level'])}>
            <option value="">Sin elegir</option>
            {EXPERIENCE_LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        <fieldset className="ccd-field">
          <legend>Mi stack: lenguajes y tecnologías que conozco</legend>
          {chips(TECH_OPTIONS, extra.knows, (next) => setExtra('knows', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Proyectos (hasta {MAX_PROJECTS})</legend>
          {extra.projects.map((p, i) => (
            <div className="ccd-project" key={i}>
              <input type="text" maxLength={80} placeholder="Nombre del proyecto" aria-label={`Proyecto ${i + 1}: nombre`} value={p.name} onChange={(e) => setProject(i, 'name', e.target.value)} />
              <textarea rows={2} maxLength={PROJECT_DESCRIPTION_MAX} placeholder="¿Qué hace y qué lograste? (resultado, tecnologías, tu aporte)" aria-label={`Proyecto ${i + 1}: descripción`} value={p.description} onChange={(e) => setProject(i, 'description', e.target.value)} />
              <input type="text" inputMode="url" maxLength={200} placeholder="https://… (repositorio o demo, opcional)" aria-label={`Proyecto ${i + 1}: enlace`} value={p.url} onChange={(e) => setProject(i, 'url', e.target.value)} />
              <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setExtra('projects', extra.projects.filter((_, j) => j !== i))}>Quitar proyecto</button>
            </div>
          ))}
          {extra.projects.length < MAX_PROJECTS && (
            <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setExtra('projects', [...extra.projects, { name: '', description: '', url: '' }])}>+ Agregar proyecto</button>
          )}
        </fieldset>
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
          <legend>Disponibilidad</legend>
          {choice(AVAILABILITY_OPTIONS, extra.availability, (next) => setExtra('availability', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Modalidad de trabajo</legend>
          <div className="ccd-chips">
            {WORK_MODES.map((m) => (
              <button key={m.value} type="button" className="ccd-chip" aria-pressed={extra.work_modes.includes(m.value)}
                onClick={() => setExtra('work_modes', toggle(extra.work_modes, m.value))}>{m.label}</button>
            ))}
          </div>
        </fieldset>
        <fieldset className="ccd-field">
          <legend>Idiomas (hasta {MAX_LANGUAGES})</legend>
          {extra.languages.map((l, i) => (
            <div className="ccd-lang" key={i}>
              <select aria-label={`Idioma ${i + 1}`} value={l.name} onChange={(e) => setLanguage(i, 'name', e.target.value)}>
                <option value="">Idioma</option>
                {LANGUAGE_OPTIONS.map((name) => <option key={name} value={name}>{name}</option>)}
              </select>
              <select aria-label={`Nivel del idioma ${i + 1}`} value={l.level} onChange={(e) => setLanguage(i, 'level', e.target.value)}>
                <option value="">Nivel</option>
                {LANGUAGE_LEVELS.map((lv) => <option key={lv.value} value={lv.value}>{lv.label}</option>)}
              </select>
              <button type="button" className="ccd-btn ccd-btn--ghost" aria-label={`Quitar idioma ${i + 1}`} onClick={() => setExtra('languages', extra.languages.filter((_, j) => j !== i))}>Quitar</button>
            </div>
          ))}
          {extra.languages.length < MAX_LANGUAGES && (
            <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setExtra('languages', [...extra.languages, { name: '', level: '' }])}>+ Agregar idioma</button>
          )}
        </fieldset>
      </section>

      <section className="ccd-section" aria-labelledby="ccd-sec-about">
        <h3 id="ccd-sec-about" className="ccd-section__title">Tus intereses</h3>
        <p className="ccd-note">Esto nos ayuda a crear una mejor experiencia y a conectarte con personas afines.</p>
        <fieldset className="ccd-field">
          <legend>Quiero aprender sobre</legend>
          {chips(TECH_OPTIONS, extra.wants_to_learn, (next) => setExtra('wants_to_learn', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>¿Qué temas te interesan?</legend>
          {chips(INTEREST_OPTIONS, form.interests, (next) => set('interests', next))}
        </fieldset>
        <fieldset className="ccd-field">
          <legend>¿Qué te gustaría conseguir en el evento?</legend>
          {chips(GOAL_OPTIONS, extra.goals, (next) => setExtra('goals', next))}
        </fieldset>
      </section>

      <label className="ccd-check">
        <input type="checkbox" checked={form.accepts_photos} onChange={(e) => set('accepts_photos', e.target.checked)} />
        <span>Acepto que se tomen fotos y se usen en las comunicaciones de Code Cats Studio.</span>
      </label>
      <div className="ccd-actions">
        <button type="submit" className="ccd-btn ccd-btn--blue" disabled={busy}>{busy ? 'Guardando…' : active ? 'Guardar cambios' : 'Finalizar mi perfil'}</button>
        {editing && <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => setEditing(false)}>Cancelar</button>}
      </div>
      <p className="ccd-note" style={{ fontSize: 13 }}>
        Usamos estos datos solo para organizar el evento y generar tu CV. Mira la <Link className="ccd-link" to="/privacidad">política de privacidad</Link>.
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
            ) : !active && (spots?.is_full || started) ? (
              <div className="ccd-panel ccd-full">
                <img className="ccd-full__cat" src={`${ASSETS}/pronto.png`} alt="" width={112} height={112} />
                <h2>{started && !spots?.is_full ? 'Las inscripciones cerraron' : '¡Cupo lleno!'}</h2>
                <p className="ccd-note">
                  {started && !spots?.is_full
                    ? 'Code Cats Days ya comenzó y no recibimos nuevas inscripciones. Gracias por tu interés.'
                    : 'Gracias por tantas ganas de explorar con nosotros: ya no quedan lugares para Code Cats Days. Síguenos en redes para enterarte de la próxima expedición.'}
                </p>
                <div className="ccd-actions">
                  <a className="ccd-btn ccd-btn--blue" href="https://linktr.ee/code_cats_studio" target="_blank" rel="noopener noreferrer">Seguir a Code Cats</a>
                  <Link className="ccd-btn ccd-btn--ghost" to="/code-cats-days">Volver al evento</Link>
                  {!user && <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => goLogin('/login')}>Ya me inscribí: iniciar sesión</button>}
                </div>
              </div>
            ) : !user ? (
              <div className="ccd-panel">
                <h2>Entra para inscribirte</h2>
                <p className="ccd-note">Usa tu cuenta de Code Cats Studio (Google o correo). Si no tienes, la creas en un minuto.</p>
                <div className="ccd-actions">
                  <button type="button" className="ccd-btn ccd-btn--blue" onClick={() => goLogin('/login')}>Iniciar sesión</button>
                  <button type="button" className="ccd-btn ccd-btn--ghost" onClick={() => goLogin('/login?modo=registro')}>Crear cuenta</button>
                </div>
              </div>
            ) : !isProfileComplete ? (
              <div className="ccd-panel">
                <h2>Completa tu perfil primero</h2>
                <p className="ccd-note">Solo falta tu fecha de nacimiento y aceptar los términos, una sola vez. Al terminar vuelves aquí.</p>
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
                  <Link className="ccd-btn ccd-btn--blue" to="/code-cats-days/cv">Generar mi CV</Link>
                  <button type="button" className="ccd-btn ccd-btn--ghost" disabled={busy} onClick={() => setEditing(true)}>Editar mis datos</button>
                  {/* Solo para pruebas: en el evento real nadie cancela (si no viene, no pasa nada) */}
                  {import.meta.env.DEV && (
                    <button type="button" className="ccd-btn ccd-btn--ghost" disabled={busy} onClick={() => void cancel()}>Cancelar inscripción (solo dev)</button>
                  )}
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
