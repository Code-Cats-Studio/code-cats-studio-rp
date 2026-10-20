import { useEffect, useState, type FormEvent } from 'react';
import {
  checkinAttendance,
  buildGoogleCalendarUrl,
  type LiveSession,
} from '../../services/liveSessions';
import { fetchMyUpcomingClasses, type UpcomingClass } from '../../services/schedules';

interface CheckinFormProps {
  session?: LiveSession | null;
  courseTitle?: string;
  onSuccess?: () => void;
}

export default function CheckinForm({
  session,
  courseTitle,
  onSuccess,
}: CheckinFormProps) {
  const [code, setCode] = useState<string>('');
  const [sessionIdInput, setSessionIdInput] = useState<string>(session?.id || '');
  const [myClasses, setMyClasses] = useState<UpcomingClass[]>([]);
  const [loadedClasses, setLoadedClasses] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const targetSessionId = session?.id || sessionIdInput;

  // El estudiante elige su clase de una lista (nunca pega un ID). Solo se ofrecen las clases en curso o por empezar.
  useEffect(() => {
    if (session) return;
    let alive = true;
    void fetchMyUpcomingClasses().then((all) => {
      if (!alive) return;
      const now = Date.now();
      const open = all.filter((c) => now >= new Date(c.starts_at).getTime() - 15 * 60000 && now <= new Date(c.ends_at).getTime() + 30 * 60000);
      setMyClasses(open);
      setSessionIdInput((current) => current || open[0]?.id || '');
      setLoadedClasses(true);
    });
    return () => {
      alive = false;
    };
  }, [session]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!targetSessionId.trim()) {
      setErrorMessage('No hay una clase en vivo disponible para marcar asistencia.');
      return;
    }

    if (code.trim().length !== 6) {
      setErrorMessage('El código debe contener exactamente 6 dígitos.');
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await checkinAttendance(targetSessionId.trim(), code.trim());

      if (result.success) {
        setSuccessMessage('¡Asistencia confirmada con éxito! Quedaste registrado como presente.');
        setCode('');
        onSuccess?.();
      } else {
        setErrorMessage(result.error || 'Código incorrecto o sesión inactiva.');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado al registrar la asistencia.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const calendarUrl = session
    ? buildGoogleCalendarUrl(session, courseTitle)
    : null;

  return (
    <div
      className="p-4 sm:p-5 rounded-2xl transition-all w-full min-w-0 box-border"
      style={{
        background: 'var(--bg-primary)',
        border: '1.5px solid var(--border)',
      }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div className="flex items-center gap-2">
          <span className="text-lg">📋</span>
          <h3
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: '0.9375rem',
              fontWeight: 700,
              margin: 0,
              color: 'var(--text-primary)',
            }}
          >
            Registro de Asistencia
          </h3>
        </div>

        {session && (
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{
              background: 'var(--bg-lime-soft)',
              color: 'var(--text-primary)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            Clase en vivo
          </span>
        )}
      </div>

      <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', margin: '0 0 1rem', overflowWrap: 'anywhere' }}>
        Ingresa el código de 6 dígitos que dictó el docente durante la sesión en vivo para marcar tu presencia.
      </p>

      {/* Alerta de Error */}
      {errorMessage && (
        <div
          role="alert"
          className="mb-3 p-3 rounded-xl text-xs flex items-start gap-2"
          style={{
            background: '#FEF2F2',
            border: '1px solid #FCA5A5',
            color: '#991B1B',
            fontFamily: 'var(--font-heading)',
          }}
        >
          <span className="font-bold flex-shrink-0">✕</span>
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Alerta de Éxito */}
      {successMessage && (
        <div
          role="status"
          className="mb-3 p-3 rounded-xl text-xs flex items-start gap-2"
          style={{
            background: '#F0FDF4',
            border: '1px solid #86EFAC',
            color: '#166534',
            fontFamily: 'var(--font-heading)',
          }}
        >
          <span className="font-bold flex-shrink-0">✓</span>
          <span>{successMessage}</span>
        </div>
      )}

      {/* Formulario */}
      <form onSubmit={handleSubmit} className="space-y-3">
        {!session && loadedClasses && myClasses.length === 0 && (
          <p className="text-xs text-gray-500">
            No hay una clase en vivo en este momento. Cuando empiece, aparecerá aquí para que marques tu asistencia.
          </p>
        )}
        {!session && myClasses.length > 0 && (
          <div>
            <label className="block text-xs font-semibold mb-1 text-gray-500">Clase:</label>
            <select
              value={sessionIdInput}
              onChange={(e) => setSessionIdInput(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-gray-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              {myClasses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title} · {c.course_title} ·{' '}
                  {new Date(c.starts_at).toLocaleTimeString('es-BO', { hour: '2-digit', minute: '2-digit', timeZone: 'America/La_Paz' })}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex gap-2 min-w-0">
          <input
            type="text"
            required
            maxLength={6}
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} // Solo dígitos
            disabled={isSubmitting}
            className="flex-1 min-w-0 w-full px-3 py-2 text-center text-sm font-mono tracking-widest font-bold rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
            style={{ fontSize: '1.1rem', letterSpacing: '0.25em' }}
          />

          <button
            type="submit"
            disabled={isSubmitting || code.length !== 6 || !targetSessionId}
            className="shrink-0 px-4 py-2 rounded-xl text-xs font-semibold text-white transition-all cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed"
            style={{
              background: 'var(--azul-gatuno)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            {isSubmitting ? 'Verificando...' : 'Marcar'}
          </button>
        </div>
      </form>

      {/* Botón de Enlace a Google Calendar */}
      {calendarUrl && (
        <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs text-gray-400">¿No quieres perderte la clase?</span>
          <a
            href={calendarUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1.5 rounded-lg transition-colors no-underline"
            style={{
              background: 'var(--bg-accent-soft)',
              color: 'var(--azul-gatuno)',
              fontFamily: 'var(--font-heading)',
            }}
          >
            <span>📅</span>
            <span>Agendar en Google</span>
          </a>
        </div>
      )}
    </div>
  );
}
