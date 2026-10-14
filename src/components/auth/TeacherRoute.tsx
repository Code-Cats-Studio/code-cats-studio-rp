import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function TeacherRoute() {
  const { user, roles, isLoading } = useAuth();

  // 1. Mostrar estado de carga mientras se recupera la sesión y roles
  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center" style={{ background: 'var(--bg-primary)' }}>
        <div
          className="w-8 h-8 border-4 border-t-transparent rounded-full animate-spin"
          style={{ borderColor: 'var(--azul-gatuno)', borderTopColor: 'transparent' }}
        />
      </div>
    );
  }

  // 2. Si no hay sesión, enviar a la página principal
  if (!user) {
    return <Navigate to="/" replace />;
  }

  // 3. Validar si el usuario posee rol 'teacher' o 'admin'
  const isAuthorized = roles.includes('teacher') || roles.includes('admin');
  if (!isAuthorized) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
