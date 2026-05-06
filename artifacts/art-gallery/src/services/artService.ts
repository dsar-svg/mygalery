import { supabase } from '../lib/supabase';
import { Artwork, SiteSettings } from '../types';

const BUCKET_NAME = 'artworks';

export const artService = {
  async getAllArtworks(): Promise<Artwork[]> {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map((item: any) => ({
        id: item.id,
        name: item.name,
        description: item.description,
        technique: item.technique,
        price: item.price,
        imageUrl: item.image_url,
        createdAt: new Date(item.created_at),
        updatedAt: new Date(item.updated_at),
        ownerId: item.owner_id,
      })) as Artwork[];
    } catch (error) {
      console.error('Error fetching artworks:', error);
      return [];
    }
  },

  async getArtworkById(id: string): Promise<Artwork | null> {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .eq('id', id)
        .single();

      if (error) return null;

      return {
        id: data.id,
        name: data.name,
        description: data.description,
        technique: data.technique,
        price: data.price,
        imageUrl: data.image_url,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        ownerId: data.owner_id,
      } as Artwork;
    } catch (error) {
      console.error('Error fetching artwork:', error);
      return null;
    }
  },

  async uploadImage(file: File): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Debes iniciar sesión para subir imágenes.');

    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    const path = `artworks/${user.id}/${timestamp}_${safeName}`;

    const uploadPromise = supabase.storage
      .from(BUCKET_NAME)
      .upload(path, file, { cacheControl: '3600', upsert: false });

    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(
        'La subida tardó demasiado y fue cancelada. ' +
        'Asegúrate de que el bucket "artworks" exista en Supabase Storage ' +
        'y que las políticas RLS permitan subidas.'
      )), 20000)
    );

    try {
      const { data, error } = await Promise.race([uploadPromise, timeoutPromise]);

      if (error) {
        const msg = (error as any).message || '';
        if (msg.includes('Bucket not found') || msg.includes('not found')) {
          throw new Error('El bucket "artworks" no existe en Supabase Storage. Créalo desde el panel de Supabase → Storage.');
        }
        if (msg.includes('JWT') || msg.includes('auth')) {
          throw new Error('Error de autenticación. Por favor cierra sesión y vuelve a iniciarla.');
        }
        if (msg.includes('policy') || msg.includes('violates')) {
          throw new Error('Sin permiso para subir imágenes. Verifica las políticas RLS del bucket en Supabase.');
        }
        throw new Error(msg || 'Error al subir la imagen.');
      }

      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      return publicUrl;
    } catch (error) {
      console.error('Storage upload error:', error);
      throw error;
    }
  },

  async createArtwork(data: Omit<Artwork, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw new Error('Error de autenticación. Por favor cierra sesión y vuelve a entrar.');
    if (!user) throw new Error('Debes iniciar sesión para publicar obras.');

    const { data: result, error } = await supabase
      .from('artworks')
      .insert({
        name: data.name,
        description: data.description,
        technique: data.technique,
        price: data.price,
        image_url: data.imageUrl,
        owner_id: user.id,
      })
      .select()
      .single();

    if (error) {
      const msg = (error as any).message || '';
      if (msg.includes('policy') || msg.includes('violates') || error.code === '42501') {
        throw new Error('Sin permiso para crear obras. Verifica las políticas RLS de la tabla "artworks" en Supabase.');
      }
      if (msg.includes('relation') || msg.includes('does not exist')) {
        throw new Error('La tabla "artworks" no existe en Supabase. Verifica que esté creada.');
      }
      throw new Error(msg || 'Error al guardar la obra.');
    }

    return result.id;
  },

  async updateArtwork(id: string, data: Partial<Omit<Artwork, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
      if (data.technique !== undefined) updateData.technique = data.technique;
      if (data.price !== undefined) updateData.price = data.price;
      if (data.imageUrl !== undefined) updateData.image_url = data.imageUrl;

      const { error } = await supabase
        .from('artworks')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating artwork:', error);
    }
  },

  async deleteArtwork(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('artworks')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting artwork:', error);
    }
  },

  subscribeToArtworks(callback: (artworks: Artwork[]) => void) {
    const channel = supabase
      .channel('artworks-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'artworks',
        },
        () => {
          this.getAllArtworks().then(callback);
        }
      )
      .subscribe();

    this.getAllArtworks().then(callback);

    return () => {
      supabase.removeChannel(channel);
    };
  },

  async getSettings(): Promise<SiteSettings | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) return null;

      return {
        galleryName: data.gallery_name,
        heroLine1: data.hero_line1,
        heroLine2: data.hero_line2,
        heroImageUrl: data.hero_image_url || undefined,
        footerDescription: data.footer_description,
        currency: data.currency,
        updatedAt: new Date(data.updated_at),
      } as SiteSettings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to update settings');

    try {
      const updateData: Record<string, unknown> = {};
      if (settings.galleryName !== undefined) updateData.gallery_name = settings.galleryName;
      if (settings.heroLine1 !== undefined) updateData.hero_line1 = settings.heroLine1;
      if (settings.heroLine2 !== undefined) updateData.hero_line2 = settings.heroLine2;
      if (settings.heroImageUrl !== undefined) updateData.hero_image_url = settings.heroImageUrl;
      if (settings.footerDescription !== undefined) updateData.footer_description = settings.footerDescription;
      if (settings.currency !== undefined) updateData.currency = settings.currency;

      const { error } = await supabase
        .from('settings')
        .update(updateData)
        .eq('id', '00000000-0000-0000-0000-000000000001');

      if (error) throw error;
    } catch (error) {
      console.error('Error updating settings:', error);
    }
  },

  subscribeToSettings(callback: (settings: SiteSettings) => void) {
    const fetchSettings = async () => {
      const settings = await this.getSettings();
      if (settings) callback(settings);
    };

    fetchSettings();

    const intervalId = setInterval(fetchSettings, 5000);

    return () => {
      clearInterval(intervalId);
    };
  }
};
