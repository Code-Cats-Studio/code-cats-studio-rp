import { useEffect, useState } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import LessonLayout from '../layouts/LessonLayout';
import {
  fetchCourseBySlug,
  flattenLessons,
  getCourseBySlug,
  getCourseSections,
  getLessonModule,
} from '../services/courses';
import { setPageMeta } from '../utils/seo';
import DbLessonPage from './DbLessonPage';

function LocalLessonPage() {
  const { courseSlug, sectionSlug, lessonSlug } = useParams();
  const course = courseSlug ? getCourseBySlug(courseSlug) : undefined;
  const lessonModule =
    courseSlug && sectionSlug && lessonSlug
      ? getLessonModule(courseSlug, sectionSlug, lessonSlug)
      : undefined;

  useEffect(() => {
    if (!course || !lessonModule) return;
    setPageMeta(
      `${lessonModule.frontmatter.title} — ${course.title}`,
      lessonModule.frontmatter.description,
    );
  }, [course, lessonModule]);

  if (!courseSlug || !sectionSlug || !lessonSlug || !course || !lessonModule) {
    return <Navigate to="/" replace />;
  }

  const sections = getCourseSections(courseSlug);
  const currentSection = sections.find((section) => section.slug === sectionSlug);
  const flat = flattenLessons(sections);
  const currentIndex = flat.findIndex(
    ({ sectionSlug: slug, lesson }) => slug === sectionSlug && lesson.slug === lessonSlug,
  );
  const prevItem = currentIndex > 0 ? flat[currentIndex - 1] : undefined;
  const nextItem = currentIndex < flat.length - 1 ? flat[currentIndex + 1] : undefined;
  const lesson = lessonModule.frontmatter;
  const Content = lessonModule.default;

  return (
    <LessonLayout
      courseSlug={courseSlug}
      courseTitle={course.title}
      sections={sections}
      currentSection={sectionSlug}
      currentLesson={lessonSlug}
      lessonTitle={lesson.title}
      lessonDuration={lesson.duration}
      lessonType={lesson.type}
      sectionTitle={currentSection?.title ?? sectionSlug}
      sectionColor={currentSection?.color ?? '#666'}
      description={lesson.description}
      prev={
        prevItem
          ? {
              title: prevItem.lesson.title,
              href: `/${courseSlug}/${prevItem.sectionSlug}/${prevItem.lesson.slug}`,
            }
          : undefined
      }
      next={
        nextItem
          ? {
              title: nextItem.lesson.title,
              href: `/${courseSlug}/${nextItem.sectionSlug}/${nextItem.lesson.slug}`,
            }
          : undefined
      }
    >
      <Content />
    </LessonLayout>
  );
}

// Si el curso ya está en la base de datos, la base manda (se puede editar desde /admin y /docente);
// si no, se leen los archivos MDX del código.
export default function LessonPage() {
  const { courseSlug, sectionSlug, lessonSlug } = useParams();
  const [source, setSource] = useState<'loading' | 'db' | 'local'>('loading');

  useEffect(() => {
    if (!courseSlug) return;
    let alive = true;
    setSource('loading');
    void fetchCourseBySlug(courseSlug).then((c) => alive && setSource(c?.source === 'db' ? 'db' : 'local'));
    return () => {
      alive = false;
    };
  }, [courseSlug]);

  if (source === 'loading') {
    return <p className="px-6 py-16 text-center" style={{ color: 'var(--text-secondary)' }}>Cargando lección…</p>;
  }
  const hasLocal = courseSlug && sectionSlug && lessonSlug && getLessonModule(courseSlug, sectionSlug, lessonSlug);
  return source === 'local' && hasLocal ? <LocalLessonPage /> : <DbLessonPage />;
}
