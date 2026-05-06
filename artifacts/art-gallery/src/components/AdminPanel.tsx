import React, { useEffect, useState, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../lib/auth';
import { artService } from '../services/artService';
import { Artwork } from '../types';
import { Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Upload, Printer, QrCode, Settings, Users, Mail } from 'lucide-react';
import { formatPrice } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { SiteSettings } from '../types';
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [allowedEmails, setAllowedEmails] = useState<string[]>([]);
  const [newEmail, setNewEmail] = useState('');
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    technique: '',
    price: 0,
    imageUrl: '',
  });

  const [settingsData, setSettingsData] = useState({
    galleryName: '',
    heroLine1: '',
    heroLine2: '',
    heroImageUrl: '',
    footerDescription: '',
    currency: 'EUR'
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const heroFileInputRef = useRef<HTMLInputElement>(null);
  const [printingArt, setPrintingArt] = useState<Artwork | null>(null);
  const [qrModalOpen, setQrModalOpen] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const unsubArtworks = artService.subscribeToArtworks((data) => {
      setArtworks(data);
    });
    const unsubSettings = artService.subscribeToSettings((data) => {
      setSettings(data);
      setSettingsData({
        galleryName: data.galleryName,
        heroLine1: data.heroLine1,
        heroLine2: data.heroLine2,
        heroImageUrl: data.heroImageUrl || '',
        footerDescription: data.footerDescription,
        currency: data.currency
      });
    });
    return () => {
      unsubArtworks();
      unsubSettings();
    };
  }, [user]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>, isHero: boolean = false) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadError(null);

    try {
      setIsUploading(true);
      const url = await artService.uploadImage(file);
      if (isHero) {
        setSettingsData(prev => ({ ...prev, heroImageUrl: url }));
      } else {
        setFormData(prev => ({ ...prev, imageUrl: url }));
      }
    } catch (error: any) {
      console.error('Upload failed:', error);
      setUploadError(error?.message || 'Error al subir la imagen.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveError(null);
    setIsSaving(true);
    try {
      if (editingId) {
        await artService.updateArtwork(editingId, formData);
        setEditingId(null);
      } else {
        await artService.createArtwork(formData);
        setIsAdding(false);
      }
      setFormData({ name: '', description: '', technique: '', price: 0, imageUrl: '' });
    } catch (error: any) {
      setSaveError(error?.message || 'Error al guardar.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSettingsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await artService.updateSettings(settingsData);
      setShowSettings(false);
    } catch (error) {
      console.error("Error saving settings:", error);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('¿Eliminar esta obra?')) return;
    try { await artService.deleteArtwork(id); } catch (error) { console.error(error); }
  };

  const handleEdit = (art: Artwork) => {
    setEditingId(art.id);
    setFormData({
      name: art.name,
      description: art.description || '',
      technique: art.technique || '',
      price: art.price,
      imageUrl: art.imageUrl,
    });
    setIsAdding(true);
  };

  const handleDownloadQR = (art: Artwork) => {
    const svgElement = document.getElementById(`qr-code-${art.id}`);
    if (!svgElement) return;
    const svgData = new XMLSerializer().serializeToString(svgElement);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx?.drawImage(img, 0, 0);
      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${art.name.replace(/[^a-z0-9]/gi, '_')}.png`;
      downloadLink.href = canvas.toDataURL('image/png');
      downloadLink.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const cancelEdit = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({ name: '', description: '', technique: '', price: 0, imageUrl: '' });
  };

  const loadAllowedEmails = async () => {
    setAccessLoading(true);
    try {
      const { data, error } = await supabase.from('allowed_emails').select('email').order('email');
      if (error) throw error;
      setAllowedEmails(data.map((r: any) => r.email));
    } catch (err) { setAccessError('Error al cargar correos.'); }
    finally { setAccessLoading(false); }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email || allowedEmails.includes(email)) return;
    try {
      const { error } = await supabase.from('allowed_emails').insert({ email });
      if (error) throw error;
      setAllowedEmails(prev => [...prev, email].sort());
      setNewEmail('');
    } catch (err: any) { setAccessError(err.message); }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!window.confirm(`¿Quitar acceso a ${email}?`)) return;
    try {
      await supabase.from('allowed_emails').delete().eq('email', email);
      setAllowedEmails(prev => prev.filter(e => e !== email));
    } catch (err: any) { setAccessError(err.message); }
  };

  if (!user) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-12 max-w-lg mx-auto text-center px-6">
        <div className="space-y-6">
            <h1 className="font-serif text-5xl">Gallería <br /><span className="italic opacity-60">Privada</span></h1>
            <p className="opacity-40 text-lg leading-relaxed font-light">Entorno exclusivo para curaduría.</p>
        </div>
        <button onClick={() => authService.loginWithGoogle()} className="w-full bg-charcoal text-bone-light py-5 rounded-full uppercase tracking-[0.3em] text-[10px] font-bold hover:scale-[1.02] transition-all shadow-2xl">
          Entrar con Google Auth
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-24 pb-32 px-6 md:px-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-charcoal/5 pb-12">
        <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">Sistema de Gestión</p>
            <h1 className="font-serif text-6xl leading-tight">Control de <br /><span className="italic opacity-50">Exhibiciones</span></h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <button onClick={() => { setShowAccess(!showAccess); setShowSettings(false); setIsAdding(false); if (!showAccess) loadAllowedEmails(); }} className={`px-6 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.1em] text-[10px] font-bold hover:scale-105 transition-all shadow-md ${showAccess ? 'bg-charcoal text-white' : 'bg-bone-dark text-charcoal'}`}><Users className="w-3.5 h-3.5" /> Acceso</button>
          <button onClick={() => { setShowSettings(!showSettings); setShowAccess(false); setIsAdding(false); }} className={`px-6 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.1em] text-[10px] font-bold hover:scale-105 transition-all shadow-md ${showSettings ? 'bg-charcoal text-white' : 'bg-bone-dark text-charcoal'}`}><Settings className="w-3.5 h-3.5" /> Preferencias</button>
          <button onClick={() => { setIsAdding(!isAdding); setShowSettings(false); setShowAccess(false); }} className="bg-charcoal text-bone-light px-8 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-bold hover:scale-105 transition-all shadow-xl group"><Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" /> Nueva Obra</button>
        </div>
      </header>

      <AnimatePresence>
        {showAccess && (
          <motion.div key="access" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-bone-dark/30 p-10 rounded-[2.5rem] border border-charcoal/5 overflow-hidden">
            <div className="space-y-8">
              <h2 className="font-serif text-3xl">Correos <span className="italic opacity-50">Autorizados</span></h2>
              <form onSubmit={handleAddEmail} className="flex gap-3">
                <input type="email" required value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="nuevo@correo.com" className="flex-grow bg-white border border-charcoal/10 rounded-2xl p-5 outline-none font-mono text-sm" />
                <button type="submit" className="bg-charcoal text-bone-light px-8 py-4 rounded-2xl uppercase text-[10px] font-bold hover:scale-105 transition-all">Agregar</button>
              </form>
              <div className="space-y-3">
                {allowedEmails.map((email) => (
                  <div key={email} className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-charcoal/5 group">
                    <span className="font-mono text-sm opacity-70">{email}</span>
                    <button onClick={() => handleRemoveEmail(email)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="bg-bone-dark/30 p-10 rounded-[2.5rem] border border-charcoal/5 overflow-hidden">
            <form onSubmit={handleSettingsSubmit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase opacity-40">Nombre Galería</label>
                    <input type="text" className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 outline-none font-serif" value={settingsData.galleryName} onChange={(e) => setSettingsData({ ...settingsData, galleryName: e.target.value })} />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase opacity-40">Moneda</label>
                    <select className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 outline-none font-mono text-sm" value={settingsData.currency} onChange={(e) => setSettingsData({ ...settingsData, currency: e.target.value })}>
                      <option value="EUR">EUR (€)</option><option value="USD">USD ($)</option>
                    </select>
                  </div>
               </div>
               <div className="flex justify-end gap-4">
                  <button type="submit" className="bg-charcoal text-white px-8 py-3 rounded-full text-[10px] uppercase font-bold tracking-[0.2em] shadow-lg">Guardar</button>
               </div>
            </form>
          </motion.div>
        )}

        {isAdding && (
          <motion.div key="form" initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }} className="bg-white p-10 md:p-14 rounded-[3rem] border border-charcoal/5 shadow-2xl relative">
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase opacity-30">Título</label>
                  <input required type="text" className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 outline-none font-serif" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase opacity-30">Descripción</label>
                  <textarea rows={3} className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 outline-none font-serif text-sm" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase opacity-30">Precio</label>
                  <input
                    required
                    type="text"
                    inputMode="numeric"
                    placeholder="Ej: 2500"
                    className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 outline-none font-mono text-sm"
                    value={formData.price === 0 ? '' : formData.price}
                    onKeyDown={(e) => {
                      if (['e', 'E', '+', '-', ','].includes(e.key)) e.preventDefault();
                    }}
                    onChange={(e) => {
                      const val = e.target.value;
                      const cleanVal = val.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, price: cleanVal === '' ? 0 : Number(cleanVal) });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-8">
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase opacity-30">Imagen URL</label>
                  <input type="url" className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-5 outline-none text-xs font-mono" value={formData.imageUrl} onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })} />
                  <button type="button" onClick={() => fileInputRef.current?.click()} className="w-full h-24 border-2 border-dashed border-charcoal/10 rounded-2xl flex flex-col items-center justify-center opacity-60 hover:opacity-100 transition-all">
                    <Upload className="w-6 h-6 mb-2" />
                    <span className="text-[10px] font-bold uppercase tracking-widest">{isUploading ? 'Subiendo...' : 'Subir Imagen'}</span>
                  </button>
                  <input type="file" className="hidden" ref={fileInputRef} onChange={(e) => handleFileUpload(e)} />
                </div>
                <div className="flex gap-4">
                  <button type="submit" disabled={isUploading || isSaving} className="flex-grow bg-charcoal text-bone-light py-5 rounded-2xl uppercase tracking-[0.2em] text-[11px] font-bold shadow-xl">
                    {isSaving ? 'Guardando...' : editingId ? 'Actualizar' : 'Publicar'}
                  </button>
                  <button type="button" onClick={cancelEdit} className="px-8 bg-bone-dark rounded-2xl hover:text-red-500"><X /></button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {artworks.map((art) => (
          <motion.div layout key={art.id} className="bg-white p-8 rounded-[2rem] border border-charcoal/5 flex flex-col md:flex-row items-center gap-8 group hover:shadow-xl transition-all">
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-bone-dark flex-shrink-0">
              <img src={art.imageUrl} className="w-full h-full object-cover" alt={art.name} />
            </div>
            <div className="flex-grow text-center md:text-left">
              <h3 className="font-serif text-2xl uppercase tracking-tight">{art.name}</h3>
              <p className="font-mono text-xs opacity-40">{formatPrice(art.price, settings?.currency || 'EUR')}</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => handleEdit(art)} className="p-4 bg-bone rounded-full hover:bg-charcoal hover:text-white transition-all"><Edit3 className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(art.id)} className="p-4 bg-bone rounded-full hover:bg-red-500 hover:text-white transition-all"><Trash2 className="w-4 h-4" /></button>
              <div className="hidden"><QRCodeSVG id={`qr-code-${art.id}`} value={`${window.location.origin}/artwork/${art.id}`} /></div>
              <button onClick={() => handleDownloadQR(art)} className="p-4 bg-bone rounded-full hover:bg-charcoal hover:text-white transition-all"><QrCode className="w-4 h-4" /></button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
