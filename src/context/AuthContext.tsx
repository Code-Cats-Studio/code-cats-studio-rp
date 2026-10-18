import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';
import type {
  AppRole,
  AuthContextType,
  UserProfile,
  UserProfileUpdateInput,
} from '../types/auth';

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [roles, setRoles] = useState<AppRole[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Consulta el perfil y los roles del usuario en Supabase
  const loadUserData = useCallback(async (userId: string) => {
    try {
      const [profileRes, rolesRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .single(),
        supabase
          .from('user_roles')
          .select('role'),
      ]);

      if (profileRes.error) {
        console.warn('[AuthContext] Error al cargar perfil:', profileRes.error.message);
        setProfile(null);
      } else {
        setProfile(profileRes.data as UserProfile);
      }

      if (rolesRes.error) {
        console.warn('[AuthContext] Error al cargar roles:', rolesRes.error.message);
        setRoles([]);
      } else if (rolesRes.data) {
        const userRoles = rolesRes.data.map(
          (item: { role: AppRole }) => item.role
        );
        setRoles(userRoles);
      }
    } catch (err) {
      console.error('[AuthContext] Error inesperado consultando datos de usuario:', err);
      setProfile(null);
      setRoles([]);
    }
  }, []);

  // Recarga manualmente los datos del perfil
  const refreshProfile = useCallback(async () => {
    if (!user) return;
    await loadUserData(user.id);
  }, [user, loadUserData]);

  // Actualiza los campos permitidos del perfil según GUIA_FRONTEND.md
  const updateProfile = useCallback(
    async (data: UserProfileUpdateInput): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('No hay una sesión activa para actualizar el perfil.') };
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .update(data)
          .eq('id', user.id);

        if (error) {
          return { error: new Error(error.message) };
        }

        // Refrescar el estado local tras la actualización exitosa
        await loadUserData(user.id);
        return { error: null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [user, loadUserData]
  );

  // Iniciar sesión con Google OAuth
  const signInWithGoogle = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  // Cerrar sesión
  const signOut = useCallback(async (): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.signOut();
      setProfile(null);
      setRoles([]);
      setSession(null);
      setUser(null);

      if (error) {
        return { error: new Error(error.message) };
      }

      return { error: null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  // Inicialización y escucha de cambios de sesión
  useEffect(() => {
    let isMounted = true;

    // Obtener sesión actual inicial
    const initAuth = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();

        if (error) {
          console.warn('[AuthContext] Error al recuperar sesión inicial:', error.message);
        }

        if (isMounted) {
          setSession(initialSession);
          setUser(initialSession?.user ?? null);

          if (initialSession?.user) {
            await loadUserData(initialSession.user.id);
          }
        }
      } catch (err) {
        console.error('[AuthContext] Error durante la inicialización de autenticación:', err);
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void initAuth();

    // Escuchar eventos en tiempo real de AuthStateChange
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      if (!isMounted) return;

      setSession(currentSession);
      setUser(currentSession?.user ?? null);

      if (currentSession?.user) {
        void loadUserData(currentSession.user.id);
      } else {
        setProfile(null);
        setRoles([]);
      }

      setIsLoading(false);
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [loadUserData]);

  const isProfileComplete = Boolean(profile?.profile_completed);

  const value: AuthContextType = {
    session,
    user,
    profile,
    roles,
    isLoading,
    isProfileComplete,
    signInWithGoogle,
    signOut,
    refreshProfile,
    updateProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser utilizado dentro de un AuthProvider');
  }
  return context;
}
