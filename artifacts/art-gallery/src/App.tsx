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

function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([
    promise,
    new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [isAuthCallback, setIsAuthCallback] = useState(false);

  useEffect(() => {
    // Detect auth callback URL so we can show the right spinner message.
    // Do NOT clean the URL here — AuthCallback needs the hash/code to exchange
    // the token. It will call replaceState itself once the exchange succeeds.
    const hasAuthInUrl =
      window.location.hash.includes('access_token') ||
      window.location.search.includes('code');

    if (hasAuthInUrl) {
      setIsAuthCallback(true);
    }

    const run = async () => {
      try {
        // 3-second hard cap on getSession() — avoids hangs on broken sessions
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          3000,
          { data: { session: null } } as any,
        );

        if (session?.user) {
          setUser(session.user);
          // 4-second hard cap on the DB admin check — if it hangs we default
          // to false so the user sees login instead of an infinite spinner.
          const admin = await withTimeout(
            authService.isAdmin(session.user),
            4000,
            false,
          );
          setIsAdmin(admin);
        } else {
          setUser(null);
          setIsAdmin(false);
        }
      } catch {
        // Broken / missing session — sign out silently and start fresh
        try { await supabase.auth.signOut(); } catch { /* ignore */ }
        setUser(null);
        setIsAdmin(false);
      } finally {
        // Always unblock the UI — this now runs after BOTH session AND admin
        // checks complete (or time out), so loading: false is guaranteed.
        setIsAuthCallback(false);
        setLoading(false);
      }
    };

    run();

    // Only react to explicit auth events — not INITIAL_SESSION which would
    // double-fire with the getSession() call above and cause a race condition.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        setUser(session?.user ?? null);
        if (session?.user) {
          const admin = await withTimeout(authService.isAdmin(session.user), 4000, false);
          setIsAdmin(admin);
        } else {
          setIsAdmin(false);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
      }
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
