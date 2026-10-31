import { useEffect, useState, type ReactElement } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';
import {
  AVAILABILITY_OPTIONS,
  CODE_CATS_DAYS_SLUG,
  EXPERIENCE_LEVELS,
  LANGUAGE_LEVELS,
  ROLE_AREAS,
  SOCIAL_FIELDS,
  WORK_MODES,
  emptyExtra,
  fetchEventBySlug,
  fetchMyEventRegistration,
  parseExtra,
  type CatPassExtra,
} from '../services/events';
import '../styles/code-cats-days.css';
import '../styles/ccd-inscripcion.css';
import '../styles/ccd-cv.css';

const PATH = '/code-cats-days/inscripcion';
// Solo en desarrollo: /code-cats-days/cv?vista muestra un CV de ejemplo
const PREVIEW = import.meta.env.DEV && new URLSearchParams(window.location.search).has('vista');

interface CvData {
  name: string;
  email: string;
  phone: string;
  institution: string;
  degree: string;
  organization: string;
  experience: string;
  extra: CatPassExtra;
}

const SAMPLE: CvData = {
  name: 'María Quispe Mamani',
  email: 'maria@ejemplo.com',
  phone: '70000000',
  institution: 'Universidad Mayor de San Andrés',
  degree: 'Informática',
  organization: 'UMSA',
  experience: 'intermediate',
  extra: {
    ...emptyExtra(),
    role_area: 'fullstack',
    role_title: 'Estudiante de Informática',
    knows: ['JavaScript', 'TypeScript', 'Python', 'SQL', 'HTML', 'CSS'],
    socials: { linkedin: 'https://linkedin.com/in/maria', github: 'https://github.com/maria', instagram: '', website: '' },
    projects: [
      { name: 'Gatuno Code', description: 'Plataforma de cursos con React y Supabase; reduje el tiempo de carga un 40 % con carga diferida.', url: 'https://github.com/maria/gatuno' },
    ],
    work_modes: ['remote', 'hybrid'],
    availability: 'internship',
    languages: [{ name: 'Español', level: 'native' }, { name: 'Inglés', level: 'intermediate' }],
  },
};

const labelOf = (list: readonly { value: string; label: string }[], value: string) => list.find((o) => o.value === value)?.label ?? '';
const shortUrl = (url: string) => url.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '');

