import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export const ALLOWED_EMAILS = [
  'dariomedina2619@gmail.com',
  // Agrega más emails permitidos aquí
];

export const authService = {
  async login() {
    try {
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Redirigir al home después del login
          redirectTo: `${window.location.origin}`,
        },
      });

      if (error) throw error;
      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async handleCallback() {
    // Supabase maneja la sesión automáticamente al cargar la página
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  },

  isAdmin(user: User | null): boolean {
    if (!user?.email) return false;
    return ALLOWED_EMAILS.includes(user.email);
  },

  async logout() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    } catch (error) {
      console.error('Logout error:', error);
      throw error;
    }
  },

  onAuthChange(callback: (user: User | null) => void) {
    let initialSessionLoaded = false;

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      initialSessionLoaded = true;
      callback(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Skip initial session event since we already handled it
      if (event === 'INITIAL_SESSION' && initialSessionLoaded) {
        return;
      }
      callback(session?.user ?? null);
    });

    // Return unsubscribe function
    return () => {
      subscription.unsubscribe();
    };
  },

  async getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.user ?? null;
  }
};
