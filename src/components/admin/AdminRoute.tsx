
import type { ReactNode } from 'react';
import { useAuth } from '../../context/AuthContext';

interface AdminRouteProps {
  children: ReactNode;
}

export default function AdminRoute({ children }: AdminRouteProps) {
  const { user, roles, isLoading } = useAuth();

  if (isLoading) {
    return <p className="p-8">Verificando permisos...</p>;
  }

  if (!user) {
    return (
      <main className="p-8">
        <h1>Acceso restringido</h1>
        <p>Inicia sesión para acceder al panel administrativo.</p>
      </main>
    );
  }

  if (!roles.includes('admin')) {
    return (
      <main className="p-8">
        <h1>Acceso denegado</h1>
        <p>No tienes permisos de administrador.</p>
      </main>
    );
  }

  return <>{children}</>;
}
