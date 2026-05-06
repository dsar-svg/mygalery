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

// Helper para evitar que la app se cuelgue por red lenta
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
  
  // 1. MEMORIA SÍNCRONA: Leemos el localStorage para evitar el rebote al Home al refrescar
  const [isAdmin, setIsAdmin] = useState<boolean | null>(() => {
    return localStorage.getItem('is_admin_session') === 'true' ? true : null;
  });

  useEffect(() => {
    // 2. FUNCIÓN DE VALIDACIÓN ÚNICA
    const validateAdminOnce = async (currUser: User) => {
      // CORTOCIRCUITO: Si ya confirmamos que es admin en esta sesión, no volvemos a consultar la DB
      if (isAdmin === true) return;

      try {
        const result = await withTimeout(authService.isAdmin(currUser), 5000, false);
        setIsAdmin(result);
        
        if (result) {
          localStorage.setItem('is_admin_session', 'true');
        } else {
          localStorage.removeItem('is_admin_session');
        }
      } catch (error) {
        console.error("Error validando admin:", error);
      }
    };

    const initApp = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          setUser(session.user);
          await validateAdminOnce(session.user);
        } else {
          setIsAdmin(false);
          localStorage.removeItem('is_admin_session');
        }
      } finally {
        setLoading(false);
      }
    };

    initApp();

    // 3. ESCUCHA DE EVENTOS: Ajustada para evitar disparos repetitivos
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      // Si el evento es un refresco de token y ya somos admin, no hacemos nada
      if (event === 'TOKEN_REFRESHED' && isAdmin === true) return;

      if (session?.user) {
        setUser(session.user);
        
        // Solo re-validamos si el estado es desconocido o si es un inicio de sesión explícito
        if (isAdmin === null || event === 'SIGNED_IN') {
          await validateAdminOnce(session.user);
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setIsAdmin(false);
        localStorage.removeItem('is_admin_session');
      }
      
      setLoading(false);
    });

    // Suscripción a los ajustes del sitio
    const unsubSettings = artService.subscribeToSettings((data) => setSettings(data));

    return () => {
      subscription.unsubscribe();
      unsubSettings();
    };
  }, [isAdmin]); 

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
          {/* Ruta para procesar el redireccionamiento de Google */}
          <Route path="auth/callback" element={<AuthCallback />} />
          
          <Route
            path="admin"
            element={
              user ? (
                // 4. LÓGICA DE NAVEGACIÓN PACIENTE: 
                // Solo sacamos al usuario si isAdmin es 'false' confirmado.
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
