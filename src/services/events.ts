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

export const ROLE_AREAS = [
  { value: 'frontend', label: 'Front-end' },
  { value: 'backend', label: 'Back-end' },
  { value: 'fullstack', label: 'Full-stack' },
  { value: 'ui_ux', label: 'UI/UX' },
  { value: 'mobile', label: 'Móvil' },
  { value: 'data', label: 'Datos e IA' },
  { value: 'devops', label: 'DevOps / Cloud' },
  { value: 'other', label: 'Otro' },
] as const;

export const WORK_MODES = [
  { value: 'remote', label: 'Remoto' },
  { value: 'onsite', label: 'Presencial' },
  { value: 'hybrid', label: 'Híbrido' },
] as const;

export const AVAILABILITY_OPTIONS = [
  { value: 'immediate', label: 'Inmediata' },
  { value: 'one_month', label: 'En 1 mes' },
  { value: 'part_time', label: 'Medio tiempo' },
  { value: 'internship', label: 'Pasantía o prácticas' },
  { value: 'freelance', label: 'Freelance' },
  { value: 'not_looking', label: 'No busco por ahora' },
] as const;

export const LANGUAGE_OPTIONS = ['Español', 'Inglés', 'Portugués', 'Francés', 'Quechua', 'Aymara'];
export const LANGUAGE_LEVELS = [
  { value: 'basic', label: 'Básico' },
  { value: 'intermediate', label: 'Intermedio' },
  { value: 'advanced', label: 'Avanzado' },
  { value: 'native', label: 'Nativo' },
] as const;

export interface CatPassProject {
  name: string;
  description: string;
  url: string;
}

export interface CatPassLanguage {
  name: string;
  level: string;
}

// Campos del Cat Pass y del CV que viven en event_profiles.extra (jsonb)
export interface CatPassExtra {
  knows: string[]; // stack
  wants_to_learn: string[];
  goals: string[];
  role_area: string;
  role_title: string;
  socials: Record<SocialKey, string>;
  business_contact: string;
  projects: CatPassProject[];
  work_modes: string[];
  availability: string;
  languages: CatPassLanguage[];
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
export const MAX_LANGUAGES = 4;
export const PROJECT_DESCRIPTION_MAX = 240;

export const emptyExtra = (): CatPassExtra => ({
  knows: [], wants_to_learn: [], goals: [],
  role_area: '', role_title: '',
  socials: { linkedin: '', github: '', instagram: '', website: '' },
  business_contact: '', projects: [],
  work_modes: [], availability: '', languages: [],
});

const asStrings = (v: unknown): string[] => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []);
const asString = (v: unknown): string => (typeof v === 'string' ? v : '');
const asObject = (v: unknown): Record<string, unknown> => (v && typeof v === 'object' ? (v as Record<string, unknown>) : {});

// Lo que viene de la BD no es de fiar: se normaliza a la forma esperada
export function parseExtra(raw: unknown): CatPassExtra {
  const r = asObject(raw);
  const socials = asObject(r.socials);
  return {
    knows: asStrings(r.knows),
    wants_to_learn: asStrings(r.wants_to_learn),
    goals: asStrings(r.goals),
    role_area: asString(r.role_area),
    role_title: asString(r.role_title),
    socials: Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, asString(socials[key])])) as Record<SocialKey, string>,
    business_contact: asString(r.business_contact),
    projects: (Array.isArray(r.projects) ? r.projects : []).slice(0, MAX_PROJECTS).map((p) => {
      const o = asObject(p);
      return { name: asString(o.name), description: asString(o.description), url: asString(o.url) };
    }),
    work_modes: asStrings(r.work_modes),
    availability: asString(r.availability),
    languages: (Array.isArray(r.languages) ? r.languages : []).slice(0, MAX_LANGUAGES).map((l) => {
      const o = asObject(l);
      return { name: asString(o.name), level: asString(o.level) };
    }),
  };
}

// Se guarda solo lo que tiene contenido
export function cleanExtra(extra: CatPassExtra): CatPassExtra {
  return {
    ...extra,
    role_title: extra.role_title.trim(),
    business_contact: extra.business_contact.trim(),
    socials: Object.fromEntries(SOCIAL_FIELDS.map(({ key }) => [key, extra.socials[key].trim()])) as Record<SocialKey, string>,
    projects: extra.projects
      .map((p) => ({ name: p.name.trim(), description: p.description.trim().slice(0, PROJECT_DESCRIPTION_MAX), url: p.url.trim() }))
      .filter((p) => p.name || p.description || p.url)
      .slice(0, MAX_PROJECTS),
    languages: extra.languages.filter((l) => l.name && l.level).slice(0, MAX_LANGUAGES),
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

export interface EventSpots {
  is_full: boolean;
  spots_left: number | null; // null = sin límite
}

// Lugares que quedan (la BD cuenta las inscripciones; aquí solo llegan las cifras). null = evento no disponible
export async function fetchEventSpots(eventId: string): Promise<EventSpots | null> {
  const { data, error } = await supabase.rpc('event_spots', { p_event: eventId });
  if (error) return null;
  const row = (data as EventSpots[] | null)?.[0];
  return row ?? null;
}

export const isFullError = (message: string) => /cupo lleno/i.test(message);

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

// Lanza Error con el mensaje de la base si no se pudo (p. ej. «Cupo lleno», ver isFullError).
export async function registerForEvent(eventId: string, profile: EventProfileInput): Promise<void> {
  const { error } = await supabase.rpc('register_for_event_with_profile', {
    p_event: eventId,
    p_profile: { ...profile, extra: cleanExtra(profile.extra) },
  });
  if (error) throw new Error(error.message);
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
