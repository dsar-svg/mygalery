import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LandingPage } from './components/LandingPage';
import { AdminPanel } from './components/AdminPanel';
import { ArtworkDetail } from './components/ArtworkDetail';
import { Layout } from './components/Layout';
import { Login } from './pages/Login';
import { AuthCallback } from './pages/AuthCallback';
import { useEffect, useState } from 'react';
import { authService } from './lib/auth';
import { artService } from './services/artService';
import { User } from '@supabase/supabase-js';
import { SiteSettings } from './types';
import { supabase } from './lib/supabase';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthCallback, setIsAuthCallback] = useState(false);

  useEffect(() => {
    const isCallback = window.location.hash.includes('access_token') ||
                       window.location.search.includes('code');
    if (isCallback) {
      setIsAuthCallback(true);
    }

    // Reduced to 3 seconds — stale sessions can cause getSession() to hang
    // indefinitely at the browser level even if JS times out
    const sessionTimeout = new Promise<{ data: { session: null } }>((resolve) =>
      setTimeout(() => resolve({ data: { session: null } }), 3000)
    );

    Promise.race([supabase.auth.getSession(), sessionTimeout])
      .then(async ({ data: { session } }) => {
        if (session?.user) {
          setUser(session.user);
          const admin = await authService.isAdmin(session.user);
          setIsAdmin(admin);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
        setIsAuthCallback(false);
      })
      .catch(async () => {
        // Session check failed — sign out to clear any broken/stale session
        // so the next refresh starts clean instead of hanging again
        try { await supabase.auth.signOut(); } catch {}
        setUser(null);
        setIsAdmin(false);
        setIsAuthCallback(false);
      })
      .finally(() => {
        setLoading(false);
      });

    // Only react to explicit auth events — not INITIAL_SESSION which would
    // double-fire with the getSession() call above and cause a race condition
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        if (session?.user) {
          const admin = await authService.isAdmin(session.user);
          setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
      }
      setIsAuthCallback(false);
    });

    const unsubSettings = artService.subscribeToSettings((data) => {
      setSettings(data);
    });

    return () => {
      subscription.unsubscribe();
      unsubSettings();
    };
  }, []);

  if (loading || isAuthCallback) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone-light">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="text-charcoal font-serif italic text-lg text-center">
            {isAuthCallback ? 'Procesando inicio de sesión...' : 'Cargando Galería...'}
          </p>
        </div>
      </div>
    );
  }

  const basePath = import.meta.env.BASE_URL.replace(/\/$/, "");

  return (
    <BrowserRouter basename={basePath}>
      <Routes>
        <Route path="/" element={<Layout user={user} settings={settings} />}>
          <Route index element={<LandingPage settings={settings} />} />
          <Route path="artwork/:id" element={<ArtworkDetail settings={settings} />} />
          <Route path="login" element={<Login />} />
          <Route path="auth/callback" element={<AuthCallback />} />
          <Route
            path="admin"
            element={
              isAdmin === true
                ? <AdminPanel user={user} />
                : <Navigate to="/login" replace />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
