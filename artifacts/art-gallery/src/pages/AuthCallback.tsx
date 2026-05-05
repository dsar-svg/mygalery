import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>;

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        navigate('/admin', { replace: true });
      }
      if (event === 'SIGNED_OUT') {
        clearTimeout(timeout);
        subscription.unsubscribe();
        navigate('/login', { replace: true });
      }
    });

    supabase.auth.getSession().then(({ data: { session }, error: sessionError }) => {
      if (sessionError) {
        setError('Error al iniciar sesión. Por favor intenta de nuevo.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
        return;
      }
      if (session) {
        clearTimeout(timeout);
        subscription.unsubscribe();
        navigate('/admin', { replace: true });
      }
    });

    timeout = setTimeout(() => {
      subscription.unsubscribe();
      setError('El inicio de sesión tardó demasiado. Por favor intenta de nuevo.');
      setTimeout(() => navigate('/', { replace: true }), 3000);
    }, 10000);

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
