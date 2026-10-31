import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { rememberRedirect } from '../auth/PostLoginRedirect';

// Cuenta en el navbar de Code Cats Days: foto o inicial + correo, aviso para completar la cuenta y menú
export default function EventAccount() {
  const { user, profile, roles, isProfileComplete, isLoading, signOut } = useAuth();
  const { pathname } = useLocation();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (event: PointerEvent) => { if (!root.current?.contains(event.target as Node)) setOpen(false); };
    const onKey = (event: KeyboardEvent) => { if (event.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('pointerdown', onPointer); document.removeEventListener('keydown', onKey); };
  }, [open]);

  if (isLoading) return <div className="ccd-account ccd-account--loading" aria-hidden="true" />;

  if (!user) {
    return (
      <div className="ccd-account">
        <Link className="ccd-account__login" to="/login" onClick={() => rememberRedirect(pathname)}>Iniciar sesión</Link>
      </div>
    );
  }

  const avatarUrl = profile?.avatar_url || user.user_metadata?.avatar_url || user.user_metadata?.picture;
  const name = profile?.full_name || user.user_metadata?.full_name || user.user_metadata?.name || user.email?.split('@')[0] || 'Explorador/a';
  const email = user.email ?? profile?.email ?? '';

  return (
    <div className="ccd-account" ref={root}>
      {!isProfileComplete && (
        <Link className="ccd-account__alert" to="/perfil" onClick={() => rememberRedirect(pathname)}>
          <span className="ccd-account__dot" aria-hidden="true" />
          <span className="ccd-account__alert-long">Completa tu cuenta</span>
          <span className="ccd-account__alert-short" aria-hidden="true">Completar</span>
        </Link>
      )}
      <button type="button" className="ccd-account__btn" aria-expanded={open} aria-haspopup="menu" aria-label={`Cuenta de ${name}`} onClick={() => setOpen(!open)}>
        {avatarUrl ? (
          <img className="ccd-account__avatar" src={avatarUrl} alt="" width={32} height={32} referrerPolicy="no-referrer" />
        ) : (
          <span className="ccd-account__avatar ccd-account__avatar--initial" aria-hidden="true">{name.charAt(0).toUpperCase()}</span>
        )}
        <span className="ccd-account__email">{email || name}</span>
        <span className="ccd-account__caret" aria-hidden="true">▾</span>
      </button>
      {open && (
        <div className="ccd-account__menu" role="menu">
          <p className="ccd-account__who"><strong>{name}</strong><span>{email}</span></p>
          <Link role="menuitem" to="/code-cats-days/inscripcion" onClick={() => setOpen(false)}>Mi Cat Pass</Link>
          <Link role="menuitem" to="/perfil" onClick={() => { rememberRedirect(pathname); setOpen(false); }}>
            {isProfileComplete ? 'Mi perfil' : 'Completar mi cuenta'}
          </Link>
          {roles.includes('admin') && <Link role="menuitem" to="/admin" onClick={() => setOpen(false)}>Panel de admin</Link>}
          <button type="button" role="menuitem" onClick={() => { setOpen(false); void signOut(); }}>Cerrar sesión</button>
        </div>
      )}
    </div>
  );
}
