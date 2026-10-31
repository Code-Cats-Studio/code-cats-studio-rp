import { supabase, FUNCTIONS_URL } from '../lib/supabase';

// Servicios de cuenta del estudiante (GUIA_FRONTEND.md §2, §4, §8 y solicitud de docente)

export interface Region {
  id: number;
  name: string;
}

// Cambia solo el nombre del perfil (la RLS deja editar únicamente el propio)
export async function updateMyFullName(userId: string, fullName: string): Promise<void> {
  const { error } = await supabase.from('profiles').update({ full_name: fullName }).eq('id', userId);
  if (error) throw new Error(error.message);
}

export async function fetchRegions(): Promise<Region[]> {
  const { data, error } = await supabase.from('regions').select('id,name').order('name');
  if (error || !data) return [];
  return data as Region[];
}

// ─── Solicitud para ser docente ─────────────────────────────────────────────

export interface TeacherApplication {
  id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export async function fetchMyTeacherApplication(): Promise<TeacherApplication | null> {
  const { data } = await supabase
    .from('teacher_applications')
    .select('id,status,created_at')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  return (data as TeacherApplication | null) ?? null;
}

export interface TeacherEligibility {
  qualifying_courses: number;
  required_courses: number;
  min_score: number;
  eligible: boolean;
}

export async function fetchMyTeacherEligibility(): Promise<TeacherEligibility | null> {
  const { data, error } = await supabase.rpc('my_teacher_eligibility');
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as TeacherEligibility;
}

export async function applyToBeTeacher(
  motivation: string,
  experience: string,
  links: string
): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('apply_to_be_teacher', {
    p_motivation: motivation,
    p_experience: experience || null,
    p_links: links || null,
  });
  return { error: error?.message ?? null };
}

// ─── Mis cursos ─────────────────────────────────────────────────────────────

export interface MyEnrollment {
  id: string;
  status: 'pending_payment' | 'waitlisted' | 'active' | 'completed' | 'failed' | 'dropped';
  group_id: string | null;
  final_score: number | null;
  offering: {
    id: string;
    label: string;
    status: string;
    course: { title: string; slug: string; cover_url: string | null } | null;
  } | null;
}

export async function fetchMyEnrollments(userId: string): Promise<MyEnrollment[]> {
  const { data, error } = await supabase
    .from('enrollments')
    .select(
      'id,status,group_id,final_score, course_offerings(id,label,status, courses(title,slug,cover_url))'
    )
    .eq('user_id', userId)
    .order('enrolled_at', { ascending: false });
  if (error || !data) return [];

  return (data as any[]).map((row) => ({
    id: row.id,
    status: row.status,
    group_id: row.group_id,
    final_score: row.final_score,
    offering: row.course_offerings
      ? {
          id: row.course_offerings.id,
          label: row.course_offerings.label,
          status: row.course_offerings.status,
          course: row.course_offerings.courses ?? null,
        }
      : null,
  }));
}

export interface MyProgress {
  progress_pct: number;
  attendance_pct: number;
  final_score: number | null;
}

export async function fetchMyProgress(offeringId: string): Promise<MyProgress | null> {
  const { data, error } = await supabase.rpc('get_my_progress', { p_offering: offeringId });
  if (error || !Array.isArray(data) || data.length === 0) return null;
  return data[0] as MyProgress;
}

export async function dropMyEnrollment(offeringId: string): Promise<{ error: string | null }> {
  const { error } = await supabase.rpc('drop_my_enrollment', { p_offering: offeringId });
  return { error: error?.message ?? null };
}

// ─── Certificados ───────────────────────────────────────────────────────────

export interface MyCertificate {
  id: string;
  verification_code: string;
  course_title_snapshot: string;
  issued_at: string;
  revoked_at: string | null;
}

export async function fetchMyCertificates(): Promise<MyCertificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select('id,verification_code,course_title_snapshot,issued_at,revoked_at')
    .order('issued_at', { ascending: false });
  if (error || !data) return [];
  return data as MyCertificate[];
}

export function certificatePdfUrl(code: string): string {
  return `${FUNCTIONS_URL}/certificate-pdf?code=${encodeURIComponent(code)}`;
}

export interface CertificateVerification {
  user_name: string;
  course_title: string;
  issued_at: string;
  valid: boolean;
}

export async function verifyCertificate(
  code: string
): Promise<{ result: CertificateVerification | null; error: string | null }> {
  const { data, error } = await supabase.rpc('verify_certificate', { p_code: code });
  if (error) return { result: null, error: error.message };
  const rows = (data ?? []) as CertificateVerification[];
  return { result: rows[0] ?? null, error: null };
}
