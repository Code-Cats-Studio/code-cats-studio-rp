import type { Session, User } from '@supabase/supabase-js';

export type AppRole = 'student' | 'teacher' | 'admin';

export interface UserRoleRecord {
  role: AppRole;
}

export interface UserProfile {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url?: string | null;
  document_number: string | null;
  document_complement: string | null;
  document_issued_region_id: number | null;
  birth_date: string | null;
  phone: string | null;
  institution: string | null;
  degree: string | null;
  terms_accepted_at: string | null;
  profile_completed: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface UserProfileUpdateInput {
  full_name: string;
  birth_date: string;
  phone?: string;
  institution?: string;
  degree?: string;
  terms_accepted_at: string;
}

export interface AuthContextType {
  session: Session | null;
  user: User | null;
  profile: UserProfile | null;
  roles: AppRole[];
  isLoading: boolean;
  isProfileComplete: boolean;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signInWithEmail: (email: string, password: string) => Promise<{ error: Error | null }>;
  // needsConfirmation = true cuando Supabase envió el correo para verificar la cuenta
  signUpWithEmail: (
    email: string,
    password: string,
    fullName: string
  ) => Promise<{ error: Error | null; needsConfirmation: boolean }>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  updateProfile: (data: UserProfileUpdateInput) => Promise<{ error: Error | null }>;
}
