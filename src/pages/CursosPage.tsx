import { useEffect, useState } from 'react';
import CourseCard from '../components/home/CourseCard';
import { fetchPublishedCourses, getEnrollmentState, type Course } from '../services/courses';
import { setPageMeta } from '../utils/seo';

export default function CursosPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setPageMeta('Cursos', 'Catálogo de cursos de Code Cats Studio');
    let active = true;
    void fetchPublishedCourses().then((data) => {
      if (!active) return;
      setCourses(data);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <main className="max-w-6xl mx-auto px-6 py-12" style={{ minHeight: 'calc(100vh - 8rem)' }}>
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em' }}>
        Cursos
      </h1>
      {loading ? (
        <p className="mt-8">Cargando…</p>
      ) : (
        <div className="mt-8 grid grid-cols-[minmax(0,1fr)] md:grid-cols-2 lg:grid-cols-3 gap-6">
          {courses.map((course) => (
            <CourseCard
              key={course.slug}
              slug={course.slug}
              title={course.title}
              subtitle={course.subtitle}
              description={course.description}
              duration={course.duration}
              level={course.level}
              lessons={course.lessons}
              sections={course.sections}
              accentColor={course.accentColor}
              mascotImage={course.mascotImage}
              comingSoon={course.comingSoon}
              startDate={course.startDate}
              enrollmentState={getEnrollmentState(course)}
            />
          ))}
        </div>
      )}
    </main>
  );
}
