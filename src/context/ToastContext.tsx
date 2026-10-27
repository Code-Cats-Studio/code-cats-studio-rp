import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';

type ToastKind = 'success' | 'error' | 'info';
interface ToastItem {
  id: number;
  kind: ToastKind;
  text: string;
}

interface ToastApi {
  success: (text: string) => void;
  error: (text: string) => void;
  info: (text: string) => void;
  /** Muestra el resultado de una acción: error si `error` trae texto, si no, éxito. */
  result: (error: string | null | undefined, successText: string) => boolean;
}

const ToastContext = createContext<ToastApi | null>(null);

const STYLES: Record<ToastKind, { bg: string; border: string; icon: string }> = {
  success: { bg: '#ECFDF3', border: '#86EFAC', icon: '✓' },
  error: { bg: '#FEF2F2', border: '#FCA5A5', icon: '!' },
  info: { bg: '#EEF0FF', border: '#A5A8FF', icon: 'i' },
};
const MAX_VISIBLE = 4;

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => setItems((list) => list.filter((t) => t.id !== id)), []);

  const push = useCallback((kind: ToastKind, text: string) => {
    const id = nextId.current++;
    setItems((list) => [...list.filter((t) => t.text !== text).slice(-(MAX_VISIBLE - 1)), { id, kind, text }]);
    window.setTimeout(() => dismiss(id), kind === 'error' ? 8000 : 5000);
  }, [dismiss]);

  const api = useMemo<ToastApi>(() => ({
    success: (text) => push('success', text),
    error: (text) => push('error', text),
    info: (text) => push('info', text),
    result: (error, successText) => {
      if (error) push('error', error);
      else push('success', successText);
      return !error;
    },
  }), [push]);

  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="fixed z-[100] top-3 inset-x-3 sm:inset-x-auto sm:right-4 sm:w-96 grid gap-2 pointer-events-none" aria-live="polite" aria-atomic="false">
        {items.map((t) => (
          <div key={t.id} role={t.kind === 'error' ? 'alert' : 'status'}
            className="pointer-events-auto flex items-start gap-3 rounded-xl px-4 py-3 text-sm shadow-lg"
            style={{ background: STYLES[t.kind].bg, border: `1px solid ${STYLES[t.kind].border}`, color: '#1f2937' }}>
            <span aria-hidden className="mt-0.5 grid place-items-center w-5 h-5 rounded-full text-xs font-bold shrink-0" style={{ border: `1px solid ${STYLES[t.kind].border}` }}>{STYLES[t.kind].icon}</span>
            <span className="grow min-w-0 break-words">{t.text}</span>
            <button type="button" onClick={() => dismiss(t.id)} aria-label="Cerrar aviso" className="cursor-pointer shrink-0 leading-none text-lg">×</button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastApi {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>');
  return ctx;
}
