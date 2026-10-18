import { supabase } from '../lib/supabase';

// Servicios del panel de administración (GUIA_FRONTEND.md §7.2). Todo depende de que el rol sea admin:
// las políticas RLS y las funciones de la base rechazan a cualquier otra persona.

export interface PendingApplication {
  id: string;
  motivation: string;
  experience: string | null;
  links: string | null;
  created_at: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export async function fetchPendingApplications(): Promise<PendingApplication[]> {
  const { data, error } = await supabase
    .from('teacher_applications')
    .select('id,motivation,experience,links,created_at,user_id, profiles(full_name,email)')
    .eq('status', 'pending')
    .order('created_at');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    motivation: r.motivation,
    experience: r.experience,
    links: r.links,
    created_at: r.created_at,
    user_id: r.user_id,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? null,
  }));
}

export async function reviewApplication(id: string, accept: boolean): Promise<string | null> {
  const { error } = await supabase.rpc('review_teacher_application', { p_id: id, p_accept: accept });
  return error?.message ?? null;
}

export type OfferingStatus = 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';

export interface AdminOffering {
  id: string;
  label: string;
  status: OfferingStatus;
  capacity: number;
  starts_on: string | null;
  ends_on: string | null;
  course_title: string;
}

export async function fetchAdminOfferings(): Promise<AdminOffering[]> {
  const { data, error } = await supabase
    .from('course_offerings')
    .select('id,label,status,capacity,starts_on,ends_on, courses(title)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    id: r.id,
    label: r.label,
    status: r.status,
    capacity: r.capacity,
    starts_on: r.starts_on,
    ends_on: r.ends_on,
    course_title: r.courses?.title ?? '—',
  }));
}

export async function updateOffering(
  id: string,
  patch: Partial<Pick<AdminOffering, 'status' | 'capacity'>>
): Promise<string | null> {
  const { error } = await supabase.from('course_offerings').update(patch).eq('id', id);
  return error?.message ?? null;
}

export interface OfferingStats {
  capacity: number;
  active: number;
  waitlisted: number;
  completed: number;
  failed: number;
  dropped: number;
  avg_progress_pct: number | null;
  avg_attendance_pct: number | null;
  avg_rating: number | null;
}

export async function fetchOfferingStats(offeringId: string): Promise<OfferingStats | null> {
  const { data, error } = await supabase.rpc('get_offering_stats', { p_offering: offeringId });
  if (error || !data) return null;
  return data as OfferingStats;
}

export async function finalizeOffering(offeringId: string): Promise<string | null> {
  const { error } = await supabase.rpc('finalize_offering', { p_offering: offeringId });
  return error?.message ?? null;
}

export async function issueCertificates(offeringId: string): Promise<string | null> {
  const { error } = await supabase.rpc('issue_certificates_for_offering', { p_offering: offeringId });
  return error?.message ?? null;
}

export interface TeacherOption {
  user_id: string;
  full_name: string | null;
  email: string | null;
}

export async function fetchTeachers(): Promise<TeacherOption[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id, profiles(full_name,email)')
    .eq('role', 'teacher');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    user_id: r.user_id,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? null,
  }));
}

export async function createGroups(
  offeringId: string,
  teacherIds: string[],
  groupSize: number
): Promise<{ error: string | null; assigned?: number; unassigned?: number }> {
  const { data, error } = await supabase.rpc('create_groups', {
    p_offering: offeringId,
    p_teacher_ids: teacherIds,
    p_group_size: groupSize,
  });
  if (error) return { error: error.message };
  return { error: null, assigned: data?.assigned, unassigned: data?.unassigned };
}
