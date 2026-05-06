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

// Eliminamos withTimeout agresivo para evitar falsos negativos en la validación
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

type AdminStatus = 'checking' | 'yes' | 'no';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [adminStatus, setAdminStatus] = useState<AdminStatus>('checking');

  useEffect(() => {
    // Escuchamos cambios de auth (incluye la carga inicial de sesión persistente)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event); // Para depuración

      if (session?.user) {
        setUser(session.user);
        
        // Solo verificamos si no hemos confirmado ya que somos admin
        // Esto evita que al navegar o refrescar el token nos mande al login por error
        try {
          const admin = await authService.isAdmin(session.user);
          setAdminStatus(admin ? 'yes' : 'no');
        } catch (error) {
          console.error("Error verificando permisos:", error);
          // En caso de error de red, si ya teníamos sesión, intentamos mantener 'checking'
          // o solo marcar 'no' si es estrictamente necesario (ej: INITIAL_SESSION)
          if (event === 'INITIAL_SESSION') setAdminStatus('no');
        }
      } else {
        // No hay sesión activa
        setUser(null);
        setAdminStatus('no');
      }

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
