import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

interface Props {
  courseName?: string;
}

export default function Navbar({ courseName }: Props) {
  const { user, profile, isProfileComplete, isLoading, signInWithGoogle, signOut } = useAuth();

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
            to="/registro"
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
          background: 'var(--bg-primary)',
          borderBottom: '1px solid var(--border)',
        }}
      >
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
          {/* Logo y título */}
          <Link to="/" className="flex items-center gap-3 no-underline group flex-shrink-0">
            <img
              src="/images/mascot/cat-peek.png"
              alt="Code Cats Studio mascota"
              className="h-9 w-auto"
            />
            <span
              style={{
                fontFamily: 'var(--font-display)',
                fontSize: '1.5rem',
                color: 'var(--text-primary)',
                letterSpacing: '0.05em',
              }}
            >
              Code Cats Studio
            </span>
          </Link>

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
              <button
                type="button"
                onClick={() => void signInWithGoogle()}
                className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold transition-all duration-200 cursor-pointer select-none"
                style={{
                  fontFamily: 'var(--font-heading)',
                  background: 'var(--bg-primary)',
                  color: 'var(--text-primary)',
                  border: '1.5px solid var(--border)',
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = 'var(--azul-gatuno)';
                  e.currentTarget.style.background = 'var(--bg-accent-soft)';
                  e.currentTarget.style.color = 'var(--azul-gatuno)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.background = 'var(--bg-primary)';
                  e.currentTarget.style.color = 'var(--text-primary)';
                }}
              >
                {/* Ícono de Google */}
                <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span className="hidden sm:inline">Iniciar Sesión con Google</span>
                <span className="sm:hidden">Ingresar</span>
              </button>
            ) : (
              <div className="flex items-center gap-3">
                {/* Tarjeta de usuario / Perfil */}
                <Link
                  to="/registro"
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

