import {
  createContext,
  useContext,
  useEffect,
  useState,
  useRef,
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
  // Id del usuario ya cargado: evita recargar perfil y estado cuando solo se renueva el token o se vuelve a la pestaña
  const loadedUserIdRef = useRef<string | null>(null);

  // Consulta el perfil y los roles del usuario en Supabase.
  // Si la fila de profiles no existe (PGRST116), la crea automáticamente
  // para que el alumno pueda rellenar sus datos sin importar el método de acceso.
  // Además, maneja salvavidas si la política RLS del servidor arroja error 403.
  const loadUserData = useCallback(async (userId: string) => {
    loadedUserIdRef.current = userId;
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
        // PGRST116 = fila no encontrada. Ocurre con usuarios de correo/contraseña
        // o Magic Link cuando no existe un trigger que cree la fila automáticamente.
        if (profileRes.error.code === 'PGRST116') {
          console.info('[AuthContext] Perfil no encontrado (PGRST116); creando fila inicial para userId:', userId);

          const { data: { user: currentUser } } = await supabase.auth.getUser();
          const userEmail = currentUser?.email ?? null;

          const { error: insertError } = await supabase
            .from('profiles')
            .insert([{ id: userId, email: userEmail, profile_completed: false }]);

          if (insertError) {
            console.warn('[AuthContext] No se pudo crear el perfil inicial:', insertError.message);
            // SALVAVIDAS RLS 403: Si la política RLS del backend rechaza la inserción,
            // asignamos un perfil mínimo en memoria para que la aplicación no colapse
            // ni se congele en un loop de recarga.
            setProfile({
              id: userId,
              full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null,
              email: userEmail,
              avatar_url: currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
              document_number: null,
              document_complement: null,
              document_issued_region_id: null,
              birth_date: null,
              phone: null,
              institution: null,
              degree: null,
              terms_accepted_at: null,
              profile_completed: false,
            });
          } else {
            // Re-leer el perfil recién creado para hidratar el estado correctamente
            const { data: newProfile, error: refetchError } = await supabase
              .from('profiles')
              .select('*')
              .eq('id', userId)
              .single();
            if (refetchError) {
              console.warn('[AuthContext] Error al releer perfil inicial:', refetchError.message);
              setProfile({
                id: userId,
                full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null,
                email: userEmail,
                avatar_url: currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
                document_number: null,
                document_complement: null,
                document_issued_region_id: null,
                birth_date: null,
                phone: null,
                institution: null,
                degree: null,
                terms_accepted_at: null,
                profile_completed: false,
              });
            } else {
              setProfile(newProfile as UserProfile);
            }
          }
        } else {
          console.warn('[AuthContext] Error al cargar perfil:', profileRes.error.message);
          // Si el SELECT mismo falló por RLS 403 (código 42501 o similar)
          if (/42501|permission denied|row-level security|403/i.test(profileRes.error.message || profileRes.error.code)) {
            const { data: { user: currentUser } } = await supabase.auth.getUser();
            setProfile({
              id: userId,
              full_name: currentUser?.user_metadata?.full_name || currentUser?.user_metadata?.name || null,
              email: currentUser?.email ?? null,
              avatar_url: currentUser?.user_metadata?.avatar_url || currentUser?.user_metadata?.picture || null,
              document_number: null,
              document_complement: null,
              document_issued_region_id: null,
              birth_date: null,
              phone: null,
              institution: null,
              degree: null,
              terms_accepted_at: null,
              profile_completed: false,
            });
          } else {
            setProfile(null);
          }
        }
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

  // Actualiza los campos permitidos del perfil usando UPSERT para garantizar
  // que la fila exista incluso si no fue creada previamente por el trigger de Supabase.
  const updateProfile = useCallback(
    async (data: UserProfileUpdateInput): Promise<{ error: Error | null }> => {
      if (!user) {
        return { error: new Error('No hay una sesión activa para actualizar el perfil.') };
      }

      try {
        const { error } = await supabase
          .from('profiles')
          .upsert({ id: user.id, ...data });

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

  // Cuenta con correo y contraseña (el correo se verifica con el enlace que envía Supabase)
  const signInWithEmail = useCallback(
    async (email: string, password: string): Promise<{ error: Error | null }> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        return { error: error ? new Error(error.message) : null };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    []
  );

  const signUpWithEmail = useCallback(
    async (
      email: string,
      password: string,
      fullName: string
    ): Promise<{ error: Error | null; needsConfirmation: boolean }> => {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: {
            data: { full_name: fullName.trim() },
            emailRedirectTo: window.location.origin,
          },
        });
        if (error) return { error: new Error(error.message), needsConfirmation: false };
        // Con un correo que ya tiene cuenta, Supabase no da error ni envía correo: responde un usuario sin identidades
        if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
          return { error: new Error('User already registered'), needsConfirmation: false };
        }
        // Sin sesión inmediata = hay que confirmar el correo
        return { error: null, needsConfirmation: !data.session };
      } catch (err) {
        return { error: err instanceof Error ? err : new Error(String(err)), needsConfirmation: false };
      }
    },
    []
  );

  // Vuelve a enviar el correo de confirmación de una cuenta creada con correo y contraseña
  const resendConfirmation = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email.trim(),
        options: { emailRedirectTo: window.location.origin },
      });
      return { error: error ? new Error(error.message) : null };
    } catch (err) {
      return { error: err instanceof Error ? err : new Error(String(err)) };
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<{ error: Error | null }> => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/restablecer`,
      });
      return { error: error ? new Error(error.message) : null };
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
      const nextUser = currentSession?.user ?? null;
      // Misma persona: se conserva el mismo objeto para que las páginas no se vuelvan a cargar solas
      setUser((prev) => (prev && nextUser && prev.id === nextUser.id ? prev : nextUser));

      if (nextUser) {
        if (nextUser.id !== loadedUserIdRef.current || _event === 'USER_UPDATED') {
          void loadUserData(nextUser.id);
        }
      } else {
        loadedUserIdRef.current = null;
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
    signInWithEmail,
    signUpWithEmail,
    resendConfirmation,
    resetPassword,
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
