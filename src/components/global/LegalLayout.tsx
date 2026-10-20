import { useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { setPageMeta } from '../../utils/seo';

interface Props {
  title: string;
  description: string;
  updated: string;
  current: 'terminos' | 'privacidad';
  children: ReactNode;
}

// Contenedor común de las páginas legales (/terminos y /privacidad): públicas, sin login.
export default function LegalLayout({ title, description, updated, current, children }: Props) {
  useEffect(() => {
    setPageMeta(title, description);
    window.scrollTo(0, 0);
  }, [title, description]);

  return (
    <main className="px-6 py-12" style={{ background: 'var(--bg-secondary)' }}>
      <article
        className="max-w-3xl mx-auto p-6 md:p-10 rounded-2xl legal-doc"
        style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)', color: 'var(--text-secondary)', fontFamily: 'var(--font-body)', lineHeight: 1.7 }}
      >
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
          <Link to="/" style={{ color: 'var(--azul-gatuno)' }}>Code Cats Studio</Link> · Última actualización: {updated}
        </p>
        <h1 className="mt-2 mb-6" style={{ fontFamily: 'var(--font-display)', fontSize: '2.5rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
          {title}
        </h1>
        <div className="grid gap-4 text-[0.95rem]">{children}</div>
        <nav aria-label="Otros documentos" className="mt-10 pt-4 text-sm flex gap-4" style={{ borderTop: '1px solid var(--border)' }}>
          {current !== 'terminos' && <Link to="/terminos" style={{ color: 'var(--azul-gatuno)' }}>Términos y condiciones</Link>}
          {current !== 'privacidad' && <Link to="/privacidad" style={{ color: 'var(--azul-gatuno)' }}>Política de privacidad</Link>}
        </nav>
      </article>
    </main>
  );
}

export function LegalH2({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-4" style={{ fontFamily: 'var(--font-heading)', fontWeight: 700, fontSize: '1.2rem', color: 'var(--text-primary)' }}>
      {children}
    </h2>
  );
}

export function LegalList({ items }: { items: ReactNode[] }) {
  return (
    <ul className="list-disc pl-6 grid gap-1.5">
      {items.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
