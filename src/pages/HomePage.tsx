import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchPublishedCourses, type Course } from '../services/courses';
import { setPageMeta } from '../utils/seo';
import { CountUp, useReveal } from '../components/landing/useReveal';
import { ABOUT_POINTS, ABOUT_STATS, MARQUEE, PROJECTS, SOCIALS, SYMBOLS } from '../components/landing/data';
import '../styles/landing.css';

const pad2 = (n: number) => String(n).padStart(2, '0');

function courseChips(course: Course): { label: string; tone: 'lime' | 'gray' | 'blue' }[] {
  const parts = course.duration.split('·').map((p) => p.trim()).filter(Boolean).slice(0, 2);
  const level = /previa|principiante|básico|basico/i.test(course.level) ? 'Básico' : course.level;
  return [
    { label: 'Gratis', tone: 'lime' },
    ...parts.map((label) => ({ label, tone: 'gray' as const })),
    { label: level, tone: 'blue' },
  ];
}

function Marquee() {
  const group = (hidden: boolean) => (
    <div className="lp-marquee__group" aria-hidden={hidden || undefined}>
      {[...MARQUEE, ...MARQUEE].map((word, i) => (
        <span className="lp-marquee__item" key={`${word}-${i}`}>{word}</span>
      ))}
    </div>
  );
  return (
    <div className="lp-marquee" role="presentation">
      <div className="lp-marquee__track">
        {group(false)}
        {group(true)}
      </div>
    </div>
  );
}

