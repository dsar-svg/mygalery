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

function Spinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bone-light">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-charcoal font-serif italic text-lg text-center">{message}</p>
      </div>
    </div>
  );
}

// Three-state admin status:
//   'checking' — DB query in flight, do NOT redirect yet
//   'yes'      — confirmed admin
//   'no'       — confirmed not admin (redirect to login)
type AdminStatus = 'checking' | 'yes' | 'no';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  // True until the first auth state event is received and processed
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('checking');

  useEffect(() => {
    // onAuthStateChange fires INITIAL_SESSION immediately after Supabase finishes
    // initialization (including PKCE code exchange if detectSessionInUrl:true).
    // This is the single source of truth — no separate getSession() call needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setAdminStatus('no');
        setLoading(false);
        return;
      }

      if (session?.user) {
        setUser(session.user);
        setAdminStatus('checking');
        // Give the DB query plenty of time (8s). On auth callback the PKCE exchange
        // already completed before this event fires, so we only pay for the DB round-trip.
        const admin = await withTimeout(authService.isAdmin(session.user), 8000, false);
        setAdminStatus(admin ? 'yes' : 'no');
      } else {
        setUser(null);
        setAdminStatus('no');
      }

      // Mark loading done after the first event (INITIAL_SESSION, SIGNED_IN, etc.)
      setLoading(false);
    });

    const unsubSettings = artService.subscribeToSettings((data) => {
      setSettings(data);
    });

    return () => {
      subscription.unsubscribe();
      unsubSettings();
    };
  }, []);

  if (loading) {
    return <Spinner message="Cargando Galería..." />;
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
              // 'checking' → spinner (never redirect prematurely)
              // 'yes'      → admin panel
              // 'no'       → send to login
              adminStatus === 'checking'
                ? <Spinner message="Verificando acceso..." />
                : adminStatus === 'yes'
                  ? <AdminPanel user={user} />
                  : <Navigate to="/login" replace />
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
