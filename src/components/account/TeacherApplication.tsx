import { useEffect, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  applyToBeTeacher,
  fetchMyTeacherApplication,
  fetchMyTeacherEligibility,
  type TeacherEligibility,
  type TeacherApplication as Application,
} from '../../services/account';

const STATUS_TEXT: Record<Application['status'], string> = {
  pending: 'Tu solicitud está en revisión. Te avisaremos cuando un administrador la responda.',
  accepted: '¡Tu solicitud fue aprobada! Ya tienes acceso al panel docente.',
  rejected: 'Tu última solicitud no fue aprobada. Puedes enviar una nueva cuando quieras.',
};

export default function TeacherApplication() {
  const { roles, refreshProfile } = useAuth();
  const [application, setApplication] = useState<Application | null>(null);
  const [eligibility, setEligibility] = useState<TeacherEligibility | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [open, setOpen] = useState(false);
  const [motivation, setMotivation] = useState('');
  const [experience, setExperience] = useState('');
  const [links, setLinks] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const alreadyStaff = roles.includes('teacher') || roles.includes('admin');

  useEffect(() => {
    if (alreadyStaff) return;
    void Promise.all([fetchMyTeacherApplication(), fetchMyTeacherEligibility()]).then(([a, el]) => {
      setApplication(a);
      setEligibility(el);
      setLoaded(true);
    });
  }, [alreadyStaff]);

  if (alreadyStaff || !loaded) return null;

  const pending = application?.status === 'pending';
  const eligible = eligibility?.eligible ?? false;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);
    if (motivation.trim().length < 20) {
      setError('Cuéntanos con al menos 20 caracteres por qué quieres ser docente.');
      return;
    }
    setSubmitting(true);
    const { error: rpcError } = await applyToBeTeacher(motivation.trim(), experience.trim(), links.trim());
    if (rpcError) {
      setError(rpcError);
    } else {
      setApplication(await fetchMyTeacherApplication());
      setOpen(false);
      setMotivation('');
      setExperience('');
      setLinks('');
      void refreshProfile();
    }
    setSubmitting(false);
  };

  const field =
    'w-full px-3.5 py-2.5 rounded-lg text-sm bg-white border border-gray-300 text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500';

  return (
    <section
      aria-labelledby="teacher-app-title"
      className="mt-8 p-6 rounded-2xl"
      style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
    >
      <h2 id="teacher-app-title" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.1rem' }}>
        ¿Quieres ser docente?
      </h2>

      {application && (
        <p role="status" className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          {STATUS_TEXT[application.status]}
        </p>
      )}

      {!eligible && !pending && eligibility && (
        <p className="mt-2 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Para postular necesitas haber aprobado al menos {eligibility.required_courses} cursos con nota
          mínima de {eligibility.min_score} y tener el certificado de cada uno. Llevas{' '}
          <strong>{eligibility.qualifying_courses}</strong> de {eligibility.required_courses}.
        </p>
      )}

      {eligible && !pending && !open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="mt-3 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
          style={{ background: 'var(--azul-gatuno)', color: '#fff', fontFamily: 'var(--font-heading)' }}
        >
          Solicitar ser docente
        </button>
      )}

      {open && eligible && !pending && (
        <form onSubmit={(e) => void handleSubmit(e)} className="mt-4 grid gap-3">
          <label className="text-sm font-medium" htmlFor="ta-motivation">
            ¿Por qué quieres ser docente? *
          </label>
          <textarea id="ta-motivation" rows={4} maxLength={2000} required className={field}
            value={motivation} onChange={(e) => setMotivation(e.target.value)} disabled={submitting} />

          <label className="text-sm font-medium" htmlFor="ta-experience">Experiencia (opcional)</label>
          <textarea id="ta-experience" rows={3} maxLength={2000} className={field}
            value={experience} onChange={(e) => setExperience(e.target.value)} disabled={submitting} />

          <label className="text-sm font-medium" htmlFor="ta-links">GitHub o portafolio (opcional)</label>
          <input id="ta-links" type="text" maxLength={1000} className={field}
            value={links} onChange={(e) => setLinks(e.target.value)} disabled={submitting} />

          {error && (
            <p role="alert" className="text-sm" style={{ color: 'var(--error)' }}>
              {error}
            </p>
          )}

          <div className="flex gap-3 justify-end">
            <button type="button" onClick={() => setOpen(false)} disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm border border-gray-300 cursor-pointer">
              Cancelar
            </button>
            <button type="submit" disabled={submitting}
              className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
              style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>
              {submitting ? 'Enviando…' : 'Enviar solicitud'}
            </button>
          </div>
        </form>
      )}
    </section>
  );
}
