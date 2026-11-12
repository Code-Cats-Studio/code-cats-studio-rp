import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

const linkStyle = { color: 'rgba(255,255,255,0.78)' } as const;

export default function Footer() {
  const { pathname } = useLocation();
  const { user, roles } = useAuth();
  const year = new Date().getFullYear();

  return (
    <footer style={{ background: '#0F1037', color: '#fff' }}>
      <div className="max-w-6xl mx-auto px-6 py-10 grid gap-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Link to="/" className="inline-flex items-center gap-3 no-underline" style={{ color: '#fff' }}>
            <span className="grid place-items-center w-11 h-11 rounded-full" style={{ background: 'var(--verde-limon)' }}>
              <img src="/images/mascot/cat-peek.png" alt="" className="h-7 w-auto" />
            </span>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: '1.7rem', letterSpacing: '0.05em' }}>Code Cats Studio</span>
          </Link>
          <p className="mt-3 text-sm max-w-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>
            Aprende desarrollo web con cursos prácticos, clases en vivo y una comunidad que te acompaña.
          </p>
        </div>

        <nav aria-label="Explorar">
          <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--verde-limon)', fontFamily: 'var(--font-heading)' }}>Explorar</p>
          <ul className="list-none p-0 m-0 grid gap-2 text-sm">
            <li><a href="/#cursos" className="no-underline hover:underline" style={linkStyle}>Cursos</a></li>
            <li><a href="/#proyectos" className="no-underline hover:underline" style={linkStyle}>Proyectos</a></li>
            <li><a href="/#encuentranos" className="no-underline hover:underline" style={linkStyle}>Contáctanos</a></li>
            {user && <li><Link to="/mis-cursos" className="no-underline hover:underline" style={linkStyle}>Mis cursos</Link></li>}
            {(roles.includes('teacher') || roles.includes('admin')) && <li><Link to="/docente" className="no-underline hover:underline" style={linkStyle}>Panel docente</Link></li>}
          </ul>
        </nav>

        <nav aria-label="Legal">
          <p className="m-0 mb-3 text-xs font-bold uppercase tracking-wider" style={{ color: 'var(--verde-limon)', fontFamily: 'var(--font-heading)' }}>Legal</p>
          <ul className="list-none p-0 m-0 grid gap-2 text-sm">
            {pathname !== '/terminos' && <li><Link to="/terminos" className="no-underline hover:underline" style={linkStyle}>Términos y condiciones</Link></li>}
            {pathname !== '/privacidad' && <li><Link to="/privacidad" className="no-underline hover:underline" style={linkStyle}>Política de privacidad</Link></li>}
          </ul>
        </nav>
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.12)' }}>
        <div className="max-w-6xl mx-auto px-6 py-4 flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: 'rgba(255,255,255,0.6)' }}>
          <span>© {year} Code Cats Studio</span>
          <span>Hecho con 🐱 para la comunidad</span>
        </div>
      </div>
    </footer>
  );
}
