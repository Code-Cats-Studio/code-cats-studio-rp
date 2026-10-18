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

// ─── Eventos ────────────────────────────────────────────────────────────────

export interface AdminEvent {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  capacity: number | null;
  is_published: boolean;
  registered: number;
  waitlisted: number;
}

export interface EventInput {
  title: string;
  slug: string;
  description: string;
  starts_at: string; // ISO con zona horaria
  location: string;
  capacity: number | null;
  is_published: boolean;
}

export async function fetchAdminEvents(): Promise<AdminEvent[]> {
  const { data, error } = await supabase
    .from('events')
    .select('id,title,slug,description,starts_at,location,capacity,is_published, event_registrations(status)')
    .order('starts_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((e) => {
    const regs: { status: string }[] = e.event_registrations ?? [];
    return {
      id: e.id,
      title: e.title,
      slug: e.slug,
      description: e.description,
      starts_at: e.starts_at,
      location: e.location,
      capacity: e.capacity,
      is_published: e.is_published,
      registered: regs.filter((r) => r.status === 'registered').length,
      waitlisted: regs.filter((r) => r.status === 'waitlisted').length,
    };
  });
}

export async function saveEvent(id: string | null, input: EventInput): Promise<string | null> {
  const row = {
    title: input.title.trim(),
    slug: input.slug.trim(),
    description: input.description.trim() || null,
    starts_at: input.starts_at,
    location: input.location.trim() || null,
    capacity: input.capacity,
    is_published: input.is_published,
  };
  if (id) {
    const { error } = await supabase.from('events').update(row).eq('id', id);
    return error?.message ?? null;
  }
  const { data: community } = await supabase.from('communities').select('id').order('created_at').limit(1).maybeSingle();
  if (!community) return 'No hay ninguna comunidad creada.';
  const { error } = await supabase.from('events').insert({ ...row, community_id: community.id });
  return error?.message ?? null;
}

export async function setEventPublished(id: string, published: boolean): Promise<string | null> {
  const { error } = await supabase.from('events').update({ is_published: published }).eq('id', id);
  return error?.message ?? null;
}

// CSV con los inscritos y su perfil del evento (para organizar el evento)
export async function exportEventRegistrations(eventId: string): Promise<string | null> {
  const { data: regs, error } = await supabase
    .from('event_registrations')
    .select('user_id,status,attended,profiles(full_name,email,phone,institution)')
    .eq('event_id', eventId);
  if (error || !regs) return null;
  const { data: profs } = await supabase
    .from('event_profiles')
    .select('user_id,participant_type,organization,tshirt_size,experience_level,interests,dietary_notes,how_found_us,accepts_photos')
    .eq('event_id', eventId);
  const byUser = new Map((profs ?? []).map((p: any) => [p.user_id, p]));
  const cols = ['nombre', 'correo', 'telefono', 'institucion', 'estado', 'tipo', 'organizacion', 'polera', 'experiencia', 'intereses', 'alimentacion', 'como_se_entero', 'fotos'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = (regs as any[]).map((r) => {
    const p: any = byUser.get(r.user_id) ?? {};
    return [
      r.profiles?.full_name, r.profiles?.email, r.profiles?.phone, r.profiles?.institution, r.status,
      p.participant_type, p.organization, p.tshirt_size, p.experience_level, (p.interests ?? []).join('; '),
      p.dietary_notes, p.how_found_us, p.accepts_photos ? 'sí' : 'no',
    ].map(esc).join(',');
  });
  return [cols.join(','), ...lines].join('\n');
}

// ─── Roles ──────────────────────────────────────────────────────────────────

export interface RoleHolder {
  user_id: string;
  role: 'teacher' | 'admin';
  full_name: string | null;
  email: string | null;
}

export async function fetchStaff(): Promise<RoleHolder[]> {
  const { data, error } = await supabase
    .from('user_roles')
    .select('user_id,role,profiles(full_name,email)')
    .in('role', ['teacher', 'admin'])
    .order('created_at');
  if (error || !data) return [];
  return (data as any[]).map((r) => ({
    user_id: r.user_id,
    role: r.role,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? null,
  }));
}

// ─── Grupos con horario ─────────────────────────────────────────────────────

// Crea un grupo vacío para un docente; el horario se completa después con set_group_schedule
export async function createManualGroup(
  offeringId: string,
  name: string,
  teacherId: string,
  capacity: number | null
): Promise<string | null> {
  const { count } = await supabase
    .from('offering_groups')
    .select('id', { count: 'exact', head: true })
    .eq('offering_id', offeringId);
  const { error } = await supabase.from('offering_groups').insert({
    offering_id: offeringId,
    name: name.trim(),
    teacher_id: teacherId,
    capacity,
    position: (count ?? 0) + 1,
  });
  if (error?.code === '23505') return 'Ya existe un grupo con ese nombre en esta edición.';
  return error?.message ?? null;
}

export async function deleteGroup(groupId: string): Promise<string | null> {
  const { error } = await supabase.from('offering_groups').delete().eq('id', groupId);
  return error?.message ?? null;
}

export async function assignPendingToGroups(offeringId: string): Promise<{ assigned?: number; error?: string }> {
  const { data, error } = await supabase.rpc('auto_assign_unassigned', { p_offering: offeringId });
  if (error) return { error: error.message };
  return { assigned: Number(data) };
}

export interface RoleInvite {
  email: string;
  role: 'teacher' | 'admin';
  created_at: string;
}

export async function fetchRoleInvites(): Promise<RoleInvite[]> {
  const { data, error } = await supabase.from('role_invites').select('email,role,created_at').order('created_at');
  if (error || !data) return [];
  return data as RoleInvite[];
}

export async function cancelRoleInvite(email: string, role: 'teacher' | 'admin'): Promise<string | null> {
  const { error } = await supabase.from('role_invites').delete().eq('email', email).eq('role', role);
  return error?.message ?? null;
}

// Asigna un rol por correo, sin importar si entra con Google o con correo y contraseña.
// 'granted' = la cuenta ya existía; 'invited' = se guardó la invitación y se avisó por correo.
export async function grantRole(email: string, role: 'teacher' | 'admin'): Promise<{ result?: 'granted' | 'invited'; error?: string }> {
  const { data, error } = await supabase.rpc('invite_role_by_email', { p_email: email.trim(), p_role: role });
  if (error) return { error: error.message };
  return { result: data as 'granted' | 'invited' };
}

export async function revokeRole(userId: string, role: 'teacher' | 'admin'): Promise<string | null> {
  const { error } = await supabase.from('user_roles').delete().eq('user_id', userId).eq('role', role).is('community_id', null);
  return error?.message ?? null;
}
