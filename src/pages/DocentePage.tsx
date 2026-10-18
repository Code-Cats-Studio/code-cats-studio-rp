import { useState, useEffect, useCallback, useId, type FormEvent } from 'react';
import {
  rotateAttendanceCode,
  fetchTeacherRoster,
  fetchAssignmentSubmissions,
  gradeAssignmentSubmission,
  type RosterStudent,
  type AssignmentSubmission,
} from '../services/teacher';
import SubmissionFiles from '../components/course/SubmissionFiles';
import { fetchFilesBySubmission, type SubmissionFile } from '../services/submissions';
import { buildGoogleCalendarUrl, type LiveSession } from '../services/liveSessions';
import ClassScheduler from '../components/schedule/ClassScheduler';
import AttendanceList from '../components/schedule/AttendanceList';
import { useAuth } from '../context/AuthContext';
import {
  fetchAssignmentChoices,
  fetchMyOfferings,
  fetchSessionChoices,
  type AssignmentChoice,
  type OfferingChoice,
  type SessionChoice,
} from '../services/schedules';

type DocenteTab = 'asistencia' | 'roster' | 'calificaciones' | 'clases';

export default function DocentePage() {
  const { user, roles } = useAuth();
  const [activeTab, setActiveTab] = useState<DocenteTab>('asistencia');

  // Listas para elegir (así el docente nunca pega IDs)
  const [offeringChoices, setOfferingChoices] = useState<OfferingChoice[]>([]);
  const [sessionChoices, setSessionChoices] = useState<SessionChoice[]>([]);
  const [assignmentChoices, setAssignmentChoices] = useState<AssignmentChoice[]>([]);

  // Estado para la Pestaña 1: Asistencia en Vivo
  const [sessionId, setSessionId] = useState<string>('');
  const [generatedCode, setGeneratedCode] = useState<string | null>(null);
  const [isLoadingCode, setIsLoadingCode] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [copied, setCopied] = useState<boolean>(false);

  // Datos para Calendar (personalizables por el docente si lo desea)
  const [sessionTitle, setSessionTitle] = useState<string>('Clase en Vivo - Code Cats Studio');
  const [sessionStart, setSessionStart] = useState<string>(
    new Date(Date.now() + 3600000).toISOString().slice(0, 16)
  );
  const [sessionEnd, setSessionEnd] = useState<string>(
    new Date(Date.now() + 7200000).toISOString().slice(0, 16)
  );
  const [meetUrl, setMeetUrl] = useState<string>('https://meet.google.com/');

  useEffect(() => {
    if (!user) return;
    let alive = true;
    void (async () => {
      const offs = await fetchMyOfferings(user.id, roles.includes('admin'));
      const ids = offs.map((o) => o.id);
      const [sess, asg] = await Promise.all([fetchSessionChoices(ids), fetchAssignmentChoices(ids)]);
      if (!alive) return;
      setOfferingChoices(offs);
      setSessionChoices(sess);
      setAssignmentChoices(asg);
      setOfferingId((current) => current || offs[0]?.id || '');
      setSessionId((current) => current || sess[0]?.id || '');
    })();
    return () => {
      alive = false;
    };
  }, [user, roles, activeTab]);

  const sessionIdInputId = useId();
  const sessionTitleId = useId();
  const sessionStartId = useId();
  const sessionEndId = useId();
  const meetUrlId = useId();
  const offeringInputId = useId();

  // Estado para la Pestaña 2: Roster de Estudiantes
  const [offeringId, setOfferingId] = useState<string>('');
  const [students, setStudents] = useState<RosterStudent[]>([]);
  const [isLoadingRoster, setIsLoadingRoster] = useState<boolean>(false);
  const [rosterError, setRosterError] = useState<string | null>(null);

  // Consulta el roster de alumnos de la edición mediante fetchTeacherRoster
  const loadRoster = useCallback(async (targetOfferingId: string) => {
    const cleanOfferingId = targetOfferingId.trim();
    if (!cleanOfferingId) {
      setStudents([]);
      return;
    }

    setIsLoadingRoster(true);
    setRosterError(null);

    try {
      const result = await fetchTeacherRoster(cleanOfferingId);
      if (result.error) {
        setRosterError(result.error);
        setStudents([]);
      } else {
        setStudents(result.data || []);
      }
    } catch (err) {
      setRosterError(
        err instanceof Error ? err.message : 'Error inesperado al consultar el roster de alumnos.'
      );
      setStudents([]);
    } finally {
      setIsLoadingRoster(false);
    }
  }, []);

  // 1. Al seleccionarse la pestaña 'roster', dispara la carga
  useEffect(() => {
    if (activeTab === 'roster') {
      void loadRoster(offeringId);
    }
  }, [activeTab, offeringId, loadRoster]);

  // Estado para la Pestaña 3: Calificaciones
  const [assignmentFilterId, setAssignmentFilterId] = useState<string>('');
  const [submissions, setSubmissions] = useState<AssignmentSubmission[]>([]);
  const [isLoadingSubmissions, setIsLoadingSubmissions] = useState<boolean>(false);
  const [submissionsError, setSubmissionsError] = useState<string | null>(null);
  const [submissionsSuccess, setSubmissionsSuccess] = useState<string | null>(null);

  // Estado del Modal de Calificación
  const [selectedSubmission, setSelectedSubmission] = useState<AssignmentSubmission | null>(null);
  const [selectedFiles, setSelectedFiles] = useState<SubmissionFile[]>([]);
  const [scoreInput, setScoreInput] = useState<number | ''>('');
  const [feedbackInput, setFeedbackInput] = useState<string>('');
  const [isSavingGrade, setIsSavingGrade] = useState<boolean>(false);
  const [gradeModalError, setGradeModalError] = useState<string | null>(null);

  const assignmentFilterInputId = useId();
  const scoreInputId = useId();
  const feedbackInputId = useId();

  // Consulta las entregas de tareas mediante fetchAssignmentSubmissions
  const loadSubmissions = useCallback(async (targetAssignmentId?: string) => {
    setIsLoadingSubmissions(true);
    setSubmissionsError(null);

    try {
      const result = await fetchAssignmentSubmissions(targetAssignmentId);
      if (result.error) {
        setSubmissionsError(result.error);
        setSubmissions([]);
      } else {
        // Filtrar entregas pendientes (donde score aún no fue asignado)
        const pending = (result.data || []).filter(
          (sub) => sub.score === null || sub.score === undefined
        );
        setSubmissions(pending);
      }
    } catch (err) {
      setSubmissionsError(
        err instanceof Error ? err.message : 'Error inesperado al consultar las entregas de tareas.'
      );
      setSubmissions([]);
    } finally {
      setIsLoadingSubmissions(false);
    }
  }, []);

  // Al seleccionarse la pestaña 'calificaciones', carga las entregas
  useEffect(() => {
    if (activeTab === 'calificaciones') {
      void loadSubmissions(assignmentFilterId);
    }
  }, [activeTab, assignmentFilterId, loadSubmissions]);

  // Abrir modal de calificación
  const handleOpenGradeModal = (submission: AssignmentSubmission) => {
    setSelectedSubmission(submission);
    setSelectedFiles([]);
    void fetchFilesBySubmission(submission.id).then(setSelectedFiles);
    setScoreInput(submission.score ?? '');
    setFeedbackInput(submission.feedback ?? '');
    setGradeModalError(null);
  };

  // Cerrar modal de calificación
  const handleCloseGradeModal = () => {
    if (isSavingGrade) return;
    setSelectedSubmission(null);
    setGradeModalError(null);
  };

  // Guardar nota e invocar gradeAssignmentSubmission
  const handleSaveGrade = async (e: FormEvent) => {
    e.preventDefault();
    if (!selectedSubmission) return;

    if (scoreInput === '' || isNaN(Number(scoreInput))) {
      setGradeModalError('Por favor ingresa una nota numérica válida.');
      return;
    }

    const numericScore = Number(scoreInput);
    const maxScore = selectedSubmission.assignments?.max_score ?? 100;

    if (numericScore < 0 || numericScore > maxScore) {
      setGradeModalError(`La nota debe encontrarse entre 0 y ${maxScore}.`);
      return;
    }

    setIsSavingGrade(true);
    setGradeModalError(null);

    try {
      const result = await gradeAssignmentSubmission(
        selectedSubmission.id,
        numericScore,
        feedbackInput.trim()
      );

      if (!result.success || result.error) {
        setGradeModalError(result.error || 'No se pudo guardar la calificación.');
      } else {
        // 5. Remover la entrega ya calificada de la lista y notificar éxito
        setSubmissions((prev) => prev.filter((s) => s.id !== selectedSubmission.id));
        setSubmissionsSuccess(
          `¡Tarea calificada con éxito! Se registraron ${numericScore}/${maxScore} pts.`
        );
        setSelectedSubmission(null);
      }
    } catch (err) {
      setGradeModalError(
        err instanceof Error ? err.message : 'Error inesperado al calificar la tarea.'
      );
    } finally {
      setIsSavingGrade(false);
    }
  };

  // Validación de seguridad para URLs de Google Drive
  const isSafeDriveUrl = (url: string) => {
    try {
      const parsed = new URL(url);
      return (
        parsed.protocol === 'https:' &&
        (parsed.hostname === 'drive.google.com' || parsed.hostname === 'docs.google.com')
      );
    } catch {
      return false;
    }
  };

  // Generar / rotar código de 6 dígitos
  const handleGenerateCode = async () => {
    setErrorMessage(null);
    setSuccessMessage(null);

    const targetSessionId = sessionId.trim();
    if (!targetSessionId) {
      setErrorMessage('Primero elige la clase en vivo (se programan en la pestaña «Clases y horario»).');
      return;
    }

    setIsLoadingCode(true);

    try {
      const result = await rotateAttendanceCode(targetSessionId);

      if (result.error) {
        setErrorMessage(result.error);
      } else if (result.code) {
        setGeneratedCode(result.code);
        setSuccessMessage('¡Código de asistencia generado con éxito!');
      } else {
        setErrorMessage('No se recibió el código del servidor.');
      }
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : 'Error inesperado al generar el código.'
      );
    } finally {
      setIsLoadingCode(false);
    }
  };

  // Copiar código al portapapeles
  const handleCopyCode = async () => {
    if (!generatedCode) return;
    try {
      await navigator.clipboard.writeText(generatedCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Ignorar error de portapapeles
    }
  };

  // Enlace para Google Calendar
  const sessionForCalendar: LiveSession = {
    id: sessionId || 'nueva-sesion',
    offering_id: '',
    title: sessionTitle || 'Clase en Vivo',
    starts_at: new Date(sessionStart).toISOString(),
    ends_at: new Date(sessionEnd).toISOString(),
    meet_url: meetUrl || null,
    description: `Sesión en vivo de Code Cats Studio. Código de asistencia: ${generatedCode || 'Se dictará en clase'}`,
  };

  const calendarUrl = buildGoogleCalendarUrl(sessionForCalendar);

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      {/* Encabezado */}
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <span className="text-2xl">🎓</span>
          <h1
            style={{ fontFamily: 'var(--font-heading)' }}
            className="text-2xl md:text-3xl font-bold tracking-tight text-gray-900"
          >
            Panel del Docente
          </h1>
        </div>
        <p className="text-sm text-gray-500">
          Gestión de clases en vivo, control de asistencia, seguimiento de alumnos y evaluación de entregas.
        </p>
      </header>

      {/* Navegación por pestañas (Tabs) */}
      <nav
        aria-label="Pestañas de navegación docente"
        className="flex items-center gap-2 border-b border-gray-200 mb-8"
      >
        <button
          type="button"
          onClick={() => setActiveTab('asistencia')}
          className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'asistencia'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📋 1. Asistencia en Vivo
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('roster')}
          className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'roster'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          👥 2. Roster de Estudiantes
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('calificaciones')}
          className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'calificaciones'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          📝 3. Calificaciones
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('clases')}
          className={`px-4 py-3 text-sm font-semibold transition-all border-b-2 cursor-pointer ${
            activeTab === 'clases'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-gray-500 hover:text-gray-800'
          }`}
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          🗓️ 4. Clases y horario
        </button>
      </nav>

      {activeTab === 'clases' && <ClassScheduler />}

      {/* Contenido según pestaña activa */}
      {activeTab === 'asistencia' && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <h2
                  className="text-lg font-bold text-gray-900 mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Generador de Código de Asistencia
                </h2>
                <p className="text-xs md:text-sm text-gray-500">
                  Rota el código de 6 dígitos para que los estudiantes registrados puedan marcar su check-in durante la clase.
                </p>
                <p className="text-xs text-gray-500 mt-2 max-w-2xl">
                  <strong>Cómo funciona:</strong> durante la clase en Meet generas un código y lo muestras en pantalla.
                  Cada estudiante lo escribe en su página (en <em>Mis cursos → Próximas clases</em>) y queda presente
                  automáticamente. Si alguien no puede, lo marcas tú abajo en la lista de asistencia.
                </p>
              </div>

              {/* Botón Agendar en Google Calendar */}
              <a
                href={calendarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-xs md:text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 transition-all no-underline flex-shrink-0"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span>📅</span>
                <span>Agendar Clase en Calendar</span>
              </a>
            </div>

            {/* Alertas */}
            {errorMessage && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2 bg-red-50 border border-red-200 text-red-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="font-bold">✕</span>
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2 bg-green-50 border border-green-200 text-green-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="font-bold">✓</span>
                <span>{successMessage}</span>
              </div>
            )}

            {/* Formulario de ID de sesión y Generación */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
              <div className="md:col-span-2">
                <label
                  htmlFor={sessionIdInputId}
                  className="block text-xs font-semibold text-gray-600 mb-1.5"
                >
                  Clase en vivo:
                </label>
                <select
                  id={sessionIdInputId}
                  value={sessionId}
                  onChange={(e) => setSessionId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs md:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {sessionChoices.length === 0 && <option value="">No hay clases programadas</option>}
                  {sessionChoices.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title}{c.group_name ? ` · ${c.group_name}` : ''} ·{' '}
                      {new Date(c.starts_at).toLocaleString('es-BO', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'America/La_Paz' })}
                    </option>
                  ))}
                </select>
                {sessionChoices.length === 0 && (
                  <p className="text-xs text-gray-500 mt-2">
                    Primero programa la clase en la pestaña{' '}
                    <button type="button" className="underline text-indigo-600 cursor-pointer" onClick={() => setActiveTab('clases')}>
                      Clases y horario
                    </button>
                    .
                  </p>
                )}
              </div>

              <div>
                <button
                  type="button"
                  onClick={() => void handleGenerateCode()}
                  disabled={isLoadingCode || !sessionId.trim()}
                  className="w-full px-5 py-2.5 rounded-xl text-xs md:text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-sm"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isLoadingCode ? 'Generando...' : 'Generar Nuevo Código'}
                </button>
              </div>
            </div>

            {/* Display Gigante del Código de Asistencia */}
            <div className="mt-8 pt-8 border-t border-gray-100 flex flex-col items-center justify-center text-center">
              <span className="text-xs uppercase tracking-wider font-semibold text-gray-400 mb-2">
                Código de Check-in para Alumnos
              </span>

              {generatedCode ? (
                <div className="space-y-3 w-full max-w-md">
                  <div className="py-6 px-8 rounded-2xl bg-gray-50 border-2 border-indigo-200 shadow-inner flex items-center justify-center">
                    <span
                      className="font-mono text-5xl md:text-7xl font-extrabold tracking-widest text-indigo-700 select-all"
                      style={{ letterSpacing: '0.25em' }}
                    >
                      {generatedCode}
                    </span>
                  </div>

                  <div className="flex items-center justify-center gap-3">
                    <button
                      type="button"
                      onClick={() => void handleCopyCode()}
                      className="px-3.5 py-1.5 text-xs font-medium rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 transition-all cursor-pointer"
                    >
                      {copied ? '✓ Copiado' : '📋 Copiar Código'}
                    </button>
                    <span className="text-xs text-gray-400">
                      Proyecta este código en pantalla grande para tu sesión en vivo
                    </span>
                  </div>
                </div>
              ) : (
                <div className="py-10 px-8 rounded-2xl bg-gray-50 border border-dashed border-gray-300 text-gray-400 w-full max-w-md">
                  <span className="text-4xl block mb-2">🔢</span>
                  <p className="text-sm font-medium">Aún no se ha generado un código</p>
                  <p className="text-xs text-gray-400 mt-1">
                    Elige la clase y presiona &apos;Generar Nuevo Código&apos;
                  </p>
                </div>
              )}
            </div>

            <AttendanceList sessionId={sessionId} />

            {/* Detalles colapsables de la sesión para el Calendar */}
            <details className="mt-8 pt-6 border-t border-gray-100">
              <summary className="text-xs font-semibold text-gray-500 cursor-pointer hover:text-gray-700">
                ⚙️ Configurar detalles para el enlace de Google Calendar
              </summary>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4 p-4 rounded-xl bg-gray-50 border border-gray-200 text-xs">
                <div>
                  <label htmlFor={sessionTitleId} className="block font-medium text-gray-600 mb-1">
                    Título de la clase:
                  </label>
                  <input
                    id={sessionTitleId}
                    type="text"
                    value={sessionTitle}
                    onChange={(e) => setSessionTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label htmlFor={meetUrlId} className="block font-medium text-gray-600 mb-1">
                    Enlace de Meet / Zoom:
                  </label>
                  <input
                    id={meetUrlId}
                    type="url"
                    value={meetUrl}
                    onChange={(e) => setMeetUrl(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300 font-mono"
                  />
                </div>
                <div>
                  <label htmlFor={sessionStartId} className="block font-medium text-gray-600 mb-1">
                    Inicio de la clase:
                  </label>
                  <input
                    id={sessionStartId}
                    type="datetime-local"
                    value={sessionStart}
                    onChange={(e) => setSessionStart(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
                <div>
                  <label htmlFor={sessionEndId} className="block font-medium text-gray-600 mb-1">
                    Fin de la clase:
                  </label>
                  <input
                    id={sessionEndId}
                    type="datetime-local"
                    value={sessionEnd}
                    onChange={(e) => setSessionEnd(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg border border-gray-300"
                  />
                </div>
              </div>
            </details>
          </div>
        </section>
      )}

      {/* Pestaña 2: Roster de Estudiantes */}
      {activeTab === 'roster' && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <h2
                  className="text-lg font-bold text-gray-900 mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Roster de Estudiantes
                </h2>
                <p className="text-xs md:text-sm text-gray-500">
                  Monitoreo en tiempo real del progreso curricular y porcentaje de asistencia de los alumnos inscritos.
                </p>
              </div>

              {/* Selector o Input de Edición */}
              <div className="flex items-center gap-2">
                <div>
                  <label htmlFor={offeringInputId} className="sr-only">
                    Edición
                  </label>
                  <select
                    id={offeringInputId}
                    value={offeringId}
                    onChange={(e) => setOfferingId(e.target.value)}
                    className="px-3.5 py-2 text-xs md:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 md:w-64"
                  >
                    {offeringChoices.length === 0 && <option value="">Sin ediciones asignadas</option>}
                    {offeringChoices.map((o) => (
                      <option key={o.id} value={o.id}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void loadRoster(offeringId)}
                  disabled={isLoadingRoster}
                  className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isLoadingRoster ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {/* Alerta de Error */}
            {rosterError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2 bg-red-50 border border-red-200 text-red-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="font-bold">✕</span>
                <span>{rosterError}</span>
              </div>
            )}

            {/* Estado de Carga */}
            {isLoadingRoster ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-heading)' }}>
                  Cargando lista de estudiantes...
                </p>
              </div>
            ) : students.length === 0 ? (
              /* Estado Vacío o sin alumnos */
              <div className="py-12 px-6 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center">
                <span className="text-4xl block mb-2">👥</span>
                <p
                  className="text-sm font-semibold text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  No se encontraron alumnos registrados en esta edición
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {offeringId.trim()
                    ? 'Verifica que el identificador de edición sea correcto o que los estudiantes tengan su inscripción activa.'
                    : 'Ingresa el ID de la edición del curso arriba y presiona "Actualizar" para consultar la lista de estudiantes.'}
                </p>
              </div>
            ) : (
              /* Tabla Minimalista Gris */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4 rounded-tl-xl">Nombre del Alumno</th>
                      <th className="py-3 px-4">Correo Electrónico</th>
                      <th className="py-3 px-4 min-w-[180px]">Progreso del Curso (%)</th>
                      <th className="py-3 px-4 min-w-[180px] rounded-tr-xl">Asistencia (%)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                    {students.map((student) => {
                      const progress = Math.min(Math.max(student.progress_pct ?? 0, 0), 100);
                      const attendance = Math.min(Math.max(student.attendance_pct ?? 0, 0), 100);

                      return (
                        <tr
                          key={student.enrollment_id}
                          className="hover:bg-gray-50/80 transition-colors"
                        >
                          {/* Nombre */}
                          <td className="py-3.5 px-4 font-medium text-gray-900">
                            <div className="flex items-center gap-2">
                              <span>{student.full_name || 'Sin nombre registrado'}</span>
                              {student.group_name && (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 font-mono">
                                  {student.group_name}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Correo */}
                          <td className="py-3.5 px-4 text-gray-500 font-mono text-xs">
                            {student.email || '—'}
                          </td>

                          {/* Progreso del curso */}
                          <td className="py-3.5 px-4">
                            <div className="w-full max-w-xs">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-gray-700">{progress}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${progress}%`,
                                    background:
                                      progress >= 70
                                        ? '#10B981'
                                        : progress >= 40
                                        ? '#F59E0B'
                                        : '#EF4444',
                                  }}
                                />
                              </div>
                            </div>
                          </td>

                          {/* Asistencia */}
                          <td className="py-3.5 px-4">
                            <div className="w-full max-w-xs">
                              <div className="flex items-center justify-between text-xs mb-1">
                                <span className="font-semibold text-gray-700">{attendance}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                                <div
                                  className="h-2 rounded-full transition-all"
                                  style={{
                                    width: `${attendance}%`,
                                    background:
                                      attendance >= 75
                                        ? '#10B981'
                                        : attendance >= 50
                                        ? '#F59E0B'
                                        : '#EF4444',
                                  }}
                                />
                              </div>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Pestaña 3: Calificaciones de Tareas */}
      {activeTab === 'calificaciones' && (
        <section className="space-y-6">
          <div className="bg-white rounded-2xl border border-gray-200 p-6 md:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-6 border-b border-gray-100">
              <div>
                <h2
                  className="text-lg font-bold text-gray-900 mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  Calificaciones de Tareas
                </h2>
                <p className="text-xs md:text-sm text-gray-500">
                  Revisión de entregas de Google Drive y asignación de notas y retroalimentación para los estudiantes.
                </p>
              </div>

              {/* Filtro por ID de tarea opcional */}
              <div className="flex items-center gap-2">
                <div>
                  <label htmlFor={assignmentFilterInputId} className="sr-only">
                    Filtrar por Tarea
                  </label>
                  <select
                    id={assignmentFilterInputId}
                    value={assignmentFilterId}
                    onChange={(e) => setAssignmentFilterId(e.target.value)}
                    className="px-3.5 py-2 text-xs md:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 w-56 md:w-64"
                  >
                    <option value="">Todas las tareas</option>
                    {assignmentChoices.map((a) => (
                      <option key={a.id} value={a.id}>{a.title}</option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => void loadSubmissions(assignmentFilterId)}
                  disabled={isLoadingSubmissions}
                  className="px-4 py-2 rounded-xl text-xs md:text-sm font-semibold bg-gray-50 text-gray-700 border border-gray-300 hover:bg-gray-100 transition-all cursor-pointer disabled:opacity-50"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  {isLoadingSubmissions ? 'Cargando...' : 'Actualizar'}
                </button>
              </div>
            </div>

            {/* Alerta de Éxito al calificar */}
            {submissionsSuccess && (
              <div
                role="status"
                className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2 bg-green-50 border border-green-200 text-green-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="font-bold">✓</span>
                <span>{submissionsSuccess}</span>
              </div>
            )}

            {/* Alerta de Error */}
            {submissionsError && (
              <div
                role="alert"
                className="mb-5 p-3.5 rounded-xl text-xs flex items-start gap-2 bg-red-50 border border-red-200 text-red-700"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                <span className="font-bold">✕</span>
                <span>{submissionsError}</span>
              </div>
            )}

            {/* Estado de Carga */}
            {isLoadingSubmissions ? (
              <div className="py-16 text-center">
                <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-xs text-gray-500" style={{ fontFamily: 'var(--font-heading)' }}>
                  Cargando entregas de tareas...
                </p>
              </div>
            ) : submissions.length === 0 ? (
              /* Estado Vacío */
              <div className="py-12 px-6 rounded-2xl bg-gray-50 border border-dashed border-gray-200 text-center">
                <span className="text-4xl block mb-2">🎉</span>
                <p
                  className="text-sm font-semibold text-gray-700 mb-1"
                  style={{ fontFamily: 'var(--font-heading)' }}
                >
                  No hay entregas pendientes de calificación
                </p>
                <p className="text-xs text-gray-400 max-w-sm mx-auto">
                  {assignmentFilterId.trim()
                    ? 'No se encontraron entregas sin calificar para la tarea especificada.'
                    : 'Todas las tareas enviadas por los estudiantes ya han sido calificadas o aún no hay entregas registradas.'}
                </p>
              </div>
            ) : (
              /* Tabla de Entregas */
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50 text-xs font-semibold text-gray-600 uppercase tracking-wider">
                      <th className="py-3 px-4 rounded-tl-xl">Estudiante</th>
                      <th className="py-3 px-4">Tarea</th>
                      <th className="py-3 px-4">Enlace a Google Drive</th>
                      <th className="py-3 px-4 text-right rounded-tr-xl">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-xs md:text-sm">
                    {submissions.map((sub) => {
                      const safeUrl = isSafeDriveUrl(sub.file_url);

                      return (
                        <tr key={sub.id} className="hover:bg-gray-50/80 transition-colors">
                          {/* Estudiante */}
                          <td className="py-3.5 px-4 font-medium text-gray-900">
                            <div>
                              <span>{sub.student?.full_name || 'Estudiante'}</span>
                              <div className="text-[11px] text-gray-400 font-mono">
                                ID: {sub.user_id.slice(0, 8)}...
                              </div>
                            </div>
                          </td>

                          {/* Tarea */}
                          <td className="py-3.5 px-4 text-gray-700">
                            <div>
                              <span className="font-medium">
                                {sub.assignments?.title || 'Tarea del curso'}
                              </span>
                              {sub.assignments?.max_score && (
                                <span className="text-[11px] text-gray-400 block">
                                  Puntaje máx: {sub.assignments.max_score} pts
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Enlace Google Drive */}
                          <td className="py-3.5 px-4">
                            {safeUrl ? (
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-indigo-50 text-indigo-700 hover:bg-indigo-100 transition-colors no-underline"
                              >
                                <span>📁</span>
                                <span>Ver archivo</span>
                                <span className="text-[10px]">↗</span>
                              </a>
                            ) : (
                              <a
                                href={sub.file_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-amber-50 text-amber-700 hover:bg-amber-100 transition-colors no-underline"
                                title="Enlace externo (verificar dominio)"
                              >
                                <span>🔗</span>
                                <span>Abrir enlace</span>
                                <span className="text-[10px]">↗</span>
                              </a>
                            )}
                          </td>

                          {/* Acción Calificar */}
                          <td className="py-3.5 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => handleOpenGradeModal(sub)}
                              className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer shadow-xs"
                              style={{ fontFamily: 'var(--font-heading)' }}
                            >
                              Calificar
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Modal Integrado para Calificar Tarea */}
          {selectedSubmission && (
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby="modal-grade-title"
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs"
            >
              <div className="bg-white rounded-2xl border border-gray-200 shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 text-left animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-3 border-b border-gray-100 mb-4">
                  <div>
                    <h3
                      id="modal-grade-title"
                      className="text-base font-bold text-gray-900"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      Calificar Entrega
                    </h3>
                    <p className="text-xs text-gray-400">
                      {selectedSubmission.assignments?.title || 'Tarea'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleCloseGradeModal}
                    disabled={isSavingGrade}
                    className="text-gray-400 hover:text-gray-600 text-lg leading-none p-1 cursor-pointer"
                  >
                    ✕
                  </button>
                </div>

                {/* Error dentro del modal */}
                {gradeModalError && (
                  <div
                    role="alert"
                    className="mb-4 p-3 rounded-xl text-xs bg-red-50 border border-red-200 text-red-700"
                  >
                    <span>{gradeModalError}</span>
                  </div>
                )}

                <div className="mb-4">
                  <p className="text-xs font-semibold text-gray-700 mb-2">Archivos entregados</p>
                  <SubmissionFiles files={selectedFiles} />
                </div>

                <form onSubmit={(e) => void handleSaveGrade(e)} className="space-y-4">
                  {/* Nota / Score */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label htmlFor={scoreInputId} className="text-xs font-semibold text-gray-700">
                        Nota (Puntaje):
                      </label>
                      <span className="text-[11px] text-gray-400">
                        Máximo: {selectedSubmission.assignments?.max_score ?? 100} pts
                      </span>
                    </div>
                    <input
                      id={scoreInputId}
                      type="number"
                      required
                      min={0}
                      max={selectedSubmission.assignments?.max_score ?? 100}
                      step="any"
                      placeholder={`0 - ${selectedSubmission.assignments?.max_score ?? 100}`}
                      value={scoreInput}
                      onChange={(e) =>
                        setScoreInput(e.target.value === '' ? '' : Number(e.target.value))
                      }
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-gray-300 font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Retroalimentación / Feedback */}
                  <div>
                    <label
                      htmlFor={feedbackInputId}
                      className="block text-xs font-semibold text-gray-700 mb-1"
                    >
                      Comentarios y Retroalimentación:
                    </label>
                    <textarea
                      id={feedbackInputId}
                      rows={3}
                      placeholder="Ej. Excelente aplicación de la estructura semántica y estilo limpio..."
                      value={feedbackInput}
                      onChange={(e) => setFeedbackInput(e.target.value)}
                      className="w-full px-3.5 py-2 text-xs md:text-sm rounded-xl border border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Acciones */}
                  <div className="flex items-center justify-end gap-2 pt-3 border-t border-gray-100">
                    <button
                      type="button"
                      onClick={handleCloseGradeModal}
                      disabled={isSavingGrade}
                      className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Cancelar
                    </button>

                    <button
                      type="submit"
                      disabled={isSavingGrade || scoreInput === ''}
                      className="px-5 py-2 rounded-xl text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                      style={{ fontFamily: 'var(--font-heading)' }}
                    >
                      {isSavingGrade ? 'Guardando Nota...' : 'Guardar Nota'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
