
import { supabase } from '../lib/supabase';

export interface AdminCertificate {
  id: string;
  user_name_snapshot: string;
  issued_at: string;
  revoked_at: string | null;
}

export interface CertificateOverview {
  approved: number;
  issued: number;
  certificates: AdminCertificate[];
}

// Verificar que la cuenta tenga permisos de administrador
async function requireAdmin(): Promise<void> {
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
}

// Consultar aprobados y certificados de una edición
export async function fetchCertificateOverview(
  offeringId: string
): Promise<CertificateOverview> {
  if (!offeringId) {
    throw new Error('Selecciona una edición.');
  }

  await requireAdmin();

  const [approvedResult, issuedResult, certificatesResult] =
    await Promise.all([
      supabase
        .from('enrollments')
        .select('id', { count: 'exact', head: true })
        .eq('offering_id', offeringId)
        .eq('status', 'completed'),

      supabase
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('offering_id', offeringId),

      supabase
        .from('certificates')
        .select('id, user_name_snapshot, issued_at, revoked_at')
        .eq('offering_id', offeringId)
        .order('issued_at', { ascending: false })
        .limit(100),
    ]);

  if (approvedResult.error) {
    throw new Error(approvedResult.error.message);
  }

  if (issuedResult.error) {
    throw new Error(issuedResult.error.message);
  }

  if (certificatesResult.error) {
    throw new Error(certificatesResult.error.message);
  }

  return {
    approved: approvedResult.count ?? 0,
    issued: issuedResult.count ?? 0,
    certificates: certificatesResult.data ?? [],
  };
}

// Emitir certificados para estudiantes aprobados
export async function issueCertificatesForOffering(
  offeringId: string
): Promise<number> {
  if (!offeringId) {
    throw new Error('Selecciona una edición.');
  }

  await requireAdmin();

  const { data, error } = await supabase.rpc(
    'issue_certificates_for_offering',
    { p_offering: offeringId }
  );

  if (error) throw new Error(error.message);

  if (typeof data !== 'number') {
    throw new Error('Respuesta inesperada del servidor.');
  }

  return data;
}
