import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { peekRedirect } from '../components/auth/PostLoginRedirect';
import { setPageMeta } from '../utils/seo';
import { retryAfterSeconds, translateAuthError } from '../utils/authErrors';
import { cleanName } from '../utils/validation';

type Mode = 'login' | 'signup' | 'reset';

const input: CSSProperties = {
  width: '100%',
  padding: '0.625rem 0.75rem',
  borderRadius: '0.75rem',
  border: '1px solid var(--border)',
  background: 'var(--bg-secondary)',
  color: 'var(--text-primary)',
  fontFamily: 'var(--font-body)',
};

const TITLES: Record<Mode, string> = {
  login: 'Bienvenido a Code Cats',
  signup: 'Crea tu cuenta',
  reset: 'Recupera tu contraseña',
};

export default function LoginPage() {
  const { user, isLoading, isProfileComplete, signInWithGoogle, signInWithEmail, signUpWithEmail, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  // Segundos de espera antes de poder pedir otro correo (recuperar contraseña / crear cuenta)
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(timer);
  }, [cooldown]);

  useEffect(() => {
    setPageMeta('Iniciar sesión', 'Entra o crea tu cuenta de Code Cats Studio con Google o con tu correo');
  }, []);

  if (!isLoading && user) {
    return <Navigate to={peekRedirect() ?? (isProfileComplete ? '/mis-cursos' : '/perfil')} replace />;
  }

  const switchMode = (next: Mode) => {
    setMode(next);
    setErrorMessage(null);
    setInfoMessage(null);
  };

  const handleGoogle = async () => {
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    if (error) setErrorMessage(translateAuthError(error.message));
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setInfoMessage(null);
    setBusy(true);
    try {
      if (mode === 'login') {
        const { error } = await signInWithEmail(email, password);
        if (error) {
          setErrorMessage(translateAuthError(error.message));
        }
      } else if (mode === 'signup') {
        if (fullName.trim().length < 3) {
          setErrorMessage('Escribe tu nombre completo.');
          return;
        }
        if (password.length < 8) {
          setErrorMessage('La contraseña debe tener al menos 8 caracteres.');
          return;
        }
        const { error, needsConfirmation } = await signUpWithEmail(email, password, fullName);
        if (error) {
          setErrorMessage(translateAuthError(error.message));
          setCooldown(retryAfterSeconds(error.message) ?? 0);
        } else if (needsConfirmation) {
          setInfoMessage('Te enviamos un correo para confirmar tu cuenta. Ábrelo y pulsa el enlace; luego inicia sesión.');
          setMode('login');
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          setErrorMessage(translateAuthError(error.message));
          setCooldown(retryAfterSeconds(error.message) ?? 60);
        } else {
          setInfoMessage('Si el correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también spam.');
          setCooldown(60);
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const link: CSSProperties = { color: 'var(--azul-gatuno)', cursor: 'pointer', background: 'none', border: 'none', padding: 0 };

  return (
    <main
      className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <section
        className="max-w-md w-full p-8 rounded-2xl text-center"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <img src="/images/mascot/cat-sitting.png" alt="" className="h-24 w-auto mx-auto mb-4" />
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2.25rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
          {TITLES[mode]}
        </h1>
        <p className="mt-2 mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Una sola cuenta para tomar cursos y participar en nuestros eventos.
        </p>

        {errorMessage && (
          <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{errorMessage}</p>
        )}
        {infoMessage && (
          <p role="status" className="mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>{infoMessage}</p>
        )}

        {mode !== 'reset' && (
          <>
            <button
              type="button"
              onClick={() => void handleGoogle()}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60"
              style={{ fontFamily: 'var(--font-heading)', background: 'var(--azul-gatuno)', color: '#fff' }}
            >
              Continuar con Google
            </button>
            <p className="my-4 text-xs" style={{ color: 'var(--text-muted)' }}>o con tu correo</p>
          </>
        )}

        <form onSubmit={(e) => void handleSubmit(e)} className="grid gap-3 text-left">
          {mode === 'signup' && (
            <label className="grid gap-1 text-sm">
              Nombre completo
              <input style={input} value={fullName} onChange={(e) => setFullName(cleanName(e.target.value))} autoComplete="name" minLength={3} maxLength={100} required />
            </label>
          )}
          <label className="grid gap-1 text-sm">
            Correo
            <input style={input} type="email" maxLength={254} value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </label>
          {mode !== 'reset' && (
            <label className="grid gap-1 text-sm">
              Contraseña
              <input style={input} type="password" value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} minLength={mode === 'signup' ? 8 : undefined} required />
            </label>
          )}
          <button
            type="submit"
            disabled={busy || (mode !== 'login' && cooldown > 0)}
            className="w-full px-4 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-heading)', border: '1.5px solid var(--azul-gatuno)', color: 'var(--azul-gatuno)', background: 'transparent' }}
          >
            {busy
              ? 'Un momento…'
              : mode !== 'login' && cooldown > 0
                ? `Espera ${cooldown} s para reenviar`
                : mode === 'login' ? 'Entrar' : mode === 'signup' ? 'Crear cuenta' : 'Enviar enlace'}
          </button>
        </form>

        <div className="mt-4 text-sm grid gap-1" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'login' && (
            <>
              <span>¿No tienes cuenta? <button type="button" style={link} onClick={() => switchMode('signup')}>Créala</button></span>
              <button type="button" style={link} onClick={() => switchMode('reset')}>Olvidé mi contraseña</button>
            </>
          )}
          {mode !== 'login' && (
            <button type="button" style={link} onClick={() => switchMode('login')}>Volver a iniciar sesión</button>
          )}
        </div>

        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Todas las cuentas empiezan como estudiante. Si quieres ser docente, podrás enviar una
          solicitud desde tu perfil; un administrador la revisa.
        </p>
      </section>
    </main>
  );
}
