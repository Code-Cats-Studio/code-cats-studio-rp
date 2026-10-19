import { supabase } from '../lib/supabase';

export type RequestStatus = 'pending' | 'approved' | 'rejected';

// ¿Forma parte del equipo (principal, apoyo o docente de un grupo) de esa edición?
export async function isOfferingTeam(offeringId: string, userId: string): Promise<boolean> {
  const [staff, groups] = await Promise.all([
    supabase.from('offering_staff').select('user_id', { count: 'exact', head: true }).eq('offering_id', offeringId).eq('user_id', userId),
    supabase.from('offering_groups').select('id', { count: 'exact', head: true }).eq('offering_id', offeringId).eq('teacher_id', userId),
  ]);
  return (staff.count ?? 0) > 0 || (groups.count ?? 0) > 0;
}

export async function fetchMyEnrollmentRequest(offeringId: string, userId: string): Promise<RequestStatus | null> {
  const { data } = await supabase
    .from('enrollment_requests')
    .select('status')
    .eq('offering_id', offeringId)
    .eq('user_id', userId)
    .maybeSingle();
  return (data?.status as RequestStatus | undefined) ?? null;
}

export async function requestEnrollment(offeringId: string, message: string): Promise<{ status?: RequestStatus; error?: string }> {
  const { data, error } = await supabase.rpc('request_enrollment', { p_offering: offeringId, p_message: message.trim() || null });
  if (error) return { error: error.message };
  return { status: data as RequestStatus };
}

export interface EnrollmentRequestRow {
  id: string;
  message: string | null;
  status: RequestStatus;
  created_at: string;
  full_name: string | null;
  email: string | null;
  course: string;
  offering: string;
}

// Solo admin: solicitudes pendientes de docentes y admins que quieren cursar
export async function fetchPendingEnrollmentRequests(): Promise<EnrollmentRequestRow[]> {
  const { data, error } = await supabase
    .from('enrollment_requests')
    .select('id,message,status,created_at, profiles!enrollment_requests_user_id_fkey(full_name,email), course_offerings(label, courses(title))')
    .eq('status', 'pending')
    .order('created_at');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    message: r.message,
    status: r.status,
    created_at: r.created_at,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? null,
    course: r.course_offerings?.courses?.title ?? 'Curso',
    offering: r.course_offerings?.label ?? '',
  }));
}

export async function reviewEnrollmentRequest(id: string, approve: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('review_enrollment_request', { p_id: id, p_approve: approve });
  return error?.message ?? null;
}
