import { supabase } from '../lib/supabase';

// Horarios por grupo, elección de horario al inscribirse y clases en vivo (Meet).
// Las horas se guardan siempre con el desfase de Bolivia (UTC-4).

export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: 'Lun' },
  { value: 2, label: 'Mar' },
  { value: 3, label: 'Mié' },
  { value: 4, label: 'Jue' },
  { value: 5, label: 'Vie' },
  { value: 6, label: 'Sáb' },
  { value: 7, label: 'Dom' },
];

export interface OfferingSchedule {
  group_id: string;
  name: string;
  schedule_label: string | null;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  teacher_name: string | null;
  spots_left: number | null;
}

export async function fetchOfferingSchedules(offeringId: string): Promise<OfferingSchedule[]> {
  const { data, error } = await supabase.rpc('offering_schedules', { p_offering: offeringId });
  if (error || !Array.isArray(data)) return [];
  return data as OfferingSchedule[];
}

// groupId null = "cualquier horario"
export async function enrollWithPreference(
  offeringId: string,
  groupId: string | null
): Promise<{ status?: 'active' | 'waitlisted' | 'pending_payment'; error?: string }> {
  const { data, error } = await supabase.rpc('enroll_in_offering_with_preference', {
    p_offering: offeringId,
    p_group: groupId,
  });
  if (error) return { error: error.message };
  return { status: data };
}

// ─── Docente / admin: mis grupos ────────────────────────────────────────────

export interface TeacherGroup {
  id: string;
  name: string;
  offering_id: string;
  schedule_label: string | null;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  meet_url: string | null;
  course_title: string;
  offering_label: string;
}

// Un docente ve solo sus grupos; un admin ve todos (lo decide la base con RLS)
export async function fetchTeachingGroups(teacherId: string | null): Promise<TeacherGroup[]> {
  let query = supabase
    .from('offering_groups')
    .select('id,name,offering_id,schedule_label,weekdays,start_time,end_time,meet_url, course_offerings(label, courses(title))')
    .order('name');
  if (teacherId) query = query.eq('teacher_id', teacherId);
  const { data, error } = await query;
  if (error || !data) return [];
  return (data as any[]).map((g) => ({
    id: g.id,
    name: g.name,
    offering_id: g.offering_id,
    schedule_label: g.schedule_label,
    weekdays: g.weekdays ?? [],
    start_time: g.start_time,
    end_time: g.end_time,
    meet_url: g.meet_url,
    course_title: g.course_offerings?.courses?.title ?? 'Curso',
    offering_label: g.course_offerings?.label ?? '',
  }));
}

export interface GroupScheduleInput {
  label: string;
  weekdays: number[];
  start: string; // HH:MM
  end: string;
  meet: string;
}

// Enlace de reunión: vacío es válido; si se escribe, debe ser una URL https completa
export function validateMeetUrl(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== 'https:' || !url.hostname.includes('.')) throw new Error('bad');
  } catch {
    return 'El enlace de la clase debe ser una dirección completa que empiece con https://';
  }
  return null;
}

export async function saveGroupSchedule(groupId: string, input: GroupScheduleInput): Promise<string | null> {
  const meet = input.meet.trim();
  const meetError = validateMeetUrl(meet);
  if (meetError) return meetError;
  if (input.start && input.end && input.end <= input.start) return 'La hora de fin debe ser posterior a la de inicio.';
  const { error } = await supabase.rpc('set_group_schedule', {
    p_group: groupId,
    p_label: input.label,
    p_weekdays: input.weekdays,
    p_start: input.start || null,
    p_end: input.end || null,
    p_meet: meet,
  });
  if (error) return error.message;
  // Las clases ya programadas sin enlace propio heredan el del grupo
  if (meet) {
    await supabase
      .from('live_sessions')
      .update({ meet_url: meet })
      .eq('group_id', groupId)
      .is('meet_url', null)
      .gte('ends_at', new Date().toISOString());
  }
  return null;
}

// ─── Clases en vivo ─────────────────────────────────────────────────────────

export interface ClassSession {
  id: string;
  offering_id: string;
  group_id: string | null;
  title: string;
  starts_at: string;
  ends_at: string;
  meet_url: string | null;
}

export const boLocalToIso = (local: string) => new Date(`${local}:00-04:00`).toISOString();

export interface EditionSession extends ClassSession {
  group_name: string | null;
}

// Todas las clases de una edición (la ve el admin o el docente principal)
export async function fetchEditionSessions(offeringId: string): Promise<EditionSession[]> {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('id,offering_id,group_id,title,starts_at,ends_at,meet_url, offering_groups(name)')
    .eq('offering_id', offeringId)
    .order('starts_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((s) => ({
    id: s.id, offering_id: s.offering_id, group_id: s.group_id, title: s.title, starts_at: s.starts_at,
    ends_at: s.ends_at, meet_url: s.meet_url, group_name: s.offering_groups?.name ?? null,
  }));
}

export async function fetchGroupSessions(groupId: string): Promise<ClassSession[]> {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('id,offering_id,group_id,title,starts_at,ends_at,meet_url')
    .eq('group_id', groupId)
    .order('starts_at', { ascending: false });
  if (error || !data) return [];
  return data as ClassSession[];
}

