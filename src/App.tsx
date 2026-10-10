import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';

// The event loads independently of course content, and GSAP stays off course routes.
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const EventoPage = lazy(() => import('./pages/EventoPage'));
const RegistroPage = lazy(() => import('./pages/RegistroPage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CodeCatsDaysPage = lazy(() => import('./pages/CodeCatsDaysPage'));

export default function App() {
  return (
    <Suspense fallback={<main role="status" style={{ minHeight: '100dvh', padding: '32px', fontFamily: 'system-ui' }}>Cargando…</main>}>
      <Routes>
        <Route path="/:courseSlug/:sectionSlug/:lessonSlug" element={<LessonPage />} />

        <Route path="/code-cats-days" element={<CodeCatsDaysPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/evento" element={<EventoPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/:courseSlug" element={<CoursePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
