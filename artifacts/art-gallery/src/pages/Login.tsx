import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Chrome } from 'lucide-react';

export function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          // Asegúrate de que esta URL esté configurada en el Dashboard de Supabase
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
      <div className="absolute top-0 left-0 w-full p-6 md:p-12">
        <Link
          to="/"
          className="inline-flex items-center gap-3 uppercase tracking-[0.4em] text-[10px] font-bold opacity-40 hover:opacity-100 transition-all group"
        >
          <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-2 transition-transform" />
          Volver a la Galería
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="w-20 h-20 bg-charcoal rounded-full flex items-center justify-center mx-auto mb-8 shadow-lg">
            <Mail className="w-8 h-8 text-bone-light opacity-80" />
          </div>

          <div className="text-center mb-10 space-y-4">
            <h1 className="font-serif text-4xl italic text-charcoal">
              Acceso Privado
            </h1>
            <p className="text-sm text-charcoal opacity-50 leading-relaxed">
              Haz clic abajo para acceder al panel de administración con tu cuenta de Google.
            </p>
          </div>

          <div className="space-y-6">
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
              {loading ? 'Redirigiendo...' : 'Continuar con Google'}
            </button>
          </div>

          <p className="text-center text-[9px] opacity-30 mt-10 leading-relaxed uppercase tracking-widest">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
