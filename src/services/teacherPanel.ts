import { supabase } from '../lib/supabase';

// Datos del panel docente: las ediciones en las que participa (como principal, apoyo o con grupo) y su resumen.

export type MyRole = 'lead' | 'assistant';

export interface PanelGroup {
  id: string;
  name: string;
  schedule_label: string | null;
  weekdays: number[];
  start_time: string | null;
  end_time: string | null;
  meet_url: string | null;
  capacity: number | null;
  teacher_id: string | null;
  teacher_name: string | null;
  students: number;
  mine: boolean;
}

export interface NextClass {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  group_id: string | null;
  group_name: string | null;
  meet_url: string | null;
}

export interface MyEdition {
  id: string;
  label: string;
  status: string;
  capacity: number;
  course_id: string;
  course_title: string;
  course_slug: string | null;
  role: MyRole;
  groups: PanelGroup[];
  students: number; // estudiantes que este docente puede ver (los de su grupo, o todos si es principal)
  nextClass: NextClass | null;
  toGrade: number;
}

export async function fetchMyEditions(userId: string): Promise<MyEdition[]> {
  const [staff, mine] = await Promise.all([
    supabase.from('offering_staff').select('offering_id,staff_role').eq('user_id', userId),
    supabase.from('offering_groups').select('offering_id').eq('teacher_id', userId),
  ]);
  const roleByOffering = new Map<string, MyRole>();
  for (const r of ((mine.data as any[]) ?? [])) roleByOffering.set(r.offering_id, 'assistant');
  for (const r of ((staff.data as any[]) ?? [])) {
    if (r.staff_role === 'lead' || !roleByOffering.has(r.offering_id)) roleByOffering.set(r.offering_id, r.staff_role);
  }
  const ids = [...roleByOffering.keys()];
  if (ids.length === 0) return [];

  const [offs, groups, enrolls, sessions, ungraded] = await Promise.all([
    supabase.from('course_offerings').select('id,label,status,capacity,course_id, courses(title,slug)').in('id', ids).order('created_at', { ascending: false }),
    supabase.from('offering_groups').select('id,offering_id,name,schedule_label,weekdays,start_time,end_time,meet_url,capacity,teacher_id').in('offering_id', ids).order('position'),
    supabase.from('enrollments').select('offering_id,group_id,status').in('offering_id', ids).in('status', ['active', 'pending_payment', 'completed']),
    supabase.from('live_sessions').select('id,offering_id,group_id,title,starts_at,ends_at,meet_url, offering_groups(name)').in('offering_id', ids).gte('ends_at', new Date().toISOString()).order('starts_at').limit(200),
    supabase.from('submissions').select('id, assignments!inner(offering_id)').is('score', null).in('assignments.offering_id', ids),
  ]);

  const teamByOffering = new Map<string, TeamMember[]>();
  (await Promise.all(ids.map(async (id) => [id, await fetchTeam(id)] as const))).forEach(([id, team]) => teamByOffering.set(id, team));
  const enrollRows = (enrolls.data as any[]) ?? [];
  const groupRows = (groups.data as any[]) ?? [];

  return (((offs.data as any[]) ?? []).map((o): MyEdition => {
    const role = roleByOffering.get(o.id) ?? 'assistant';
    const gs: PanelGroup[] = groupRows
      .filter((g) => g.offering_id === o.id)
      .map((g) => ({
        id: g.id,
        name: g.name,
        schedule_label: g.schedule_label,
        weekdays: g.weekdays ?? [],
        start_time: g.start_time,
        end_time: g.end_time,
        meet_url: g.meet_url,
        capacity: g.capacity,
        teacher_id: g.teacher_id,
        teacher_name: teamByOffering.get(o.id)?.find((t) => t.user_id === g.teacher_id)?.full_name ?? null,
        students: enrollRows.filter((e) => e.group_id === g.id).length,
        mine: g.teacher_id === userId,
      }));
    const myGroupIds = new Set(gs.filter((g) => g.mine).map((g) => g.id));
    const next = ((sessions.data as any[]) ?? []).find(
      (s) => s.offering_id === o.id && (role === 'lead' || !s.group_id || myGroupIds.has(s.group_id)),
    );
    const visibleStudents = enrollRows.filter((e) => e.offering_id === o.id && (role === 'lead' || myGroupIds.has(e.group_id))).length;
    return {
      id: o.id,
      label: o.label,
      status: o.status,
      capacity: o.capacity,
      course_id: o.course_id,
      course_title: o.courses?.title ?? 'Curso',
      course_slug: o.courses?.slug ?? null,
      role,
      groups: gs,
      students: visibleStudents,
      nextClass: next
        ? { id: next.id, title: next.title, starts_at: next.starts_at, ends_at: next.ends_at, group_id: next.group_id, group_name: next.offering_groups?.name ?? null, meet_url: next.meet_url }
        : null,
      toGrade: ((ungraded.data as any[]) ?? []).filter((s) => s.assignments?.offering_id === o.id).length,
    };
  }));
}

// Solo el docente principal (o un admin): lo comprueba la base de datos.
export async function leadSetGroupCapacity(groupId: string, capacity: number | null): Promise<string | null> {
  const { error } = await supabase.rpc('lead_set_group_capacity', { p_group: groupId, p_capacity: capacity });
  return error?.message ?? null;
}

export async function leadUpdateOffering(
  offeringId: string,
  patch: { capacity?: number; opensAt?: string | null; closesAt?: string | null },
): Promise<string | null> {
  const setDates = 'opensAt' in patch || 'closesAt' in patch;
  const { error } = await supabase.rpc('lead_update_offering', {
    p_offering: offeringId,
    p_capacity: patch.capacity ?? null,
    p_opens: patch.opensAt ?? null,
    p_closes: patch.closesAt ?? null,
    p_set_dates: setDates,
  });
  return error?.message ?? null;
}

export interface OfferingSettings {
  enrollment_opens_at: string | null;
  enrollment_closes_at: string | null;
}

export async function fetchOfferingSettings(offeringId: string): Promise<OfferingSettings | null> {
  const { data } = await supabase.from('course_offerings').select('enrollment_opens_at,enrollment_closes_at').eq('id', offeringId).maybeSingle();
  return (data as OfferingSettings | null) ?? null;
}

export interface TeamMember {
  user_id: string;
  full_name: string | null;
  staff_role: MyRole;
  headline: string | null;
  group_names: string | null;
}

// Equipo de la edición (principal, apoyo y docentes con grupo), visible para todo el equipo.
export async function fetchTeam(offeringId: string): Promise<TeamMember[]> {
  const { data } = await supabase.rpc('offering_team', { p_offering: offeringId });
  return ((data as TeamMember[] | null) ?? []).map((r) => ({ ...r, staff_role: r.staff_role === 'lead' ? 'lead' : 'assistant' }));
}
