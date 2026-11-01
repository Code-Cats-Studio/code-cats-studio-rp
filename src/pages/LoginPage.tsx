import { useEffect, useState, type CSSProperties, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { peekRedirect } from '../components/auth/PostLoginRedirect';
import { setPageMeta } from '../utils/seo';
import { retryAfterSeconds, translateAuthError } from '../utils/authErrors';
import { cleanName } from '../utils/validation';
import { useToast } from '../context/ToastContext';

type Mode = 'login' | 'signup' | 'reset' | 'verify';

// Segundos que se espera entre un envío de correo de confirmación y el siguiente. El correo puede tardar
// hasta 2 minutos en llegar; esperar evita que se pidan muchos seguidos y se agote el límite de envíos.
const RESEND_SECONDS = 120;
const SENT_KEY = 'verify-email-sent-at';

// Recuerda cuándo se envió el último correo a esa dirección, para que la espera siga aunque se recargue la página
function markSent(email: string) {
  try {
    const sent = JSON.parse(localStorage.getItem(SENT_KEY) || '{}');
    sent[email.trim().toLowerCase()] = Date.now();
    localStorage.setItem(SENT_KEY, JSON.stringify(sent));
  } catch {
    // sin almacenamiento local: la espera solo vale mientras la página siga abierta
  }
}

function secondsLeft(email: string): number {
  try {
    const at = JSON.parse(localStorage.getItem(SENT_KEY) || '{}')[email.trim().toLowerCase()];
    return at ? Math.max(0, Math.ceil(RESEND_SECONDS - (Date.now() - at) / 1000)) : 0;
  } catch {
    return 0;
  }
}

const clock = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

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
  verify: 'Verifica tu correo',
};

export default function LoginPage() {
  const { user, isLoading, isProfileComplete, signInWithGoogle, signInWithEmail, signUpWithEmail, resendConfirmation, resetPassword } = useAuth();
  const [mode, setMode] = useState<Mode>(() => (new URLSearchParams(window.location.search).get('modo') === 'registro' ? 'signup' : 'login'));
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const toast = useToast();
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
    if (error) { setErrorMessage(translateAuthError(error.message)); toast.error(translateAuthError(error.message)); }
  };

  // Reenvía el correo de confirmación (pantalla "Verifica tu correo")
  const handleResend = async () => {
    setErrorMessage(null);
    setInfoMessage(null);
    setBusy(true);
    try {
      const { error } = await resendConfirmation(email);
      if (error) {
        const text = translateAuthError(error.message);
        setErrorMessage(text);
        toast.error(text);
        setCooldown(retryAfterSeconds(error.message) ?? RESEND_SECONDS);
      } else {
        const text = `Reenviamos el correo a ${email.trim()}. Puede tardar hasta 2 minutos; revisa también spam y promociones.`;
        setInfoMessage(text);
        toast.info(text);
        markSent(email);
        setCooldown(RESEND_SECONDS);
      }
    } finally {
      setBusy(false);
    }
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
          // Cuenta creada pero con el correo sin confirmar: se lleva a la pantalla para verificarlo y reenviarlo
          if (/not confirmed/i.test(error.message)) {
            setMode('verify');
            setCooldown(secondsLeft(email));
          } else {
            { setErrorMessage(translateAuthError(error.message)); toast.error(translateAuthError(error.message)); }
          }
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
          { setErrorMessage(translateAuthError(error.message)); toast.error(translateAuthError(error.message)); }
          setCooldown(retryAfterSeconds(error.message) ?? 0);
        } else if (needsConfirmation) {
          // El correo ya salió: se muestra la pantalla de verificación y el reenvío queda en espera
          markSent(email);
          setMode('verify');
          setCooldown(RESEND_SECONDS);
        }
      } else {
        const { error } = await resetPassword(email);
        if (error) {
          { setErrorMessage(translateAuthError(error.message)); toast.error(translateAuthError(error.message)); }
          setCooldown(retryAfterSeconds(error.message) ?? 60);
        } else {
          { setInfoMessage('Si el correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también spam.'); toast.info('Si el correo tiene cuenta, te enviamos un enlace para crear una contraseña nueva. Revisa también spam.'); }
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
          {mode === 'verify'
            ? <>Te enviamos un enlace a <strong style={{ color: 'var(--text-primary)', overflowWrap: 'anywhere' }}>{email.trim()}</strong> para activar tu cuenta.</>
            : 'Una sola cuenta para tomar cursos y participar en nuestros eventos.'}
        </p>

        {peekRedirect()?.startsWith('/code-cats-days') && (
          <p className="mb-4 text-sm p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)' }}>
            🐾 Al terminar volverás a tu inscripción de Code Cats Days.
          </p>
        )}
        {errorMessage && (
          <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--error)' }}>{errorMessage}</p>
        )}
        {infoMessage && (
          <p role="status" className="mb-4 text-sm" style={{ color: 'var(--text-primary)' }}>{infoMessage}</p>
        )}

        {mode === 'verify' && (
          <div className="grid gap-4 text-left" data-testid="verify-email">
            <ol className="grid gap-2 text-sm pl-5 list-decimal" style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              <li>Abre tu correo (revisa también <strong>spam</strong> y <strong>promociones</strong>).</li>
              <li>Pulsa el enlace para confirmar tu cuenta.</li>
              <li>{peekRedirect() ? 'El enlace te lleva directo a tu inscripción. Si esta pestaña sigue abierta, también avanza sola.' : 'Vuelve aquí e inicia sesión.'} Si el enlace abrió otro navegador, no pasa nada: entra con tu correo y contraseña.</li>
            </ol>
            <p className="text-sm p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', fontFamily: 'var(--font-body)' }}>
              El correo puede tardar <strong>hasta 2 minutos</strong> en llegar. Espera antes de pedir otro: si pides muchos seguidos, los envíos se bloquean por un rato.
            </p>
            <button
              type="button"
              onClick={() => { setErrorMessage(null); setInfoMessage(null); setPassword(''); setMode('login'); }}
              className="w-full px-4 py-3 rounded-xl font-semibold cursor-pointer"
              style={{ fontFamily: 'var(--font-heading)', background: 'var(--azul-gatuno)', color: '#fff', border: 'none' }}
            >
              Ya lo confirmé: iniciar sesión
            </button>
            <button
              type="button"
              onClick={() => void handleResend()}
              disabled={busy || cooldown > 0}
              className="w-full px-4 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ fontFamily: 'var(--font-heading)', border: '1.5px solid var(--azul-gatuno)', color: 'var(--azul-gatuno)', background: 'transparent' }}
            >
              {busy ? 'Un momento…' : cooldown > 0 ? `Reenviar correo en ${clock(cooldown)}` : 'Reenviar correo'}
            </button>
            <button
              type="button"
              style={{ ...link, textAlign: 'center', fontSize: '0.875rem' }}
              onClick={() => { setErrorMessage(null); setInfoMessage(null); setEmail(''); setPassword(''); setCooldown(0); setMode('signup'); }}
            >
              Me equivoqué de correo
            </button>
          </div>
        )}

        {mode !== 'reset' && mode !== 'verify' && (
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

        {mode !== 'verify' && (
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
        )}

        <div className="mt-4 text-sm grid gap-1" style={{ color: 'var(--text-secondary)' }}>
          {mode === 'login' && (
            <>
              <span>¿No tienes cuenta? <button type="button" style={link} onClick={() => switchMode('signup')}>Créala</button></span>
              <button type="button" style={link} onClick={() => switchMode('reset')}>Olvidé mi contraseña</button>
            </>
          )}
          {mode !== 'login' && mode !== 'verify' && (
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
