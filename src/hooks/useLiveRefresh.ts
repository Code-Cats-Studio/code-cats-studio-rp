import { useEffect, useRef } from 'react';
import { supabase } from '../lib/supabase';

// Vuelve a cargar los datos cuando cambia alguna de las tablas (Supabase Realtime, respeta RLS)
// y cuando la persona regresa a la pestaña. Así la pantalla se mantiene al día sin recargar la página.
// `filter` (opcional) acota los cambios, p. ej. `offering_id=eq.<id>`; solo se aplica a las tablas que tengan esa columna.
export function useLiveRefresh(tables: string[], reload: () => void, enabled = true) {
  const reloadRef = useRef(reload);
  reloadRef.current = reload;
  const key = tables.join(',');

  useEffect(() => {
    if (!enabled) return;
    let timer: number | undefined;
    // varios cambios seguidos (p. ej. al asignar muchos estudiantes) se agrupan en una sola recarga
    const fire = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(() => reloadRef.current(), 400);
    };

    let channel = supabase.channel(`live-${key}-${Math.random().toString(36).slice(2, 8)}`);
    for (const table of key.split(',')) {
      channel = channel.on('postgres_changes', { event: '*', schema: 'public', table }, fire);
    }
    channel.subscribe();

    const onVisible = () => {
      if (document.visibilityState === 'visible') fire();
    };
    document.addEventListener('visibilitychange', onVisible);
    window.addEventListener('online', fire);

    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('visibilitychange', onVisible);
      window.removeEventListener('online', fire);
      void supabase.removeChannel(channel);
    };
  }, [key, enabled]);
}
