import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { setPageMeta } from '../utils/seo';

export default function NotFoundPage() {
  useEffect(() => {
    setPageMeta('404', 'Página no encontrada');
  }, []);

  return (
    <main
      className="min-h-[calc(100vh-72px)] px-6 py-16 flex items-center justify-center"
      style={{ background: 'var(--bg-secondary)' }}
    >
      <section
        className="w-full max-w-2xl rounded-3xl p-8 md:p-12 text-center"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}
      >
        <p
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '0.75rem',
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            color: 'var(--text-muted)',
            margin: '0 0 0.75rem',
          }}
        >
          Error de navegación
        </p>

        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(3.5rem, 9vw, 6rem)',
            lineHeight: 1,
            margin: 0,
            color: 'var(--azul-gatuno)',
          }}
        >
          404
        </h1>

        <div className="flex justify-center my-6">
          <img
            src="/animacion/gato404.webp"
            alt="Gato animado confundido"
            className="w-48 h-48 md:w-64 md:h-64 object-contain"
            style={{ maxWidth: '100%' }}
          />
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-heading)',
            fontSize: '1.5rem',
            margin: '0.5rem 0 0.75rem',
            color: 'var(--text-primary)',
          }}
        >
          Página no encontrada
        </h2>

        <p
          style={{
            fontSize: '1rem',
            color: 'var(--text-secondary)',
            margin: '0 auto 1.75rem',
            maxWidth: '38ch',
            lineHeight: 1.7,
          }}
        >
          La ruta que abriste no existe o fue movida.
        </p>

        <Link
          to="/"
          className="inline-flex items-center justify-center rounded-xl px-5 py-3 no-underline"
          style={{
            fontFamily: 'var(--font-heading)',
            fontWeight: 700,
            color: 'var(--text-primary)',
            background: 'var(--verde-limon)',
            border: '1px solid transparent',
          }}
        >
          Volver al inicio
        </Link>
      </section>
    </main>
  );
}
