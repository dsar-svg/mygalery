import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { artService } from '../services/artService';
import { Artwork, SiteSettings } from '../types';
import { Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Upload, Printer, QrCode, Settings, Users, Mail } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { supabase } from '../lib/supabase';

interface AdminPanelProps {
  user: User | null;
}

export function AdminPanel({ user }: AdminPanelProps) {
  const [artworks, setArtworks] = useState<Artwork[]>([]);
  const [settings, setSettings] = useState<SiteSettings | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  
  const [newArt, setNewArt] = useState({
    name: '',
    description: '',
    technique: '',
    price: 0,
    imageUrl: ''
  });

  const [editForm, setEditForm] = useState({
    name: '',
    description: '',
    technique: '',
    price: 0,
    imageUrl: ''
  });

  const [printingArt, setPrintingArt] = useState<Artwork | null>(null);

  useEffect(() => {
    // Sincronizado con artService.getArtworks()
    artService.getArtworks().then(setArtworks);
    artService.getSettings().then(setSettings);
    loadAllowedEmails();
  }, []);

  const loadAllowedEmails = async () => {
    const { data } = await supabase.from('allowed_emails').select('email');
    if (data) setAllowedEmails(data.map(d => d.email));
  };

  const handleAddEmail = async () => {
    if (!newEmail) return;
    const email = newEmail.trim().toLowerCase();
    const { error } = await supabase.from('allowed_emails').insert([{ email }]);
    if (!error) {
      setNewEmail('');
      loadAllowedEmails();
    }
  };

  const handleRemoveEmail = async (email: string) => {
    const { error } = await supabase.from('allowed_emails').delete().eq('email', email);
    if (!error) loadAllowedEmails();
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const url = await artService.uploadImage(file);
      if (isEdit) setEditForm({ ...editForm, imageUrl: url });
      else setNewArt({ ...newArt, imageUrl: url });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddArt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const art = await artService.createArtwork({ ...newArt, ownerId: user.id });
      setArtworks([art, ...artworks]);
      setIsAdding(false);
      setNewArt({ name: '', description: '', technique: '', price: 0, imageUrl: '' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleUpdateArt = async (id: string) => {
    setIsSaving(true);
    try {
      const updated = await artService.updateArtwork(id, editForm);
      setArtworks(artworks.map(a => a.id === id ? updated : a));
      setEditingId(null);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 pb-32">
      {/* HEADER SEGÚN CAPTURAS */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-charcoal/10 pb-12">
        <div className="space-y-4">
          <h1 className="font-serif text-5xl italic">Panel de Control</h1>
          <p className="text-sm opacity-40 uppercase tracking-widest font-medium text-charcoal">Gestión de Galería</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => setShowAccess(!showAccess)} className="flex items-center gap-2 px-6 py-4 rounded-full bg-white border border-charcoal/10 text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all text-charcoal shadow-sm">
            <Users className="w-4 h-4" /> Accesos
          </button>
          <button onClick={() => setShowSettings(!showSettings)} className="flex items-center gap-2 px-6 py-4 rounded-full bg-white border border-charcoal/10 text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all text-charcoal shadow-sm">
            <Settings className="w-4 h-4" /> Ajustes
          </button>
          <button onClick={() => setIsAdding(!isAdding)} className="flex items-center gap-2 px-8 py-4 rounded-full bg-charcoal text-bone-light text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl">
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancelar' : 'Nueva Obra'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {/* MODAL AJUSTES */}
        {showSettings && settings && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden bg-white rounded-[2rem] p-8 border border-charcoal/5 shadow-sm">
            <form onSubmit={async (e) => { e.preventDefault(); await artService.updateSettings(settings); setShowSettings(false); }} className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase opacity-30 tracking-widest">Nombre Galería</label>
                  <input type="text" value={settings.galleryName} onChange={e => setSettings({...settings, galleryName: e.target.value})} className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all" />
                </div>
                <div className="space-y-4">
                  <label className="text-[10px] font-bold uppercase opacity-30 tracking-widest">Moneda</label>
                  <input type="text" value={settings.currency} onChange={e => setSettings({...settings, currency: e.target.value})} className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all" />
                </div>
              </div>
              <button type="submit" className="bg-charcoal text-white px-8 py-4 rounded-full text-[10px] font-bold uppercase tracking-widest">Guardar Cambios</button>
            </form>
          </motion.div>
        )}

        {/* MODAL NUEVA OBRA */}
        {isAdding && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <form onSubmit={handleAddArt} className="bg-white rounded-[3rem] p-8 md:p-12 border border-charcoal/5 shadow-2xl space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Título</label>
                    <input type="text" required value={newArt.name} onChange={e => setNewArt({...newArt, name: e.target.value})} className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-5 outline-none font-serif text-xl italic" />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Técnica</label>
                      <input type="text" value={newArt.technique} onChange={e => setNewArt({...newArt, technique: e.target.value})} className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Precio</label>
                      <input 
                        type="text" 
                        inputMode="numeric"
                        value={newArt.price === 0 ? '' : newArt.price}
                        onChange={e => setNewArt({...newArt, price: Number(e.target.value.replace(/\D/g, ''))})}
                        className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none font-mono" 
                      />
                    </div>
                  </div>
                </div>
                <div className="relative aspect-square rounded-[2rem] border-2 border-dashed border-charcoal/10 bg-bone-light flex items-center justify-center overflow-hidden">
                  {newArt.imageUrl ? (
                    <img src={newArt.imageUrl} className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center">
                      <Upload className="w-8 h-8 opacity-20 mx-auto" />
                      <input type="file" accept="image/*" onChange={e => handleImageUpload(e)} className="absolute inset-0 opacity-0 cursor-pointer" />
                    </div>
                  )}
                </div>
              </div>
              <div className="flex justify-end border-t border-charcoal/5 pt-8">
                <button type="submit" disabled={isSaving || !newArt.imageUrl} className="bg-charcoal text-white px-16 py-6 rounded-full text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-2xl">
                  {isSaving ? 'Guardando...' : 'Publicar Obra'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* TABLA PRINCIPAL SEGÚN CAPTURAS */}
      <div className="bg-white rounded-[3rem] border border-charcoal/5 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-charcoal/5">
              <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30 text-charcoal">Obra</th>
              <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30 text-charcoal">Técnica</th>
              <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30 text-charcoal">Precio</th>
              <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30 text-right text-charcoal">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {artworks.map(art => (
              <tr key={art.id} className="group hover:bg-bone-light/30 transition-colors">
                <td className="p-8">
                  <div className="flex items-center gap-6">
                    <img src={art.imageUrl} className="w-16 h-16 rounded-xl object-cover border border-charcoal/5" />
                    <div className="space-y-1">
                      <p className="font-serif text-lg italic text-charcoal">{art.name}</p>
                      <p className="text-[10px] opacity-30 font-mono text-charcoal">#{art.id.slice(0, 8).toUpperCase()}</p>
                    </div>
                  </div>
                </td>
                <td className="p-8 text-charcoal opacity-50 text-sm">{art.technique || '---'}</td>
                <td className="p-8 text-charcoal font-mono text-sm font-bold">
                  {formatPrice(art.price, settings?.currency || '$')}
                </td>
                <td className="p-8">
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setPrintingArt(art)} className="p-3 text-charcoal/30 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-all"><QrCode className="w-4 h-4" /></button>
                    <button onClick={() => { setEditingId(art.id); setEditForm({...art, description: art.description || '', technique: art.technique || ''}); }} className="p-3 text-charcoal/30 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-all"><Edit3 className="w-4 h-4" /></button>
                    <button onClick={async () => { if(confirm('¿Eliminar?')) { await artService.deleteArtwork(art.id); setArtworks(artworks.filter(a => a.id !== art.id)); }}} className="p-3 text-red-200 hover:text-red-500 rounded-full transition-all"><Trash2 className="w-4 h-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* QR MODAL */}
      <AnimatePresence>
        {printingArt && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-charcoal/90 backdrop-blur-xl flex items-center justify-center p-6">
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} className="bg-white max-w-lg rounded-[3rem] p-12 text-center space-y-8 shadow-2xl">
              <h2 className="font-serif text-3xl italic">Etiqueta Digital</h2>
              <div className="bg-bone-light p-10 rounded-[2rem] flex flex-col items-center gap-6">
                <QRCodeSVG value={`${window.location.origin}/artwork/${printingArt.id}`} size={200} level="H" />
                <p className="font-serif text-2xl italic">{printingArt.name}</p>
              </div>
              <div className="flex gap-4">
                <button onClick={() => window.print()} className="flex-1 bg-charcoal text-white py-5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2"><Printer className="w-4 h-4" /> Imprimir</button>
                <button onClick={() => setPrintingArt(null)} className="w-16 h-16 border border-charcoal/10 rounded-full flex items-center justify-center text-charcoal hover:bg-charcoal hover:text-white transition-all"><X className="w-5 h-5" /></button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
