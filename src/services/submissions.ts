import { supabase, FUNCTIONS_URL } from '../lib/supabase';

// Entregas con archivos (se guardan en Google Drive a través de la Edge Function `drive-files`).
// El navegador nunca recibe credenciales de Drive.

export const MAX_FILES = 10;
export const MAX_FILE_BYTES = 50 * 1024 * 1024;

export interface SubmissionFile {
  id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  created_at: string;
}

export interface AssignmentItem {
  id: string;
  title: string;
  description: string | null;
  due_at: string | null;
  max_score: number;
  submission: {
    id: string;
    score: number | null;
    feedback: string | null;
    files: SubmissionFile[];
  } | null;
}

export interface MaterialItem {
  id: string;
  title: string;
  kind: string;
  url: string;
}

export async function fetchAssignments(offeringId: string, userId: string): Promise<AssignmentItem[]> {
  const { data: assignments, error } = await supabase
    .from('assignments')
    .select('id,title,description,due_at,max_score')
    .eq('offering_id', offeringId)
    .order('due_at', { ascending: true, nullsFirst: false });
  if (error || !assignments) return [];

  const ids = assignments.map((a: { id: string }) => a.id);
  if (ids.length === 0) return [];

  const { data: subs } = await supabase
    .from('submissions')
    .select('id,assignment_id,score,feedback, submission_files(id,file_name,mime_type,size_bytes,created_at)')
    .eq('user_id', userId)
    .in('assignment_id', ids);

  const byAssignment = new Map<string, any>((subs ?? []).map((s: any) => [s.assignment_id, s]));
  return (assignments as any[]).map((a) => {
    const s = byAssignment.get(a.id);
    return {
      ...a,
      submission: s
        ? { id: s.id, score: s.score, feedback: s.feedback, files: s.submission_files ?? [] }
        : null,
    };
  });
}

export async function fetchFilesBySubmission(submissionId: string): Promise<SubmissionFile[]> {
  const { data, error } = await supabase
    .from('submission_files')
    .select('id,file_name,mime_type,size_bytes,created_at')
    .eq('submission_id', submissionId)
    .order('created_at');
  if (error || !data) return [];
  return data as SubmissionFile[];
}

export async function fetchMaterials(offeringId: string): Promise<MaterialItem[]> {
  const { data, error } = await supabase
    .from('materials')
    .select('id,title,kind,url')
    .eq('offering_id', offeringId)
    .order('created_at');
  if (error || !data) return [];
  return data as MaterialItem[];
}

// ─── Llamadas a la Edge Function ────────────────────────────────────────────

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Inicia sesión para continuar.');
  return { Authorization: `Bearer ${token}`, apikey: import.meta.env.VITE_SUPABASE_ANON_KEY ?? '' };
}

async function callFunction<T>(body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${FUNCTIONS_URL}/drive-files`, {
    method: 'POST',
    headers: { ...(await authHeaders()), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error ?? 'No se pudo completar la operación.');
  return json as T;
}

// Sube el archivo directo a Google con la URL de sesión que entrega la función; devuelve el id de Drive.
function putToDrive(uploadUrl: string, file: File, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', uploadUrl);
    xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText).id as string);
        } catch {
          reject(new Error('Google no confirmó la subida.'));
        }
      } else {
        reject(new Error(`Google rechazó la subida (${xhr.status}).`));
      }
    };
    xhr.onerror = () => reject(new Error('Se cortó la conexión durante la subida.'));
    xhr.send(file);
  });
}

export function validateFiles(existing: number, files: File[]): string | null {
  if (existing + files.length > MAX_FILES) {
    return `Máximo ${MAX_FILES} archivos por entrega (ya tienes ${existing}).`;
  }
  const big = files.find((f) => f.size > MAX_FILE_BYTES);
  if (big) return `«${big.name}» supera los 50 MB.`;
  const empty = files.find((f) => f.size === 0);
  if (empty) return `«${empty.name}» está vacío.`;
  return null;
}

export async function uploadSubmissionFile(
  assignmentId: string,
  file: File,
  onProgress: (pct: number) => void
): Promise<SubmissionFile> {
  const start = await callFunction<{ upload_url: string; submission_id: string }>({
    action: 'start_upload',
    assignment_id: assignmentId,
    file_name: file.name,
    mime_type: file.type || 'application/octet-stream',
    size: file.size,
  });
  const driveId = await putToDrive(start.upload_url, file, onProgress);
  const done = await callFunction<{ file: SubmissionFile }>({
    action: 'complete_upload',
    submission_id: start.submission_id,
    drive_file_id: driveId,
  });
  return done.file;
}

export async function deleteSubmissionFile(fileId: string): Promise<void> {
  await callFunction<{ ok: boolean }>({ action: 'delete_file', file_id: fileId });
}

// Trae el archivo con la sesión del usuario (un <iframe src> no puede enviar el token).
export async function fetchFileBlob(fileId: string, disposition: 'inline' | 'attachment'): Promise<Blob> {
  const res = await fetch(`${FUNCTIONS_URL}/drive-files?id=${encodeURIComponent(fileId)}&disposition=${disposition}`, {
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error ?? 'No se pudo abrir el archivo.');
  }
  return await res.blob();
}

export const INLINE_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'text/plain'];

export function formatSize(bytes: number | null): string {
  if (bytes === null) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

// Convierte un enlace de Drive/Docs en su versión embebible (/preview). Devuelve null si no es de Drive.
export function toDrivePreviewUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname !== 'drive.google.com' && u.hostname !== 'docs.google.com') return null;
    const file = u.pathname.match(/\/(?:file|document|presentation|spreadsheets)\/d\/([\w-]+)/);
    if (!file) return null;
    const kind = u.pathname.split('/')[1];
    return u.hostname === 'drive.google.com'
      ? `https://drive.google.com/file/d/${file[1]}/preview`
      : `https://docs.google.com/${kind}/d/${file[1]}/preview`;
  } catch {
    return null;
  }
}
