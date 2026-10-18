import { supabase } from '../lib/supabase';

// Crear y editar cursos completos desde /admin (módulos, lecciones, video de YouTube y ediciones).
// Todo se guarda con la función admin_save_course; solo un administrador puede usarla.

export type LessonType = 'theory' | 'practice' | 'challenge' | 'setup' | 'reading' | 'tool' | 'skill';

export const LESSON_TYPES: { value: LessonType; label: string }[] = [
  { value: 'theory', label: 'Teoría' },
  { value: 'practice', label: 'Práctica' },
  { value: 'challenge', label: 'Desafío' },
  { value: 'setup', label: 'Configuración' },
  { value: 'reading', label: 'Lectura' },
  { value: 'tool', label: 'Herramienta' },
  { value: 'skill', label: 'Habilidad' },
];

export const LEVELS = [
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

// Mascotas disponibles en /public/images/mascot (sin la extensión .png)
export const MASCOTS = ['cat-sitting', 'cat-laptop', 'cat-coding', 'cat-browser', 'cat-peek', 'cat-falling', 'gato-js-1', 'gato-js-2', 'gato-js-3'];

export interface LessonForm {
  id?: string;
  title: string;
  description: string;
  lesson_type: LessonType;
  duration_label: string;
  topics: string; // un tema por línea
  content_md: string;
  youtube: string; // enlace o ID de YouTube
  is_preview: boolean;
  completion_threshold: number;
}

export interface ModuleForm {
  id?: string;
  title: string;
  color: string;
  duration_label: string;
  lessons: LessonForm[];
}

export interface CourseForm {
  id?: string;
  title: string;
  slug: string;
  subtitle: string;
  description: string;
  level: string;
  topic_id: string;
  duration_label: string;
  mascot_image: string;
  accent_color: string;
  learning_outcomes: string; // un objetivo por línea
  is_published: boolean;
  modules: ModuleForm[];
}

export const emptyLesson = (): LessonForm => ({
  title: '', description: '', lesson_type: 'theory', duration_label: '', topics: '', content_md: '',
  youtube: '', is_preview: false, completion_threshold: 0.5,
});

export const emptyModule = (): ModuleForm => ({ title: '', color: '#4142F5', duration_label: '', lessons: [emptyLesson()] });

export const emptyCourse = (): CourseForm => ({
  title: '', slug: '', subtitle: '', description: '', level: 'beginner', topic_id: '', duration_label: '',
  mascot_image: 'cat-sitting', accent_color: '#4142F5', learning_outcomes: '', is_published: false,
  modules: [emptyModule()],
});

const lines = (text: string) => text.split('\n').map((l) => l.trim()).filter(Boolean);

// Acepta el ID de 11 caracteres o cualquier enlace de YouTube (watch, youtu.be, embed, shorts)
export function parseYoutubeId(input: string): string {
  const text = input.trim();
  if (!text) return '';
  if (/^[A-Za-z0-9_-]{11}$/.test(text)) return text;
  const m = text.match(/(?:youtu\.be\/|[?&]v=|embed\/|shorts\/|live\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : text; // si no se reconoce, se envía tal cual y la base avisa del error
}

// Lee una lección en el formato de los archivos .mdx del proyecto (frontmatter + texto)
export function parseMdxLesson(text: string): Partial<LessonForm> {
  const match = text.replace(/\r\n?/g, '\n').match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { content_md: text.trim() };
  const out: Partial<LessonForm> = { content_md: match[2].trim() };
  const topics: string[] = [];
  let inTopics = false;
  for (const raw of match[1].split('\n')) {
    const item = raw.match(/^\s+-\s+"?(.*?)"?\s*$/);
    if (inTopics && item) { topics.push(item[1]); continue; }
    inTopics = false;
    const kv = raw.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const value = kv[2].replace(/^"(.*)"$/, '$1');
    if (kv[1] === 'title') out.title = value;
    else if (kv[1] === 'description') out.description = value;
    else if (kv[1] === 'duration') out.duration_label = value;
    else if (kv[1] === 'type' && LESSON_TYPES.some((t) => t.value === value)) out.lesson_type = value as LessonType;
    else if (kv[1] === 'topics') inTopics = true;
  }
  if (topics.length) out.topics = topics.join('\n');
  return out;
}

export function toPayload(form: CourseForm) {
  return {
    id: form.id || null,
    title: form.title,
    slug: form.slug,
    subtitle: form.subtitle,
    description: form.description,
    level: form.level,
    topic_id: form.topic_id || null,
    duration_label: form.duration_label,
    mascot_image: form.mascot_image,
    accent_color: form.accent_color,
    learning_outcomes: lines(form.learning_outcomes),
    is_published: form.is_published,
    modules: form.modules.map((m) => ({
      id: m.id || null,
      title: m.title,
      color: m.color,
      duration_label: m.duration_label,
      lessons: m.lessons.map((l) => ({
        id: l.id || null,
        title: l.title,
        description: l.description,
        lesson_type: l.lesson_type,
        duration_label: l.duration_label,
        topics: lines(l.topics),
        content_md: l.content_md,
        youtube_id: parseYoutubeId(l.youtube),
        is_preview: l.is_preview,
        completion_threshold: l.completion_threshold,
      })),
    })),
  };
}

export async function saveCourse(form: CourseForm): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase.rpc('admin_save_course', { p_course: toPayload(form) });
  if (error) return { error: error.message };
  return { id: data as string };
}

export interface AdminCourseRow {
  id: string;
  title: string;
  slug: string;
  is_published: boolean;
  editions: { id: string; label: string; status: string }[];
}

export async function fetchAdminCourses(): Promise<AdminCourseRow[]> {
  const { data, error } = await supabase
    .from('courses')
    .select('id,title,slug,is_published, course_offerings(id,label,status)')
    .order('created_at', { ascending: false });
  if (error || !data) return [];
  return (data as any[]).map((c) => ({
    id: c.id, title: c.title, slug: c.slug, is_published: c.is_published, editions: c.course_offerings ?? [],
  }));
}

export async function fetchTopics(): Promise<{ id: number; name: string }[]> {
  const { data } = await supabase.from('topics').select('id,name').order('name');
  return (data as { id: number; name: string }[]) ?? [];
}

export async function fetchCourseForEdit(id: string): Promise<CourseForm | null> {
  const { data: c, error } = await supabase
    .from('courses')
    .select('id,title,slug,subtitle,description,level,topic_id,duration_label,mascot_image,accent_color,learning_outcomes,is_published')
    .eq('id', id)
    .maybeSingle();
  if (error || !c) return null;
  const { data: mods } = await supabase
    .from('modules')
    .select('id,title,position,color,duration_label, lessons(id,title,position,description,lesson_type,duration_label,topics,content_md,is_preview,completion_threshold, videos(external_id))')
    .eq('course_id', id)
    .order('position');
  const row = c as any;
  return {
    id: row.id,
    title: row.title,
    slug: row.slug,
    subtitle: row.subtitle ?? '',
    description: row.description ?? '',
    level: row.level,
    topic_id: row.topic_id ? String(row.topic_id) : '',
    duration_label: row.duration_label ?? '',
    mascot_image: row.mascot_image ?? 'cat-sitting',
    accent_color: row.accent_color ?? '#4142F5',
    learning_outcomes: (row.learning_outcomes ?? []).join('\n'),
    is_published: row.is_published,
    modules: ((mods as any[]) ?? []).map((m) => ({
      id: m.id,
      title: m.title,
      color: m.color ?? '#4142F5',
      duration_label: m.duration_label ?? '',
      lessons: [...(m.lessons ?? [])]
        .sort((a: any, b: any) => a.position - b.position)
        .map((l: any) => ({
          id: l.id,
          title: l.title,
          description: l.description ?? '',
          lesson_type: l.lesson_type,
          duration_label: l.duration_label ?? '',
          topics: (l.topics ?? []).join('\n'),
          content_md: l.content_md ?? '',
          youtube: l.videos?.external_id ?? '',
          is_preview: l.is_preview,
          completion_threshold: Number(l.completion_threshold),
        })),
    })),
  };
}

// ─── Ediciones (cuándo se dicta el curso y cuántos cupos hay) ───────────────

export type EditionStatus = 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';

export interface EditionForm {
  id?: string;
  label: string;
  status: EditionStatus;
  capacity: number;
  enrollment_opens_at: string; // datetime-local (hora de Bolivia)
  enrollment_closes_at: string;
  starts_on: string;
  ends_on: string;
  pass_score: number;
  min_attendance_pct: number;
  min_progress_pct: number;
}

export const emptyEdition = (n: number): EditionForm => ({
  label: `Edición ${n}`, status: 'draft', capacity: 100, enrollment_opens_at: '', enrollment_closes_at: '',
  starts_on: '', ends_on: '', pass_score: 60, min_attendance_pct: 0, min_progress_pct: 0,
});

const BO_OFFSET_MS = 4 * 60 * 60 * 1000;
const isoToLocal = (iso: string | null) => (iso ? new Date(new Date(iso).getTime() - BO_OFFSET_MS).toISOString().slice(0, 16) : '');
const localToIso = (local: string) => (local ? new Date(`${local}:00-04:00`).toISOString() : null);

export async function fetchEditions(courseId: string): Promise<EditionForm[]> {
  const { data } = await supabase
    .from('course_offerings')
    .select('id,label,status,capacity,enrollment_opens_at,enrollment_closes_at,starts_on,ends_on,pass_score,min_attendance_pct,min_progress_pct')
    .eq('course_id', courseId)
    .order('created_at');
  return ((data as any[]) ?? []).map((o) => ({
    id: o.id,
    label: o.label,
    status: o.status,
    capacity: o.capacity,
    enrollment_opens_at: isoToLocal(o.enrollment_opens_at),
    enrollment_closes_at: isoToLocal(o.enrollment_closes_at),
    starts_on: o.starts_on ?? '',
    ends_on: o.ends_on ?? '',
    pass_score: Number(o.pass_score),
    min_attendance_pct: Number(o.min_attendance_pct),
    min_progress_pct: Number(o.min_progress_pct),
  }));
}

export async function saveEdition(courseId: string, e: EditionForm): Promise<string | null> {
  if (!e.label.trim()) return 'Ponle un nombre a la edición, por ejemplo «Edición 1».';
  if (e.starts_on && e.ends_on && e.ends_on < e.starts_on) return 'La fecha de fin no puede ser anterior a la de inicio.';
  const row = {
    label: e.label.trim(),
    status: e.status,
    capacity: Math.max(1, Math.round(e.capacity)),
    enrollment_opens_at: localToIso(e.enrollment_opens_at),
    enrollment_closes_at: localToIso(e.enrollment_closes_at),
    starts_on: e.starts_on || null,
    ends_on: e.ends_on || null,
    pass_score: e.pass_score,
    min_attendance_pct: e.min_attendance_pct,
    min_progress_pct: e.min_progress_pct,
  };
  const { error } = e.id
    ? await supabase.from('course_offerings').update(row).eq('id', e.id)
    : await supabase.from('course_offerings').insert({ ...row, course_id: courseId });
  return error?.message ?? null;
}

export interface EditionGroup {
  id: string;
  name: string;
  schedule_label: string | null;
}

export async function fetchEditionGroups(offeringId: string): Promise<EditionGroup[]> {
  const { data } = await supabase.from('offering_groups').select('id,name,schedule_label').eq('offering_id', offeringId).order('position');
  return (data as EditionGroup[]) ?? [];
}

// ─── Equipo docente de una edición ──────────────────────────────────────────

export interface StaffRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  staff_role: 'lead' | 'assistant';
}

export async function fetchOfferingStaff(offeringId: string): Promise<StaffRow[]> {
  const { data } = await supabase
    .from('offering_staff')
    .select('user_id,staff_role,profiles(full_name,email)')
    .eq('offering_id', offeringId);
  return ((data as any[]) ?? []).map((r) => ({
    user_id: r.user_id,
    staff_role: r.staff_role,
    full_name: r.profiles?.full_name ?? null,
    email: r.profiles?.email ?? null,
  }));
}

export async function setOfferingStaff(offeringId: string, userId: string, role: 'lead' | 'assistant'): Promise<string | null> {
  const { error } = await supabase
    .from('offering_staff')
    .upsert({ offering_id: offeringId, user_id: userId, staff_role: role }, { onConflict: 'offering_id,user_id' });
  return error?.message ?? null;
}

export async function removeOfferingStaff(offeringId: string, userId: string): Promise<string | null> {
  const { error } = await supabase.from('offering_staff').delete().eq('offering_id', offeringId).eq('user_id', userId);
  return error?.message ?? null;
}

// ─── Tareas y material de una edición ───────────────────────────────────────

export interface AssignmentRow {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  max_score: number;
  weight: number;
  group_id: string | null;
}

export interface MaterialRow {
  id: string;
  title: string;
  kind: 'file' | 'link' | 'drive' | 'github' | 'other';
  url: string;
  group_id: string | null;
}

export async function fetchEditionAssignments(offeringId: string): Promise<AssignmentRow[]> {
  const { data } = await supabase
    .from('assignments')
    .select('id,title,description,due_at,max_score,weight,group_id')
    .eq('offering_id', offeringId)
    .order('due_at', { ascending: true, nullsFirst: false });
  return (data as AssignmentRow[]) ?? [];
}

export async function createAssignment(offeringId: string, a: {
  title: string; description: string; dueLocal: string; maxScore: number; weight: number; groupId: string | null;
}): Promise<string | null> {
  if (a.title.trim().length < 2) return 'Ponle un título a la tarea.';
  const { error } = await supabase.from('assignments').insert({
    offering_id: offeringId,
    title: a.title.trim(),
    description: a.description.trim() || null,
    due_at: a.dueLocal ? localToIso(a.dueLocal) : null,
    max_score: a.maxScore,
    weight: a.weight,
    group_id: a.groupId,
  });
  return error?.message ?? null;
}

export async function deleteAssignment(id: string): Promise<string | null> {
  const { error } = await supabase.from('assignments').delete().eq('id', id);
  return error?.message ?? null;
}

export async function fetchEditionMaterials(offeringId: string): Promise<MaterialRow[]> {
  const { data } = await supabase.from('materials').select('id,title,kind,url,group_id').eq('offering_id', offeringId).order('created_at');
  return (data as MaterialRow[]) ?? [];
}

export async function createMaterial(offeringId: string, m: {
  title: string; kind: MaterialRow['kind']; url: string; groupId: string | null;
}): Promise<string | null> {
  if (m.title.trim().length < 2) return 'Ponle un título al material.';
  if (!/^https:\/\//i.test(m.url.trim())) return 'El enlace debe empezar con https://';
  const { error } = await supabase.from('materials').insert({
    offering_id: offeringId, title: m.title.trim(), kind: m.kind, url: m.url.trim(), group_id: m.groupId,
  });
  return error?.message ?? null;
}

export async function deleteMaterial(id: string): Promise<string | null> {
  const { error } = await supabase.from('materials').delete().eq('id', id);
  return error?.message ?? null;
}

// ─── Estudiantes de una edición ─────────────────────────────────────────────

export async function assignStudentToGroup(enrollmentId: string, groupId: string | null): Promise<string | null> {
  const { error } = await supabase.rpc('assign_to_group', { p_enrollment: enrollmentId, p_group: groupId });
  return error?.message ?? null;
}

export async function removeStudent(enrollmentId: string, reason: string): Promise<string | null> {
  const { error } = await supabase.rpc('remove_student', { p_enrollment: enrollmentId, p_reason: reason });
  return error?.message ?? null;
}
