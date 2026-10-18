import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { setPageMeta } from '../utils/seo';

// Destino del enlace "Olvidé mi contraseña": Supabase abre una sesión temporal y aquí se fija la nueva clave.
export default function RestablecerPage() {
  const { user, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    setPageMeta('Nueva contraseña', 'Crea una contraseña nueva para tu cuenta de Code Cats Studio');
  }, []);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < 8) {
      setMessage({ type: 'error', text: 'La contraseña debe tener al menos 8 caracteres.' });
      return;
    }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    setMessage(error ? { type: 'error', text: error.message } : { type: 'ok', text: 'Listo, tu contraseña se actualizó.' });
  };

  return (
    <main className="min-h-[calc(100vh-8rem)] px-6 py-16 flex items-center justify-center" style={{ background: 'var(--bg-secondary)' }}>
      <section className="max-w-md w-full p-8 rounded-2xl" style={{ background: 'var(--bg-primary)', border: '1px solid var(--border)' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '2rem', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
          Nueva contraseña
        </h1>
        {isLoading ? null : !user ? (
          <p className="mt-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
            El enlace caducó o ya se usó. <Link to="/login" style={{ color: 'var(--azul-gatuno)' }}>Pide uno nuevo</Link>.
          </p>
        ) : (
          <form onSubmit={(e) => void submit(e)} className="mt-4 grid gap-3">
            <label className="grid gap-1 text-sm">
              Contraseña nueva (mínimo 8 caracteres)
              <input type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                style={{ padding: '0.625rem 0.75rem', borderRadius: '0.75rem', border: '1px solid var(--border)', background: 'var(--bg-secondary)', color: 'var(--text-primary)' }} />
            </label>
            <button type="submit" disabled={busy} className="px-4 py-3 rounded-xl font-semibold cursor-pointer disabled:opacity-60"
              style={{ fontFamily: 'var(--font-heading)', background: 'var(--azul-gatuno)', color: '#fff' }}>
              {busy ? 'Guardando…' : 'Guardar contraseña'}
            </button>
            {message && (
              <p role={message.type === 'error' ? 'alert' : 'status'} className="text-sm"
                style={{ color: message.type === 'error' ? 'var(--error)' : 'var(--text-primary)' }}>
                {message.text} {message.type === 'ok' && <Link to="/mis-cursos" style={{ color: 'var(--azul-gatuno)' }}>Ir a mis cursos</Link>}
              </p>
            )}
          </form>
        )}
      </section>
    </main>
  );
}
