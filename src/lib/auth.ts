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
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (error) throw error;
      return null;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      callback(session?.user ?? null);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
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
