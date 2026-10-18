
import { supabase } from '../lib/supabase';

export interface AdminUser {
  id: string;
  full_name: string | null;
  email: string | null;
  status: 'active' | 'suspended';
  roles: string[];
}

// Verificar permisos administrativos
async function requireAdmin(): Promise<string> {
  const { data: auth, error: authError } =
    await supabase.auth.getUser();

  if (authError || !auth.user) {
    throw new Error('Debes iniciar sesión.');
  }

  const { data, error } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', auth.user.id)
    .eq('role', 'admin')
    .limit(1);

  if (error) throw new Error(error.message);

  if (!data?.length) {
    throw new Error('No tienes permisos de administrador.');
  }

  return auth.user.id;
}

// Consultar las primeras 200 cuentas
export async function fetchAdminUsers(): Promise<AdminUser[]> {
  await requireAdmin();

  const [profilesResult, rolesResult] = await Promise.all([
    supabase
      .from('profiles')
      .select('id, full_name, email, status')
      .order('full_name')
      .limit(200),

    supabase
      .from('user_roles')
      .select('user_id, role'),
  ]);

  if (profilesResult.error) {
    throw new Error(profilesResult.error.message);
  }

  if (rolesResult.error) {
    throw new Error(rolesResult.error.message);
  }

  const rolesByUser = new Map<string, string[]>();

  for (const item of rolesResult.data ?? []) {
    const current = rolesByUser.get(item.user_id) ?? [];

    if (!current.includes(item.role)) {
      current.push(item.role);
    }

    rolesByUser.set(item.user_id, current);
  }

  return (profilesResult.data ?? []).map((profile) => ({
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    status: profile.status,
    roles: rolesByUser.get(profile.id) ?? [],
  }));
}

// Suspender una cuenta
export async function suspendAdminUser(
  userId: string,
  reason: string
): Promise<void> {
  if (!userId || !reason.trim()) {
    throw new Error('Debes indicar el motivo de suspensión.');
  }

  const adminId = await requireAdmin();

  if (userId === adminId) {
    throw new Error('No puedes suspender tu propia cuenta.');
  }

  const { error } = await supabase.rpc('suspend_user', {
    p_user: userId,
    p_reason: reason.trim(),
  });

  if (error) throw new Error(error.message);
}

// Reactivar una cuenta
export async function reactivateAdminUser(
  userId: string
): Promise<void> {
  if (!userId) {
    throw new Error('Selecciona un usuario.');
  }

  await requireAdmin();

  const { error } = await supabase.rpc('reactivate_user', {
    p_user: userId,
  });

  if (error) throw new Error(error.message);
}
