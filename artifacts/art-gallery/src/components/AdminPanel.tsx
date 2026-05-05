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
      setUploadError(error?.message || 'Error al subir la imagen. Por favor, inténtalo de nuevo.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      if (heroFileInputRef.current) heroFileInputRef.current.value = '';
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingId) {
        await artService.updateArtwork(editingId, formData);
        setEditingId(null);
      } else {
        await artService.createArtwork(formData);
        setIsAdding(false);
      }
      setFormData({ name: '', description: '', technique: '', price: 0, imageUrl: '' });
    } catch (error) {
       console.error("Error saving artwork:", error);
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
    if (!window.confirm('¿Estás seguro de que deseas eliminar esta obra?')) return;
    try {
      await artService.deleteArtwork(id);
    } catch (error) {
      console.error("Error deleting artwork:", error);
    }
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
      const pngFile = canvas.toDataURL('image/png');

      const downloadLink = document.createElement('a');
      downloadLink.download = `qr-${art.name.replace(/[^a-z0-9]/gi, '_')}.png`;
      downloadLink.href = pngFile;
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
    setAccessError(null);
    try {
      const { data, error } = await supabase.from('allowed_emails').select('email').order('email');
      if (error) throw error;
      setAllowedEmails(data.map((r: { email: string }) => r.email));
    } catch (err: any) {
      setAccessError('No se pudo cargar la lista de correos.');
    } finally {
      setAccessLoading(false);
    }
  };

  const handleAddEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const email = newEmail.trim().toLowerCase();
    if (!email) return;
    if (allowedEmails.includes(email)) {
      setAccessError('Este correo ya tiene acceso.');
      return;
    }
    setAccessError(null);
    try {
      const { error } = await supabase.from('allowed_emails').insert({ email });
      if (error) throw error;
      setAllowedEmails(prev => [...prev, email].sort());
      setNewEmail('');
    } catch (err: any) {
      setAccessError(err.message || 'Error al agregar el correo.');
    }
  };

  const handleRemoveEmail = async (email: string) => {
    if (!window.confirm(`¿Quitar acceso a ${email}?`)) return;
    try {
      const { error } = await supabase.from('allowed_emails').delete().eq('email', email);
      if (error) throw error;
      setAllowedEmails(prev => prev.filter(e => e !== email));
    } catch (err: any) {
      setAccessError(err.message || 'Error al eliminar el correo.');
    }
  };

  if (!user) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-12 max-w-lg mx-auto text-center px-6">
        <div className="space-y-6">
            <h1 className="font-serif text-5xl">Gallería <br /><span className="italic opacity-60">Privada</span></h1>
            <p className="opacity-40 text-lg leading-relaxed font-light">
                Un entorno exclusivo para la curaduría y gestión de obras artísticas certificadas.
            </p>
        </div>
        <button 
          onClick={() => authService.loginWithGoogle()}
          className="w-full bg-charcoal text-bone-light py-5 rounded-full uppercase tracking-[0.3em] text-[10px] font-bold hover:bg-charcoal/90 hover:scale-[1.02] transition-all shadow-2xl"
        >
          Entrar con Google Auth
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-16 py-24 pb-32 px-6 md:px-12">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-end gap-8 border-b border-charcoal/5 pb-12">
        <div className="space-y-4">
            <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">Sistema de Gestión Intuitivo</p>
            <h1 className="font-serif text-6xl leading-tight">Control de <br /><span className="italic opacity-50">Exhibiciones</span></h1>
        </div>
        <div className="flex flex-wrap gap-4">
          <button 
            onClick={() => { setShowAccess(!showAccess); setShowSettings(false); setIsAdding(false); if (!showAccess) loadAllowedEmails(); }}
            className={`px-6 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.1em] text-[10px] font-bold hover:scale-105 transition-all shadow-md ${showAccess ? 'bg-charcoal text-white' : 'bg-bone-dark text-charcoal'}`}
          >
            <Users className="w-3.5 h-3.5" />
            Acceso Admin
          </button>
          <button 
            onClick={() => { setShowSettings(!showSettings); setShowAccess(false); setIsAdding(false); }}
            className={`px-6 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.1em] text-[10px] font-bold hover:scale-105 transition-all shadow-md ${showSettings ? 'bg-charcoal text-white' : 'bg-bone-dark text-charcoal'}`}
          >
            <Settings className="w-3.5 h-3.5" />
            Preferencias de Galería
          </button>
          <button 
            onClick={() => { setIsAdding(!isAdding); setShowSettings(false); setShowAccess(false); }}
            className="bg-charcoal text-bone-light px-8 py-4 rounded-full flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-bold hover:scale-105 transition-all shadow-xl group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform" />
            Nueva Adquisición
          </button>
        </div>
      </header>

      <AnimatePresence>
        {showAccess && (
          <motion.div
            key="access-panel"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-bone-dark/30 p-10 rounded-[2.5rem] border border-charcoal/5 overflow-hidden"
          >
            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[9px] font-black uppercase tracking-[0.4em] opacity-30">Gestión de Permisos</p>
                <h2 className="font-serif text-3xl">Correos <span className="italic opacity-50">Autorizados</span></h2>
              </div>

              <form onSubmit={handleAddEmail} className="flex gap-3">
                <div className="relative flex-grow">
                  <input
                    type="email"
                    required
                    value={newEmail}
                    onChange={(e) => { setNewEmail(e.target.value); setAccessError(null); }}
                    placeholder="nuevo@correo.com"
                    className="w-full bg-white border border-charcoal/10 rounded-2xl p-5 pl-14 focus:border-charcoal/30 outline-none transition-all placeholder:opacity-30 font-mono text-sm"
                  />
                  <Mail className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 opacity-30" />
                </div>
                <button
                  type="submit"
                  className="bg-charcoal text-bone-light px-8 py-4 rounded-2xl uppercase tracking-[0.15em] text-[10px] font-bold hover:scale-105 transition-all shadow-lg flex items-center gap-2 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" />
                  Agregar
                </button>
              </form>

              {accessError && (
                <div className="bg-red-50 text-red-600 text-sm p-4 rounded-xl">
                  {accessError}
                </div>
              )}

              <div className="space-y-3">
                {accessLoading ? (
                  <div className="flex items-center justify-center py-12 opacity-30">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-charcoal"></div>
                  </div>
                ) : allowedEmails.length === 0 ? (
                  <p className="text-center py-10 opacity-30 text-sm font-serif italic">
                    No hay correos autorizados aún
                  </p>
                ) : (
                  <AnimatePresence>
                    {allowedEmails.map((email) => (
                      <motion.div
                        key={email}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center justify-between bg-white rounded-2xl px-6 py-4 border border-charcoal/5 group hover:shadow-md transition-all"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-9 h-9 rounded-full bg-bone-dark flex items-center justify-center flex-shrink-0">
                            <Mail className="w-4 h-4 opacity-40" />
                          </div>
                          <span className="font-mono text-sm opacity-70">{email}</span>
                        </div>
                        <button
                          onClick={() => handleRemoveEmail(email)}
                          className="w-9 h-9 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-red-50 hover:text-red-500 transition-all"
                          title="Quitar acceso"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {showSettings && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="bg-bone-dark/30 p-10 rounded-[2.5rem] border border-charcoal/5 overflow-hidden"
          >
            <form onSubmit={handleSettingsSubmit} className="space-y-8">
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Nombre de la Galería</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-serif"
                      value={settingsData.galleryName}
                      onChange={(e) => setSettingsData({ ...settingsData, galleryName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Moneda Principal</label>
                    <select 
                      className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-mono text-sm"
                      value={settingsData.currency}
                      onChange={(e) => setSettingsData({ ...settingsData, currency: e.target.value })}
                    >
                      <option value="EUR">EUR (€)</option>
                      <option value="USD">USD ($)</option>
                      <option value="GBP">GBP (£)</option>
                      <option value="MXN">MXN ($)</option>
                      <option value="ARS">ARS ($)</option>
                      <option value="COP">COP ($)</option>
                      <option value="PEN">PEN (S/)</option>
                    </select>
                  </div>
               </div>
               
               <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Línea Principal del Hero</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-serif"
                      value={settingsData.heroLine1}
                      onChange={(e) => setSettingsData({ ...settingsData, heroLine1: e.target.value })}
                    />
                  </div>
                  <div className="space-y-3">
                    <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Línea Secundaria (Italic)</label>
                    <input 
                      required
                      type="text" 
                      className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-serif italic"
                      value={settingsData.heroLine2}
                      onChange={(e) => setSettingsData({ ...settingsData, heroLine2: e.target.value })}
                    />
                  </div>
               </div>

               <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Descripción del Footer</label>
                  <textarea 
                    rows={3}
                    className="w-full bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-sans text-sm leading-relaxed"
                    value={settingsData.footerDescription}
                    onChange={(e) => setSettingsData({ ...settingsData, footerDescription: e.target.value })}
                  />
               </div>

               <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-40 px-1">Fondo del Hero (Landing)</label>
                  <div className="flex flex-col md:flex-row gap-6 items-start">
                    {settingsData.heroImageUrl && (
                      <div className="w-40 h-24 rounded-xl overflow-hidden bg-bone shadow-inner flex-shrink-0">
                        <img src={settingsData.heroImageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Hero preview" />
                      </div>
                    )}
                    <div className="flex-grow w-full space-y-4">
                      <div className="flex gap-2">
                        <input 
                          type="url" 
                          placeholder="URL de la imagen de fondo..."
                          className="flex-grow bg-white border border-charcoal/5 rounded-2xl p-5 focus:border-charcoal/20 outline-none transition-all font-mono text-xs"
                          value={settingsData.heroImageUrl}
                          onChange={(e) => setSettingsData({ ...settingsData, heroImageUrl: e.target.value })}
                        />
                        {settingsData.heroImageUrl && (
                          <button 
                            type="button"
                            onClick={() => setSettingsData({ ...settingsData, heroImageUrl: '' })}
                            className="p-5 bg-white border border-charcoal/5 rounded-2xl text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <input 
                        type="file" 
                        accept="image/*"
                        className="hidden"
                        ref={heroFileInputRef}
                        onChange={(e) => handleFileUpload(e, true)}
                      />
                      <button 
                        type="button"
                        onClick={() => heroFileInputRef.current?.click()}
                        disabled={isUploading}
                        className="flex items-center gap-2 text-[10px] uppercase font-bold tracking-widest opacity-60 hover:opacity-100 transition-opacity disabled:opacity-30"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        {isUploading ? 'Subiendo...' : 'Subir Nueva Imagen de Fondo'}
                      </button>
                    </div>
                  </div>
                </div>

               <div className="flex justify-end gap-4">
                  <button type="button" onClick={() => setShowSettings(false)} className="text-[10px] uppercase font-bold tracking-widest opacity-40 hover:opacity-100 transition-opacity">Cancelar</button>
                  <button type="submit" className="bg-charcoal text-white px-8 py-3 rounded-full text-[10px] uppercase font-bold tracking-[0.2em] shadow-lg hover:scale-105 transition-all">Guardar Configuración</button>
               </div>
            </form>
          </motion.div>
        )}

        {isAdding && (
          <motion.div 
            key="add-form"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="bg-white p-10 md:p-14 rounded-[3rem] border border-charcoal/5 shadow-2xl relative overflow-hidden"
          >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-bone via-charcoal to-bone opacity-10"></div>
            <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-2 gap-16">
              <div className="space-y-8">
                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Título de la Obra</label>
                  <input
                    required
                    type="text"
                    placeholder="Nebulosa Primordial"
                    className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 focus:bg-white focus:border-charcoal/20 outline-none transition-all placeholder:opacity-30 font-serif"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Descripción</label>
                  <textarea
                    rows={3}
                    placeholder="Una exploración de las formas cósmicas..."
                    className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 focus:bg-white focus:border-charcoal/20 outline-none transition-all placeholder:opacity-30 font-serif text-sm"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Técnica</label>
                  <input
                    type="text"
                    placeholder="Óleo sobre lienzo, Acrílico, Acuarela..."
                    className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 focus:bg-white focus:border-charcoal/20 outline-none transition-all placeholder:opacity-30 font-serif text-sm"
                    value={formData.technique}
                    onChange={(e) => setFormData({ ...formData, technique: e.target.value })}
                  />
                </div>

                <div className="space-y-3">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Precio</label>
                  <input
                    required
                    type="number"
                    placeholder="2500"
                    className="w-full bg-bone-light border border-charcoal/5 rounded-2xl p-5 focus:bg-white focus:border-charcoal/20 outline-none transition-all placeholder:opacity-30 font-mono text-sm"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: Number(e.target.value) })}
                  />
                </div>
              </div>

              <div className="space-y-8 flex flex-col h-full justify-between">
                <div className="space-y-4">
                  <label className="text-[9px] font-black uppercase tracking-[0.3em] opacity-30 px-1">Imagen de la Obra</label>
                  <div className="space-y-4">
                    <input 
                      type="url" 
                      placeholder="Enlace URL de la imagen..."
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-5 focus:bg-white focus:border-charcoal/20 outline-none transition-all placeholder:opacity-30 text-xs font-mono"
                      value={formData.imageUrl}
                      onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                    />
                    <div className="space-y-2">
                      <div className="relative h-28">
                        <input 
                          type="file" 
                          accept="image/*"
                          className="hidden"
                          ref={fileInputRef}
                          onChange={(e) => handleFileUpload(e)}
                        />
                        <button 
                          type="button"
                          onClick={() => { setUploadError(null); fileInputRef.current?.click(); }}
                          disabled={isUploading}
                          className={`w-full h-full border-2 border-dashed rounded-2xl flex flex-col items-center justify-center gap-2 transition-all ${isUploading ? 'opacity-50 cursor-wait border-charcoal/10' : uploadError ? 'border-red-300 hover:bg-red-50' : 'border-charcoal/10 hover:bg-bone-light'}`}
                        >
                          {isUploading ? (
                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-charcoal"></div>
                          ) : (
                            <Upload className={`w-6 h-6 ${uploadError ? 'text-red-400' : 'opacity-30'}`} />
                          )}
                          <span className={`text-[10px] font-bold uppercase tracking-widest ${uploadError ? 'text-red-500' : 'opacity-60'}`}>
                            {isUploading ? 'Subiendo Imagen...' : uploadError ? 'Reintentar' : 'Subir desde el Dispositivo'}
                          </span>
                        </button>
                      </div>
                      {uploadError && (
                        <div className="bg-red-50 border border-red-100 text-red-600 text-xs p-3 rounded-xl leading-relaxed">
                          {uploadError}
                        </div>
                      )}
                    </div>
                  </div>

                  {formData.imageUrl && (
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="aspect-video rounded-2xl overflow-hidden bg-bone-dark relative group shadow-inner mt-4"
                    >
                        <img src={formData.imageUrl} className="w-full h-full object-cover" referrerPolicy="no-referrer" alt="Preview" />
                        <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button"
                            onClick={() => setFormData(prev => ({ ...prev, imageUrl: '' }))}
                            className="w-12 h-12 bg-white text-charcoal rounded-full flex items-center justify-center shadow-2xl hover:scale-110 transition-transform"
                          >
                            <X className="w-6 h-6" />
                          </button>
                        </div>
                    </motion.div>
                  )}
                </div>

                <div className="flex gap-4 pt-6">
                  <button type="submit" disabled={isUploading} className="flex-grow bg-charcoal text-bone-light py-5 rounded-2xl uppercase tracking-[0.2em] text-[11px] font-bold hover:opacity-90 transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50">
                    <Save className="w-5 h-5" />
                    {editingId ? 'Confirmar Cambios' : 'Certificar Publicación'}
                  </button>
                  <button type="button" onClick={cancelEdit} className="px-8 bg-bone-dark rounded-2xl hover:bg-red-50 hover:text-red-500 transition-colors group">
                    <X className="w-5 h-5 opacity-40 group-hover:opacity-100 transition-opacity" />
                  </button>
                </div>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 gap-6">
        {artworks.map((art) => (
          <motion.div 
            layout
            key={art.id} 
            className="bg-white p-8 rounded-[2rem] border border-charcoal/5 flex flex-col md:flex-row items-center gap-8 group hover:shadow-2xl transition-all duration-500 hover:-translate-y-1"
          >
            <div className="w-32 h-32 rounded-2xl overflow-hidden bg-bone-dark flex-shrink-0 shadow-inner">
               {art.imageUrl ? (
                 <img src={art.imageUrl} className="w-full h-full object-cover grayscale-[0.5] group-hover:grayscale-0 transition-all duration-700" referrerPolicy="no-referrer" alt={art.name} />
               ) : (
                 <div className="w-full h-full flex items-center justify-center opacity-20"><ImageIcon className="w-10 h-10" /></div>
               )}
            </div>
            <div className="flex-grow min-w-0 text-center md:text-left">
              <h3 className="font-serif text-3xl mb-1 group-hover:tracking-tight transition-all">{art.name}</h3>
              {art.technique && (
                <p className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-1">{art.technique}</p>
              )}
              <p className="text-sm font-medium opacity-30 italic font-serif mt-2">{formatPrice(art.price, settings?.currency || 'EUR')}</p>
            </div>
            <div className="flex gap-4">
              <button
                onClick={() => setQrModalOpen(art.id)}
                title="Ver QR"
                className="w-12 h-12 rounded-full border border-charcoal/5 flex items-center justify-center bg-bone-light hover:bg-charcoal hover:text-bone-light transition-all duration-300"
              >
                <QrCode className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(art)}
                className="w-12 h-12 rounded-full border border-charcoal/5 flex items-center justify-center bg-bone-light hover:bg-charcoal hover:text-bone-light transition-all duration-300"
              >
                <Edit3 className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(art.id)}
                className="w-12 h-12 rounded-full border border-charcoal/5 flex items-center justify-center bg-bone-light hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all duration-300"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {qrModalOpen && artworks.find(a => a.id === qrModalOpen) && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setQrModalOpen(null)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-[2rem] p-10 max-w-lg w-full shadow-2xl relative"
              onClick={(e) => e.stopPropagation()}
            >
              {(() => {
                const art = artworks.find(a => a.id === qrModalOpen);
                if (!art) return null;
                return (
                  <div className="flex flex-col items-center space-y-8">
                    <div className="space-y-4 text-center">
                      <h2 className="font-serif text-3xl">{art.name}</h2>
                      {art.technique && (
                        <p className="text-[8px] font-black uppercase tracking-widest opacity-40">{art.technique}</p>
                      )}
                    </div>

                    <div className="p-6 border-2 border-charcoal rounded-[2rem] bg-bone-light">
                      <QRCodeSVG
                        id={`qr-code-${art.id}`}
                        value={`${window.location.origin}/artwork/${art.id}`}
                        size={280}
                        level="H"
                        includeMargin={true}
                      />
                    </div>

                    <div className="flex gap-4 w-full">
                      <button
                        onClick={() => handleDownloadQR(art)}
                        className="flex-1 bg-charcoal text-bone-light py-4 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                        </svg>
                        Descargar
                      </button>
                      <button
                        onClick={() => {
                          setPrintingArt(art);
                          setQrModalOpen(null);
                          setTimeout(() => window.print(), 100);
                        }}
                        className="flex-1 bg-bone-dark text-charcoal py-4 rounded-full uppercase tracking-[0.2em] text-[10px] font-bold hover:scale-105 transition-all shadow-xl flex items-center justify-center gap-2"
                      >
                        <Printer className="w-4 h-4" />
                        Imprimir
                      </button>
                    </div>

                    <button
                      onClick={() => setQrModalOpen(null)}
                      className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white border border-charcoal/5 flex items-center justify-center hover:bg-charcoal hover:text-white transition-all"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                );
              })()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hidden print:block fixed inset-0 bg-white z-[9999] p-20 text-center space-y-12">
          {printingArt && (
            <div className="flex flex-col items-center justify-center h-full space-y-16">
              <div className="space-y-4">
                <h1 className="font-serif text-6xl italic">{settings?.galleryName || "Gallería D'Arte"}</h1>
                <div className="h-px w-32 bg-charcoal mx-auto opacity-20"></div>
              </div>
              
              <div className="p-8 border-[12px] border-charcoal rounded-[3rem]">
                <QRCodeSVG 
                  value={`${window.location.origin}/artwork/${printingArt.id}`} 
                  size={400}
                  level="H"
                />
              </div>

              <div className="space-y-4 text-charcoal">
                <h2 className="font-serif text-5xl uppercase tracking-tighter">{printingArt.name}</h2>
                <p className="font-mono text-sm opacity-30 mt-8">Certificado de Autenticidad Digital #{printingArt.id.slice(0,8).toUpperCase()}</p>
              </div>
            </div>
          )}
      </div>
    </div>
  );
}
