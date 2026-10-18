import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import TeacherRoute from './components/auth/TeacherRoute';
import AdminRoute from './components/auth/AdminRoute';

// The event loads independently of course content, and GSAP stays off course routes.
const MainLayout = lazy(() => import('./layouts/MainLayout'));
const HomePage = lazy(() => import('./pages/HomePage'));
const CoursePage = lazy(() => import('./pages/CoursePage'));
const LessonPage = lazy(() => import('./pages/LessonPage'));
const EventoPage = lazy(() => import('./pages/EventoPage'));
const RegistroPage = lazy(() => import('./pages/RegistroPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const CursosPage = lazy(() => import('./pages/CursosPage'));
const MisCursosPage = lazy(() => import('./pages/MisCursosPage'));
const VerificarPage = lazy(() => import('./pages/VerificarPage'));
const TareasPage = lazy(() => import('./pages/TareasPage'));
const TerminosPage = lazy(() => import('./pages/TerminosPage'));
const PrivacidadPage = lazy(() => import('./pages/PrivacidadPage'));
const AdminPage = lazy(() => import('./pages/AdminPage'));
const DocentePage = lazy(() => import('./pages/DocentePage'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const CodeCatsDaysPage = lazy(() => import('./pages/CodeCatsDaysPage'));

export default function App() {
  return (
    <AuthProvider>
      <Suspense fallback={<main role="status" style={{ minHeight: '100dvh', padding: '32px', fontFamily: 'system-ui' }}>Cargando…</main>}>
        <Routes>
          <Route path="/:courseSlug/:sectionSlug/:lessonSlug" element={<LessonPage />} />

          <Route path="/code-cats-days" element={<CodeCatsDaysPage />} />

          <Route element={<MainLayout />}>
            <Route path="/" element={<HomePage />} />
            <Route path="/evento" element={<EventoPage />} />
            <Route path="/registro" element={<RegistroPage />} />
            <Route path="/perfil" element={<RegistroPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/terminos" element={<TerminosPage />} />
            <Route path="/privacidad" element={<PrivacidadPage />} />
            <Route path="/cursos" element={<CursosPage />} />
            <Route path="/mis-cursos" element={<MisCursosPage />} />
            <Route path="/tareas/:offeringId" element={<TareasPage />} />
            <Route path="/verificar/:code" element={<VerificarPage />} />
            <Route path="/:courseSlug" element={<CoursePage />} />

            {/* Rutas protegidas para Docentes / Administradores */}
            <Route element={<TeacherRoute />}>
              <Route path="/docente" element={<DocentePage />} />
            </Route>

            <Route element={<AdminRoute />}>
              <Route path="/admin" element={<AdminPage />} />
            </Route>

            <Route path="*" element={<NotFoundPage />} />
          </Route>
        </Routes>
      </Suspense>
    </AuthProvider>
  );
}
