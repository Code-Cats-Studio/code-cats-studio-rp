import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { fetchOfferingSettings, leadSetGroupCapacity, leadUpdateOffering, type MyEdition } from '../../services/teacherPanel';
import { boLocalToIso } from '../../services/schedules';
import { clampInt, onlyDigits } from '../../utils/validation';
import { useToast } from '../../context/ToastContext';

const toBoLocal = (iso: string | null) => (iso ? new Date(iso).toLocaleString('sv-SE', { timeZone: 'America/La_Paz' }).replace(' ', 'T').slice(0, 16) : '');

// Configuración del curso para el docente principal: cupos por grupo, cupo de la edición y fechas de inscripción.
export default function EditionSettings({ edition, onSaved }: { edition: MyEdition; onSaved: () => void }) {
  const toast = useToast();
  const [capacity, setCapacity] = useState(String(edition.capacity));
  const [opens, setOpens] = useState('');
  const [closes, setCloses] = useState('');
  const [groupCaps, setGroupCaps] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  const loadDates = useCallback(async () => {
    const s = await fetchOfferingSettings(edition.id);
    setOpens(toBoLocal(s?.enrollment_opens_at ?? null));
    setCloses(toBoLocal(s?.enrollment_closes_at ?? null));
  }, [edition.id]);

  useEffect(() => {
    void loadDates();
  }, [loadDates]);

  useEffect(() => setCapacity(String(edition.capacity)), [edition.capacity]);
  useEffect(
    () => setGroupCaps(Object.fromEntries(edition.groups.map((g) => [g.id, g.capacity ? String(g.capacity) : '']))),
    [edition.groups],
  );

  const saveEdition = async () => {
    const cap = clampInt(capacity, 1, 5000, edition.capacity);
    if (opens && closes && boLocalToIso(closes) <= boLocalToIso(opens)) return toast.error('El cierre debe ser posterior a la apertura.');
    setBusy(true);
    const error = await leadUpdateOffering(edition.id, {
      capacity: cap,
      opensAt: opens ? boLocalToIso(opens) : null,
      closesAt: closes ? boLocalToIso(closes) : null,
    });
    setBusy(false);
    if (toast.result(error, 'Configuración de la edición guardada.')) onSaved();
  };

  const saveGroup = async (id: string) => {
    const raw = groupCaps[id] ?? '';
    setBusy(true);
    const error = await leadSetGroupCapacity(id, raw ? clampInt(raw, 1, 5000) : null);
    setBusy(false);
    if (toast.result(error, 'Cupo del grupo guardado.')) onSaved();
  };

  return (
    <div className="pn-stack-lg">
      <section className="pn-card pn-between" aria-labelledby="st-content">
        <div>
          <h3 id="st-content" className="pn-title">Información y contenido del curso</h3>
          <p className="pn-subtitle">Título, descripción, objetivos, módulos y lecciones. El enlace (slug) y el nivel solo los cambia un administrador.</p>
        </div>
        <Link to={`/docente/cursos/${edition.course_id}`} className="pn-btn pn-btn-primary">Editar curso</Link>
      </section>

      <section className="pn-card pn-stack" aria-labelledby="st-edition">
        <div>
          <h3 id="st-edition" className="pn-title">Edición «{edition.label}»</h3>
          <p className="pn-subtitle">El cupo no puede ser menor que los estudiantes ya inscritos.</p>
        </div>
        <div className="pn-row" style={{ alignItems: 'end' }}>
          <label className="grid gap-1">Cupo total
            <input type="text" inputMode="numeric" maxLength={4} style={{ width: '7rem' }} value={capacity} onChange={(e) => setCapacity(onlyDigits(e.target.value, 4))} />
          </label>
          <label className="grid gap-1">Abren inscripciones (hora Bolivia)
            <input type="datetime-local" value={opens} onChange={(e) => setOpens(e.target.value)} />
          </label>
          <label className="grid gap-1">Cierran inscripciones
            <input type="datetime-local" value={closes} onChange={(e) => setCloses(e.target.value)} />
          </label>
          <button type="button" className="pn-btn pn-btn-primary" disabled={busy} onClick={() => void saveEdition()}>Guardar</button>
        </div>
        <p className="pn-hint m-0">Deja una fecha vacía si no quieres límite. El estado de la edición (abierta, en curso…) lo cambia un administrador.</p>
      </section>

      <section className="pn-card pn-stack" aria-labelledby="st-groups">
        <div>
          <h3 id="st-groups" className="pn-title">Cupo por grupo</h3>
          <p className="pn-subtitle">Cuántos estudiantes entran en cada grupo. Vacío = sin límite.</p>
        </div>
        {edition.groups.length === 0 ? (
          <p className="pn-hint m-0">Esta edición todavía no tiene grupos. Un administrador los crea en Administración → Ediciones.</p>
        ) : (
          <ul className="pn-stack list-none p-0 m-0">
            {edition.groups.map((g) => (
              <li key={g.id} className="pn-between" style={{ padding: '0.6rem 0', borderTop: '1px solid var(--border)' }}>
                <span>
                  <strong>{g.name}</strong>
                  <span className="pn-muted"> · {g.teacher_name ?? 'sin docente'} · {g.students} inscritos</span>
                </span>
                <span className="pn-row">
                  <label className="sr-only" htmlFor={`cap-${g.id}`}>Cupo de {g.name}</label>
                  <input id={`cap-${g.id}`} type="text" inputMode="numeric" maxLength={4} style={{ width: '6rem' }} placeholder="Sin límite"
                    value={groupCaps[g.id] ?? ''} onChange={(e) => setGroupCaps((c) => ({ ...c, [g.id]: onlyDigits(e.target.value, 4) }))} />
                  <button type="button" className="pn-btn pn-btn-sm" disabled={busy} onClick={() => void saveGroup(g.id)}>Guardar</button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
