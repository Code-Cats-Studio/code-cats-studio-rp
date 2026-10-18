import { useState } from 'react';
import EditionRoster from './EditionRoster';
import EditionSessions from './EditionSessions';
import EditionTeam from './EditionTeam';
import EditionWork from './EditionWork';

type Tab = 'team' | 'classes' | 'students' | 'work';

// Todo lo que se gestiona de una edición: docentes y grupos, clases y asistencia, estudiantes, tareas y material.
export default function EditionHub({ offeringId, courseTitle, canManageTeam }: { offeringId: string; courseTitle: string; canManageTeam: boolean }) {
  const tabs: { id: Tab; label: string }[] = [
    ...(canManageTeam ? [{ id: 'team' as Tab, label: 'Docentes y horarios' }] : []),
    { id: 'classes', label: 'Clases y asistencia' },
    { id: 'students', label: 'Estudiantes' },
    { id: 'work', label: 'Tareas y material' },
  ];
  const [tab, setTab] = useState<Tab>(tabs[0].id);

  return (
    <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      <div role="tablist" aria-label="Gestión de la edición" className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: tab === t.id ? 'var(--azul-gatuno)' : 'var(--bg-primary)', color: tab === t.id ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {tab === 'team' && canManageTeam && <EditionTeam offeringId={offeringId} />}
      {tab === 'classes' && <EditionSessions offeringId={offeringId} courseTitle={courseTitle} />}
      {tab === 'students' && <EditionRoster offeringId={offeringId} />}
      {tab === 'work' && <EditionWork offeringId={offeringId} />}
    </div>
  );
}
