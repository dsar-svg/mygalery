import { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Mail, Chrome, CheckCircle2 } from 'lucide-react';

export function Login() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailSent, setEmailSent] = useState(false);

  // 1. Lógica para entrar mediante Magic Link (Correo Directo)
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Verificamos primero si el correo está en la lista blanca
      const { data, error: tableError } = await supabase
        .from('allowed_emails')
        .select('email')
        .eq('email', email.trim().toLowerCase())
        .single();

      if (tableError || !data) {
        setError('Este correo no tiene acceso autorizado.');
        setLoading(false);
        return;
      }

      // Enviamos el enlace mágico
      const { error: authError } = await supabase.auth.signInWithOtp({
        email: email.trim().toLowerCase(),
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
        },
      });

      if (authError) throw authError;

      setEmailSent(true);
    } catch (err: any) {
      setError(err.message || 'Error al procesar el acceso');
    } finally {
      setLoading(false);
    }
  };

  // 2. Lógica para entrar con Google
  const handleGoogleLogin = async () => {
    setError(null);
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
              {emailSent 
                ? "Verifica tu bandeja de entrada para continuar" 
                : "Ingresa tu correo para acceder al panel de administración"}
            </p>
          </div>

          {emailSent ? (
            <div className="bg-white border border-charcoal/5 rounded-3xl p-8 text-center space-y-6 shadow-sm animate-in fade-in zoom-in duration-300">
              <div className="flex justify-center">
                <CheckCircle2 className="w-12 h-12 text-green-800/50" />
              </div>
              <div className="space-y-2">
                <p className="text-charcoal font-medium">¡Enlace enviado!</p>
                <p className="text-xs text-charcoal/40 leading-relaxed">
                  Hemos enviado un acceso directo a <strong>{email}</strong>.<br/>
                  Haz clic en el botón del correo para entrar.
                </p>
              </div>
              <button
                onClick={() => setEmailSent(false)}
                className="text-[9px] uppercase tracking-[0.2em] font-black opacity-30 hover:opacity-100 transition-all"
              >
                ¿No recibiste nada? Reintentar
              </button>
            </div>
          ) : (
            <>
              <form onSubmit={handleEmailLogin} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 ml-1">
                    Correo Electrónico
                  </label>
                  <div className="relative">
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tu@correo.com"
                      className="w-full bg-white border border-charcoal/10 rounded-2xl p-5 pl-14 focus:border-charcoal/30 outline-none transition-all placeholder:opacity-30 font-mono text-sm"
                    />
                    <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                  </div>
                </div>

                {error && (
                  <div className="bg-red-50 text-red-600 text-[11px] font-bold uppercase tracking-wider p-4 rounded-xl text-center border border-red-100">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-charcoal text-bone-light py-5 rounded-full uppercase tracking-[0.3em] text-[10px] font-bold hover:bg-charcoal/90 transition-all shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Verificando...' : 'Entrar'}
                </button>
              </form>

              <div className="relative my-10">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-charcoal/10"></div>
                </div>
                <div className="relative flex justify-center">
                  <span className="bg-bone-light px-4 text-[9px] font-black uppercase tracking-[0.3em] opacity-30">
                    O continúa con
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleGoogleLogin}
                className="w-full bg-white border border-charcoal/20 text-charcoal py-5 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-charcoal/5 transition-all shadow-md flex items-center justify-center gap-3"
              >
                <Chrome className="w-4 h-4" />
                Google
              </button>
            </>
          )}

          <p className="text-center text-[9px] opacity-30 mt-10 leading-relaxed uppercase tracking-widest">
            Solo personal autorizado
          </p>
        </div>
      </div>
    </div>
  );
}
