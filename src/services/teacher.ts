import { supabase } from '../lib/supabase';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface RosterStudent {
  enrollment_id: string;
  user_id?: string;
  full_name: string;
  email: string;
  group_id?: string | null;
  group_name?: string | null;
  progress_pct: number;
  attendance_pct: number;
  final_score?: number | null;
  status?: 'active' | 'waitlisted' | 'completed' | 'failed' | 'dropped';
}

export interface AssignmentSubmission {
  id: string;
  assignment_id: string;
  user_id: string;
  file_url: string;
  content_text?: string | null;
  score?: number | null;
  feedback?: string | null;
  submitted_at: string;
  assignments?: {
    title: string;
    max_score: number;
  };
  student?: {
    full_name?: string;
    email?: string;
  };
}

export interface GroupAttendanceItem {
  enrollment_id: string;
  full_name: string;
  group_id?: string;
  present: boolean;
}

// ─── Servicios del Docente (Paso 7.1 de GUIA_FRONTEND.md) ───────────────────

/**
 * 1. Consulta la lista de alumnos (roster) con su asistencia y avance en una edición.
 * Invoque RPC 'get_roster' con { p_offering: offeringId, p_group: groupId }
 * Según la guía: lista de su grupo (nombre, correo, avance, asistencia). No incluye CI ni fecha de nacimiento.
 */
export async function fetchTeacherRoster(
  offeringId: string,
  groupId: string | null = null
): Promise<{ data: RosterStudent[]; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('get_roster', {
      p_offering: offeringId,
      p_group: groupId,
    });

    if (error) {
      console.warn('[TeacherService] Error al obtener get_roster:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data as RosterStudent[]) || [] };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error inesperado al cargar el roster de estudiantes.';
    console.error('[TeacherService] Excepción en fetchTeacherRoster:', err);
    return { data: [], error: errorMsg };
  }
}

/**
 * 2. Genera o rota el código de 6 dígitos que dicta el docente en clase para el check-in.
 * Invoque RPC 'rotate_checkin_code' con { p_session: sessionId }
 */
export async function rotateAttendanceCode(
  sessionId: string
): Promise<{ code: string | null; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('rotate_checkin_code', {
      p_session: sessionId,
    });

    if (error) {
      console.warn('[TeacherService] Error al rotar código de asistencia:', error.message);
      return { code: null, error: error.message };
    }

    return { code: String(data) };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error inesperado al generar el código de asistencia.';
    console.error('[TeacherService] Excepción en rotateAttendanceCode:', err);
    return { code: null, error: errorMsg };
  }
}

/**
 * 3. Califica una entrega de tarea de Google Drive asignando puntaje y feedback.
 * Invoque RPC 'grade_submission' con { p_submission: submissionId, p_score: grade, p_feedback: feedback }
 */
export async function gradeAssignmentSubmission(
  submissionId: string,
  grade: number,
  feedback: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.rpc('grade_submission', {
      p_submission: submissionId,
      p_score: grade,
      p_feedback: feedback,
    });

    if (error) {
      console.warn('[TeacherService] Error al calificar entrega:', error.message);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error inesperado al registrar la calificación.';
    console.error('[TeacherService] Excepción en gradeAssignmentSubmission:', err);
    return { success: false, error: errorMsg };
  }
}

/**
 * Consulta las entregas de tareas del grupo a calificar.
 */
export async function fetchAssignmentSubmissions(
  assignmentId?: string
): Promise<{ data: AssignmentSubmission[]; error?: string }> {
  try {
    let query = supabase
      .from('submissions')
      .select('*, assignments(title,max_score)');

    if (assignmentId && assignmentId.trim()) {
      query = query.eq('assignment_id', assignmentId.trim());
    }

    const { data, error } = await query;

    if (error) {
      console.warn('[TeacherService] Error al consultar submissions:', error.message);
      return { data: [], error: error.message };
    }

    return { data: (data as AssignmentSubmission[]) || [] };
  } catch (err) {
    const errorMsg =
      err instanceof Error ? err.message : 'Error inesperado al obtener entregas.';
    return { data: [], error: errorMsg };
  }
}
