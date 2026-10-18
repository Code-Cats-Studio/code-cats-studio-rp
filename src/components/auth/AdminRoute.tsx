import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

// Solo administradores. La seguridad real está en la base de datos (RLS); esto solo evita mostrar la pantalla.
export default function AdminRoute() {
  const { user, roles, isLoading } = useAuth();

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

  if (!user || !roles.includes('admin')) {
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
