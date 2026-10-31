// Mensajes de error de Supabase Auth y de la base de datos, traducidos a algo que entienda cualquier persona

// Si el mensaje trae "after N seconds" devuelve ese N
export function retryAfterSeconds(message: string): number | null {
  const match = message.match(/after (\d+) seconds?/i);
  return match ? Number(match[1]) : null;
}

export function translateAuthError(message: string): string {
  const wait = retryAfterSeconds(message);
  if (wait !== null) return `Por seguridad debes esperar ${wait} segundos antes de volver a intentarlo.`;
  if (/rate limit|too many/i.test(message)) return 'Hiciste demasiados intentos. Espera unos minutos y vuelve a intentarlo.';
  // "Invalid login credentials" y variantes — Supabase Auth v2
  if (/invalid login|invalid credentials|invalid email or password/i.test(message)) return 'Correo o contraseña incorrectos. Verifica que estés usando el mismo método con el que te registraste.';
  // "Email not confirmed" — Supabase envía este mensaje exacto cuando el correo aún no fue verificado
  if (/email not confirmed|not confirmed/i.test(message)) return 'Aún no confirmaste tu correo. Revisa tu bandeja de entrada (y la carpeta de spam).';
  if (/different from the old/i.test(message)) return 'La contraseña nueva debe ser distinta de la anterior.';
  if (/password.*(short|least|characters)/i.test(message)) return 'La contraseña es muy corta (mínimo 8 caracteres).';
  if (/weak|easy to guess|pwned/i.test(message)) return 'Esa contraseña es muy fácil de adivinar. Elige otra más segura.';
  if (/already registered|already been registered/i.test(message)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/user already registered/i.test(message)) return 'Ya existe una cuenta con ese correo. Inicia sesión o usa "Olvidé mi contraseña".';
  if (/invalid email|valid email/i.test(message)) return 'Escribe un correo válido.';
  if (/session.*missing|not authenticated/i.test(message)) return 'Tu sesión caducó. Vuelve a iniciar sesión.';
  // Errores de seguridad RLS 403
  if (/row-level security|permission denied|42501|403|unauthorized/i.test(message)) {
    return 'Acceso denegado por políticas de seguridad del servidor (error 403/RLS). El administrador está ajustando los permisos. Por favor intenta de nuevo en unos minutos.';
  }
  // Errores de red o tiempo de espera agotado — evita que el botón parezca congelado
  if (/network|fetch|failed to fetch|load failed/i.test(message)) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return message;
}

export function translateProfileError(message: string): string {
  // Errores de seguridad RLS 403 al interactuar con profiles
  if (/row-level security|permission denied|42501|403|unauthorized/i.test(message)) {
    return 'No se pudo guardar el perfil por políticas de seguridad del servidor (error 403 / RLS). El administrador está actualizando las reglas de acceso en Supabase. Tus datos están a salvo; por favor reintenta en breve.';
  }
  if (/profiles_document_uniq/i.test(message)) {
    return 'Ese número de CI ya está registrado en otra cuenta. Si es tuyo, escríbenos a code.cats.studio@gmail.com para ayudarte.';
  }
  if (/duplicate key/i.test(message)) return 'Ya existe un registro con esos datos.';
  if (/violates check constraint/i.test(message)) return 'Alguno de los datos no tiene un formato válido. Revísalos e inténtalo de nuevo.';
  // Errores de red al guardar el perfil
  if (/network|fetch|failed to fetch|load failed/i.test(message)) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return message;
}
