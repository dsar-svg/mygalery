import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/auth'; // Asegúrate de que la ruta sea correcta

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleAuth = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          // VALIDACIÓN DE SEGURIDAD:
          // Verificamos si el correo de Google está en la tabla allowed_emails
          const isAllowed = await authService.isAdmin(session.user);

          if (!isAllowed) {
            // Si no está permitido, cerramos sesión de inmediato
            await supabase.auth.signOut();
            setError('Tu cuenta de Google no tiene acceso autorizado.');
            setTimeout(() => navigate('/login', { replace: true }), 4000);
            return;
          }

          // Si es válido, limpiamos URL y vamos al admin
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/admin', { replace: true });
        }
      } catch (err: any) {
        setError('Error en la autenticación. Intenta de nuevo.');
        setTimeout(() => navigate('/login', { replace: true }), 3000);
      }
    };

    handleAuth();
  }, [navigate]);

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-bone-light p-6">
        <div className="text-center space-y-4 max-w-sm">
          <div className="bg-red-50 border border-red-100 p-6 rounded-3xl">
            <p className="text-red-600 font-bold uppercase tracking-wider text-xs mb-2">Acceso Denegado</p>
            <p className="text-charcoal opacity-70 text-sm leading-relaxed">{error}</p>
          </div>
          <p className="text-[10px] uppercase tracking-widest opacity-30 animate-pulse">Redirigiendo al login...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone-light">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin"></div>
        <p className="text-charcoal font-serif italic text-lg text-center">
          Verificando credenciales...
        </p>
      </div>
    </div>
  );
}
