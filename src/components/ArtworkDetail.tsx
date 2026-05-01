import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { artService } from '../services/artService';
import { Artwork, SiteSettings } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { formatPrice } from '../lib/utils';
import { ArrowLeft, Share2, ZoomIn } from 'lucide-react';

interface ArtworkDetailProps {
  settings: SiteSettings | null;
}

export function ArtworkDetail({ settings }: ArtworkDetailProps) {
  const { id } = useParams<{ id: string }>();
  const [art, setArt] = useState<Artwork | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('No se pudo copiar el enlace:', err);
    }
  };

  useEffect(() => {
    if (id) {
      artService.getArtworkById(id).then((data) => {
        setArt(data);
        setLoading(false);
      });
    }
  }, [id]);

  if (loading) {
    return <div className="h-[70vh] flex items-center justify-center opacity-30 italic font-serif text-xl">Revelando detalles...</div>;
  }

  if (!art) {
    return (
      <div className="h-[70vh] flex flex-col items-center justify-center space-y-6 text-center">
        <p className="font-serif text-3xl italic opacity-40">Pieza no localizada.</p>
        <Link to="/" className="text-[10px] uppercase tracking-[0.3em] font-bold border border-charcoal/20 px-8 py-3 rounded-full hover:bg-charcoal hover:text-bone-light transition-all">Explorar Colección</Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-32 py-24 px-6 md:px-12">
      <Link to="/" className="inline-flex items-center gap-3 uppercase tracking-[0.4em] text-[10px] font-bold opacity-30 hover:opacity-100 transition-all group">
        <ArrowLeft className="w-3.5 h-3.5 group-hover:-translate-x-2 transition-transform" />
        Regresar a la Exhibición
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-24 items-start">
        <motion.div 
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1 }}
          className="space-y-12"
        >
          <div className="aspect-[4/5] overflow-hidden bg-white shadow-[0_50px_100px_-20px_rgba(0,0,0,0.15)] relative group rounded-sm p-4">
            <div className="w-full h-full overflow-hidden">
               <img 
                 src={art.imageUrl} 
                 alt={art.name}
                 className="w-full h-full object-cover grayscale-[0.2] hover:grayscale-0 transition-all duration-1000"
                 referrerPolicy="no-referrer"
               />
            </div>
            <button 
              onClick={() => setIsZoomed(true)}
              className="absolute top-10 right-10 w-14 h-14 bg-white/95 backdrop-blur rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 shadow-2xl"
            >
                <ZoomIn className="w-6 h-6 opacity-60" />
            </button>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1, delay: 0.2 }}
          className="space-y-16 lg:py-12"
        >
          <div className="space-y-8">
            <div className="flex items-center gap-4">
               <span className="h-0.5 w-12 bg-charcoal/10"></span>
               <p className="text-[10px] font-black uppercase tracking-[0.4em] text-stone-gray">Pieza de Exhibición:</p>
            </div>
            <h1 className="font-serif text-7xl md:text-[6rem] leading-[0.9] tracking-tighter">{art.name}</h1>
            <div className="flex flex-col space-y-4 pt-4">
              <p className="text-xl font-light tracking-[0.4em] uppercase opacity-70 border-l-2 border-charcoal/20 pl-6">{art.painter || 'Artista Anónimo'}</p>
              <p className="text-4xl font-light tracking-tighter opacity-100 italic font-serif">{formatPrice(art.price, art.currency || settings?.currency)}</p>
            </div>
          </div>

          <div className="space-y-8">
             <div className="flex justify-start items-center border-b border-charcoal/5 pb-4">
               <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 italic">Técnica: {art.technique || 'Técnica Mixta'}</p>
             </div>
          </div>

          <div className="pt-12 border-t border-charcoal/5 flex flex-wrap gap-6 items-center">
            <button 
              onClick={handleShare}
              className="relative flex items-center gap-3 border border-charcoal/10 px-12 py-5 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold hover:bg-charcoal hover:text-bone-light transition-all group overflow-hidden"
            >
              <Share2 className={`w-4 h-4 transition-transform ${copied ? 'scale-0' : 'scale-100'}`} />
              <span className={`transition-all ${copied ? 'opacity-0 translate-y-4' : 'opacity-100 translate-y-0'}`}>Compartir</span>
              
              {copied && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="absolute inset-0 flex items-center justify-center bg-charcoal text-white text-[9px]"
                >
                  ¡ENLACE COPIADO!
                </motion.div>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      <AnimatePresence>
        {isZoomed && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsZoomed(false)}
            className="fixed inset-0 z-50 bg-charcoal/95 backdrop-blur-xl flex items-center justify-center p-4 md:p-20 cursor-zoom-out"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="relative max-w-full max-h-full"
            >
              <img 
                src={art.imageUrl} 
                alt={art.name}
                className="max-w-full max-h-[90vh] object-contain shadow-2xl rounded-sm"
                referrerPolicy="no-referrer"
              />
              <div className="absolute top-full left-0 w-full pt-8 text-center text-bone-light opacity-60 space-y-2">
                <p className="font-serif text-3xl italic">{art.name}</p>
                <p className="text-[10px] uppercase tracking-[0.4em]">{art.painter}</p>
              </div>
            </motion.div>
            <button 
              className="absolute top-10 right-10 text-white opacity-40 hover:opacity-100 transition-opacity"
              onClick={() => setIsZoomed(false)}
            >
              <ArrowLeft className="w-8 h-8 rotate-90" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
