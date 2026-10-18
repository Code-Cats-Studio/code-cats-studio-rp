import type { ComponentType } from 'react';
import { supabase } from '../lib/supabase';

// ─── Interfaces ─────────────────────────────────────────────────────────────

export interface Instructor {
  name: string;
  role: string;
  bio: string;
  image: string;
  weeks: string;
}

export interface CourseOffering {
  id: string;
  label: string;
  status: 'draft' | 'open' | 'in_progress' | 'finished' | 'cancelled';
  modality?: string;
  capacity?: number;
  starts_on?: string;
  ends_on?: string;
  enrollment_closes_at?: string;
}

export interface Course {
  id?: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  duration: string;
  level: string;
  mascotImage: string;
  accentColor: string;
  sections: number;
  lessons: number;
  comingSoon?: boolean;
  startDate?: string;
  instructors?: Instructor[];
  topics?: Array<{ name: string }>;
  course_offerings?: CourseOffering[];
}

export interface LessonMeta {
  slug: string;
  title: string;
  description: string;
  duration: string;
  type: string;
  order: number;
  topics?: string[];
}

export interface SectionMeta {
  slug: string;
  title: string;
  order: number;
  color: string;
  duration: string;
  lessons: LessonMeta[];
}

export interface CourseSyllabusItem {
  id?: string;
  course_id: string;
  module_position: number;
  module_title: string;
  lesson_position: number;
  lesson_title: string;
  duration_seconds?: number;
}

export interface OfferingAvailability {
  capacity: number;
  taken: number;
  available: number;
}

export interface EnrollmentResponse {
  status?: 'active' | 'waitlisted' | 'pending_payment';
  error?: string;
}

// ─── Contenido Local MDX (para el visor interactivo de clases) ─────────────

export interface LessonFrontmatter {
  title: string;
  description: string;
  order: number;
  section: string;
  type: string;
  duration: string;
  topics?: string[];
}

interface LessonModule {
  default: ComponentType;
  frontmatter: LessonFrontmatter;
}

interface SectionFile {
  title?: string;
  order?: number;
  color?: string;
  duration?: string;
}

const localCourseFiles = import.meta.glob<{ default: Course }>(
  '../content/courses/*.json',
  { eager: true }
);

const sectionFiles = import.meta.glob<{ default: SectionFile }>(
  '../content/lessons/**/section.json',
  { eager: true }
);

const lessonFiles = import.meta.glob<LessonModule>(
  '../content/lessons/**/*.mdx',
  { eager: true }
);

// ─── Servicios con Supabase (Paso 3 y 4 de GUIA_FRONTEND.md) ────────────────

/**
 * Consulta en Supabase todos los cursos publicados con sus ediciones y temas.
 * Si Supabase no tiene registros (o está en entorno offline/setup), provee fallback ordenado.
 */
export async function fetchPublishedCourses(): Promise<Course[]> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(
        '*, topics(name), course_offerings(id,label,status,modality,capacity,starts_on,ends_on,enrollment_closes_at)'
      )
      .eq('is_published', true);

    if (error) {
      console.warn('[CoursesService] Error al consultar courses en Supabase:', error.message);
      return getAllCourses();
    }

    if (!data || data.length === 0) {
      // Fallback a cursos locales si aún no se han insertado datos en la base
      return getAllCourses();
    }

    // Mapear registros de Supabase a la interfaz Course
    return data.map((item: any) => {
      const localFallback = getAllCourses().find((c) => c.slug === item.slug);
      const offerings: CourseOffering[] = item.course_offerings || [];
      const primaryOffering = offerings.find((o) => o.status === 'open') || offerings[0];

      return {
        id: item.id,
        slug: item.slug,
        title: item.title,
        subtitle: item.subtitle || localFallback?.subtitle || 'Curso oficial en Code Cats Studio',
        description: item.description || localFallback?.description || '',
        duration: item.duration || localFallback?.duration || '6 semanas',
        level: item.level || localFallback?.level || 'Principiante',
        mascotImage: item.mascot_image || localFallback?.mascotImage || 'cat-sitting',
        accentColor: item.accent_color || localFallback?.accentColor || '#4142F5',
        sections: item.sections_count || localFallback?.sections || 6,
        lessons: item.lessons_count || localFallback?.lessons || 18,
        comingSoon: !offerings.some((o) => o.status === 'open'),
        startDate: primaryOffering?.starts_on || localFallback?.startDate,
        topics: item.topics,
        course_offerings: offerings,
        instructors: localFallback?.instructors,
      };
    });
  } catch (err) {
    console.error('[CoursesService] Excepción al consultar courses en Supabase:', err);
    return getAllCourses();
  }
}

