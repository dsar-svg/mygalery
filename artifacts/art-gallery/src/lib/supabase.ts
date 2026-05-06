import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMisconfigured = !supabaseUrl || !supabaseAnonKey;

if (isMisconfigured) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

// Configuración común para evitar repetición
const authConfig = {
  autoRefreshToken: true,
  persistSession: true,
  detectSessionInUrl: true,
  storage: window.localStorage,
  // Añadimos una clave única para evitar conflictos con otras apps de Supabase en localhost
  storageKey: 'galleria-darte-auth-session', 
  // Esto ayuda a que la sesión no se pierda si hay micro-cortes de internet
  flowType: 'pkce' as const 
};

export const supabase = isMisconfigured
  ? createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        ...authConfig,
        persistSession: false, // Desactivado para el placeholder
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: authConfig,
    });