export default function HomePage() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useReveal(rootRef);

  useEffect(() => {
    setPageMeta('Inicio', 'Aprende programación en comunidad: cursos gratuitos de desarrollo web en La Paz, Bolivia');
    let alive = true;
    fetchPublishedCourses()
      .then((data) => alive && setCourses(data))
      .catch((err) => alive && setError(err instanceof Error ? err.message : 'No se pudieron cargar los cursos'))
      .finally(() => alive && setLoading(false));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <div className="lp" ref={rootRef}>
      {/* Hero */}
      <section className="lp-hero" aria-labelledby="lp-hero-title">
        {SYMBOLS.map((s) => (
          <span key={s.char} aria-hidden="true" className={`lp-symbol lp-symbol--${s.color}`}
            style={{ top: s.top, left: s.left, fontSize: s.size, animationDelay: s.delay }}>
            {s.char}
          </span>
        ))}
        <div className="lp-hero__grid">
          <div className="lp-hero__in">
            <h1 id="lp-hero-title">Aprende programación <em>en comunidad</em></h1>
            <p className="lp-hero__sub">Grupo de estudio gratuito donde el código se aprende entre ronroneos</p>
            <Link to="/login" className="lp-btn lp-btn--lime">Unirse gratis</Link>
          </div>
          <div className="lp-hero__art">
            <img className="lp-hero__cat" src="/images/mascot/cat-laptop.png" alt="Gato de Code Cats Studio programando en su laptop" width={474} height={371} fetchPriority="high" />
          </div>
        </div>
        <img className="lp-hero__badge" src="/images/brand/logo-badge.png" alt="" aria-hidden="true" width={128} height={128} />
      </section>

      <Marquee />

      {/* Sobre nosotros */}
      <section id="sobre-nosotros" className="lp-about" aria-labelledby="lp-about-title">
        <div className="lp-about__panel">
          <p className="lp-eyebrow lp-reveal">Sobre Nosotros</p>
          <h2 id="lp-about-title" className="lp-title lp-title--lg lp-reveal" style={{ ['--d' as string]: '0.08s' }}>Somos devs que aprenden juntos</h2>
          <p className="lp-about__text lp-reveal" style={{ ['--d' as string]: '0.16s' }}>
            Un grupo de estudio donde el único requisito es tener ganas, sin costos, sin juicios, con gatos.
          </p>
          <div className="lp-stats">
            {ABOUT_STATS.map((s, i) => (
              <div className="lp-stat lp-reveal" key={s.label} style={{ ['--d' as string]: `${0.2 + i * 0.1}s` }}>
                <strong><CountUp to={s.value} suffix={s.suffix} /></strong>
                <span>{s.label}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="lp-points">
          {ABOUT_POINTS.map((p, i) => (
            <div className="lp-point lp-reveal" key={p.title} style={{ ['--d' as string]: `${i * 0.1}s` }}>
              <span className="lp-point__n" aria-hidden="true">{pad2(i + 1)}</span>
              <div>
                <h3>{p.title}</h3>
                <p>{p.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Cursos */}
      <section id="cursos" className="lp-courses" aria-labelledby="lp-courses-title">
        <div className="lp-head">
          <div>
            <p className="lp-eyebrow lp-reveal">Lo que enseñamos</p>
            <h2 id="lp-courses-title" className="lp-title lp-title--xl lp-reveal" style={{ ['--d' as string]: '0.08s' }}>Cursos</h2>
          </div>
          <Link to="/cursos" className="lp-link lp-reveal">Ver todos</Link>
        </div>

        <div className="lp-rows">
          {loading && [0, 1, 2].map((i) => <div className="lp-skeleton" key={i} style={{ marginBottom: '1rem' }} />)}
          {!loading && error && <p role="alert">No pudimos cargar los cursos. Recarga la página para reintentar.</p>}
          {!loading && !error && courses.slice(0, 4).map((course, i) => (
            <Link to={`/${course.slug}`} className="lp-row lp-reveal" key={course.slug} style={{ ['--d' as string]: `${i * 0.08}s` }}>
              <span className="lp-row__n" aria-hidden="true">{pad2(i + 1)}</span>
              <div>
                <h3>{course.title}</h3>
                <p>{course.subtitle}</p>
              </div>
              <div className="lp-chips">
                {courseChips(course).map((chip) => (
                  <span className={`lp-chip lp-chip--${chip.tone}`} key={chip.label}>{chip.label}</span>
                ))}
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Proyectos */}
      <section id="proyectos" className="lp-projects" aria-labelledby="lp-projects-title">
        <div className="lp-head">
          <div>
            <p className="lp-eyebrow lp-reveal">Lo que construimos</p>
            <h2 id="lp-projects-title" className="lp-title lp-title--xl lp-reveal" style={{ ['--d' as string]: '0.08s' }}>Proyectos</h2>
          </div>
          <Link to="/cursos" className="lp-link lp-link--light lp-reveal">Ver todos</Link>
        </div>
        <div className="lp-cards">
          {PROJECTS.map((p, i) => (
            <article className="lp-card lp-reveal" key={p.title} style={{ ['--d' as string]: `${i * 0.1}s` }}>
              <span className="lp-soon">Próximamente</span>
              <div className="lp-card__art"><img src={p.image} alt="" loading="lazy" /></div>
              <div>
                <h3>{p.title}</h3>
                <div className="lp-chips" style={{ marginTop: '0.75rem' }}>
                  {p.stack.map((s) => <span className="lp-chip lp-chip--lime" key={s}>{s}</span>)}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ¿Te sumas? */}
      <section className="lp-join" aria-labelledby="lp-join-title">
        <h2 id="lp-join-title" className="lp-title lp-title--xl lp-reveal">¿Te sumas a la comunidad?</h2>
        <Link to="/login" className="lp-btn lp-btn--navy lp-reveal" style={{ ['--d' as string]: '0.15s' }}>Unirse gratis</Link>
        <img className="lp-join__cat" src="/images/mascot/cat-peek.png" alt="" aria-hidden="true" loading="lazy" />
      </section>

      {/* Encuéntranos */}
      <section id="encuentranos" className="lp-find" aria-labelledby="lp-find-title">
        <div className="lp-find__left">
          <p className="lp-eyebrow lp-reveal">Encuéntranos</p>
          <h2 id="lp-find-title" className="lp-title lp-title--lg lp-reveal" style={{ ['--d' as string]: '0.08s' }}>Estamos en todas partes</h2>
          <div className="lp-socials">
            {SOCIALS.map((s, i) => (
              <a className="lp-social lp-reveal" key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
                style={{ ['--d' as string]: `${i * 0.08}s` }}>
                <span className="lp-social__ico" aria-hidden="true">{s.short}</span>
                {s.name}
              </a>
            ))}
          </div>
        </div>
        <div className="lp-find__right">
          <img src="/images/mascot/cat-falling.png" alt="" aria-hidden="true" loading="lazy" />
        </div>
      </section>
    </div>
  );
}
