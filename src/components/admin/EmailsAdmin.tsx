import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';
import { onlyDigits } from '../../utils/validation';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const SETTING_KEY = 'daily_email_limit';
const FALLBACK_LIMIT = 90; // mismo valor que usa process-emails si el ajuste no existe
const MAX_LIMIT = 100000;

interface EmailStats {
  limit: number;
  sentToday: number;
  pending: number;
  failed: number;
}

async function countEmails(status: 'sent' | 'pending' | 'failed', since?: string): Promise<number> {
  let query = supabase.from('email_outbox').select('id', { count: 'exact', head: true }).eq('status', status);
  if (since) query = query.gte('sent_at', since);
  const { count } = await query;
  return count ?? 0;
}

// Tope diario de correos: debe coincidir con el plan de Resend (gratis = 100 al día, Pro = sin tope diario).
export default function EmailsAdmin() {
  const toast = useToast();
  const [stats, setStats] = useState<EmailStats | null>(null);
  const [value, setValue] = useState('');
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const [setting, sentToday, pending, failed] = await Promise.all([
      supabase.from('platform_settings').select('value').eq('key', SETTING_KEY).maybeSingle(),
      countEmails('sent', since),
      countEmails('pending'),
      countEmails('failed'),
    ]);
    const limit = Number(setting.data?.value ?? FALLBACK_LIMIT);
    setStats({ limit, sentToday, pending, failed });
    setValue(String(limit));
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const limit = Number(value);
    if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
      toast.error(`Escribe un número entre 1 y ${MAX_LIMIT}.`);
      return;
    }
    setBusy(true);
    const { error } = await supabase
      .from('platform_settings')
      .upsert({ key: SETTING_KEY, value: limit, description: 'Tope diario de correos (Resend gratis permite 100 al día; Pro no tiene tope diario)' });
    setBusy(false);
    if (toast.result(error?.message, `Tope diario guardado: ${limit} correos.`)) await load();
  };

  const left = stats ? Math.max(0, stats.limit - stats.sentToday) : null;

  return (
    <section className="mt-10 p-5 rounded-2xl" style={card} aria-labelledby="emails-admin-title">
      <h2 id="emails-admin-title" className="text-xl font-bold" style={{ fontFamily: 'var(--font-heading)' }}>Correos</h2>
      <p className="mt-1 text-sm" style={{ color: 'var(--text-secondary)' }}>
        La plataforma envía como máximo este número de correos cada 24 horas; el resto espera en cola y sale al día siguiente.
        Con Resend gratis déjalo en 90; con el plan Pro súbelo (por ejemplo 1500 al día, unos 45.000 al mes).
      </p>

      {stats && (
        <dl className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
          <div><dt className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Tope diario</dt><dd className="text-lg font-bold">{stats.limit}</dd></div>
          <div><dt className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Enviados en 24 h</dt><dd className="text-lg font-bold">{stats.sentToday} <span className="text-xs font-normal">({left} disponibles)</span></dd></div>
          <div><dt className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>En cola</dt><dd className="text-lg font-bold">{stats.pending}</dd></div>
          <div><dt className="text-xs font-bold uppercase" style={{ color: 'var(--text-muted)' }}>Fallidos</dt><dd className="text-lg font-bold">{stats.failed}</dd></div>
        </dl>
      )}

      <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={(e) => void save(e)}>
        <label className="grid gap-1 text-sm">
          Nuevo tope diario
          <input
            className="px-2 py-1.5 rounded border border-gray-300 text-sm w-40"
            inputMode="numeric"
            maxLength={6}
            value={value}
            onChange={(e) => setValue(onlyDigits(e.target.value))}
          />
        </label>
        <button
          type="submit"
          disabled={busy || !stats}
          className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60"
          style={{ background: 'var(--azul-gatuno)', color: '#fff', border: 'none' }}
        >
          {busy ? 'Guardando…' : 'Guardar tope'}
        </button>
      </form>
    </section>
  );
}
