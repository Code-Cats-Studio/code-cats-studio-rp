import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const KEY = 'post-login-redirect';

// Guarda a dónde volver después de iniciar sesión (por ejemplo, la inscripción a un evento).
export function rememberRedirect(path: string) {
  try {
    localStorage.setItem(KEY, path);
  } catch {
    // sin almacenamiento local: se vuelve al inicio normal
  }
}

export function clearRedirect() {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // nada que limpiar
  }
}

export function peekRedirect(): string | null {
  try {
    const path = localStorage.getItem(KEY);
    return path && path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}

// Al detectar la sesión, lleva a la persona a la página que pidió y olvida el destino.
export default function PostLoginRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (isLoading || !user) return;
    const path = peekRedirect();
    if (!path) return;
    try {
      localStorage.removeItem(KEY);
    } catch {
      // nada que limpiar
    }
    navigate(path, { replace: true });
  }, [user, isLoading, navigate]);

  return null;
}
