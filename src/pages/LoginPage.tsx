import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { setPageMeta } from '../utils/seo';

export default function LoginPage() {
  const { user, isLoading, isProfileComplete, signInWithGoogle } = useAuth();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta('Iniciar sesión', 'Entra a Code Cats Studio con tu cuenta de Google');
  }, []);

  if (!isLoading && user) {
    return <Navigate to={isProfileComplete ? '/mis-cursos' : '/perfil'} replace />;
  }

  const handleLogin = async () => {
    setErrorMessage(null);
    const { error } = await signInWithGoogle();
    if (error) setErrorMessage(error.message);
  };

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
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: '2.25rem',
            letterSpacing: '0.05em',
            color: 'var(--text-primary)',
          }}
        >
          Bienvenido a Code Cats
        </h1>
        <p className="mt-2 mb-6" style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-body)' }}>
          Una sola cuenta para tomar cursos y participar en nuestros eventos.
        </p>

        {errorMessage && (
          <p role="alert" className="mb-4 text-sm" style={{ color: 'var(--error)' }}>
            {errorMessage}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleLogin()}
          disabled={isLoading}
          className="w-full inline-flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60"
          style={{
            fontFamily: 'var(--font-heading)',
            background: 'var(--azul-gatuno)',
            color: '#fff',
          }}
        >
          Continuar con Google
        </button>

        <p className="mt-6 text-xs" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
          Todas las cuentas empiezan como estudiante. Si quieres ser docente, podrás enviar una
          solicitud desde tu perfil; un administrador la revisa.
        </p>
      </section>
    </main>
  );
}
