import { supabase } from '../lib/supabase';

// Eventos: inscripción con perfil por evento (register_for_event_with_profile)

export const CODE_CATS_DAYS_SLUG = 'code-cats-days';
const LEGACY_SLUGS: Record<string, string> = { 'code-cats-days': 'code-cats-days-2026' }; // por si se creó con el enlace anterior

export interface EventInfo {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  starts_at: string;
  location: string | null;
  capacity: number | null;
}

export type ParticipantType = 'attendee' | 'speaker' | 'volunteer' | 'sponsor' | 'community';
export type ExperienceLevel = 'none' | 'beginner' | 'intermediate' | 'advanced';

export const SOCIAL_FIELDS = [
  { key: 'linkedin', label: 'LinkedIn', placeholder: 'https://linkedin.com/in/tu-usuario' },
  { key: 'github', label: 'GitHub', placeholder: 'https://github.com/tu-usuario' },
  { key: 'instagram', label: 'Instagram', placeholder: 'https://instagram.com/tu-usuario' },
  { key: 'website', label: 'Sitio web o portafolio', placeholder: 'https://tusitio.com' },
] as const;
export type SocialKey = (typeof SOCIAL_FIELDS)[number]['key'];

// Qué datos del Cat Pass puede ver quien escanea el QR
export const VISIBILITY_FIELDS = [
  { key: 'role_title', label: 'Rol o título' },
  { key: 'organization', label: 'Institución u organización' },
  { key: 'socials', label: 'Redes' },
  { key: 'business_contact', label: 'Contacto de negocios' },
  { key: 'projects', label: 'Proyectos' },
  { key: 'open_to', label: 'Estoy abierto/a a…' },
] as const;
export type VisibilityKey = (typeof VISIBILITY_FIELDS)[number]['key'];

export interface CatPassProject {
  name: string;
  description: string;
  url: string;
}

// Campos del Cat Pass que viven en event_profiles.extra (jsonb)
export interface CatPassExtra {
  knows: string[];
  wants_to_learn: string[];
  goals: string[];
  talk_about: string;
  role_title: string;
  socials: Record<SocialKey, string>;
  business_contact: string;
  projects: CatPassProject[];
  open_to: string[];
  visible: Record<VisibilityKey, boolean>;
}

export interface EventProfileInput {
  participant_type: ParticipantType;
  organization: string;
  experience_level: ExperienceLevel | '';
  interests: string[];
  accepts_photos: boolean;
  extra: CatPassExtra;
}

export interface MyEventRegistration {
  status: 'registered' | 'waitlisted' | 'cancelled';
  profile: Omit<EventProfileInput, 'experience_level' | 'extra'> & {
    experience_level: ExperienceLevel | null;
    extra: unknown;
  } | null;
}

export const MAX_PROJECTS = 3;
export const TALK_ABOUT_MAX = 300;

export const emptyExtra = (): CatPassExtra => ({
  knows: [], wants_to_learn: [], goals: [], talk_about: '',
  role_title: '', socials: { linkedin: '', github: '', instagram: '', website: '' },
  business_contact: '', projects: [], open_to: [],
  visible: { role_title: true, organization: true, socials: true, business_contact: false, projects: true, open_to: true },
});

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const asString = (v: unknown): string => (typeof v === 'string' ? v : '');

// Lo que viene de la BD no es de fiar: se normaliza a la forma esperada
export function parseExtra(raw: unknown): CatPassExtra {
  const base = emptyExtra();
  if (!raw || typeof raw !== 'object') return base;
  const r = raw as Record<string, unknown>;
  const socials = (r.socials && typeof r.socials === 'object' ? r.socials : {}) as Record<string, unknown>;
  const visible = (r.visible && typeof r.visible === 'object' ? r.visible : {}) as Record<string, unknown>;
  const projects = Array.isArray(r.projects) ? r.projects : [];
  return {
    knows: asStrings(r.knows),
    wants_to_learn: asStrings(r.wants_to_learn),
    goals: asStrings(r.goals),
    talk_about: asString(r.talk_about),
    role_title: asString(r.role_title),
    socials: Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, asString(socials[key])])) as Record<SocialKey, string>,
    business_contact: asString(r.business_contact),
    projects: projects.slice(0, MAX_PROJECTS).map((p) => {
      const o = (p && typeof p === 'object' ? p : {}) as Record<string, unknown>;
      return { name: asString(o.name), description: asString(o.description), url: asString(o.url) };
    }),
    open_to: asStrings(r.open_to),
    visible: Object.fromEntries(
      VISIBILITY_FIELDS.map(({ key }) => [key, typeof visible[key] === 'boolean' ? visible[key] : base.visible[key]]),
    ) as Record<VisibilityKey, boolean>,
  };
}

