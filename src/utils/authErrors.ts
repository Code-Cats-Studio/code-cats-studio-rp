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
  if (/invalid login|credentials/i.test(message)) return 'Correo o contraseña incorrectos.';
  if (/not confirmed/i.test(message)) return 'Aún no confirmaste tu correo. Revisa tu bandeja (y spam).';
  if (/different from the old/i.test(message)) return 'La contraseña nueva debe ser distinta de la anterior.';
  if (/password.*(short|least|characters)/i.test(message)) return 'La contraseña es muy corta (mínimo 8 caracteres).';
  if (/weak|easy to guess|pwned/i.test(message)) return 'Esa contraseña es muy fácil de adivinar. Elige otra más segura.';
  if (/already registered|already been registered/i.test(message)) return 'Ya existe una cuenta con ese correo. Inicia sesión.';
  if (/invalid email|valid email/i.test(message)) return 'Escribe un correo válido.';
  if (/session.*missing|not authenticated/i.test(message)) return 'Tu sesión caducó. Abre de nuevo el enlace de tu correo.';
  if (/network|fetch/i.test(message)) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return message;
}

export function translateProfileError(message: string): string {
  if (/profiles_document_uniq/i.test(message)) {
    return 'Ese número de CI ya está registrado en otra cuenta. Si es tuyo, escríbenos a code.cats.studio@gmail.com para ayudarte.';
  }
  if (/duplicate key/i.test(message)) return 'Ya existe un registro con esos datos.';
  if (/violates check constraint/i.test(message)) return 'Alguno de los datos no tiene un formato válido. Revísalos e inténtalo de nuevo.';
  if (/network|fetch/i.test(message)) return 'No pudimos conectarnos. Revisa tu internet e inténtalo de nuevo.';
  return message;
}
