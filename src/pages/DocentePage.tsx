import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { fetchMyEditions, type MyEdition } from '../services/teacherPanel';
import { useLiveRefresh } from '../hooks/useLiveRefresh';
import { setPageMeta } from '../utils/seo';
import TeacherHome from '../components/teacher/TeacherHome';
import EditionWorkspace from '../components/teacher/EditionWorkspace';
import { supabase } from '../lib/supabase';

// Panel docente: primero tus cursos; al abrir uno, su espacio de trabajo por secciones.
// La edición abierta vive en la URL (?edicion=…&tab=…), así que se puede compartir y el botón «atrás» funciona.
export default function DocentePage() {
  const { user, roles, profile } = useAuth();
  const isAdmin = roles.includes('admin');
  const [params, setParams] = useSearchParams();
  const [editions, setEditions] = useState<MyEdition[] | null>(null);
  const [hasHeadline, setHasHeadline] = useState(true);
  const openId = params.get('edicion');

  useEffect(() => {
    setPageMeta('Panel docente', 'Tus cursos, grupos, clases, asistencia y tareas');
  }, []);

  const load = useCallback(async () => {
    if (!user) return;
    setEditions(await fetchMyEditions(user.id));
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  // cambios en cursos, grupos, clases, inscripciones o entregas: se actualiza sin recargar la página
  useLiveRefresh(['offering_staff', 'offering_groups', 'live_sessions', 'enrollments', 'submissions', 'course_offerings'], () => void load(), Boolean(user));

  useEffect(() => {
    if (!user) return;
    void supabase.from('teacher_profiles').select('headline').eq('user_id', user.id).maybeSingle().then(({ data }) => setHasHeadline(Boolean((data as { headline?: string } | null)?.headline)));
  }, [user]);

  const open = (id: string, tab?: string) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('edicion', id);
      if (tab) next.set('tab', tab);
      else next.delete('tab');
      return next;
    });

  const close = () => setParams({}, { replace: false });

  const current = editions?.find((e) => e.id === openId) ?? null;
  const firstName = (profile?.full_name ?? '').split(' ')[0];

  return (
    <main className="pn-page">
      <header className="pn-hero">
        <span className="pn-eyebrow">Panel docente</span>
        <h1>{firstName ? `Hola, ${firstName}` : 'Tus cursos'}</h1>
        <p>Aquí ves los cursos que dictas, tu grupo y horario, las clases de hoy, la asistencia y las tareas por calificar.</p>
        <span className="pn-live-pill mt-3"><i /> Se actualiza solo cuando algo cambia</span>
      </header>

      {!hasHeadline && (
        <div className="pn-callout mt-4 pn-between" role="status">
          <span>Completa tu ficha docente (titular y «Sobre mí»): es lo que ven los estudiantes en la página de tus cursos.</span>
          <Link to="/perfil#ficha-docente" className="pn-btn pn-btn-sm pn-btn-primary">Completar mi ficha</Link>
        </div>
      )}

      <div className="mt-6">
        {openId && editions !== null && !current ? (
          <div className="pn-empty">
            <strong>No encontramos ese curso entre los tuyos</strong>
            <p>Puede que ya no formes parte de su equipo o que el enlace sea antiguo.</p>
            <button type="button" className="pn-btn pn-btn-primary mt-3" onClick={close}>Ver mis cursos</button>
          </div>
        ) : current ? (
          <EditionWorkspace edition={current} onBack={close} onChanged={() => void load()} />
        ) : (
          <TeacherHome editions={editions} isAdmin={isAdmin} onOpen={open} />
        )}
      </div>
    </main>
  );
}
