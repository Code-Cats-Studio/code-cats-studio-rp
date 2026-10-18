import { createClient } from '@supabase/supabase-js';

const envUrl = import.meta.env.VITE_SUPABASE_URL;
const envAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Fallback preventivo en caso de que las variables estén vacías durante la fase inicial de configuración
const supabaseUrl =
  envUrl && envUrl.trim() !== ''
    ? envUrl
    : 'https://placeholder-project.supabase.co';

const supabaseAnonKey =
  envAnonKey && envAnonKey.trim() !== ''
    ? envAnonKey
    : 'placeholder-anon-key';

if (!envUrl || !envAnonKey) {
  console.warn(
    '[Supabase] ADVERTENCIA: VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY están vacías en .env. ' +
      'Por favor asigna tus credenciales reales del proyecto de Supabase.'
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const FUNCTIONS_URL: string = import.meta.env.VITE_FUNCTIONS_URL || '';
