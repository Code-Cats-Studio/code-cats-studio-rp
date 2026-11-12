import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const NAV_LINKS = [
  { label: 'Sobre nosotros', href: '/#sobre-nosotros' },
  { label: 'Cursos', href: '/#cursos' },
  { label: 'Proyectos', href: '/#proyectos' },
  { label: 'Contáctanos', href: '/#encuentranos' },
];

interface Props {
  courseName?: string;
}

const linkStyle = { fontFamily: 'var(--font-heading)' } as const;

export default function Navbar({ courseName }: Props) {
  const { user, profile, roles, isProfileComplete, isLoading, signOut } = useAuth();
  const { pathname } = useLocation();
  const isTeacher = roles.includes('teacher');
  const isAdmin = roles.includes('admin');
  const [menuOpen, setMenuOpen] = useState(false);
  const [userOpen, setUserOpen] = useState(false);
  const userRef = useRef<HTMLDivElement>(null);

  // cierra los menús al cambiar de página, con Escape y al hacer clic fuera
  useEffect(() => {
    setMenuOpen(false);
    setUserOpen(false);
  }, [pathname]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setUserOpen(false);
      }
    };
    const onClick = (e: MouseEvent) => {
      if (userRef.current && !userRef.current.contains(e.target as Node)) setUserOpen(false);
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('mousedown', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('mousedown', onClick);
    };
  }, []);

  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || user?.user_metadata?.picture;
  const displayName =
    profile?.full_name || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0] || 'Usuario';

  const appLinks = [
    { to: '/mis-cursos', label: 'Mis cursos', show: true },
    { to: '/docente', label: 'Panel docente', show: isTeacher || isAdmin },
    { to: '/admin', label: 'Administración', show: isAdmin },
  ].filter((l) => l.show);

  const avatar = avatarUrl ? (
    <img src={avatarUrl} alt="" className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
  ) : (
    <span className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm" style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>
      {displayName.charAt(0).toUpperCase()}
    </span>
  );

  return (
    <header className="sticky top-0 z-40">
      {user && !isProfileComplete && (
        <aside
          aria-label="Aviso de perfil incompleto"
          className="w-full px-4 py-2 flex flex-wrap items-center justify-center gap-x-2 text-xs md:text-sm"
          style={{ background: '#FEF2F2', borderBottom: '1px solid #FCA5A5', color: '#991B1B', ...linkStyle }}
        >
          <span className="flex h-2 w-2 relative flex-shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="font-medium">Completa tu perfil para inscribirte a los cursos</span>
          <Link to="/perfil" className="font-bold underline hover:opacity-80" style={{ color: '#DC2626' }}>
            Completar ahora →
          </Link>
        </aside>
      )}

      <nav
        aria-label="Principal"
        style={{ background: 'rgba(255, 255, 255, 0.92)', backdropFilter: 'blur(14px)', WebkitBackdropFilter: 'blur(14px)', borderBottom: '1px solid var(--border)' }}
      >
        <div className="max-w-6xl mx-auto px-4 md:px-6 h-16 flex items-center justify-between gap-3">
          <Link to="/" className="flex items-center no-underline flex-shrink-0" aria-label="Code Cats Studio, ir al inicio">
            <img src="/images/brand/logo-wordmark.png" alt="code_cats studio" className="h-9 md:h-10 w-auto" width={126} height={40} />
          </Link>

          <div className="hidden lg:flex items-center gap-8 flex-1 justify-center">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="no-underline hover:underline underline-offset-4"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: 'var(--azul-gatuno)' }}>
                {l.label}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2 md:gap-3">
            {courseName && (
              <span className="hidden xl:inline-block truncate max-w-[200px] text-sm" style={{ color: 'var(--text-muted)', ...linkStyle }}>
                {courseName}
              </span>
            )}

            {isLoading ? (
              <div className="w-24 h-9 rounded-xl animate-pulse" style={{ background: 'var(--bg-tertiary)' }} />
            ) : !user ? (
              <Link to="/login" className="inline-flex items-center px-4 py-2 rounded-[7px] no-underline transition-transform hover:-translate-y-0.5"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem', lineHeight: 1, background: 'var(--verde-limon)', color: 'var(--azul-gatuno)' }}>
                Unirse ahora
              </Link>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-1">
                  {appLinks.map((l) => (
                    <NavLink key={l.to} to={l.to}
                      className="px-3 py-1.5 rounded-lg text-sm font-semibold no-underline transition-colors"
                      style={({ isActive }) => ({
                        ...linkStyle,
                        background: isActive ? 'var(--bg-accent-soft)' : 'transparent',
                        color: isActive ? 'var(--azul-gatuno)' : 'var(--text-secondary)',
                      })}>
                      {l.label}
                    </NavLink>
                  ))}
                </div>

                <div className="relative" ref={userRef}>
                  <button type="button" onClick={() => setUserOpen((o) => !o)} aria-haspopup="menu" aria-expanded={userOpen}
                    className="flex items-center gap-2 p-1 pr-2 md:pr-3 rounded-full cursor-pointer"
                    style={{ border: isProfileComplete ? '1.5px solid var(--border)' : '1.5px solid #F87171', background: isProfileComplete ? 'var(--bg-secondary)' : '#FEF2F2' }}
                    title={!isProfileComplete ? 'Perfil incompleto' : displayName}>
                    <span className="relative">
                      {avatar}
                      {!isProfileComplete && <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white" style={{ background: '#EF4444' }} aria-hidden />}
                    </span>
                    <span className="hidden sm:inline-block text-sm font-semibold max-w-[130px] truncate" style={linkStyle}>{displayName}</span>
                    <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden className="hidden sm:block" style={{ color: 'var(--text-muted)' }}>
                      <path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                    </svg>
                  </button>

                  {userOpen && (
                    <div role="menu" className="absolute right-0 mt-2 w-60 rounded-2xl p-2 shadow-xl"
                      style={{ background: '#fff', border: '1px solid var(--border)' }}>
                      <div className="px-3 py-2">
                        <p className="m-0 text-sm font-bold truncate" style={linkStyle}>{displayName}</p>
                        <p className="m-0 text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user.email}</p>
                      </div>
                      <hr className="my-1 border-0 h-px" style={{ background: 'var(--border)' }} />
                      <Link role="menuitem" to="/perfil" className="block px-3 py-2 rounded-lg text-sm no-underline hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text-primary)' }}>
                        {isTeacher ? 'Mi perfil y ficha docente' : 'Mi perfil'}
                      </Link>
                      {appLinks.map((l) => (
                        <Link key={l.to} role="menuitem" to={l.to} className="block px-3 py-2 rounded-lg text-sm no-underline hover:bg-[var(--bg-secondary)]" style={{ color: 'var(--text-primary)' }}>
                          {l.label}
                        </Link>
                      ))}
                      <hr className="my-1 border-0 h-px" style={{ background: 'var(--border)' }} />
                      <button type="button" role="menuitem" onClick={() => void signOut()}
                        className="w-full text-left px-3 py-2 rounded-lg text-sm cursor-pointer hover:bg-[#FEF2F2]" style={{ color: '#B91C1C' }}>
                        Cerrar sesión
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}

            <button type="button" className="lg:hidden grid place-items-center w-10 h-10 rounded-xl cursor-pointer"
              style={{ border: '1px solid var(--border)' }} aria-label={menuOpen ? 'Cerrar menú' : 'Abrir menú'}
              aria-expanded={menuOpen} onClick={() => setMenuOpen((o) => !o)}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                {menuOpen
                  ? <path d="M4 4l12 12M16 4L4 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  : <path d="M3 6h14M3 10h14M3 14h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />}
              </svg>
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden px-4 pb-4 grid gap-1" style={{ borderTop: '1px solid var(--border)', background: '#fff' }}>
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setMenuOpen(false)} className="px-3 py-3 rounded-xl no-underline"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: 'var(--azul-gatuno)' }}>
                {l.label}
              </a>
            ))}
            {user && appLinks.map((l) => (
              <Link key={l.to} to={l.to} className="md:hidden px-3 py-3 rounded-xl text-sm font-semibold no-underline"
                style={{ ...linkStyle, background: 'var(--bg-secondary)', color: 'var(--text-primary)' }}>
                {l.label}
              </Link>
            ))}
          </div>
        )}
      </nav>
    </header>
  );
}
