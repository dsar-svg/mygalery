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

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = verificando, true/false = resultado

  useEffect(() => {
    // 1. Obtener sesión inicial inmediatamente para evitar bloqueo
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        const admin = await authService.isAdmin(session.user);
        setIsAdmin(admin);
      } else {
        setIsAdmin(false);
      }
      setLoading(false); // Liberamos el spinner inicial lo antes posible
    };

    initAuth();

    // 2. Escuchar cambios futuros (Login/Logout)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user);
        const admin = await authService.isAdmin(session.user);
        setIsAdmin(admin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      setLoading(false);
    });

    const unsubSettings = artService.subscribeToSettings((data) => setSettings(data));

    return () => {
      subscription.unsubscribe();
      unsubSettings();
    };
  }, []);

  // Solo mostramos el spinner de "Cargando Galería" en el primer arranque
  if (loading && !user) {
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
              user ? (
                isAdmin === null ? (
                  <Spinner message="Verificando permisos..." />
                ) : isAdmin ? (
                  <AdminPanel user={user} />
                ) : (
                  <Navigate to="/" replace />
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
