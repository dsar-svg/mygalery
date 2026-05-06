import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { authService } from '../lib/auth';

export function AuthCallback() {
  const navigate = useNavigate();
  const hasProcessed = useRef(false);

  useEffect(() => {
    const handleAuth = async () => {
      if (hasProcessed.current) return;
      hasProcessed.current = true;

      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) throw sessionError;

        if (session?.user) {
          const isAllowed = await authService.isAdmin(session.user);

          if (!isAllowed) {
            // Cerramos sesión para que no quede el token de Google activo
            await supabase.auth.signOut();
            
            // Enviamos al login con un mensaje específico en el state
            navigate('/login', { 
              replace: true, 
              state: { 
                forbidden: true,
                message: `El correo ${session.user.email} no está autorizado. Solicita acceso al administrador para entrar.` 
              } 
            });
            return;
          }

          localStorage.setItem('is_admin_session', 'true');
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/admin', { replace: true });
        } else {
          navigate('/login', { replace: true });
        }
      } catch (err) {
        navigate('/login', { replace: true });
      }
    };

    handleAuth();
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-bone-light">
      <div className="animate-pulse flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-charcoal border-t-transparent rounded-full animate-spin"></div>
        <p className="text-charcoal font-serif italic">Verificando lista de acceso...</p>
      </div>
    </div>
  );
}
