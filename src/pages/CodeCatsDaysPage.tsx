import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { Link } from 'react-router-dom';
import EventMotion from '../components/event/EventMotion';
import { setPageMeta } from '../utils/seo';
import redes from '../utils/redes.json';
import '../styles/code-cats-days.css';

const ASSETS = '/code-cats-days';
const EVENT_DATE = new Date('2026-11-07T10:00:00-04:00');
const WHATSAPP_NUMBER = '59175268812';
const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'comunidades', label: 'Comunidades' },
] as const;
const SECTION_IDS = NAV_LINKS.map((link) => link.id);
const WORDS = ['Explora', 'Construye', 'Comparte'];
const TIERS = [
  { name: 'Expedition Lead', kind: 'Sponsors ORO', sponsors: [] as string[], formUrl: 'https://forms.gle/Z1xtK6YAQQ8yiq7L7' },
  { name: 'Pathfinder', kind: 'Sponsor PLATA', sponsors: ['TCA La Paz'], formUrl: 'https://forms.gle/PP1veypSuDEP2o9b9' },
  { name: 'Trailblazer', kind: 'Sponsor BRONCE', sponsors: [] as string[], formUrl: 'https://forms.gle/yQTiaJu7tdcG87d36' },
];
// redes.json has no logo field, so logos are matched by organization name.
const LOGOS: Record<string, string> = {
  'TCA La Paz': '/sponsors/logo_sponsor_academy.png',
  'Women Techmakers El Alto': '/aliadas/wtm_logo.png',
  'R00thouse - Hacklab La Paz': '/aliadas/root_logo.png',
  'Microsoft Education Hub - MEH': '/aliadas/meh_logo.png',
  'GDG El Alto': '/aliadas/gdg_logo.png',
};
const SOCIALS = [
  { key: 'instagram', label: 'Instagram' },
  { key: 'facebook', label: 'Facebook' },
  { key: 'tiktok', label: 'TikTok' },
] as const;
type Org = { nombre: string; redes: Partial<Record<(typeof SOCIALS)[number]['key'], string>> };
const SPONSOR_MESSAGE = '¡Hola Code Cats Studio! Quiero que nuestra organización sea sponsor de Code Cats Days 2026 (Expedition 01). ¿Me cuentan más sobre los niveles Expedition Lead, Pathfinder y Trailblazer?';
const LINKTREE_URL = 'https://linktr.ee/code_cats_studio';
const COMMUNITY_FORM_URL = 'https://forms.gle/698u1Uwvwd23VaRC6';
const whatsappLink = (message: string) => `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

// Only the timer re-renders each second; animation and page layout remain stable.
function Countdown() {
  const [remaining, setRemaining] = useState(() => Math.max(0, EVENT_DATE.getTime() - Date.now()));
  useEffect(() => {
    const id = window.setInterval(() => setRemaining(Math.max(0, EVENT_DATE.getTime() - Date.now())), 1000);
    return () => window.clearInterval(id);
  }, []);
  const seconds = Math.floor(remaining / 1000);
  const items = [
    { value: Math.floor(seconds / 86400), label: 'Días' },
    { value: Math.floor(seconds % 86400 / 3600), label: 'Horas' },
    { value: Math.floor(seconds % 3600 / 60), label: 'Mins' },
    { value: seconds % 60, label: 'Seg' },
  ];
  return (
    <div className="ccd-countdown-wrap" role="timer" aria-live="off" aria-label="Cuenta regresiva para Code Cats Days">
      <p className="ccd-countdown-caption">{remaining > 0 ? 'La expedición empieza en' : '¡Llegó el día de la expedición!'}</p>
      <ul className="ccd-countdown">
        {items.map(({ value, label }) => (
          <li className="ccd-countdown__item" key={label}>
            <span className="ccd-countdown__num">{String(value).padStart(2, '0')}</span>
            <span className="ccd-countdown__label">{label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Logo that opens a small menu with the organization's social links.
function OrgLogo({ org, menuId }: { org: Org; menuId: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);
  const links = SOCIALS.flatMap(({ key, label }) => { const href = org.redes[key]; return href ? [{ label, href }] : []; });
  return (
    <div ref={root} className="ccd-org" data-open={open}>
      <button type="button" className="ccd-org__btn" aria-expanded={open} aria-controls={menuId} onClick={() => setOpen(!open)}>
        <img src={LOGOS[org.nombre]} alt={org.nombre} loading="lazy" />
        <span className="ccd-org__hint" aria-hidden="true">Ver redes</span>
      </button>
      {open && (
        <ul id={menuId} className="ccd-org__menu" aria-label={`Redes de ${org.nombre}`}>
          {links.map(({ label, href }, index) => (
            <li key={label} style={{ '--i': index } as CSSProperties}>
              <a href={href} target="_blank" rel="noopener noreferrer">{label} <span aria-hidden="true">↗</span></a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Band() {
  const [paused, setPaused] = useState(false);
  const [hasTexture, setHasTexture] = useState(false);
  const band = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The lower decorative texture should not compete with the hero's assets.
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.intersectionRatio >= 0.4)) {
        setHasTexture(true);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    if (band.current) observer.observe(band.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={band} className="ccd-band" data-paused={paused} data-texture={hasTexture}>
      <div className="ccd-band__track" aria-hidden="true">
        {[0, 1].map((copy) => (
          <div className="ccd-band__group" key={copy}>
            {WORDS.map((word) => <span key={word}>{word}<span className="ccd-band__star">✳</span></span>)}
          </div>
        ))}
      </div>
      <button className="ccd-band__pause" type="button" onClick={() => setPaused(!paused)} aria-pressed={paused}>
        {paused ? 'Reanudar movimiento' : 'Pausar movimiento'}
      </button>
    </div>
  );
}

export default function CodeCatsDaysPage() {
  const [active, setActive] = useState<string>('inicio');
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: '-20% 0px -55% 0px' });
    SECTION_IDS.forEach((id) => { const node = document.getElementById(id); if (node) observer.observe(node); });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const icon = document.createElement('link');
    icon.rel = 'icon';
    icon.type = 'image/png';
    icon.href = `${ASSETS}/favicon-gato.png`;
    document.head.appendChild(icon);
    setPageMeta('Code Cats Days 2026', 'Un festival tech para explorar, crear proyectos reales y conectar con la comunidad. Sábado 7 de noviembre, Auditorio de Informática, UMSA.');
    return () => icon.remove();
  }, []);

  return (
    <EventMotion>
      <a className="ccd-skip" href="#contenido-evento">Saltar al contenido</a>
      <header className="ccd-nav">
        <div className="ccd-container ccd-nav__inner">
          <a className="ccd-nav__logo" href="#inicio" aria-label="Code Cats Days, ir al inicio">
            <img src={`${ASSETS}/Logo_Navbar.svg`} width={117} height={78} alt="" />
          </a>
          <nav className="ccd-nav__links" aria-label="Secciones">
            {NAV_LINKS.map((link) => <a key={link.id} className="ccd-nav__link" href={`#${link.id}`} aria-current={active === link.id ? 'location' : undefined}>{link.label}</a>)}
          </nav>
        </div>
      </header>

      <main id="contenido-evento" tabIndex={-1}>
        <section id="inicio" className="ccd-hero ccd-tex">
          <div className="ccd-container ccd-hero__grid">
            <div className="ccd-hero__copy">
              <p className="ccd-hero__date"><time dateTime="2026-11-07T10:00:00-04:00">Sábado 7 de noviembre, 10:00</time><span>Auditorio de Informática, UMSA</span></p>
              <h1 className="ccd-hero__logo"><img src={`${ASSETS}/logo_hero.png`} width={561} height={446} fetchPriority="high" alt="Code Cats Days 2026, Expedition 01" /></h1>
              <p className="ccd-text ccd-hero__desc">Explora tecnología, crea proyectos reales y conecta con la comunidad. Tu expedición empieza aquí.</p>
              <span className="ccd-btn ccd-hero__cta" role="button" aria-disabled="true" style={{ opacity: 0.6, cursor: 'not-allowed' }}>Próximamente</span>
            </div>
            <div className="ccd-hero__visual">
              <div className="ccd-hero__cat-entry"><img className="ccd-hero__cat" src={`${ASSETS}/portada_hero_gato.png`} width={645} height={451} fetchPriority="high" alt="" /></div>
              <Countdown />
            </div>
          </div>
        </section>

        <Band />

        <section id="cat-pass" className="ccd-pass ccd-tex" aria-labelledby="cat-pass-title">
          <div className="ccd-container ccd-pass__grid">
            <div className="ccd-pass__copy" data-reveal>
              <p className="ccd-pass__kicker">Tu próxima aventura tech</p>
              <h2 id="cat-pass-title" className="ccd-pass__title">Está por comenzar</h2>
              <p className="ccd-text">Estamos preparando todo para tu llegada. Muy pronto podrás conseguir tu <strong>CAT PASS</strong> y ser parte de esta expedición completamente <strong>GRATUITO</strong>.</p>
              <a className="ccd-btn ccd-btn--arrow" href={LINKTREE_URL} target="_blank" rel="noopener noreferrer">Mantenme al tanto <span aria-hidden="true">↗</span></a>
            </div>
            <div className="ccd-pass__visual" data-cat-reveal>
              <img className="ccd-pass__badge" src={`${ASSETS}/credencial.png`} width={453} height={576} loading="lazy" alt="Credencial Cat Pass de Code Cats Days 2026, Expedition 01" />
              <img className="ccd-pass__status" src={`${ASSETS}/estado.png`} width={265} height={55} loading="lazy" alt="Estado: próximamente" />
            </div>
          </div>
        </section>

        <section id="sponsors" className="ccd-sponsors ccd-tex">
          <div className="ccd-container">
            <div className="ccd-section-heading" data-reveal>
              <h2 className="ccd-title">Nuestros<br /><span>Sponsors</span></h2>
              <p className="ccd-text">Estamos sumando organizaciones que harán posible esta expedición. Tu equipo puede ser parte.</p>
            </div>
            <div className="ccd-tiers" data-reveal>
              {TIERS.map((tier, index) => (
                <article className={`ccd-tier ccd-tier--${index + 1}`} key={tier.name}>
                  <header className="ccd-tier__label">
                    <h3 className="ccd-tier__name">{tier.name}</h3>
                    <p className="ccd-tier__kind">{tier.kind}</p>
                    <a className="ccd-tier__cta" href={tier.formUrl} target="_blank" rel="noopener noreferrer" aria-label={`Quiero ser sponsor ${tier.name}`}>Quiero este nivel <span aria-hidden="true">↗</span></a>
                  </header>
                  <div className="ccd-tier__logos">
                    {tier.sponsors.length === 0 && <p className="ccd-tier__empty">Espacio disponible</p>}
                    {tier.sponsors.map((nombre) => {
                      const org = redes.Sponsors.find((item) => item.nombre === nombre);
                      return org ? <OrgLogo key={nombre} org={org} menuId={`redes-${index}`} /> : null;
                    })}
                  </div>
                </article>
              ))}
            </div>
            <div className="ccd-join">
              <div data-reveal>
                <h2 className="ccd-heading">¿Te sumas a<br /><span>la expedición?</span></h2>
                <p className="ccd-text">Buscamos organizaciones que crean en el talento, la tecnología y el poder de construir en comunidad.</p>
                <a className="ccd-btn ccd-btn--arrow" href={whatsappLink(SPONSOR_MESSAGE)} target="_blank" rel="noopener noreferrer">Más información <span aria-hidden="true">↗</span></a>
              </div>
              <img className="ccd-join__cat" data-cat-reveal src={`${ASSETS}/sponsor_gato2.png`} width={455} height={302} loading="lazy" alt="" />
            </div>
          </div>
        </section>

        <section id="comunidades" className="ccd-communities">
          <div className="ccd-container ccd-communities__grid">
            <div className="ccd-communities__copy" data-reveal>
              <h2 className="ccd-title">Comunidades<br /><span>Aliadas</span></h2>
              <p className="ccd-text">Compartimos conocimientos, conectamos talentos y construimos algo más grande. Estamos sumando comunidades a esta primera expedición.</p>
              <p className="ccd-communities__motto">Más comunidades.<br />Más ideas.<br /><span>Un mismo mapa.</span></p>
            </div>
            <div className="ccd-communities__visual" data-cat-reveal aria-hidden="true">
              <p className="ccd-communities__words">People<br />Ideas<br /><span>Community</span></p>
              <div className="ccd-communities__cat">
                <img src={`${ASSETS}/comunidad_gato_cuerpo.svg`} width={363} height={211} loading="lazy" alt="" />
                <img src={`${ASSETS}/comunidad_gato.svg`} width={363} height={211} loading="lazy" alt="" />
              </div>
            </div>
          </div>
          <ul className="ccd-container ccd-orgs" data-reveal aria-label="Comunidades aliadas">
            {redes.Alianzas.map((org, index) => (
              <li key={org.nombre}><OrgLogo org={org} menuId={`redes-aliada-${index}`} /></li>
            ))}
          </ul>
          <div className="ccd-container ccd-invite" data-reveal>
            <h2 className="ccd-heading">¿Sumamos tu comunidad?</h2>
            <p className="ccd-text">Conectemos talentos, ideas y comunidades tech.</p>
            <a className="ccd-btn ccd-btn--arrow" href={COMMUNITY_FORM_URL} target="_blank" rel="noopener noreferrer">Quiero ser comunidad aliada <span aria-hidden="true">↗</span></a>
          </div>
        </section>
      </main>

      <footer className="ccd-footer">
        <div className="ccd-container">
          <div className="ccd-footer__grid">
            <div><p className="ccd-footer__brand">Code Cats Days</p><p className="ccd-footer__tag">Expedition 01 / 2026</p><p className="ccd-footer__blurb">Un festival tech para explorar, crear proyectos reales y conectar con la comunidad.</p></div>
            <nav aria-label="Secciones del pie de página"><p className="ccd-footer__head">Explora</p><ul className="ccd-footer__list">{NAV_LINKS.map((link) => <li key={link.id}><a href={`#${link.id}`}>{link.label}</a></li>)}</ul></nav>
            <div><p className="ccd-footer__head">Contacto</p><ul className="ccd-footer__list"><li>Sábado, 7 de Noviembre</li><li>Auditorio de Informática - UMSA</li><li><a href={`https://wa.me/${WHATSAPP_NUMBER}`} target="_blank" rel="noopener noreferrer">WhatsApp +591 75268812</a></li></ul></div>
          </div>
          <div className="ccd-footer__bar"><span>© 2026 Code Cats Studio. Todos los derechos reservados.</span><span className="ccd-footer__mark" role="img" aria-label="Code Cats Studio" /></div>
        </div>
      </footer>
    </EventMotion>
  );
}
