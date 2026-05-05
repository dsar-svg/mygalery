import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

export function AuthCallback() {
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // ── Implicit-flow OAuth (hash contains access_token) ──────────────────
        // Supabase redirects back with: /auth/callback#access_token=...&refresh_token=...
        if (window.location.hash.includes('access_token')) {
          const params = new URLSearchParams(window.location.hash.substring(1));
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (!accessToken || !refreshToken) {
            throw new Error('Token incompleto en la URL.');
          }

          // Store the session in Supabase's localStorage — clears the URL need.
          const { data, error: setErr } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          });

          if (setErr) throw setErr;
          if (!data.session) throw new Error('No se pudo establecer la sesión.');

          // Clean the URL before navigating so the hash is never stored in history.
          window.history.replaceState(null, '', window.location.pathname);
          navigate('/admin', { replace: true });
          return;
        }

        // ── PKCE-flow OAuth (query string contains code) ───────────────────────
        // Supabase redirects back with: /auth/callback?code=...
        if (window.location.search.includes('code')) {
          const { data, error: exchErr } =
            await supabase.auth.exchangeCodeForSession(window.location.href);

          if (exchErr) throw exchErr;
          if (!data.session) throw new Error('No se pudo intercambiar el código.');

          window.history.replaceState(null, '', window.location.pathname);
          navigate('/admin', { replace: true });
          return;
        }

        // ── Already authenticated (e.g. refreshed /auth/callback) ─────────────
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
          navigate('/admin', { replace: true });
          return;
        }

        // Nothing to do — send back to login.
        navigate('/login', { replace: true });
      } catch (err: unknown) {
        console.error('Auth callback error:', err);
        setError('Error al iniciar sesión. Por favor intenta de nuevo.');
        setTimeout(() => navigate('/', { replace: true }), 3000);
      }
    };

    const timeout = setTimeout(() => {
      setError('El inicio de sesión tardó demasiado. Por favor intenta de nuevo.');
      setTimeout(() => navigate('/', { replace: true }), 3000);
    }, 10000);

    handleCallback().finally(() => clearTimeout(timeout));

    return () => clearTimeout(timeout);
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
