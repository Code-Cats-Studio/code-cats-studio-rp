import { useCallback, useEffect, useMemo, useState } from 'react';
import { fetchEditionSessions, type EditionSession } from '../../services/schedules';
import { rotateAttendanceCode } from '../../services/teacher';
import AttendanceList from '../schedule/AttendanceList';
import { useLiveRefresh } from '../../hooks/useLiveRefresh';
import { useToast } from '../../context/ToastContext';
import { MOMENT_LABEL, classMoment, fmtFull } from './helpers';
import { splitScheduleNote } from '../../utils/schedule';

// Asistencia de una clase: código de 6 dígitos para proyectar y lista manual. Se destaca la clase en curso o la más cercana.
export default function LiveClassPanel({ offeringId, ownGroupIds, preferredId }: { offeringId: string; ownGroupIds?: string[]; preferredId?: string }) {
  const [sessions, setSessions] = useState<EditionSession[] | null>(null);
  const [sessionId, setSessionId] = useState('');
  const [code, setCode] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const toast = useToast();

  const load = useCallback(async () => {
    const all = await fetchEditionSessions(offeringId);
    setSessions(ownGroupIds ? all.filter((s) => !s.group_id || ownGroupIds.includes(s.group_id)) : all);
  }, [offeringId, ownGroupIds]);

  useEffect(() => {
    void load();
  }, [load]);
  useLiveRefresh(['live_sessions'], () => void load());

  // la clase sugerida: en curso, si no la próxima, si no la última que pasó
  const suggested = useMemo(() => {
    if (!sessions?.length) return '';
    const asc = [...sessions].sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));
    const now = new Date();
    return (asc.find((s) => classMoment(s, now) === 'live') ?? asc.find((s) => new Date(s.ends_at) >= now) ?? asc[asc.length - 1]).id;
  }, [sessions]);

  useEffect(() => {
    setSessionId((cur) => (cur && sessions?.some((s) => s.id === cur) ? cur : preferredId && sessions?.some((s) => s.id === preferredId) ? preferredId : suggested));
  }, [sessions, suggested, preferredId]);

  useEffect(() => setCode(null), [sessionId]);

  const current = sessions?.find((s) => s.id === sessionId);
  const moment = classMoment(current ?? null);

  const generate = async () => {
    if (!sessionId) return;
    setBusy(true);
    const r = await rotateAttendanceCode(sessionId);
    if (r.error) toast.error(r.error);
    else if (r.code) {
      setCode(r.code);
      toast.success('Código generado. Los estudiantes lo escriben en «Mis cursos → Próximas clases».');
    }
    setBusy(false);
  };

  const copy = async () => {
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      /* el portapapeles puede estar bloqueado; el código sigue visible */
    }
  };

  if (sessions === null) return <div className="pn-skeleton" style={{ minHeight: '12rem' }} />;

  if (sessions.length === 0) {
    return (
      <div className="pn-empty">
        <strong>Aún no hay clases programadas</strong>
        <p>Programa una clase más abajo, en «Programar una clase». Cuando exista, aquí podrás generar el código de asistencia.</p>
      </div>
    );
  }

  return (
    <section className={`pn-card ${moment === 'live' || moment === 'soon' ? 'pn-live' : ''}`} aria-labelledby="lc-title">
      <div className="pn-between">
        <div>
          <h3 id="lc-title" className="pn-title">Asistencia</h3>
          <p className="pn-subtitle">Genera un código, proyéctalo en la clase y cada estudiante queda presente al escribirlo. A quien no pueda, lo marcas tú en la lista.</p>
        </div>
        {moment && <span className={`pn-badge ${moment === 'live' || moment === 'soon' ? 'pn-badge-blue' : ''}`}>{MOMENT_LABEL[moment]}</span>}
      </div>

      <div className="pn-row mt-4" style={{ alignItems: 'end' }}>
        <label className="grid gap-1 grow" style={{ minWidth: '14rem' }}>Clase
          <select value={sessionId} onChange={(e) => setSessionId(e.target.value)}>
            {sessions.map((s) => (
              <option key={s.id} value={s.id}>
                {splitScheduleNote(s.title).title} · {s.group_name ?? 'Toda la edición'} · {fmtFull(s.starts_at)}
              </option>
            ))}
          </select>
        </label>
        <button type="button" className="pn-btn pn-btn-primary" disabled={busy || !sessionId} onClick={() => void generate()}>
          {busy ? 'Generando…' : code ? 'Generar otro código' : 'Generar código'}
        </button>
        {current?.meet_url && <a className="pn-btn" href={current.meet_url} target="_blank" rel="noopener noreferrer">Abrir Meet</a>}
      </div>

      <div className="mt-5 text-center">
        {code ? (
          <div role="status" aria-label={`Código de asistencia ${code}`}>
            <p className="m-0 text-xs font-bold uppercase tracking-wider pn-muted">Código de asistencia</p>
            <p className="pn-live-code m-0 select-all">{code}</p>
            <button type="button" className="pn-btn pn-btn-sm" onClick={() => void copy()}>{copied ? '✓ Copiado' : 'Copiar código'}</button>
          </div>
        ) : (
          <p className="pn-hint m-0">Todavía no generaste un código para esta clase.</p>
        )}
      </div>

      <AttendanceList sessionId={sessionId} />
    </section>
  );
}
