import { useEffect, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import EditionHub from './EditionHub';

const card = { background: 'var(--bg-primary)', border: '1px solid var(--border)' } as const;
const btn = 'px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer no-underline disabled:opacity-50';
const field = 'w-full px-2 py-1.5 rounded border border-gray-300 text-sm';

interface LeadEdition {
  id: string;
  label: string;
  courseId: string;
  courseTitle: string;
}

async function fetchLeadEditions(userId: string, isAdmin: boolean): Promise<LeadEdition[]> {
  const map = (o: any): LeadEdition => ({ id: o.id, label: o.label, courseId: o.course_id, courseTitle: o.courses?.title ?? 'Curso' });
  if (isAdmin) {
    const { data } = await supabase.from('course_offerings').select('id,label,course_id, courses(title)').order('created_at', { ascending: false });
    return ((data as any[]) ?? []).map(map);
  }
  const { data } = await supabase
    .from('offering_staff')
    .select('course_offerings(id,label,course_id, courses(title))')
    .eq('user_id', userId)
    .eq('staff_role', 'lead');
  return ((data as any[]) ?? []).map((r) => r.course_offerings).filter(Boolean).map(map);
}

// Ficha pública del docente: lo que ven los estudiantes en la página del curso
function PublicProfile({ userId }: { userId: string }) {
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    void supabase.from('teacher_profiles').select('headline,bio').eq('user_id', userId).maybeSingle().then(({ data }) => {
      setHeadline((data as any)?.headline ?? '');
      setBio((data as any)?.bio ?? '');
    });
  }, [userId]);

  const save = async (e: FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('teacher_profiles').upsert({ user_id: userId, headline: headline.trim() || null, bio: bio.trim() || null });
    setMessage(error?.message ?? 'Ficha guardada. Se verá en la página de tus cursos.');
  };

  return (
    <form onSubmit={(e) => void save(e)} className="p-4 rounded-xl grid gap-3 text-sm" style={card}>
      <h3 className="font-semibold">Mi ficha pública de docente</h3>
      <label className="grid gap-1">Titular<input className={field} maxLength={120} value={headline} placeholder="Desarrollador web · Instructor" onChange={(e) => setHeadline(e.target.value)} /></label>
      <label className="grid gap-1">Sobre mí<textarea className={field} rows={3} maxLength={600} value={bio} onChange={(e) => setBio(e.target.value)} /></label>
      <div className="flex items-center gap-3">
        <button type="submit" className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }}>Guardar ficha</button>
        {message && <span role="status" className="text-xs" style={{ color: 'var(--text-secondary)' }}>{message}</span>}
      </div>
    </form>
  );
}

// Pestaña «Mis cursos» del docente: sus ediciones como docente principal, con todo lo que puede gestionar.
export default function TeacherCourses() {
  const { user, roles } = useAuth();
  const isAdmin = roles.includes('admin');
  const [editions, setEditions] = useState<LeadEdition[] | null>(null);
  const [open, setOpen] = useState<string | null>(null);

  useEffect(() => {
    if (user) void fetchLeadEditions(user.id, isAdmin).then(setEditions);
  }, [user, isAdmin]);

  if (!user) return null;

  return (
    <div className="grid gap-8">
      <section aria-labelledby="tc-title">
        <h2 id="tc-title" className="font-semibold text-lg">{isAdmin ? 'Todas las ediciones' : 'Mis cursos como docente principal'}</h2>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
          Desde aquí editas el contenido de tu curso, programas clases, pasas lista, creas tareas y material y ves a tus estudiantes.
        </p>
        <ul className="mt-4 grid gap-3">
          {editions === null && <li className="text-sm">Cargando…</li>}
          {editions?.length === 0 && (
            <li className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Aún no eres docente principal de ninguna edición. Un administrador te asigna desde el curso. Mientras tanto, las clases de tu grupo están en «Clases y horario».
            </li>
          )}
          {editions?.map((e) => (
            <li key={e.id} className="p-4 rounded-xl" style={card}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-sm"><strong>{e.courseTitle}</strong> <span style={{ color: 'var(--text-muted)' }}>· {e.label}</span></span>
                <span className="flex gap-2">
                  <Link to={`/docente/cursos/${e.courseId}`} className={btn} style={{ border: '1px solid var(--border)', color: 'inherit' }}>Editar contenido</Link>
                  <button type="button" className={btn} style={{ background: 'var(--azul-gatuno)', color: '#fff' }} onClick={() => setOpen(open === e.id ? null : e.id)}>
                    {open === e.id ? 'Cerrar' : 'Gestionar edición'}
                  </button>
                </span>
              </div>
              {open === e.id && <EditionHub offeringId={e.id} courseTitle={e.courseTitle} canManageTeam={isAdmin} />}
            </li>
          ))}
        </ul>
      </section>
      <PublicProfile userId={user.id} />
    </div>
  );
}
