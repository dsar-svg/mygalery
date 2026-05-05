import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const isMisconfigured = !supabaseUrl || !supabaseAnonKey;

if (isMisconfigured) {
  console.warn('Supabase credentials not found. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment variables.');
}

export const supabase = isMisconfigured
  ? createClient('https://placeholder.supabase.co', 'placeholder-key', {
      auth: {
        detectSessionInUrl: false,
        persistSession: false,
        autoRefreshToken: false,
      },
    })
  : createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // false = Supabase never scans window.location for tokens at getSession()
        // time. This prevents the "URL could be stale" warning when reloading any
        // page that once had #access_token in the hash. The AuthCallback page
        // handles the token manually using setSession / exchangeCodeForSession.
        detectSessionInUrl: false,
        persistSession: true,
        autoRefreshToken: true,
      },
    });
