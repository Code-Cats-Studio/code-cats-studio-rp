import { Link } from 'react-router-dom';
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

export default function Navbar({ courseName }: Props) {
  const { user, profile, roles, isProfileComplete, isLoading, signOut } = useAuth();
  const isStaff = roles.includes('teacher') || roles.includes('admin');

  const avatarUrl =
    profile?.avatar_url ||
    user?.user_metadata?.avatar_url ||
    user?.user_metadata?.picture;

  const displayName =
    profile?.full_name ||
    user?.user_metadata?.full_name ||
    user?.user_metadata?.name ||
    user?.email?.split('@')[0] ||
    'Usuario';

  return (
    <header className="sticky top-0 z-40">
      {/* Banner de alerta discreto si el usuario no ha completado su perfil */}
      {user && !isProfileComplete && (
        <aside
          aria-label="Aviso de perfil incompleto"
          className="w-full px-4 py-2 flex items-center justify-center gap-2 text-xs md:text-sm transition-all"
          style={{
            background: '#FEF2F2',
            borderBottom: '1px solid #FCA5A5',
            color: '#991B1B',
            fontFamily: 'var(--font-heading)',
          }}
        >
          <span className="flex h-2 w-2 relative flex-shrink-0" aria-hidden="true">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
          </span>
          <span className="font-medium text-center">
            Completa tu perfil para inscribirte a los cursos
          </span>
          <Link
            to="/perfil"
            className="font-bold underline hover:opacity-80 transition-opacity ml-1 flex-shrink-0"
            style={{ color: '#DC2626' }}
          >
            Completar ahora →
          </Link>
        </aside>
      )}

      {/* Barra de navegación principal */}
      <nav
        style={{
          background: 'rgba(255, 255, 255, 0.9)',
          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo y título */}
          <Link to="/" className="flex items-center no-underline flex-shrink-0" aria-label="Code Cats Studio, ir al inicio">
            <img
              src="/images/brand/logo-wordmark.png"
              alt="code_cats studio"
              className="h-10 w-auto"
              width={126}
              height={40}
            />
          </Link>

          {/* Enlaces de la landing (Figma): Bebas Neue 24 px, azul */}
          <div className="hidden md:flex items-center gap-6 lg:gap-10 flex-1 justify-center">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="no-underline transition-colors"
                style={{ fontFamily: 'var(--font-display)', fontSize: '1.5rem', lineHeight: 1, color: 'var(--azul-gatuno)' }}
                onMouseOver={(e) => (e.currentTarget.style.textDecoration = 'underline')}
                onMouseOut={(e) => (e.currentTarget.style.textDecoration = 'none')}
              >
                {l.label}
              </a>
            ))}
          </div>

          {/* Sección derecha: Curso activo y Estado de Autenticación */}
          <div className="flex items-center gap-4">
            {courseName && (
              <span
                className="hidden md:inline-block truncate max-w-[200px]"
                style={{
                  color: 'var(--text-muted)',
                  fontSize: '0.875rem',
                  fontFamily: 'var(--font-heading)',
                }}
              >
                {courseName}
              </span>
            )}

            {isLoading ? (
              <div
                className="w-24 h-9 rounded-xl animate-pulse"
                style={{ background: 'var(--bg-tertiary)' }}
              />
            ) : !user ? (
              <Link
                to="/login"
                className="inline-flex items-center px-4 py-2 rounded-[7px] no-underline transition-transform duration-200 hover:-translate-y-0.5"
                style={{
                  fontFamily: 'var(--font-display)',
                  fontSize: '1.5rem',
                  lineHeight: 1,
                  background: 'var(--verde-limon)',
                  color: 'var(--azul-gatuno)',
                }}
              >
                Unirse ahora
              </Link>
            ) : (
              <div className="flex items-center gap-3">
                <Link to="/mis-cursos" className="hidden md:inline text-xs font-semibold no-underline" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)' }}>
                  Mis cursos
                </Link>
                {isStaff && (
                  <Link to="/docente" className="hidden md:inline text-xs font-semibold no-underline" style={{ fontFamily: 'var(--font-heading)', color: 'var(--text-secondary)' }}>
                    Docente
                  </Link>
                )}
                {roles.includes('admin') && (
                  <Link to="/admin" className="hidden md:inline text-xs font-semibold no-underline" style={{ fontFamily: 'var(--font-heading)', color: 'var(--azul-gatuno)' }}>
                    Admin
                  </Link>
                )}
                {/* Tarjeta de usuario / Perfil */}
                <Link
                  to="/perfil"
                  className="flex items-center gap-2 p-1 pr-2.5 rounded-full no-underline transition-all"
                  style={{
                    border: isProfileComplete
                      ? '1.5px solid var(--border)'
                      : '1.5px solid #F87171',
                    background: isProfileComplete ? 'var(--bg-secondary)' : '#FEF2F2',
                  }}
                  title={
                    !isProfileComplete
                      ? 'Perfil incompleto - Clic para completar datos'
                      : displayName
                  }
                >
                  <div className="relative flex-shrink-0">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="w-7 h-7 rounded-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs"
                        style={{ background: 'var(--azul-gatuno)', color: 'white' }}
                      >
                        {displayName.charAt(0).toUpperCase()}
                      </div>
                    )}

                    {/* Indicador rojo si el perfil no está completo */}
                    {!isProfileComplete && (
                      <span
                        className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-white"
                        style={{ background: '#EF4444' }}
                        aria-hidden="true"
                      />
                    )}
                  </div>

                  <span
                    className="text-xs font-semibold max-w-[120px] truncate hidden sm:inline-block"
                    style={{
                      fontFamily: 'var(--font-heading)',
                      color: 'var(--text-primary)',
                    }}
                  >
                    {displayName}
                  </span>
                </Link>

                {/* Botón Cerrar Sesión */}
                <button
                  type="button"
                  onClick={() => void signOut()}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-all duration-150 select-none"
                  style={{
                    fontFamily: 'var(--font-heading)',
                    background: 'transparent',
                    color: 'var(--text-muted)',
                    border: '1px solid var(--border)',
                  }}
                  onMouseOver={(e) => {
                    e.currentTarget.style.color = 'var(--error)';
                    e.currentTarget.style.borderColor = 'var(--error)';
                    e.currentTarget.style.background = '#FEF2F2';
                  }}
                  onMouseOut={(e) => {
                    e.currentTarget.style.color = 'var(--text-muted)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                    e.currentTarget.style.background = 'transparent';
                  }}
                >
                  Cerrar Sesión
                </button>
              </div>
            )}
          </div>
        </div>
      </nav>
    </header>
  );
}