export default function CodeCatsDaysCvPage() {
  const { user, profile, isLoading: authLoading } = useAuth();
  const [data, setData] = useState<CvData | null>(PREVIEW ? SAMPLE : null);
  const [loading, setLoading] = useState(!PREVIEW);

  useEffect(() => {
    setPageMeta('Mi CV · Code Cats Days', 'Genera tu CV en PDF con los datos de tu Cat Pass.');
  }, []);

  useEffect(() => {
    if (PREVIEW || authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      const ev = await fetchEventBySlug(CODE_CATS_DAYS_SLUG);
      const reg = ev ? await fetchMyEventRegistration(ev.id, user.id) : null;
      if (cancelled) return;
      if (reg?.profile) {
        setData({
          name: profile?.full_name ?? '',
          email: user.email ?? profile?.email ?? '',
          phone: profile?.phone ?? '',
          institution: profile?.institution ?? '',
          degree: profile?.degree ?? '',
          organization: reg.profile.organization ?? '',
          experience: reg.profile.experience_level ?? '',
          extra: parseExtra(reg.profile.extra),
        });
      }
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [authLoading, user, profile]);

  const toolbar = (
    <div className="cv-toolbar cv-no-print">
      <Link className="ccd-btn ccd-btn--ghost" to={PATH}>← Volver a mi Cat Pass</Link>
      {data && <button type="button" className="ccd-btn ccd-btn--blue" onClick={() => window.print()}>Descargar PDF</button>}
    </div>
  );

  let sheet: ReactElement;
  if (loading || authLoading) {
    sheet = <p className="ccd-note">Cargando…</p>;
  } else if (!data) {
    sheet = (
      <div className="ccd-panel">
        <h2>Primero crea tu Cat Pass</h2>
        <p className="ccd-note">Tu CV se arma con los datos de tu inscripción. {user ? 'Completa el formulario y vuelve aquí.' : 'Inicia sesión e inscríbete para generarlo.'}</p>
        <div className="ccd-actions"><Link className="ccd-btn ccd-btn--blue" to={PATH}>Ir a la inscripción</Link></div>
      </div>
    );
  } else {
    const { extra } = data;
    const role = labelOf(ROLE_AREAS, extra.role_area);
    const level = EXPERIENCE_LEVELS.find((l) => l.value === data.experience)?.label.split(',')[0] ?? '';
    const headline = [extra.role_title, role && `Desarrollo ${role}`].filter(Boolean).join(' · ');
    const contact = [data.email, data.phone, extra.business_contact && extra.business_contact !== data.email ? extra.business_contact : '']
      .filter(Boolean);
    const links = SOCIAL_FIELDS.map(({ key, label }) => ({ label, url: extra.socials[key] })).filter((l) => l.url);
    const education = [data.degree, data.institution || data.organization].filter(Boolean).join(' — ');
    const availability = [
      labelOf(AVAILABILITY_OPTIONS, extra.availability),
      extra.work_modes.map((m) => labelOf(WORK_MODES, m)).filter(Boolean).join(', '),
    ].filter(Boolean).join(' · ');

    sheet = (
      <article className="cv-sheet" aria-label="Vista previa de tu CV">
        <header className="cv-head">
          <h1>{data.name || 'Tu nombre'}</h1>
          {headline && <p className="cv-headline">{headline}{level && ` · Nivel ${level.toLowerCase()}`}</p>}
          {contact.length > 0 && <p className="cv-line">{contact.join(' · ')}</p>}
          {links.length > 0 && <p className="cv-line">{links.map((l) => `${l.label}: ${shortUrl(l.url)}`).join(' · ')}</p>}
        </header>

        {education && (
          <section>
            <h2>Educación</h2>
            <p>{education}</p>
          </section>
        )}

        {extra.projects.length > 0 && (
          <section>
            <h2>Proyectos</h2>
            {extra.projects.map((p, i) => (
              <div className="cv-item" key={i}>
                <p className="cv-item__title"><strong>{p.name}</strong>{p.url && <span> — {shortUrl(p.url)}</span>}</p>
                {p.description && <p>{p.description}</p>}
              </div>
            ))}
          </section>
        )}

        {extra.knows.length > 0 && (
          <section>
            <h2>Habilidades técnicas</h2>
            <p>{extra.knows.join(', ')}</p>
          </section>
        )}

        {extra.languages.length > 0 && (
          <section>
            <h2>Idiomas</h2>
            <p>{extra.languages.map((l) => `${l.name} (${labelOf(LANGUAGE_LEVELS, l.level)})`).join(', ')}</p>
          </section>
        )}

        {availability && (
          <section>
            <h2>Disponibilidad</h2>
            <p>{availability}</p>
          </section>
        )}
      </article>
    );
  }

  return (
    <div className="ccd cv-page">
      <main id="contenido-cv" className="ccd-tex ccd-page cv-main">
        <div className="ccd-container">
          <div className="cv-no-print">
            <p className="ccd-eyebrow">Cat Pass · Twintro</p>
            <h1 className="ccd-title">Tu <span>CV</span></h1>
            <p className="ccd-text cv-hint">
              Formato clásico de una columna, el más usado y compatible con los sistemas de selección. Pulsa «Descargar PDF» y, en la
              ventana que se abre, elige «Guardar como PDF». Si algo no es correcto, edítalo desde tu Cat Pass.
            </p>
          </div>
          {toolbar}
          {sheet}
        </div>
      </main>
    </div>
  );
}
