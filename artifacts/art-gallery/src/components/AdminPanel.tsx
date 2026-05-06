import React, { useEffect, useState } from 'react';
import { User } from '@supabase/supabase-js';
import { authService } from '../lib/auth';
import { artService } from '../services/artService'; // Verifica que esta ruta sea correcta
import { Artwork, SiteSettings } from '../types';
import { Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Upload, Printer, QrCode, Settings, Users, Mail, ShieldAlert } from 'lucide-react';
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
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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
    // Verificación de seguridad para evitar el error de "not a function"
    if (artService && typeof artService.getArtworks === 'function') {
      artService.getArtworks().then(setArtworks).catch(console.error);
      artService.getSettings().then(setSettings).catch(console.error);
    } else {
      console.error("artService no está cargado correctamente o faltan funciones.");
    }
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
    setUploadError(null);

    try {
      const url = await artService.uploadImage(file);
      if (isEdit) {
        setEditForm({ ...editForm, imageUrl: url });
      } else {
        setNewArt({ ...newArt, imageUrl: url });
      }
    } catch (err: any) {
      setUploadError(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleAddArt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsSaving(true);
    try {
      const art = await artService.createArtwork({
        ...newArt,
        ownerId: user.id
      });
      setArtworks([art, ...artworks]);
      setIsAdding(false);
      setNewArt({ name: '', description: '', technique: '', price: 0, imageUrl: '' });
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleStartEdit = (art: Artwork) => {
    setEditingId(art.id);
    setEditForm({
      name: art.name,
      description: art.description || '',
      technique: art.technique || '',
      price: art.price,
      imageUrl: art.imageUrl
    });
  };

  const handleUpdateArt = async (id: string) => {
    setIsSaving(true);
    try {
      const updated = await artService.updateArtwork(id, editForm);
      setArtworks(artworks.map(a => a.id === id ? updated : a));
      setEditingId(null);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteArt = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar esta obra?')) {
      await artService.deleteArtwork(id);
      setArtworks(artworks.filter(a => a.id !== id));
    }
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    setIsSaving(true);
    try {
      const updated = await artService.updateSettings(settings);
      setSettings(updated);
      setShowSettings(false);
    } catch (err: any) {
      setSaveError(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 md:p-12 space-y-12 pb-32 text-charcoal">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 border-b border-charcoal/5 pb-12">
        <div className="space-y-4">
          <h1 className="font-serif text-5xl italic tracking-tight">Panel de Control</h1>
          <p className="text-sm opacity-40 uppercase tracking-[0.2em] font-medium">Gestión de Galería y Exhibiciones</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => setShowAccess(!showAccess)}
            className="flex items-center gap-2 px-6 py-4 rounded-full bg-white border border-charcoal/10 text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all shadow-sm"
          >
            <Users className="w-4 h-4" />
            Accesos
          </button>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-6 py-4 rounded-full bg-white border border-charcoal/10 text-[10px] font-bold uppercase tracking-widest hover:bg-charcoal hover:text-white transition-all shadow-sm"
          >
            <Settings className="w-4 h-4" />
            Ajustes
          </button>
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="flex items-center gap-2 px-8 py-4 rounded-full bg-charcoal text-white text-[10px] font-bold uppercase tracking-widest hover:scale-105 transition-all shadow-xl"
          >
            {isAdding ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {isAdding ? 'Cancelar' : 'Nueva Obra'}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {/* Sección Accesos */}
        {showAccess && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="bg-white rounded-[2rem] p-8 border border-charcoal/5 shadow-sm space-y-8">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-charcoal/5 rounded-full flex items-center justify-center">
                  <Mail className="w-5 h-5 opacity-40" />
                </div>
                <h2 className="font-serif text-2xl italic text-charcoal">Lista de Acceso</h2>
              </div>
              <div className="flex gap-4">
                <input
                  type="email"
                  placeholder="nuevo@correo.com"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="flex-1 bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all text-sm"
                />
                <button
                  onClick={handleAddEmail}
                  className="bg-charcoal text-white px-8 rounded-2xl text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all"
                >
                  Autorizar
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allowedEmails.map(email => (
                  <div key={email} className="flex items-center justify-between p-4 bg-bone-light rounded-xl border border-charcoal/5 group">
                    <span className="text-xs font-medium opacity-60">{email}</span>
                    <button
                      onClick={() => handleRemoveEmail(email)}
                      className="p-2 text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {/* Sección Ajustes */}
        {showSettings && settings && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleUpdateSettings} className="bg-white rounded-[2rem] p-8 border border-charcoal/5 shadow-sm space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Nombre de la Galería</label>
                    <input
                      type="text"
                      value={settings.galleryName}
                      onChange={e => setSettings({ ...settings, galleryName: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Línea Hero 1</label>
                    <input
                      type="text"
                      value={settings.heroLine1}
                      onChange={e => setSettings({ ...settings, heroLine1: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Línea Hero 2</label>
                    <input
                      type="text"
                      value={settings.heroLine2}
                      onChange={e => setSettings({ ...settings, heroLine2: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Moneda (ej: $, €, Bs)</label>
                    <input
                      type="text"
                      value={settings.currency}
                      onChange={e => setSettings({ ...settings, currency: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Descripción Footer</label>
                    <textarea
                      value={settings.footerDescription}
                      onChange={e => setSettings({ ...settings, footerDescription: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all h-32 resize-none"
                    />
                  </div>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="bg-charcoal text-white px-12 py-4 rounded-full text-[10px] font-bold uppercase tracking-widest hover:opacity-90 transition-all disabled:opacity-50 shadow-lg"
                >
                  {isSaving ? 'Guardando...' : 'Confirmar Cambios'}
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {/* Formulario Nueva Obra */}
        {isAdding && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <form onSubmit={handleAddArt} className="bg-white rounded-[3rem] p-8 md:p-12 border border-charcoal/5 shadow-2xl space-y-12">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-8">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Título de la Obra</label>
                    <input
                      type="text"
                      required
                      placeholder="Ej: Maíz de Colores"
                      value={newArt.name}
                      onChange={e => setNewArt({ ...newArt, name: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-5 outline-none focus:border-charcoal/30 transition-all font-serif text-xl italic"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Descripción</label>
                    <textarea
                      placeholder="Una breve historia sobre la pieza..."
                      value={newArt.description}
                      onChange={e => setNewArt({ ...newArt, description: e.target.value })}
                      className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-5 outline-none focus:border-charcoal/30 transition-all h-32 resize-none text-sm leading-relaxed"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Técnica</label>
                      <input
                        type="text"
                        placeholder="Ej: Óleo sobre lienzo"
                        value={newArt.technique}
                        onChange={e => setNewArt({ ...newArt, technique: e.target.value })}
                        className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Precio</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        placeholder="0"
                        value={newArt.price}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setNewArt({ ...newArt, price: Number(val) });
                        }}
                        className="w-full bg-bone-light border border-charcoal/10 rounded-2xl p-4 outline-none focus:border-charcoal/30 transition-all font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <label className="text-[10px] font-bold uppercase tracking-widest opacity-30">Imagen de la Obra</label>
                  <div className="relative group aspect-[4/3] rounded-[2rem] border-2 border-dashed border-charcoal/10 bg-bone-light flex flex-col items-center justify-center overflow-hidden transition-all hover:border-charcoal/20">
                    {newArt.imageUrl ? (
                      <>
                        <img src={newArt.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-charcoal/40 opacity-0 group-hover:opacity-100 transition-all flex items-center justify-center">
                          <button
                            type="button"
                            onClick={() => setNewArt({ ...newArt, imageUrl: '' })}
                            className="bg-white text-charcoal px-6 py-3 rounded-full text-[10px] font-bold uppercase tracking-widest"
                          >
                            Eliminar
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="w-16 h-16 bg-charcoal/5 rounded-full flex items-center justify-center mx-auto mb-4">
                          <Upload className="w-6 h-6 opacity-20" />
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-40">Subir desde el dispositivo</p>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={e => handleImageUpload(e)}
                          className="absolute inset-0 opacity-0 cursor-pointer"
                        />
                      </div>
                    )}
                    {isUploading && (
                      <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex flex-col items-center justify-center gap-4">
                        <div className="w-8 h-8 border-2 border-charcoal border-t-transparent rounded-full animate-spin"></div>
                        <span className="text-[9px] font-bold uppercase tracking-widest">Subiendo...</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-8 border-t border-charcoal/5">
                <button
                  type="submit"
                  disabled={isSaving || !newArt.imageUrl}
                  className="bg-charcoal text-white px-16 py-6 rounded-full text-[10px] font-bold uppercase tracking-[0.3em] hover:scale-105 transition-all shadow-2xl disabled:opacity-50 disabled:scale-100"
                >
                  {isSaving ? 'Guardando...' : 'Publicar Obra'}
                </button>
              </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tabla de Obras */}
      <div className="bg-white rounded-[3rem] border border-charcoal/5 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-charcoal/5">
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30">Obra</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30">Técnica</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30">Precio</th>
                <th className="p-8 text-[10px] font-bold uppercase tracking-widest opacity-30 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {artworks.map(art => (
                <tr key={art.id} className="group hover:bg-bone-light/30 transition-colors">
                  <td className="p-8">
                    <div className="flex items-center gap-6">
                      <div className="w-16 h-16 rounded-xl overflow-hidden bg-bone-light flex-shrink-0 border border-charcoal/5">
                        <img src={art.imageUrl} alt={art.name} className="w-full h-full object-cover" />
                      </div>
                      {editingId === art.id ? (
                        <input
                          type="text"
                          value={editForm.name}
                          onChange={e => setEditForm({ ...editForm, name: e.target.value })}
                          className="bg-bone-light border border-charcoal/10 rounded-lg p-2 font-serif italic"
                        />
                      ) : (
                        <div className="space-y-1">
                          <p className="font-serif text-lg italic">{art.name}</p>
                          <p className="text-[10px] opacity-30 font-mono">#{art.id.slice(0, 8).toUpperCase()}</p>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="p-8">
                    {editingId === art.id ? (
                      <input
                        type="text"
                        value={editForm.technique}
                        onChange={e => setEditForm({ ...editForm, technique: e.target.value })}
                        className="bg-bone-light border border-charcoal/10 rounded-lg p-2 text-sm"
                      />
                    ) : (
                      <span className="text-sm opacity-50">{art.technique || '---'}</span>
                    )}
                  </td>
                  <td className="p-8">
                    {editingId === art.id ? (
                      <input
                        type="text"
                        inputMode="numeric"
                        value={editForm.price}
                        onChange={(e) => {
                          const val = e.target.value.replace(/\D/g, '');
                          setEditForm({ ...editForm, price: Number(val) });
                        }}
                        className="w-24 bg-bone-light border border-charcoal/10 rounded-lg p-2 font-mono text-sm"
                      />
                    ) : (
                      <span className="font-mono text-sm font-bold">{formatPrice(art.price, settings?.currency || '$')}</span>
                    )}
                  </td>
                  <td className="p-8">
                    <div className="flex justify-end gap-2">
                      {editingId === art.id ? (
                        <>
                          <button
                            onClick={() => handleUpdateArt(art.id)}
                            className="p-3 bg-charcoal text-white rounded-full hover:scale-110 transition-all"
                          >
                            <Save className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-3 bg-bone-light rounded-full hover:scale-110 transition-all"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            onClick={() => setPrintingArt(art)}
                            className="p-3 text-charcoal/30 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-all"
                            title="Generar Código QR"
                          >
                            <QrCode className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleStartEdit(art)}
                            className="p-3 text-charcoal/30 hover:text-charcoal hover:bg-charcoal/5 rounded-full transition-all"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteArt(art.id)}
                            className="p-3 text-red-200 hover:text-red-500 hover:bg-red-50 rounded-full transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {artworks.length === 0 && (
            <div className="p-20 text-center space-y-4">
              <div className="w-20 h-20 bg-bone-light rounded-full flex items-center justify-center mx-auto">
                <ImageIcon className="w-8 h-8 opacity-10" />
              </div>
              <p className="font-serif italic text-xl opacity-30">No hay obras en la colección todavía.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal QR */}
      <AnimatePresence>
        {printingArt && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-charcoal/90 backdrop-blur-xl flex items-center justify-center p-6"
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              className="bg-white w-full max-w-lg rounded-[3rem] p-12 text-center space-y-10 shadow-2xl relative"
            >
              <div className="space-y-4">
                <div className="flex justify-center">
                  <div className="w-16 h-16 bg-charcoal rounded-full flex items-center justify-center text-bone-light">
                    <QrCode className="w-8 h-8" />
                  </div>
                </div>
                <h2 className="font-serif text-3xl italic">Etiqueta Digital</h2>
                <p className="text-[10px] uppercase tracking-widest opacity-40">Escanea para ver detalles en la galería</p>
              </div>

              <div className="flex flex-col items-center gap-8 bg-bone-light p-10 rounded-[2rem]">
                <div className="bg-white p-6 rounded-3xl shadow-sm">
                  <QRCodeSVG 
                    value={`${window.location.origin}/artwork/${printingArt.id}`} 
                    size={200}
                    level="H"
                    includeMargin
                  />
                </div>
                <div className="space-y-2">
                  <p className="font-serif text-2xl italic">{printingArt.name}</p>
                  <p className="text-[9px] font-mono opacity-40">ID: {printingArt.id}</p>
                </div>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={() => window.print()}
                  className="flex-1 bg-charcoal text-white py-5 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-3 hover:opacity-90 transition-all"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={() => setPrintingArt(null)}
                  className="w-16 h-16 border border-charcoal/10 rounded-full flex items-center justify-center hover:bg-charcoal hover:text-white transition-all"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
