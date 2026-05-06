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

async function withTimeout<T>(promise: Promise<T>, ms: number, fallback: T): Promise<T> {
  const timeout = new Promise<T>((resolve) => setTimeout(() => resolve(fallback), ms));
  return Promise.race([promise, timeout]);
}

function Spinner({ message }: { message: string }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-bone-light">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-charcoal font-serif italic text-lg text-center px-4">{message}</p>
      </div>
    </div>
  );
}

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  
  // 1. MEMORIA INICIAL: Leemos si ya éramos admin para evitar el rebote al Home
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() => {
    return localStorage.getItem('is_admin_session') === 'true' ? true : null;
  });

  useEffect(() => {
    const checkAdmin = async (u: User) => {
      // Validamos sin resetear el estado a null si ya tenemos un true
      const result = await withTimeout(authService.isAdmin(u), 5000, isAdmin === true);
      setIsAdmin(result);
      if (result) localStorage.setItem('is_admin_session', 'true');
      else localStorage.removeItem('is_admin_session');
    };

    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await checkAdmin(session.user);
        } else {
          setIsAdmin(false);
          localStorage.removeItem('is_admin_session');
        }
      } finally {
        setLoading(false);
      }
    };

    initApp();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      if (session?.user) {
        setUser(session.user);
        // Si ya somos admin confirmado, no bloqueamos la interfaz
        await checkAdmin(session.user);
      } else {
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem('is_admin_session');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading && !settings && !user) {
    return <Spinner message="Preparando exposición..." />;
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
              user ? (
                // 2. LÓGICA DE PROTECCIÓN: No redirigimos si isAdmin es null o true
                isAdmin === false ? (
                  <Navigate to="/" replace />
                ) : isAdmin === true ? (
                  <AdminPanel user={user} />
                ) : (
                  <Spinner message="Sincronizando permisos..." />
                )
              ) : (
                <Navigate to="/login" replace />
              )
            }
          />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
