import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import Sidebar from '../components/course/Sidebar';
import LessonNav from '../components/course/LessonNav';
import CompleteButton from '../components/course/CompleteButton';
import YouTubePlayer from '../components/course/YouTubePlayer';
import CheckinForm from '../components/course/CheckinForm';
import type { SectionMeta } from '../services/courses';

interface LessonRef {
  title: string;
  href: string;
}

interface Props {
  courseSlug: string;
  courseTitle: string;
  sections: SectionMeta[];
  currentSection: string;
  currentLesson: string;
  lessonTitle: string;
  lessonDuration: string;
  lessonType: string;
  sectionTitle: string;
  sectionColor: string;
  description?: string;
  prev?: LessonRef;
  next?: LessonRef;
  children: ReactNode;
}

const typeLabels: Record<string, string> = {
  theory: 'Teoría',
  practice: 'Práctica',
  challenge: 'Desafío',
  setup: 'Configuración',
  reading: 'Lectura',
  tool: 'Herramienta',
  skill: 'Habilidad',
};

const typeColors: Record<string, string> = {
  theory: 'var(--azul-gatuno)',
  practice: '#22c55e',
  challenge: '#f59e0b',
  setup: '#8A8A9A',
  reading: '#6366f1',
  tool: '#14b8a6',
  skill: '#ec4899',
};

export default function LessonLayout({
  courseSlug,
  courseTitle,
  sections,
  currentSection,
  currentLesson,
  lessonTitle,
  lessonDuration,
  lessonType,
  sectionTitle,
  sectionColor,
  description,
  prev,
  next,
  children,
}: Props) {
  return (
    <div className="flex min-h-screen">
      <Sidebar
        courseSlug={courseSlug}
        courseTitle={courseTitle}
        sections={sections}
        currentSection={currentSection}
        currentLesson={currentLesson}
      />

      <div className="flex-1 flex flex-col md:ml-[var(--sidebar-width)]">
        <header
          className="sticky top-0 z-20 px-8 py-3 flex items-center gap-2 text-sm"
          style={{ background: 'var(--bg-primary)', borderBottom: '1px solid var(--border)' }}
        >
          <Link
            to="/"
            className="ml-5 md:ml-0 no-underline"
            style={{ color: 'var(--text-muted)' }}
          >
            Inicio
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <Link to={`/${courseSlug}`} className="no-underline" style={{ color: 'var(--text-muted)' }}>
            {courseTitle}
          </Link>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: 'var(--text-secondary)' }}>{sectionTitle}</span>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span
            style={{ color: 'var(--text-primary)', fontWeight: 500 }}
            className="truncate max-w-xs"
          >
            {lessonTitle}
          </span>
        </header>

        <main className="flex-1 px-8 md:px-12 py-10 max-w-4xl w-full mx-auto">
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${sectionColor}20`,
                  color: sectionColor,
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {sectionTitle}
              </span>
              <span
                className="px-2.5 py-1 rounded-full text-xs font-semibold"
                style={{
                  background: `${typeColors[lessonType] || 'var(--bg-tertiary)'}15`,
                  color: typeColors[lessonType] || 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {typeLabels[lessonType] || lessonType}
              </span>
              <span
                style={{
                  fontSize: '0.75rem',
                  color: 'var(--text-muted)',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                ⏱ {lessonDuration}
              </span>
            </div>

            <h1
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: 'clamp(1.75rem, 4vw, 2.5rem)',
                color: 'var(--text-primary)',
                margin: '0 0 0.5rem',
                lineHeight: 1.1,
                letterSpacing: '0.02em',
              }}
            >
              {lessonTitle}
            </h1>
            {description && (
              <p
                style={{
                  fontSize: '1rem',
                  color: 'var(--text-secondary)',
                  margin: 0,
                  lineHeight: 1.6,
                  maxWidth: '60ch',
                }}
              >
                {description}
              </p>
            )}
          </div>

          {/* Reproductor de YouTube con dominio extendido y reporte de watch time a Supabase */}
          <YouTubePlayer
            lessonId={`${currentSection}/${currentLesson}`}
            courseSlug={courseSlug}
            sectionSlug={currentSection}
            lessonSlug={currentLesson}
          />

          <div className="prose">{children}</div>

          {/* Formulario de Asistencia con código de 6 dígitos y enlace a Google Calendar */}
          <div className="my-10">
            <CheckinForm courseTitle={courseTitle} />
          </div>

          <div className="mt-8 pt-6" style={{ borderTop: '1px solid var(--border)' }}>
            <CompleteButton
              lessonId={`${currentSection}/${currentLesson}`}
              courseSlug={courseSlug}
              sectionSlug={currentSection}
              lessonSlug={currentLesson}
            />
          </div>

          <LessonNav prev={prev} next={next} />
        </main>

        <footer
          className="px-8 py-4 text-center"
          style={{ borderTop: '1px solid var(--border)', background: 'var(--bg-secondary)' }}
        >
          <p
            style={{
              fontSize: '0.75rem',
              color: 'var(--text-muted)',
              margin: 0,
              fontFamily: 'var(--font-heading)',
            }}
          >
            Code Cats Studios · Aprende desarrollo web con cursos prácticos
          </p>
        </footer>
      </div>
    </div>
  );
}
