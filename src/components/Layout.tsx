import { Outlet, Link, useNavigate } from 'react-router-dom';
import { User } from '@supabase/supabase-js';
import { SiteSettings } from '../types';
import { authService } from '../lib/auth';
import { LogIn, LogOut, LayoutDashboard, Palette } from 'lucide-react';

interface LayoutProps {
  user: User | null;
  settings: SiteSettings | null;
}

export function Layout({ user, settings }: LayoutProps) {
  const navigate = useNavigate();

  const handleLogout = async () => {
    await authService.logout();
    navigate('/');
  };

  return (
    <div className="min-h-screen bg-bone-light text-charcoal font-sans selection:bg-charcoal selection:text-bone-light flex flex-col">
      <nav className="border-b border-charcoal/5 px-6 md:px-12 py-6 flex justify-between items-center bg-bone-light/80 backdrop-blur-xl sticky top-0 z-50">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 bg-charcoal rounded-full flex items-center justify-center group-hover:rotate-[30deg] transition-transform duration-500 shadow-lg">
            <Palette className="w-5 h-5 text-bone-light" />
          </div>
          <span className="font-serif text-2xl tracking-tighter font-semibold">{settings?.galleryName || 'Gallería'} <span className="italic font-light opacity-60">D'Arte</span></span>
        </Link>
        <div className="flex items-center gap-8">
          <Link to="/" className="text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-100 opacity-40 transition-opacity">Explorar</Link>
          {user && (
            <Link to="/admin" className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] hover:opacity-100 opacity-40 transition-opacity">
              <LayoutDashboard className="w-3.5 h-3.5" />
              Admin
            </Link>
          )}
        </div>
      </nav>
      <main className="flex-grow w-full">
        <Outlet />
      </main>
      <footer className="bg-charcoal text-bone-light pt-32 pb-20 px-6 md:px-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-white/5 rounded-full blur-[120px] -mr-48 -mt-48"></div>
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-2 gap-20 relative z-10">
          <div className="space-y-10">
            <div className="space-y-4">
              <Link to="/" className="inline-block">
                <h3 className="font-serif text-5xl italic">{settings?.galleryName || "Gallería D'Arte"}</h3>
              </Link>
              <p className="max-w-md opacity-40 leading-relaxed font-light text-lg">
                {settings?.footerDescription}
              </p>
            </div>
            
            <div className="flex flex-col gap-4 items-start">
              {!user ? (
                <button 
                  onClick={() => authService.login()}
                  className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] bg-black border border-white/10 text-bone-light px-8 py-4 rounded-full hover:bg-bone-light hover:text-charcoal transition-all shadow-2xl"
                >
                  <LogIn className="w-4 h-4" />
                  Acceso Administración
                </button>
              ) : (
                <button 
                  onClick={handleLogout}
                  className="inline-flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.3em] bg-black border border-white/10 text-bone-light px-8 py-4 rounded-full hover:bg-bone-light hover:text-charcoal transition-all shadow-2xl"
                >
                  <LogOut className="w-4 h-4" />
                  Cerrar Sesión
                </button>
              )}
            </div>
          </div>
          <div className="flex flex-col md:items-end justify-between">
            <div className="pt-24 md:pt-0">
              <p className="text-[9px] font-bold uppercase tracking-[0.5em] opacity-20">
                © {new Date().getFullYear()} {settings?.galleryName || "Gallería D'Arte"} • Todos los derechos reservados
              </p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
