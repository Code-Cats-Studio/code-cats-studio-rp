import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import MainLayout from './layouts/MainLayout';
import TeacherRoute from './components/auth/TeacherRoute';
import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import EventoPage from './pages/EventoPage';
import RegistroPage from './pages/RegistroPage';
import DocentePage from './pages/DocentePage';
import NotFoundPage from './pages/NotFoundPage';

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/:courseSlug/:sectionSlug/:lessonSlug" element={<LessonPage />} />

        <Route element={<MainLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/evento" element={<EventoPage />} />
          <Route path="/registro" element={<RegistroPage />} />
          <Route path="/:courseSlug" element={<CoursePage />} />

          {/* Rutas protegidas para Docentes / Administradores */}
          <Route element={<TeacherRoute />}>
            <Route path="/docente" element={<DocentePage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </AuthProvider>
  );
}