export async function createClassSession(input: {
  offeringId: string;
  groupId: string | null; // null = toda la edición
  title: string;
  startsLocal: string;
  endsLocal: string;
  meet: string;
}): Promise<string | null> {
  const meetError = validateMeetUrl(input.meet);
  if (meetError) return meetError;
  if (input.title.trim().length < 3) return 'Escribe un título para la clase (mínimo 3 caracteres).';
  if (!input.startsLocal || !input.endsLocal) return 'Indica la hora de inicio y de fin.';
  const starts = boLocalToIso(input.startsLocal);
  const ends = boLocalToIso(input.endsLocal);
  if (!(new Date(ends) > new Date(starts))) return 'La hora de fin debe ser posterior al inicio.';

  // Choque de horario: una clase del mismo grupo (o de toda la edición) que se cruce con esta
  const { data: overlapping } = await supabase
    .from('live_sessions')
    .select('title,starts_at,group_id')
    .eq('offering_id', input.offeringId)
    .lt('starts_at', ends)
    .gt('ends_at', starts);
  const clash = (overlapping ?? []).find((o: any) => !input.groupId || !o.group_id || o.group_id === input.groupId);
  if (clash) {
    const when = new Date(clash.starts_at).toLocaleString('es-BO', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/La_Paz' });
    return `Ese horario choca con la clase «${clash.title}» (${when}). Elige otra hora.`;
  }

  // Sin enlace propio, la clase guarda el del grupo para que los estudiantes siempre lo vean
  let meet = input.meet.trim();
  if (!meet && input.groupId) {
    const { data: group } = await supabase.from('offering_groups').select('meet_url').eq('id', input.groupId).maybeSingle();
    meet = group?.meet_url ?? '';
  }

  const { error } = await supabase.from('live_sessions').insert({
    offering_id: input.offeringId,
    group_id: input.groupId,
    title: input.title.trim(),
    starts_at: starts,
    ends_at: ends,
    meet_url: meet || null,
  });
  return error?.message ?? null;
}

export async function deleteClassSession(id: string): Promise<string | null> {
  const { error } = await supabase.from('live_sessions').delete().eq('id', id);
  return error?.message ?? null;
}

// ─── Docente: listas para elegir (en vez de pegar IDs) ─────────────────────

export interface OfferingChoice {
  id: string;
  label: string; // "JavaScript · Edición 1"
}

// Ediciones donde enseña la persona (o todas, si es admin)
export async function fetchMyOfferings(userId: string, isAdmin: boolean): Promise<OfferingChoice[]> {
  const toChoice = (o: any): OfferingChoice => ({ id: o.id, label: `${o.courses?.title ?? 'Curso'} · ${o.label}` });
  if (isAdmin) {
    const { data } = await supabase.from('course_offerings').select('id,label, courses(title)').order('created_at', { ascending: false });
    return ((data as any[]) ?? []).map(toChoice);
  }
  const [staff, grouped] = await Promise.all([
    supabase.from('offering_staff').select('course_offerings(id,label, courses(title))').eq('user_id', userId),
    supabase.from('offering_groups').select('course_offerings(id,label, courses(title))').eq('teacher_id', userId),
  ]);
  const map = new Map<string, OfferingChoice>();
  for (const row of [...((staff.data as any[]) ?? []), ...((grouped.data as any[]) ?? [])]) {
    if (row.course_offerings) map.set(row.course_offerings.id, toChoice(row.course_offerings));
  }
  return [...map.values()];
}

export interface SessionChoice {
  id: string;
  title: string;
  starts_at: string;
  group_name: string | null;
}

export async function fetchSessionChoices(offeringIds: string[]): Promise<SessionChoice[]> {
  if (offeringIds.length === 0) return [];
  const { data } = await supabase
    .from('live_sessions')
    .select('id,title,starts_at, offering_groups(name)')
    .in('offering_id', offeringIds)
    .order('starts_at', { ascending: false })
    .limit(100);
  return ((data as any[]) ?? []).map((s) => ({
    id: s.id,
    title: s.title,
    starts_at: s.starts_at,
    group_name: s.offering_groups?.name ?? null,
  }));
}

export interface AssignmentChoice {
  id: string;
  title: string;
  offering_id: string;
}

export async function fetchAssignmentChoices(offeringIds: string[]): Promise<AssignmentChoice[]> {
  if (offeringIds.length === 0) return [];
  const { data } = await supabase
    .from('assignments')
    .select('id,title,offering_id')
    .in('offering_id', offeringIds)
    .order('title');
  return (data as AssignmentChoice[]) ?? [];
}

// ─── Estudiante: próximas clases ────────────────────────────────────────────

export interface UpcomingClass extends ClassSession {
  course_title: string;
  group_name: string | null;
  join_url: string | null;
}

export async function fetchMyUpcomingClasses(): Promise<UpcomingClass[]> {
  const { data, error } = await supabase
    .from('live_sessions')
    .select('id,offering_id,group_id,title,starts_at,ends_at,meet_url, course_offerings(courses(title)), offering_groups(name,meet_url)')
    .gte('ends_at', new Date().toISOString())
    .order('starts_at')
    .limit(20);
  if (error || !data) return [];
  return (data as any[]).map((s) => ({
    id: s.id,
    offering_id: s.offering_id,
    group_id: s.group_id,
    title: s.title,
    starts_at: s.starts_at,
    ends_at: s.ends_at,
    meet_url: s.meet_url,
    course_title: s.course_offerings?.courses?.title ?? 'Curso',
    group_name: s.offering_groups?.name ?? null,
    join_url: s.meet_url ?? s.offering_groups?.meet_url ?? null,
  }));
}
