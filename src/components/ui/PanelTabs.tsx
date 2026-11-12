import type { ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';

export interface PanelTab<T extends string> {
  id: T;
  label: string;
  icon?: string;
  count?: number;
  hidden?: boolean;
}

// Interruptor de secciones. La sección activa vive en la URL (?param=id): se puede compartir, el botón «atrás» funciona
// y al recargar la página se queda donde estabas.
export function usePanelTab<T extends string>(param: string, tabs: PanelTab<T>[], fallback: T): [T, (id: T) => void] {
  const [params, setParams] = useSearchParams();
  const visible = tabs.filter((t) => !t.hidden);
  const wanted = params.get(param) as T | null;
  const current = visible.find((t) => t.id === wanted)?.id ?? visible.find((t) => t.id === fallback)?.id ?? visible[0]?.id ?? fallback;

  const set = (id: T) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set(param, id);
      return next;
    }, { replace: false });

  return [current, set];
}

export default function PanelTabs<T extends string>({
  label,
  tabs,
  value,
  onChange,
  right,
}: {
  label: string;
  tabs: PanelTab<T>[];
  value: T;
  onChange: (id: T) => void;
  right?: ReactNode;
}) {
  const visible = tabs.filter((t) => !t.hidden);
  const move = (dir: 1 | -1) => {
    const i = visible.findIndex((t) => t.id === value);
    const next = visible[(i + dir + visible.length) % visible.length];
    if (next) onChange(next.id);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div
        role="tablist"
        aria-label={label}
        className="pn-tabs grow"
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') move(1);
          if (e.key === 'ArrowLeft') move(-1);
        }}
      >
        {visible.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={value === t.id}
            tabIndex={value === t.id ? 0 : -1}
            className="pn-tab"
            onClick={() => onChange(t.id)}
          >
            {t.icon && <span aria-hidden>{t.icon}</span>}
            {t.label}
            {t.count ? <span className="pn-tab-count" aria-label={`${t.count} pendientes`}>{t.count}</span> : null}
          </button>
        ))}
      </div>
      {right}
    </div>
  );
}
