import { getAllCourses, getLocalCourseExport, type Course } from './courses';
import { LESSON_TYPES, emptyLesson, parseMdxLesson, saveCourse, type CourseForm, type LessonForm, type ModuleForm } from './courseAdmin';

// Pasa un curso que vive en archivos del código (src/content) a la base de datos, para poder editarlo desde /admin.

const HTML_CSS_OUTCOMES = [
  'HTML semántico y accesible',
  'CSS desde cero hasta positioning',
  'Flexbox para layouts 1D',
  'CSS Grid para layouts 2D',
  'Buenas prácticas del mundo real',
  'Herramientas de desarrollo',
];

const levelOf = (text: string) => (/avanzad/i.test(text) ? 'advanced' : /intermedi/i.test(text) ? 'intermediate' : 'beginner');

export const localCoursesPending = (dbSlugs: string[]): Course[] => getAllCourses().filter((c) => !dbSlugs.includes(c.slug));

export async function importLocalCourse(slug: string): Promise<{ id?: string; error?: string }> {
  const course = getAllCourses().find((c) => c.slug === slug);
  if (!course) return { error: 'No encontramos ese curso en el código.' };

  const modules: ModuleForm[] = [];
  for (const { section, lessons } of getLocalCourseExport(slug)) {
    const lessonForms: LessonForm[] = [];
    for (const { meta, loadRaw } of lessons) {
      const loaded: unknown = await loadRaw();
      const raw = typeof loaded === 'string' ? loaded.trim() : '';
      const parsed = raw.startsWith('---') ? parseMdxLesson(raw) : {};
      const topics = meta.topics ?? [];
      lessonForms.push({
        ...emptyLesson(),
        title: meta.title,
        description: meta.description ?? '',
        lesson_type: LESSON_TYPES.some((t) => t.value === meta.type) ? (meta.type as LessonForm['lesson_type']) : 'theory',
        duration_label: meta.duration ?? '',
        topics: topics.join('\n'),
        content_md:
          parsed.content_md ?? (topics.length ? `## Temas que cubrirás\n\n${topics.map((t) => `- ${t}`).join('\n')}` : ''),
      });
    }
    modules.push({ title: section.title, color: section.color || '#4142F5', duration_label: section.duration ?? '', lessons: lessonForms });
  }

  const form: CourseForm = {
    title: course.title,
    slug: course.slug,
    subtitle: course.subtitle ?? '',
    description: course.description ?? '',
    level: levelOf(course.level ?? ''),
    topic_id: '',
    duration_label: course.duration ?? '',
    mascot_image: course.mascotImage || 'cat-sitting',
    accent_color: /^#[0-9a-f]{6}$/i.test(course.accentColor) ? course.accentColor.toUpperCase() : '#4142F5',
    learning_outcomes: (slug === 'html-css-layouts' ? HTML_CSS_OUTCOMES : []).join('\n'),
    is_published: true,
    modules,
  };
  return saveCourse(form);
}
