
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';

import MainLayout from './layouts/MainLayout';

import HomePage from './pages/HomePage';
import CoursePage from './pages/CoursePage';
import LessonPage from './pages/LessonPage';
import EventoPage from './pages/EventoPage';
import RegistroPage from './pages/RegistroPage';
import NotFoundPage from './pages/NotFoundPage';

// Panel de Administración
import AdminPage from './pages/AdminPage';
import AdminRoute from './components/admin/AdminRoute';

export default function App() {
  return (
    <AuthProvider>
      <Routes>

        {/* Página de lecciones */}
        <Route
          path="/:courseSlug/:sectionSlug/:lessonSlug"
          element={<LessonPage />}
        />

        <Route element={<MainLayout />}>

          {/* Páginas generales */}
          <Route path="/" element={<HomePage />} />

          <Route
            path="/evento"
            element={<EventoPage />}
          />

          <Route
            path="/registro"
            element={<RegistroPage />}
          />

          {/* Panel real: acceso exclusivo para administradores */}
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminPage />
              </AdminRoute>
            }
          />

          {/* Página de cursos */}
          <Route
            path="/:courseSlug"
            element={<CoursePage />}
          />

          {/* Página no encontrada */}
          <Route
            path="*"
            element={<NotFoundPage />}
          />

        </Route>

      </Routes>
    </AuthProvider>
  );
}
