import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { verifyCertificate, type CertificateVerification } from '../services/account';
import { setPageMeta } from '../utils/seo';

type State =
  | { kind: 'loading' }
  | { kind: 'error'; message: string }
  | { kind: 'notfound' }
  | { kind: 'found'; data: CertificateVerification };

export default function VerificarPage() {
  const { code } = useParams();
  const [state, setState] = useState<State>({ kind: 'loading' });

  useEffect(() => {
    setPageMeta('Verificar certificado', 'Comprueba la autenticidad de un certificado de Code Cats Studio');
  }, []);

  useEffect(() => {
    if (!code) return;
    let active = true;
    setState({ kind: 'loading' });
    void verifyCertificate(code).then(({ result, error }) => {
      if (!active) return;
      if (error) setState({ kind: 'error', message: error });
      else if (!result) setState({ kind: 'notfound' });
      else setState({ kind: 'found', data: result });
    });
    return () => {
      active = false;
    };
  }, [code]);

  const issued =
    state.kind === 'found'
      ? new Date(state.data.issued_at).toLocaleDateString('es-BO', {
          timeZone: 'America/La_Paz',
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      : '';

  return (
    <main
      className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <section
        className="max-w-lg w-full p-8 rounded-2xl text-center"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
        aria-live="polite"
      >
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em' }}>
          Verificación de certificado
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
          {code}
        </p>

        {state.kind === 'loading' && <p className="mt-6">Verificando…</p>}

        {state.kind === 'error' && (
          <p role="alert" className="mt-6" style={{ color: 'var(--error)' }}>
            No se pudo verificar: {state.message}
          </p>
        )}

        {state.kind === 'notfound' && (
          <p className="mt-6" style={{ color: 'var(--error)' }}>
            Este código no corresponde a ningún certificado emitido por Code Cats Studio.
          </p>
        )}

        {state.kind === 'found' && (
          <div className="mt-6">
            <p
              className="inline-block px-3 py-1 rounded-full text-sm font-semibold"
              style={{
                background: state.data.valid ? 'var(--bg-lime-soft)' : '#FEF2F2',
                color: state.data.valid ? 'var(--text-primary)' : '#991B1B',
              }}
            >
              {state.data.valid ? 'Certificado válido' : 'Certificado revocado'}
            </p>
            <p className="mt-4" style={{ fontFamily: 'var(--font-heading)', fontSize: '1.25rem' }}>
              {state.data.user_name}
            </p>
            <p style={{ color: 'var(--text-secondary)' }}>completó «{state.data.course_title}»</p>
            <p className="text-sm mt-1" style={{ color: 'var(--text-muted)' }}>
              Emitido el {issued}
            </p>
          </div>
        )}

        <Link to="/" className="inline-block mt-8 text-sm underline" style={{ color: 'var(--azul-gatuno)' }}>
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
