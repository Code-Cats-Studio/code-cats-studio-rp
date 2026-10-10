import { Route, Routes } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import CodeCatsDaysPage from './pages/CodeCatsDaysPage';
import EventoPage from './pages/EventoPage';
import RegistroPage from './pages/RegistroPage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
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
  );
}