// Se guarda solo lo que tiene contenido
export function cleanExtra(extra: CatPassExtra): CatPassExtra {
  return {
    ...extra,
    talk_about: extra.talk_about.trim().slice(0, TALK_ABOUT_MAX),
    role_title: extra.role_title.trim(),
    business_contact: extra.business_contact.trim(),
    socials: Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, extra.socials[key].trim()])) as Record<SocialKey, string>,
    projects: extra.projects
      .map((p) => ({ name: p.name.trim(), description: p.description.trim(), url: p.url.trim() }))
      .filter((p) => p.name || p.description || p.url)
      .slice(0, MAX_PROJECTS),
  };
}

export const PARTICIPANT_TYPES: { value: ParticipantType; label: string }[] = [
  { value: 'attendee', label: 'Asistente' },
  { value: 'volunteer', label: 'Voluntario/a' },
  { value: 'speaker', label: 'Speaker' },
  { value: 'community', label: 'Comunidad aliada' },
  { value: 'sponsor', label: 'Sponsor' },
];

export const EXPERIENCE_LEVELS: { value: ExperienceLevel; label: string }[] = [
  { value: 'none', label: 'Ninguna, quiero empezar' },
  { value: 'beginner', label: 'Principiante' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
];

export const TECH_OPTIONS = [
  'HTML', 'CSS', 'JavaScript', 'TypeScript', 'Python',
  'Java', 'PHP', 'SQL', 'C#', 'C/C++',
  'Go', 'Rust', 'Dart/Flutter', 'Bash', 'Otros',
];

export const GOAL_OPTIONS = [
  'Aprender cosas nuevas',
  'Hacer contactos',
  'Buscar empleo o pasantía',
  'Encontrar equipo',
  'Mostrar mi proyecto',
  'Conocer comunidades',
];

export const OPEN_TO_OPTIONS = ['Colaborar en proyectos', 'Mentoría', 'Ofertas de trabajo', 'Freelance'];

export const INTEREST_OPTIONS = [
  'Desarrollo web',
  'Móvil',
  'Datos e IA',
  'Videojuegos',
  'Ciberseguridad',
  'Diseño UI/UX',
  'Cloud y DevOps',
  'Open source',
];

export async function fetchEventBySlug(slug: string): Promise<EventInfo | null> {
  const slugs = [slug, LEGACY_SLUGS[slug]].filter(Boolean) as string[];
  const { data } = await supabase
    .from('events')
    .select('id,title,slug,description,starts_at,location,capacity')
    .in('slug', slugs);
  const rows = (data as EventInfo[] | null) ?? [];
  return rows.find((r) => r.slug === slug) ?? rows[0] ?? null;
}

export async function fetchMyEventRegistration(eventId: string, userId: string): Promise<MyEventRegistration | null> {
  const { data: reg } = await supabase
    .from('event_registrations')
    .select('status')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  if (!reg) return null;
  const { data: profile } = await supabase
    .from('event_profiles')
    .select('participant_type,organization,experience_level,interests,accepts_photos,extra')
    .eq('event_id', eventId)
    .eq('user_id', userId)
    .maybeSingle();
  return {
    status: reg.status as MyEventRegistration['status'],
    profile: (profile as MyEventRegistration['profile']) ?? null,
  };
}

// Devuelve 'registered' o 'waitlisted'. Lanza Error con el mensaje de la base si no se pudo.
export async function registerForEvent(eventId: string, profile: EventProfileInput): Promise<'registered' | 'waitlisted'> {
  const { data, error } = await supabase.rpc('register_for_event_with_profile', {
    p_event: eventId,
    p_profile: { ...profile, extra: cleanExtra(profile.extra) },
  });
  if (error) throw new Error(error.message);
  return data as 'registered' | 'waitlisted';
}

// Edita el perfil de un evento ya inscrito (la política RLS solo deja tocar el propio)
export async function updateMyEventProfile(eventId: string, userId: string, profile: EventProfileInput): Promise<void> {
  const { error } = await supabase
    .from('event_profiles')
    .update({
      participant_type: profile.participant_type,
      organization: profile.organization.trim() || null,
      experience_level: profile.experience_level || null,
      interests: profile.interests,
      accepts_photos: profile.accepts_photos,
      extra: cleanExtra(profile.extra),
    })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function cancelEventRegistration(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_event_registration', { p_event: eventId });
  if (error) throw new Error(error.message);
}
