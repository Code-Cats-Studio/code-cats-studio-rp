import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../context/ToastContext';

interface Row {
  enrollment_id: string;
  full_name: string | null;
  present: boolean;
}

// Asistencia manual: el docente marca quién estuvo en la clase (alternativa o complemento al código de 6 dígitos).
export default function AttendanceList({ sessionId }: { sessionId: string }) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    if (!sessionId) {
      setRows([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.rpc('get_session_attendance', { p_session: sessionId });
    setRows(error || !Array.isArray(data) ? [] : (data as Row[]));
    if (error) toast.error(error.message);
    setLoading(false);
  }, [sessionId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggle = (id: string) => setRows((r) => r.map((x) => (x.enrollment_id === id ? { ...x, present: !x.present } : x)));
  const setAll = (present: boolean) => setRows((r) => r.map((x) => ({ ...x, present })));

  const save = async () => {
    setBusy(true);
    const present = rows.filter((r) => r.present).map((r) => r.enrollment_id);
    const absent = rows.filter((r) => !r.present).map((r) => r.enrollment_id);
    const calls = [];
    if (present.length) calls.push(supabase.rpc('mark_attendance_bulk', { p_session: sessionId, p_enrollments: present, p_present: true }));
    if (absent.length) calls.push(supabase.rpc('mark_attendance_bulk', { p_session: sessionId, p_enrollments: absent, p_present: false }));
    const results = await Promise.all(calls);
    const failed = results.find((r) => r.error);
    toast.result(failed?.error?.message, `Asistencia guardada: ${present.length} presentes, ${absent.length} ausentes.`);
    setBusy(false);
  };

  if (!sessionId) return null;

  return (
    <div className="mt-8 pt-6 border-t border-gray-100">
      <h3 className="text-sm font-bold text-gray-900" style={{ fontFamily: 'var(--font-heading)' }}>Lista de asistencia</h3>
      <p className="text-xs text-gray-500 mt-1">
        Marca a quienes estuvieron en la clase y guarda. Los estudiantes que ingresaron el código aparecen ya marcados.
      </p>
      {loading ? (
        <p className="text-sm mt-3">Cargando…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm mt-3 text-gray-500">No hay estudiantes activos para esta clase (o aún no tienes grupo asignado).</p>
      ) : (
        <>
          <div className="flex flex-wrap gap-2 mt-3">
            <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 cursor-pointer" onClick={() => setAll(true)}>Todos presentes</button>
            <button type="button" className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-gray-300 cursor-pointer" onClick={() => setAll(false)}>Ninguno</button>
          </div>
          <ul className="mt-3 grid gap-1 sm:grid-cols-2">
            {rows.map((r) => (
              <li key={r.enrollment_id}>
                <label className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm cursor-pointer">
                  <input type="checkbox" checked={r.present} onChange={() => toggle(r.enrollment_id)} />
                  {r.full_name ?? 'Sin nombre'}
                </label>
              </li>
            ))}
          </ul>
          <button type="button" disabled={busy} onClick={() => void save()}
            className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 cursor-pointer">
            {busy ? 'Guardando…' : 'Guardar asistencia'}
          </button>
        </>
      )}
    </div>
  );
}
