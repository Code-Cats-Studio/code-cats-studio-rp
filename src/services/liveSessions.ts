import { supabase } from '../lib/supabase';

export interface LiveSession {
  id: string;
  offering_id: string;
  title: string;
  starts_at: string;
  ends_at: string;
  meet_url?: string | null;
  description?: string | null;
  recording_video_id?: string | null;
}

/**
 * Consulta las próximas clases en vivo de una edición ordenada por fecha de inicio.
 */
export async function fetchLiveSessions(offeringId: string): Promise<LiveSession[]> {
  try {
    const { data, error } = await supabase
      .from('live_sessions')
      .select('*')
      .eq('offering_id', offeringId)
      .order('starts_at');

    if (error || !data) {
      console.warn('[LiveSessions] Error al consultar live_sessions:', error?.message);
      return [];
    }

    return data as LiveSession[];
  } catch (err) {
    console.error('[LiveSessions] Error inesperado en fetchLiveSessions:', err);
    return [];
  }
}

/**
 * Registra la asistencia del estudiante con el código de 6 dígitos que dicta el docente en clase.
 * RPC: checkin({ p_session, p_code })
 */
export async function checkinAttendance(
  sessionId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const cleanCode = code.trim();
    if (!cleanCode || cleanCode.length !== 6) {
      return { success: false, error: 'El código de asistencia debe tener exactamente 6 dígitos.' };
    }

    const { error } = await supabase.rpc('checkin', {
      p_session: sessionId,
      p_code: cleanCode,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : 'Ocurrió un error inesperado al registrar tu asistencia.',
    };
  }
}

/**
 * Reporta los segundos reales reproducidos a la RPC report_watch_time.
 * El servidor limita a 60s por envío y retorna true si la lección alcanzó el % de completitud configurado.
 */
export async function reportWatchTime(
  lessonId: string,
  deltaSeconds: number,
  durationSeconds: number
): Promise<{ completed?: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('report_watch_time', {
      p_lesson: lessonId,
      p_delta_seconds: Math.min(deltaSeconds, 60),
      p_duration_seconds: Math.round(durationSeconds),
    });

    if (error) {
      return { error: error.message };
    }

    return { completed: Boolean(data) };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al reportar tiempo de reproducción.',
    };
  }
}

/**
 * Construye de manera declarativa el enlace para agendar una clase en vivo en Google Calendar
 * Fórmula:
 * https://calendar.google.com/calendar/render?action=TEMPLATE&text=...&dates=...&details=...&location=...
 */
export function buildGoogleCalendarUrl(
  session: {
    title: string;
    starts_at: string;
    ends_at: string;
    meet_url?: string | null;
    description?: string | null;
  },
  courseTitle?: string
): string {
  const fmt = (d: string | Date) =>
    new Date(d).toISOString().replace(/[-:]|\.\d{3}/g, '');

  const startFormatted = fmt(session.starts_at);
  const endFormatted = fmt(session.ends_at);
  const details = courseTitle ? `Curso: ${courseTitle}` : session.description || '';
  const location = session.meet_url ?? '';

  return (
    `https://calendar.google.com/calendar/render?action=TEMPLATE` +
    `&text=${encodeURIComponent(session.title)}` +
    `&dates=${startFormatted}/${endFormatted}` +
    `&details=${encodeURIComponent(details)}` +
    `&location=${encodeURIComponent(location)}`
  );
}
