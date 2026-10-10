import { useEffect, useState } from 'react';
import { setPageMeta } from '../utils/seo';
import '../styles/code-cats-days.css';

const ASSETS = '/code-cats-days';
const EVENT_DATE = new Date('2026-11-07T10:00:00-04:00'); // Sábado 7 de noviembre, 10:00 hora Bolivia
const WHATSAPP_NUMBER = '59175268812';

const SPONSOR_MESSAGE =
  '¡Hola Code Cats Studio! 🐱 Quiero que nuestra organización sea sponsor de Code Cats Days 2026 (Expedition 01). ' +
  '¿Me cuentan más sobre los niveles Expedition Lead, Pathfinder y Trailblazer? 🧭';
const COMMUNITY_MESSAGE =
  '¡Hola Code Cats Studio! 🐱 Somos una comunidad tech y nos encantaría sumarnos como comunidad aliada ' +
  'a Code Cats Days 2026 (Expedition 01). ¿Cómo podemos participar? 🗺️';

const whatsappLink = (message: string) =>
  `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;

const NAV_LINKS = [
  { id: 'inicio', label: 'Inicio' },
  { id: 'sponsors', label: 'Sponsors' },
  { id: 'comunidades', label: 'Comunidades' },
] as const;

const TIERS = [
  { name: ['Expedition', 'Lead'], kind: 'Sponsors ORO' },
  { name: ['Pathfinder'], kind: 'Sponsor PLATA' },
  { name: ['Trailblazer'], kind: 'Sponsor BRONCE' },
] as const;

const MARQUEE = ['Explora', 'Construye', 'Comparte'] as const;
const COMMUNITY_SLOTS = [1, 2, 3, 4, 5, 6] as const;

const pad2 = (value: number) => String(value).padStart(2, '0');

function useCountdown(target: Date) {
  const compute = () => Math.max(0, target.getTime() - Date.now());
  const [remaining, setRemaining] = useState(compute);

  useEffect(() => {
    const id = window.setInterval(() => setRemaining(compute()), 1000);
    return () => window.clearInterval(id);
  }, []);

  const totalSeconds = Math.floor(remaining / 1000);
  return {
    days: Math.floor(totalSeconds / 86400),
    hours: Math.floor((totalSeconds % 86400) / 3600),
    minutes: Math.floor((totalSeconds % 3600) / 60),
    seconds: totalSeconds % 60,
  };
}

function useActiveSection(ids: readonly string[]) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-40% 0px -55% 0px' },
    );
    ids.forEach((id) => {
      const node = document.getElementById(id);
      if (node) observer.observe(node);
    });
    return () => observer.disconnect();
  }, [ids]);

  return active;
}

function Band() {
  return (
    <div className="ccd-band" aria-hidden="true">
      {MARQUEE.map((word) => (
        <span key={word}>{word}</span>
      ))}
    </div>
  );
}

export default function CodeCatsDaysPage() {
  const { days, hours, minutes, seconds } = useCountdown(EVENT_DATE);
  const active = useActiveSection(NAV_LINKS.map((link) => link.id));

  useEffect(() => {
    const icons = Array.from(document.querySelectorAll<HTMLLinkElement>('link[rel~="icon"]'));
    const previous = icons.map((icon) => [icon, icon.href] as const);
    const icon = icons[0] ?? document.head.appendChild(Object.assign(document.createElement('link'), { rel: 'icon' }));
    icon.type = 'image/png';
    icon.removeAttribute('sizes');
    icon.href = `${ASSETS}/favicon-gato.png`;
    return () => previous.forEach(([link, href]) => { link.href = href; });
  }, []);

  useEffect(() => {
    setPageMeta(
      'Code Cats Days 2026',
      'Un festival tech para explorar, crear proyectos reales y conectar con la comunidad. Sábado 7 de noviembre, Auditorio de Informática, UMSA.',
    );
  }, []);

  const countdown = [
    { value: days, label: 'Días' },
    { value: hours, label: 'Horas' },
    { value: minutes, label: 'Mins' },
    { value: seconds, label: 'Seg' },
  ];

  return (
    <div className="ccd">
      <header className="ccd-nav">
        <div className="ccd-stage">
          <a className="ccd-nav__logo" href="#inicio" aria-label="Code Cats Days, ir al inicio">
            <img src={`${ASSETS}/Logo_Navbar.svg`} width={117} height={78} alt="" />
          </a>
          <nav className="ccd-nav__links" aria-label="Secciones">
            {NAV_LINKS.map((link) => (
              <a
                key={link.id}
                className="ccd-nav__link"
                href={`#${link.id}`}
                aria-current={active === link.id ? 'true' : undefined}
              >
                {link.label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <main>
        <section id="inicio" className="ccd-hero ccd-tex">
          <div className="ccd-stage">
            <img
              className="ccd-hero__cat"
              src={`${ASSETS}/portada_hero_gato.png`}
              width={645}
              height={451}
              alt=""
            />
            <h1 className="ccd-hero__logo">
              <img
                src={`${ASSETS}/logo_hero.png`}
                width={561}
                height={446}
                alt="Code Cats Days 2026, Expedition 01"
              />
            </h1>
            <p className="ccd-hero__date">
              Sábado, 7 de Noviembre - Auditorio de Informática - UMSA
            </p>
            <ul className="ccd-countdown" role="timer" aria-label="Cuenta regresiva para Code Cats Days">
              {countdown.map(({ value, label }) => (
                <li className="ccd-countdown__item" key={label}>
                  <span className="ccd-countdown__num">{pad2(value)}</span>
                  <span className="ccd-countdown__label">{label}</span>
                </li>
              ))}
            </ul>
            <p className="ccd-text ccd-hero__desc">
              Un festival tech para explorar, crear proyectos reales y conectar con la
              <br className="ccd-br" /> comunidad. ¡Tu expedición al mundo tech empieza aquí!
            </p>
            <button type="button" className="ccd-btn ccd-btn--center ccd-hero__cta" disabled>
              Inscripciones Próximamente
            </button>
          </div>
        </section>

        <Band />

        <section id="sponsors">
          <div className="ccd-intro ccd-tex">
            <div className="ccd-stage">
              <p className="ccd-tag ccd-intro__tag">Alianzas</p>
              <h2 className="ccd-heading ccd-intro__title">Impulsan esta expedición</h2>
              <p className="ccd-text ccd-intro__desc">
                Empresas y comunidades que creen en el aprendizaje
                <br className="ccd-br" /> práctico y el talento emergente.
              </p>
              <img
                className="ccd-wordmark"
                src="/logo-transparent.png"
                width={1088}
                height={348}
                alt="code_cats studio"
              />
              <h2 className="ccd-title ccd-title--ink ccd-intro__nuestros">Nuestros</h2>
              <p className="ccd-title ccd-title--blue ccd-intro__sponsors" aria-hidden="true">
                Sponsors
              </p>
              <p className="ccd-text ccd-intro__sub">
                Organizaciones que creen en el poder de las ideas y hacen posible esta expedición.
              </p>
              <img
                className="ccd-intro__cat"
                src={`${ASSETS}/sponsor_gato.png`}
                width={468}
                height={242}
                alt=""
              />
            </div>
          </div>

          <div className="ccd-tiers">
            <div className="ccd-stage">
              {TIERS.map((tier, index) => (
                <article className={`ccd-tier ccd-tier--${index + 1}`} key={tier.kind}>
                  <div className="ccd-tier__label">
                    <h3 className="ccd-tier__name">
                      {tier.name.map((line, i) => (
                        <span key={line}>
                          {i > 0 && <br />}
                          {line}
                        </span>
                      ))}
                    </h3>
                    <p className="ccd-tier__kind">{tier.kind}</p>
                  </div>
                </article>
              ))}

              <p className="ccd-title ccd-title--ink ccd-join__lead">Te sumas a</p>
              <h2 className="ccd-title ccd-title--blue ccd-join__title">La expedicion</h2>
              <p className="ccd-text ccd-join__text">
                Buscamos organizaciones que crean en el talento, la tecnología y el poder de
                construir en comunidad.{' '}
                <br className="ccd-br" />
                <strong>Convirtámonos en aliados y hagamos posible nuevas ideas.</strong>
              </p>
              <a
                className="ccd-btn ccd-btn--arrow ccd-join__cta"
                href={whatsappLink(SPONSOR_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Quiero ser sponsor</span>
                <span aria-hidden="true">→</span>
              </a>
              <img
                className="ccd-join__cat"
                src={`${ASSETS}/sponsor_gato2.png`}
                width={455}
                height={302}
                alt=""
              />
            </div>
          </div>
        </section>

        <Band />

        <section id="comunidades">
          <div className="ccd-communities ccd-tex">
            <div className="ccd-stage">
              <h2 className="ccd-title ccd-title--ink ccd-communities__lead">Comunidades</h2>
              <p className="ccd-title ccd-title--blue ccd-communities__title" aria-hidden="true">
                Aliadas
              </p>
              <p className="ccd-text ccd-communities__desc">
                <strong>Comunidades que se suman a esta expedición</strong> para compartir
                conocimientos, conectar talentos y construir algo más grande.
              </p>
              {COMMUNITY_SLOTS.map((slot) => (
                <div className={`ccd-card ccd-card--${slot}`} key={slot} />
              ))}
              <p className="ccd-communities__motto">
                Más comunidades.
                <br />
                Más ideas.
                <br />
                Un mismo mapa.
              </p>
              <p className="ccd-title ccd-communities__words" aria-hidden="true">
                People
                <br />
                Ideas
                <br />
                <span className="ccd-title--blue">Community</span>
              </p>
              <div className="ccd-communities__cat" aria-hidden="true">
                <img src={`${ASSETS}/comunidad_gato_cuerpo.svg`} width={363} height={211} alt="" />
                <img src={`${ASSETS}/comunidad_gato.svg`} width={363} height={211} alt="" />
              </div>
            </div>
          </div>

          <div className="ccd-invite">
            <div className="ccd-stage">
              <p className="ccd-title ccd-title--ink ccd-invite__lead">Sumamos tu</p>
              <h2 className="ccd-title ccd-title--blue ccd-invite__title">Comunidad?</h2>
              <p className="ccd-text ccd-invite__desc">
                Únete a esta expedición y conectemos talentos, ideas y comunidades tech
              </p>
              <a
                className="ccd-btn ccd-btn--arrow ccd-invite__cta"
                href={whatsappLink(COMMUNITY_MESSAGE)}
                target="_blank"
                rel="noopener noreferrer"
              >
                <span>Quiero ser comunidad aliada</span>
                <span aria-hidden="true">→</span>
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="ccd-footer">
        <div className="ccd-footer__inner">
          <div className="ccd-footer__grid">
            <div>
              <p className="ccd-footer__brand">Code Cats Days</p>
              <p className="ccd-footer__tag">Expedition 01 / 2026</p>
              <p className="ccd-footer__blurb">
                Un festival tech para explorar, crear proyectos reales y conectar con la comunidad.
              </p>
            </div>
            <nav aria-label="Secciones del pie de página">
              <p className="ccd-footer__head">Explora</p>
              <ul className="ccd-footer__list">
                {NAV_LINKS.map((link) => (
                  <li key={link.id}>
                    <a href={`#${link.id}`}>{link.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
            <div>
              <p className="ccd-footer__head">Contacto</p>
              <ul className="ccd-footer__list">
                <li>Sábado, 7 de Noviembre</li>
                <li>Auditorio de Informática - UMSA</li>
                <li>
                  <a
                    href={`https://wa.me/${WHATSAPP_NUMBER}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp +591 75268812
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="ccd-footer__bar">
            <span>© 2026 Code Cats Studio. Todos los derechos reservados.</span>
            <span className="ccd-footer__mark" role="img" aria-label="code_cats studio" />
          </div>
        </div>
      </footer>
    </div>
  );
}
