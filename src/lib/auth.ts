import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export const ALLOWED_EMAILS = [
  'dariomedina2619@gmail.com',
  // Agrega más emails permitidos aquí
];

export const authService = {
  async login() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/admin`,
        },
      });

      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
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

  isAdmin(user: User | null): boolean {
    if (!user?.email) return false;
    return ALLOWED_EMAILS.includes(user.email);
  }
};
