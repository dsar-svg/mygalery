import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom'; // Añadimos useLocation
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Chrome, ShieldAlert } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const location = useLocation();

  // Capturamos el error de "No autorizado" si viene del Callback
  const forbiddenMessage = location.state?.message;
  const isForbidden = location.state?.forbidden;

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) throw error;
    } catch (err: any) {
      setError(err.message || 'Error con Google login');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-bone-light flex flex-col">
      {/* Botón Volver... */}
      
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="w-20 h-20 bg-charcoal rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Mail className="w-8 h-8 text-bone-light opacity-80" />
          </div>

          <div className="text-center mb-10 space-y-4">
            <h1 className="font-serif text-4xl italic text-charcoal">Acceso Privado</h1>
            <p className="text-sm text-charcoal opacity-50 leading-relaxed">
              Inicia sesión para gestionar la galería.
            </p>
          </div>

          <div className="space-y-6">
            {/* MENSAJE DE NO AUTORIZADO (WHITELIST) */}
            {isForbidden && (
              <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl flex flex-col items-center gap-3 text-center animate-in fade-in slide-in-from-bottom-2">
                <ShieldAlert className="w-8 h-8 text-amber-600" />
                <p className="text-[11px] text-amber-900 font-medium leading-relaxed">
                  {forbiddenMessage}
                </p>
              </div>
            )}

            {/* ERROR GENERAL */}
            {error && (
              <div className="bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider p-4 rounded-xl text-center border border-red-100">
                {error}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full bg-white border border-charcoal/20 text-charcoal py-6 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-charcoal/5 transition-all shadow-md flex items-center justify-center gap-3 disabled:opacity-50"
            >
              <Chrome className="w-5 h-5" />
              {loading ? 'Redirigiendo...' : 'Entrar con Google'}
            </button>
          </div>
          
          {/* ... */}
        </div>
      </div>
    </div>
  );
}
