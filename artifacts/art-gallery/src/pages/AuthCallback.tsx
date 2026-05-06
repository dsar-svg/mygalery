import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    // Escuchar el evento de Supabase cuando procesa el token de la URL
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      // Si el evento es SIGNED_IN y hay sesión, navegamos al admin
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        // Limpiamos la URL para que el token no se intente reutilizar
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/admin', { replace: true });
      }
      
      // Si por alguna razón el evento es SIGNED_OUT durante el callback
      if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        navigate('/login', { replace: true });
      }
    });

    // Verificación de respaldo en caso de que la sesión ya esté activa (ej. refresh)
    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError('Error al iniciar sesión. Por favor intenta de nuevo.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }
      
      if (session) {
        clearTimeout(timeout);
        window.history.replaceState(null, '', window.location.pathname);
        navigate('/admin', { replace: true });
      }
    });

    // Timeout de seguridad por si Supabase tarda demasiado en responder
    timeout = setTimeout(() => {
      setError('El inicio de sesión tardó demasiado. Por favor intenta de nuevo.');
      setTimeout(() => navigate('/', { replace: true }), 3000);
    }, 10000);

    // Limpieza al desmontar el componente
    return () => {
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone-light">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-serif text-xl">{error}</p>
          <p className="text-sm opacity-60">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone-light">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin"></div>
        <p className="text-charcoal font-serif italic text-lg text-center">
          Procesando inicio de sesión...
        </p>
      </div>
    </div>
  );
}
