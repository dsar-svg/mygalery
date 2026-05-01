import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Supabase auth router handles the session automatically
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) throw sessionError;

        // Redirect to admin page after successful auth
        navigate('/admin', { replace: true });
      } catch (err) {
        console.error('Auth callback error:', err);
        setError('Error al iniciar sesión. Por favor intenta de nuevo.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    handleCallback();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed]">
        <div className="text-center space-y-4">
          <p className="text-red-500 font-serif text-xl">{error}</p>
          <p className="text-sm opacity-60">Redirigiendo al inicio...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f5f2ed]">
      <div className="animate-pulse flex flex-col items-center">
        <div className="w-12 h-12 border-4 border-[#1a1a1a] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-[#1a1a1a] font-serif italic text-lg text-center">Procesando inicio de sesión...</p>
      </div>
    </div>
  );
}
