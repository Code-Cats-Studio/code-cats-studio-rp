import { useEffect } from 'react';
import { setPageMeta } from '../utils/seo';

export default function EventoPage() {
  useEffect(() => {
    setPageMeta('Evento', 'Landing del próximo evento de la comunidad Code Cats Studio');
  }, []);

  return (
    <main className="min-h-[calc(100vh-8rem)] px-6 py-16" style={{ background: 'var(--bg-secondary)' }}>
      <section className="max-w-3xl mx-auto">
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
          Comunidad
        </p>
        <h1
          style={{
            fontFamily: 'var(--font-display)',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            margin: '0 0 1rem',
            color: 'var(--text-primary)',
          }}
        >
          Evento
        </h1>
        <p style={{ fontSize: '1.125rem', color: 'var(--text-secondary)', lineHeight: 1.7, maxWidth: '50ch' }}>
          Esta vista está lista para la landing del evento. Conecta aquí el contenido,
          la fecha y el llamado a registro cuando el evento se publique.
        </p>
      </section>
    </main>
  );
}
