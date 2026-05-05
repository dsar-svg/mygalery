import { supabase } from './supabase';
import { User } from '@supabase/supabase-js';

export const authService = {
  async loginWithGoogle() {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  },

  async loginWithEmail(email: string, password: string) {
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
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

  async isAdmin(user: User | null): Promise<boolean> {
    if (!user?.email) return false;

    const { data } = await supabase
      .from('allowed_emails')
      .select('email')
      .eq('email', user.email)
      .single();

    return !!data;
  }
};
