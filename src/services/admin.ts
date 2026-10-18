
import { supabase } from '../lib/supabase';

export interface AdminOffering {
  id: string;
  label: string;
  status: string;
  capacity: number | null;
  courseTitle: string;
}

export interface AdminTeacher {
  id: string;
  full_name: string;
  email: string | null;
}

// Obtener ediciones de los cursos
export async function fetchAdminOfferings(): Promise<AdminOffering[]> {
  const { data, error } = await supabase
    .from('course_offerings')
    .select('id, label, status, capacity, courses(title)')
    .order('label');

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((offering) => {
    const course = Array.isArray(offering.courses)
      ? offering.courses[0]
      : offering.courses;

    return {
      id: offering.id,
      label: offering.label,
      status: offering.status,
      capacity: offering.capacity,
      courseTitle: course?.title ?? 'Curso sin título',
    };
  });
}

// Obtener usuarios que tienen rol docente
export async function fetchAdminTeachers(): Promise<AdminTeacher[]> {
  const { data: roles, error: rolesError } = await supabase
    .from('user_roles')
    .select('user_id')
    .eq('role', 'teacher');

  if (rolesError) {
    throw new Error(rolesError.message);
  }

  const teacherIds = [...new Set(
    (roles ?? []).map((role) => role.user_id)
  )];

  if (teacherIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', teacherIds);

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((teacher) => ({
    id: teacher.id,
    full_name: teacher.full_name ?? 'Sin nombre',
    email: teacher.email,
  }));
}

// Crear grupos utilizando la función del backend
export async function createAdminGroups(
  offeringId: string,
  teacherIds: string[],
  groupSize: number
): Promise<void> {
  if (!offeringId) {
    throw new Error('Selecciona una edición.');
  }

  if (teacherIds.length === 0) {
    throw new Error('Selecciona al menos un docente.');
  }

  if (!Number.isInteger(groupSize) || groupSize <= 0) {
    throw new Error('Ingresa un tamaño de grupo válido.');
  }

  // Comprobar la sesión antes de realizar cambios
  const { data: authData, error: authError } =
    await supabase.auth.getUser();

  if (authError || !authData.user) {
    throw new Error('Debes iniciar sesión.');
  }

  // Comprobar el rol administrativo
  const { data: adminRole, error: roleError } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', authData.user.id)
    .eq('role', 'admin')
    .maybeSingle();

  if (roleError || !adminRole) {
    throw new Error('No tienes permisos de administrador.');
  }

  const { error } = await supabase.rpc('create_groups', {
    p_offering: offeringId,
    p_teacher_ids: teacherIds,
    p_group_size: groupSize,
  });

  if (error) {
    throw new Error(error.message);
  }
}

/* =========================================
   CONSULTA DE GRUPOS EXISTENTES
========================================= */

export interface AdminGroup {
  id: string;
  offering_id: string;
  name: string;
  teacher_id: string | null;
  capacity: number | null;
}

export async function fetchAdminGroups(
  offeringId: string
): Promise<AdminGroup[]> {

  if (!offeringId) {
    return [];
  }

  const { data, error } = await supabase
    .from('offering_groups')
    .select('id, offering_id, name, teacher_id, capacity')
    .eq('offering_id', offeringId)
    .order('name');

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}