/**
 * Consulta un curso específico por slug con sus ofertas desde Supabase.
 */
export async function fetchCourseBySlug(slug: string): Promise<Course | undefined> {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select(
        '*, topics(name), course_offerings(id,label,status,modality,capacity,starts_on,ends_on,enrollment_closes_at)'
      )
      .eq('slug', slug)
      .single();

    if (error || !data) {
      return getCourseBySlug(slug);
    }

    const localFallback = getCourseBySlug(slug);
    const offerings: CourseOffering[] = data.course_offerings || [];
    const primaryOffering = offerings.find((o) => o.status === 'open') || offerings[0];

    return {
      id: data.id,
      slug: data.slug,
      title: data.title,
      subtitle: data.subtitle || localFallback?.subtitle || 'Curso oficial',
      description: data.description || localFallback?.description || '',
      duration: data.duration || localFallback?.duration || '6 semanas',
      level: data.level || localFallback?.level || 'Principiante',
      mascotImage: data.mascot_image || localFallback?.mascotImage || 'cat-sitting',
      accentColor: data.accent_color || localFallback?.accentColor || '#4142F5',
      sections: data.sections_count || localFallback?.sections || 6,
      lessons: data.lessons_count || localFallback?.lessons || 18,
      comingSoon: !offerings.some((o) => o.status === 'open'),
      startDate: primaryOffering?.starts_on || localFallback?.startDate,
      topics: data.topics,
      course_offerings: offerings,
      instructors: localFallback?.instructors,
    };
  } catch {
    return getCourseBySlug(slug);
  }
}

/**
 * Consulta el sílabo ordenado de un curso desde la vista/tabla course_syllabus.
 */
export async function fetchCourseSyllabus(courseId: string): Promise<CourseSyllabusItem[]> {
  try {
    const { data, error } = await supabase
      .from('course_syllabus')
      .select('*')
      .eq('course_id', courseId)
      .order('module_position')
      .order('lesson_position');

    if (error) {
      console.warn('[CoursesService] Error al obtener course_syllabus:', error.message);
      return [];
    }

    return (data as CourseSyllabusItem[]) || [];
  } catch (err) {
    console.error('[CoursesService] Error inesperado en fetchCourseSyllabus:', err);
    return [];
  }
}

/**
 * Consulta los cupos disponibles de una edición específica en offering_availability.
 * Devuelve: { capacity, taken, available }
 */
export async function fetchOfferingAvailability(
  offeringId: string
): Promise<OfferingAvailability | null> {
  try {
    const { data, error } = await supabase
      .from('offering_availability')
      .select('capacity,taken,available')
      .eq('offering_id', offeringId)
      .single();

    if (error || !data) {
      console.warn('[CoursesService] Error en offering_availability:', error?.message);
      return null;
    }

    return data as OfferingAvailability;
  } catch (err) {
    console.error('[CoursesService] Error al consultar offering_availability:', err);
    return null;
  }
}

/**
 * Realiza la inscripción de un estudiante mediante la RPC enroll_in_offering.
 * Respuestas:
 * - status: 'active' | 'waitlisted'
 * - error.message: Texto descriptivo en español si no cumple requisitos (perfil, cupo, etc.)
 */
