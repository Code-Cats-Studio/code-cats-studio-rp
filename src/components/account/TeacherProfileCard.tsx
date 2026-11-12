import { useEffect, useState, type FormEvent } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';

// Ficha pública del docente (titular y «Sobre mí»): lo que ven los estudiantes en la página de sus cursos.
export default function TeacherProfileCard() {
  const { user, roles } = useAuth();
  const [headline, setHeadline] = useState('');
  const [bio, setBio] = useState('');
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const toast = useToast();
  const userId = user?.id;

  useEffect(() => {
    if (!userId) return;
    void supabase.from('teacher_profiles').select('headline,bio').eq('user_id', userId).maybeSingle().then(({ data }) => {
      const row = data as { headline?: string | null; bio?: string | null } | null;
      setHeadline(row?.headline ?? '');
      setBio(row?.bio ?? '');
      setLoaded(true);
    });
  }, [userId]);

  if (!userId || !roles.includes('teacher')) return null;

  const save = async (e: FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const { error } = await supabase.from('teacher_profiles').upsert({ user_id: userId, headline: headline.trim() || null, bio: bio.trim() || null });
    setSaving(false);
    toast.result(error?.message, 'Ficha guardada. Los estudiantes la ven en la página de tus cursos.');
  };

  return (
    <section id="ficha-docente" className="pn-card pn-scope pn-stack mt-8" aria-labelledby="tp-title" style={{ scrollMarginTop: '6rem' }}>
      <div>
        <span className="pn-badge pn-badge-blue">Docente</span>
        <h2 id="tp-title" className="pn-title mt-2">Mi ficha docente</h2>
        <p className="pn-subtitle">Se muestra públicamente junto a tus cursos. Cuéntales a tus estudiantes quién eres.</p>
      </div>
      {!loaded ? (
        <div className="pn-skeleton" />
      ) : (
        <form onSubmit={(e) => void save(e)} className="pn-stack">
          <label className="grid gap-1">Titular
            <input maxLength={120} value={headline} placeholder="Desarrollador web · Instructor" onChange={(e) => setHeadline(e.target.value)} />
            <span className="text-xs pn-muted">{headline.length}/120</span>
          </label>
          <label className="grid gap-1">Sobre mí
            <textarea rows={4} maxLength={600} value={bio} placeholder="Tu experiencia, qué enseñas y qué pueden esperar tus estudiantes." onChange={(e) => setBio(e.target.value)} />
            <span className="text-xs pn-muted">{bio.length}/600</span>
          </label>
          <div><button type="submit" disabled={saving} className="pn-btn pn-btn-primary">{saving ? 'Guardando…' : 'Guardar ficha'}</button></div>
        </form>
      )}
    </section>
  );
}
