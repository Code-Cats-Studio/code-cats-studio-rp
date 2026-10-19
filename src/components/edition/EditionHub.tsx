import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isOfferingTeam } from '../../services/enrollmentRequests';
import EditionRoster from './EditionRoster';
import EditionSessions from './EditionSessions';
import EditionTeam from './EditionTeam';
import EditionWork from './EditionWork';

type Tab = 'team' | 'classes' | 'students' | 'work';

// Todo lo que se gestiona de una edición: docentes y grupos, clases y asistencia, estudiantes, tareas y material.
// Un admin arma el equipo, pero solo opera la edición (clases, asistencia, estudiantes, tareas) si es parte de su equipo docente.
export default function EditionHub({ offeringId, courseTitle, canManageTeam }: { offeringId: string; courseTitle: string; canManageTeam: boolean }) {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [member, setMember] = useState<boolean | null>(isAdmin ? null : true);
  const [teamVersion, setTeamVersion] = useState(0);

  useEffect(() => {
    if (!isAdmin || !user) return;
    void isOfferingTeam(offeringId, user.id).then(setMember);
  }, [isAdmin, user, offeringId, teamVersion]);

  const canOperate = member === true;
  const tabs: { id: Tab; label: string }[] = [
    ...(canManageTeam ? [{ id: 'team' as Tab, label: 'Docentes y horarios' }] : []),
    ...(canOperate
      ? [
          { id: 'classes' as Tab, label: 'Clases y asistencia' },
          { id: 'students' as Tab, label: 'Estudiantes' },
          { id: 'work' as Tab, label: 'Tareas y material' },
        ]
      : []),
  ];
  const [tab, setTab] = useState<Tab>(canManageTeam ? 'team' : 'classes');
  const current = tabs.find((t) => t.id === tab) ? tab : tabs[0]?.id;

  return (
    <div className="mt-3 rounded-xl p-4" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}>
      {member === false && (
        <p className="mb-3 text-sm" style={{ color: 'var(--text-secondary)' }}>
          Para dar clases, pasar lista o ver a los estudiantes de esta edición, primero agrégate al equipo docente (como principal o de apoyo) en «Docentes y horarios».
        </p>
      )}
      <div role="tablist" aria-label="Gestión de la edición" className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={current === t.id} onClick={() => setTab(t.id)}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
            style={{ background: current === t.id ? 'var(--azul-gatuno)' : 'var(--bg-primary)', color: current === t.id ? '#fff' : 'var(--text-secondary)', border: '1px solid var(--border)' }}>
            {t.label}
          </button>
        ))}
      </div>
      {current === 'team' && canManageTeam && <EditionTeam offeringId={offeringId} onChange={() => setTeamVersion((v) => v + 1)} />}
      {current === 'classes' && canOperate && <EditionSessions offeringId={offeringId} courseTitle={courseTitle} />}
      {current === 'students' && canOperate && <EditionRoster offeringId={offeringId} />}
      {current === 'work' && canOperate && <EditionWork offeringId={offeringId} />}
    </div>
  );
}
