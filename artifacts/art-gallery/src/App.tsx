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

// Función auxiliar para evitar bloqueos infinitos por latencia de red
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
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null); // null = verificando

  useEffect(() => {
    const initApp = async () => {
      try {
        // 1. Validar sesión existente de forma segura
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          setUser(null);
          setIsAdmin(false);
        } else {
          setUser(session.user);
          // Validamos si es admin con un margen de 5 segundos
          const admin = await withTimeout(authService.isAdmin(session.user), 5000, false);
          setIsAdmin(admin);
        }

        // 2. Carga de configuración del sitio (Settings)
        const settingsPromise = new Promise<void>((resolve) => {
          const unsub = artService.subscribeToSettings((data) => {
            setSettings(data);
            resolve();
          });
          // Guardamos la referencia para limpiar si fuera necesario, 
          // aunque aquí lo manejamos en el retorno del useEffect
        });
        await withTimeout(settingsPromise, 4000, null);

      } catch (error) {
        console.error("Error crítico en inicialización:", error);
        setIsAdmin(false);
      } finally {
        setLoading(false);
      }
    };

    initApp();

    // 3. Escuchar cambios de estado (Login, Logout, Token Refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log("Auth Event:", event);
      
      if (session?.user) {
        setUser(session.user);
        const admin = await withTimeout(authService.isAdmin(session.user), 5000, false);
        setIsAdmin(admin);
      } else {
        setUser(null);
        setIsAdmin(false);
      }
      // Aseguramos que el loading se apague tras cualquier cambio de auth
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Spinner inicial solo si no hay nada cargado aún
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
          
          {/* Ruta Protegida de Administración[cite: 8] */}
          <Route
            path="admin"
            element={
              user ? (
                isAdmin === null ? (
                  <Spinner message="Verificando permisos de acceso..." />
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
