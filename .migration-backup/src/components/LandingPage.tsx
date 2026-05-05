import { useEffect, useState } from 'react';
import { artService } from '../services/artService';
import { Artwork, SiteSettings } from '../types';
import { Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { ArrowRight } from 'lucide-react';

interface LandingPageProps {
  settings: SiteSettings | null;
}

export function LandingPage({ settings }: LandingPageProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = artService.subscribeToArtworks((data) => {
      setArtworks(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="h-[60vh] flex items-center justify-center">
        <p className="font-serif italic text-xl opacity-50">Preparando exposición...</p>
      </div>
    );
  }
  return (
    <div className="pb-32">
      <section className="relative h-[90vh] flex items-center justify-center overflow-hidden group">
        <div className="absolute inset-0 z-0">
          <img 
            src={settings?.heroImageUrl || "https://images.unsplash.com/photo-1579783902614-a3fb3927b6a5?auto=format&fit=crop&q=85&w=2000"} 
            alt="Obra maestra de fondo" 
            className="w-full h-full object-cover scale-110 group-hover:scale-100 transition-transform duration-[15s] ease-out opacity-60"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-bone-light via-bone-light/40 to-transparent"></div>
          <div className="absolute inset-0 bg-white/5 backdrop-blur-[1px]"></div>
        </div>

        <motion.div 
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          className="relative z-10 text-center px-6 max-w-5xl"
        >
          <span className="inline-block text-[10px] font-bold uppercase tracking-[0.5em] mb-8 bg-charcoal text-bone-light px-4 py-1 rounded-full">
            Curaduría Contemporánea
          </span>
          <h1 className="font-serif text-[13vw] md:text-[8rem] lg:text-[10rem] leading-[0.8] tracking-tighter text-charcoal drop-shadow-sm uppercase">
            {settings?.heroLine1 || 'EL ARTE DE'} <br />
            <span className="italic font-light opacity-80">{settings?.heroLine2 || 'LA CREACIÓN'}</span>
          </h1>
          <div className="mt-16 h-px w-32 bg-charcoal/30 mx-auto"></div>
          <p className="mt-10 text-xl md:text-2xl font-light opacity-50 max-w-2xl mx-auto leading-relaxed italic font-serif">
            "Donde cada pincelada es un eco de la existencia."
          </p>
        </motion.div>
      </section>

      <section className="mt-32 space-y-16 px-6 md:px-12 container mx-auto">
        <div className="flex justify-between items-end border-b border-charcoal/10 pb-6">
          <h2 className="font-serif text-4xl italic">Obras En Exhibición</h2>
          
        </div>

        {artworks.length === 0 ? (
          <div className="py-32 text-center border border-dashed border-charcoal/20 rounded-3xl bg-white/30 backdrop-blur-sm">
            <p className="font-serif italic text-2xl opacity-40">No hay obras expuestas en este momento.</p>
            <Link to="/admin" className="inline-block mt-6 underline uppercase tracking-widest text-sm hover:opacity-60">
              Añadir la primera obra
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-20">
            {artworks.map((art, index) => (
              <motion.div
                key={art.id}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                className="group cursor-pointer"
              >
                <Link to={`/artwork/${art.id}`}>
                  <div className="aspect-[3/4] overflow-hidden bg-gallery-gray relative mb-8 shadow-sm transition-shadow group-hover:shadow-xl">
                    <img 
                      src={art.imageUrl} 
                      alt={art.name}
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute inset-0 bg-charcoal/0 group-hover:bg-charcoal/5 transition-colors duration-500"></div>
                  </div>
                  <div className="space-y-3">
                    <div className="flex justify-between items-baseline">
                      <div className="space-y-1">
                        <h3 className="font-serif text-3xl leading-tight group-hover:italic transition-all">{art.name}</h3>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-30 italic">{art.painter || 'Anónimo'}</p>
                      </div>
                      <p className="text-lg font-light tracking-tighter">{formatPrice(art.price, art.currency || settings?.currency)}</p>
                    </div>
                    <div className="h-px w-full bg-charcoal/5 scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-700"></div>
                    <p className="text-[10px] uppercase tracking-[0.3em] opacity-30 font-bold group-hover:opacity-60 transition-opacity">Ver Detalles de la Pieza</p>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
