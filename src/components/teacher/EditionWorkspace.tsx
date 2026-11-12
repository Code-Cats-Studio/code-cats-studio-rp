import type { MyEdition } from '../../services/teacherPanel';
import PanelTabs, { usePanelTab, type PanelTab } from '../ui/PanelTabs';
import EditionRoster from '../edition/EditionRoster';
import EditionSessions from '../edition/EditionSessions';
import EditionWork from '../edition/EditionWork';
import EditionOverview from './EditionOverview';
import MySchedule from './MySchedule';
import LiveClassPanel from './LiveClassPanel';
import GradingPanel from './GradingPanel';
import CourseContentView from './CourseContentView';
import EditionSettings from './EditionSettings';
import { STATUS_LABEL, statusBadge } from './helpers';

type Tab = 'resumen' | 'horario' | 'clases' | 'estudiantes' | 'tareas' | 'entregas' | 'contenido' | 'config';

// Espacio de trabajo de un curso. El principal ve y gestiona todo; el docente de apoyo trabaja con su grupo
// y ve (sin editar) el contenido general.
export default function EditionWorkspace({ edition, onBack, onChanged }: { edition: MyEdition; onBack: () => void; onChanged: () => void }) {
  const isLead = edition.role === 'lead';
  const ownGroupIds = isLead ? undefined : edition.groups.filter((g) => g.mine).map((g) => g.id);

  const tabs: PanelTab<Tab>[] = [
    { id: 'resumen', label: 'Resumen', icon: '🏠' },
    { id: 'horario', label: 'Mi horario', icon: '🗓️' },
    { id: 'clases', label: 'Clases y asistencia', icon: '📋' },
    { id: 'estudiantes', label: 'Estudiantes', icon: '👥' },
    { id: 'tareas', label: 'Tareas y material', icon: '📚' },
    { id: 'entregas', label: 'Entregas', icon: '📝', count: edition.toGrade },
    { id: 'contenido', label: 'Contenido', icon: '📖' },
    { id: 'config', label: 'Configuración', icon: '⚙️', hidden: !isLead },
  ];
  const [tab, setTab] = usePanelTab<Tab>('tab', tabs, 'resumen');

  return (
    <div className="pn-stack">
      <div className="pn-between">
        <button type="button" className="pn-btn pn-btn-sm" onClick={onBack}>← Mis cursos</button>
        {isLead && (
          <button type="button" className="pn-btn pn-btn-primary" onClick={() => setTab('config')}>⚙️ Editar configuración del curso</button>
        )}
      </div>

      <header className="pn-card">
        <div className="pn-row" style={{ marginBottom: '0.4rem' }}>
          <span className={`pn-badge ${isLead ? 'pn-badge-blue' : ''}`}>{isLead ? 'Docente principal' : 'Docente de apoyo'}</span>
          <span className={`pn-badge ${statusBadge(edition.status)}`}>{STATUS_LABEL[edition.status] ?? edition.status}</span>
        </div>
        <h2 className="pn-title" style={{ fontSize: '1.5rem' }}>{edition.course_title}</h2>
        <p className="pn-subtitle">{edition.label}</p>
      </header>

      <PanelTabs label={`Secciones de ${edition.course_title}`} tabs={tabs} value={tab} onChange={setTab} />

      <div className="pn-scope">
        {tab === 'resumen' && <EditionOverview edition={edition} onGo={(t) => setTab(t as Tab)} />}
        {tab === 'horario' && <MySchedule edition={edition} onSaved={onChanged} />}
        {tab === 'clases' && (
          <div className="pn-stack-lg">
            <LiveClassPanel offeringId={edition.id} ownGroupIds={ownGroupIds} />
            <EditionSessions offeringId={edition.id} courseTitle={edition.course_title} ownGroupIds={ownGroupIds} />
          </div>
        )}
        {tab === 'estudiantes' && <EditionRoster offeringId={edition.id} />}
        {tab === 'tareas' && <EditionWork offeringId={edition.id} ownGroupIds={ownGroupIds} />}
        {tab === 'entregas' && <GradingPanel offeringId={edition.id} />}
        {tab === 'contenido' && <CourseContentView courseId={edition.course_id} canEdit={isLead} />}
        {tab === 'config' && isLead && <EditionSettings edition={edition} onSaved={onChanged} />}
      </div>
    </div>
  );
}
