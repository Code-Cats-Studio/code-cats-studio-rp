import { useEffect, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const KEY = 'post-login-redirect';
// El destino caduca: quien confirma su correo horas después sigue volviendo, pero uno viejo no secuestra otro inicio de sesión
const MAX_AGE_MS = 48 * 3600 * 1000;

// Guarda a dónde volver después de iniciar sesión (por ejemplo, la inscripción a un evento).
export function rememberRedirect(path: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }));
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
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    let path = raw;
    if (raw.startsWith('{')) {
      const saved = JSON.parse(raw) as { path?: string; at?: number };
      if (!saved.path || !saved.at || Date.now() - saved.at > MAX_AGE_MS) {
        localStorage.removeItem(KEY);
        return null;
      }
      path = saved.path;
    }
    return path.startsWith('/') && !path.startsWith('//') ? path : null;
  } catch {
    return null;
  }
}

// URL a la que Google y el enlace del correo devuelven a la persona. Lleva el destino dentro, así funciona
// aunque abra el correo en otro navegador o en el celular (ahí no existe el localStorage). Debe estar
// permitida en Supabase → Authentication → URL Configuration; si no lo está, Supabase cae en la página principal.
export function authReturnUrl(): string {
  return `${window.location.origin}${peekRedirect() ?? ''}`;
}

// Al detectar la sesión, lleva a la persona a la página que pidió y olvida el destino.
// Solo actúa UNA vez por inicio de sesión: antes se volvía a ejecutar en cada cambio de ruta y, como
// "Completar mi perfil" guarda la inscripción como destino y navega a /perfil, la devolvía a la inscripción
// al instante (la persona veía que el botón "solo recarga la página" y nunca podía completar su perfil).
export default function PostLoginRedirect() {
  const { user, isLoading } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  // Id de la persona cuyo destino ya se revisó
  const handledFor = useRef<string | null>(null);

  useEffect(() => {
    if (isLoading) return;
    if (!user) {
      handledFor.current = null;
      return;
    }
    if (handledFor.current === user.id) return;
    handledFor.current = user.id;

    // Quien abre /perfil se queda ahí para completar sus datos; el destino se conserva para el botón "Continuar"
    if (pathname === '/perfil') return;

    const path = peekRedirect();
    if (!path) return;
    clearRedirect();
    navigate(path, { replace: true });
  }, [user, isLoading, pathname, navigate]);

  return null;
}
