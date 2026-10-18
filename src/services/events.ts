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
export type TshirtSize = 'XS' | 'S' | 'M' | 'L' | 'XL' | 'XXL';

export interface EventProfileInput {
  participant_type: ParticipantType;
  organization: string;
  tshirt_size: TshirtSize | '';
  experience_level: ExperienceLevel | '';
  interests: string[];
  dietary_notes: string;
  how_found_us: string;
  accepts_photos: boolean;
}

export interface MyEventRegistration {
  status: 'registered' | 'waitlisted' | 'cancelled';
  profile: Omit<EventProfileInput, 'tshirt_size' | 'experience_level'> & {
    tshirt_size: TshirtSize | null;
    experience_level: ExperienceLevel | null;
  } | null;
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

export const TSHIRT_SIZES: TshirtSize[] = ['XS', 'S', 'M', 'L', 'XL', 'XXL'];

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
    .select('participant_type,organization,tshirt_size,experience_level,interests,dietary_notes,how_found_us,accepts_photos')
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
    p_profile: profile,
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
      tshirt_size: profile.tshirt_size || null,
      experience_level: profile.experience_level || null,
      interests: profile.interests,
      dietary_notes: profile.dietary_notes.trim() || null,
      how_found_us: profile.how_found_us.trim() || null,
      accepts_photos: profile.accepts_photos,
    })
    .eq('event_id', eventId)
    .eq('user_id', userId);
  if (error) throw new Error(error.message);
}

export async function cancelEventRegistration(eventId: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_event_registration', { p_event: eventId });
  if (error) throw new Error(error.message);
}
