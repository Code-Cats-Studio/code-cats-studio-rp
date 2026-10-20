import { useEffect, useState } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import LessonLayout from '../layouts/LessonLayout';
import MarkdownView from '../components/course/MarkdownView';
import {
  completeLesson,
  fetchCourseBySlug,
  fetchDbLesson,
  fetchDbSections,
  fetchMyCompletedLessonIds,
  hasCourseAccess,
  flattenLessons,
  type Course,
  type DbLesson,
  type SectionMeta,
} from '../services/courses';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';

const STORAGE_KEY = 'gatuno-completed';

// Copia las lecciones completadas de la base al almacenamiento local para que el índice lateral las marque.
// La base manda: primero se borra lo que el navegador recordaba de este curso (otra cuenta o una vista previa).
function mirrorProgress(courseSlug: string, sections: SectionMeta[], completedIds: string[]) {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const previous: string[] = stored ? JSON.parse(stored) : [];
    const own = new Set<string>();
    for (const section of sections) {
      for (const lesson of section.lessons) {
        own.add(`${section.slug}/${lesson.slug}`);
        own.add(`${courseSlug}/${section.slug}/${lesson.slug}`);
      }
    }
    const list = new Set<string>(previous.filter((item) => !own.has(item)));
    for (const section of sections) {
      for (const lesson of section.lessons) {
        if (lesson.id && completedIds.includes(lesson.id)) {
          list.add(`${section.slug}/${lesson.slug}`);
          list.add(`${courseSlug}/${section.slug}/${lesson.slug}`);
        }
      }
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...list]));
    window.dispatchEvent(new CustomEvent('lesson-completed', { detail: { course: courseSlug } }));
  } catch {
    // sin almacenamiento local: el índice simplemente no marca el avance
  }
}

// Lección de un curso creado desde la web: el contenido viene de la base y solo lo ven inscritos, docentes y admins.
export default function DbLessonPage() {
  const { courseSlug, sectionSlug, lessonSlug } = useParams();
  const { user, isLoading: authLoading } = useAuth();
  const [state, setState] = useState<'loading' | 'ready' | 'missing' | 'locked'>('loading');
  const [course, setCourse] = useState<Course | undefined>();
  const [sections, setSections] = useState<SectionMeta[]>([]);
  const [lesson, setLesson] = useState<DbLesson | null>(null);
  const [canInteract, setCanInteract] = useState(false);

  useEffect(() => {
    if (authLoading || !courseSlug || !sectionSlug || !lessonSlug) return;
    let alive = true;
    setState('loading');
    void (async () => {
      const c = await fetchCourseBySlug(courseSlug);
      if (!alive) return;
      if (!c?.id) return setState('missing');
      const secs = await fetchDbSections(c.id);
      const meta = secs.find((s) => s.slug === sectionSlug)?.lessons.find((l) => l.slug === lessonSlug);
      if (!alive) return;
      if (!meta?.id) return setState('missing');
      setCourse(c);
      setSections(secs);
      const full = await fetchDbLesson(meta.id);
      if (!alive) return;
      if (!full) return setState('locked');
      // Solo quien está inscrito puede marcar avance o asistencia; los demás ven la vista previa
      const enrolled = user ? await hasCourseAccess(c.id) : false;
      if (!alive) return;
      setCanInteract(enrolled);
      setLesson(full);
      setState('ready');
      setPageMeta(`${full.title} — ${c.title}`, full.description || c.description);
      const done = enrolled ? await fetchMyCompletedLessonIds() : [];
      if (alive) mirrorProgress(courseSlug, secs, done);
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, user, courseSlug, sectionSlug, lessonSlug]);

  if (!courseSlug || !sectionSlug || !lessonSlug) return <Navigate to="/" replace />;
  if (state === 'missing') return <Navigate to="/" replace />;

  if (state === 'loading') {
    return <p className="px-6 py-16 text-center" style={{ color: 'var(--text-secondary)' }}>Cargando lección…</p>;
  }

  if (state === 'locked' || !lesson || !course) {
    return (
      <main className="px-6 py-16 max-w-xl mx-auto text-center" style={{ minHeight: '60vh' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem' }}>Esta lección es solo para inscritos</h1>
        <p className="mt-3" style={{ color: 'var(--text-secondary)' }}>
          {user ? 'Inscríbete en el curso para ver su contenido.' : 'Inicia sesión e inscríbete en el curso para ver su contenido.'}
        </p>
        <Link to={user ? `/${courseSlug}` : '/login'} className="inline-block mt-6 px-5 py-3 rounded-xl font-semibold no-underline"
          style={{ background: 'var(--azul-gatuno)', color: '#fff', fontFamily: 'var(--font-heading)' }}>
          {user ? 'Ver el curso' : 'Iniciar sesión'}
        </Link>
      </main>
    );
  }

  const currentSection = sections.find((s) => s.slug === sectionSlug);
  const flat = flattenLessons(sections);
  const idx = flat.findIndex(({ sectionSlug: s, lesson: l }) => s === sectionSlug && l.slug === lessonSlug);
  const ref = (i: number) =>
    i >= 0 && i < flat.length
      ? { title: flat[i].lesson.title, href: `/${courseSlug}/${flat[i].sectionSlug}/${flat[i].lesson.slug}` }
      : undefined;

  return (
    <LessonLayout
      courseSlug={courseSlug}
      courseTitle={course.title}
      sections={sections}
      currentSection={sectionSlug}
      currentLesson={lessonSlug}
      lessonTitle={lesson.title}
      lessonDuration={lesson.duration || '—'}
      lessonType={lesson.type}
      sectionTitle={currentSection?.title ?? sectionSlug}
      sectionColor={currentSection?.color ?? '#666'}
      description={lesson.description}
      prev={ref(idx - 1)}
      next={ref(idx + 1)}
      videoId={lesson.youtubeId ?? undefined}
      dbLessonId={lesson.id}
      onComplete={() => void completeLesson(lesson.id)}
      readOnly={!canInteract}
    >
      {lesson.contentMd.trim() ? (
        <MarkdownView source={lesson.contentMd} />
      ) : lesson.topics.length > 0 ? (
        <>
          <h2>Temas que cubrirás</h2>
          <ul>{lesson.topics.map((t) => <li key={t}>{t}</li>)}</ul>
        </>
      ) : null}
    </LessonLayout>
  );
}