export async function enrollInOffering(
  offeringId: string
): Promise<{ status?: 'active' | 'waitlisted' | 'pending_payment'; error?: string }> {
  try {
    const { data, error } = await supabase.rpc('enroll_in_offering', {
      p_offering: offeringId,
    });

    if (error) {
      return { error: error.message };
    }

    return { status: data };
  } catch (err) {
    return {
      error:
        err instanceof Error ? err.message : 'Error inesperado al procesar la inscripción.',
    };
  }
}

/**
 * Verifica si el usuario actual ya está inscrito en la edición indicada.
 */
export async function checkMyEnrollment(
  offeringId: string
): Promise<{ isEnrolled: boolean; status?: string }> {
  try {
    const { data, error } = await supabase
      .from('enrollments')
      .select('id, status, course_offerings(id)')
      .eq('offering_id', offeringId)
      .maybeSingle();

    if (error || !data) {
      return { isEnrolled: false };
    }

    return { isEnrolled: true, status: data.status };
  } catch {
    return { isEnrolled: false };
  }
}

// ─── Funciones Síncronas Locales (Compatibilidad MDX) ──────────────────────

function parseLessonPath(filePath: string) {
  const match = filePath.replace(/\\/g, '/').match(
    /content\/lessons\/([^/]+)\/([^/]+)\/([^/]+)\.mdx$/
  );
  if (!match) return null;

  return {
    courseSlug: match[1],
    sectionSlug: match[2],
    lessonSlug: match[3],
  };
}

function getSectionMeta(
  courseSlug: string,
  sectionFolder: string
): Omit<SectionMeta, 'lessons'> {
  const key = Object.keys(sectionFiles).find((path) =>
    path.replace(/\\/g, '/').endsWith(
      `/content/lessons/${courseSlug}/${sectionFolder}/section.json`
    )
  );
  const data = key ? (sectionFiles[key].default ?? {}) : {};

  return {
    slug: sectionFolder,
    title: data.title ?? sectionFolder,
    order: data.order ?? 99,
    color: data.color ?? '#666',
    duration: data.duration ?? '',
  };
}

export function getAllCourses(): Course[] {
  return Object.values(localCourseFiles).map((mod) => mod.default);
}

export function getCourseBySlug(slug: string): Course | undefined {
  return getAllCourses().find((course) => course.slug === slug);
}

export function getCourseSections(courseSlug: string): SectionMeta[] {
  const sectionMap = new Map<string, LessonMeta[]>();

  for (const [filePath, mod] of Object.entries(lessonFiles)) {
    const parsed = parseLessonPath(filePath);
    if (!parsed || parsed.courseSlug !== courseSlug) continue;

    const frontmatter = mod.frontmatter;
    if (!sectionMap.has(parsed.sectionSlug)) {
      sectionMap.set(parsed.sectionSlug, []);
    }

    sectionMap.get(parsed.sectionSlug)!.push({
      slug: parsed.lessonSlug,
      title: frontmatter.title,
      description: frontmatter.description,
      duration: frontmatter.duration,
      type: frontmatter.type,
      order: frontmatter.order,
      topics: frontmatter.topics,
    });
  }

  const sections: SectionMeta[] = [];
  for (const [sectionFolder, lessonList] of sectionMap) {
    sections.push({
      ...getSectionMeta(courseSlug, sectionFolder),
      lessons: lessonList.sort((a, b) => a.order - b.order),
    });
  }

  return sections.sort((a, b) => a.order - b.order);
}

export function flattenLessons(
  sections: SectionMeta[]
): Array<{ sectionSlug: string; lesson: LessonMeta }> {
  return sections.flatMap((section) =>
    section.lessons.map((lesson) => ({ sectionSlug: section.slug, lesson }))
  );
}

export function getLessonModule(
  courseSlug: string,
  sectionSlug: string,
  lessonSlug: string
): LessonModule | undefined {
  const entry = Object.entries(lessonFiles).find(([filePath]) => {
    const parsed = parseLessonPath(filePath);
    return (
      parsed?.courseSlug === courseSlug &&
      parsed.sectionSlug === sectionSlug &&
      parsed.lessonSlug === lessonSlug
    );
  });

  return entry?.[1];
}
