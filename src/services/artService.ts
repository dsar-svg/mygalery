import { supabase } from '../lib/supabase';
import { Artwork, SiteSettings } from '../types';
import { User } from '@supabase/supabase-js';

const BUCKET_NAME = 'artworks';

export const artService = {
  async getAllArtworks(): Promise<Artwork[]> {
    try {
      const { data, error } = await supabase
        .from('artworks')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        name: item.name,
        description: item.description,
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
    if (!user) throw new Error('Must be logged in to upload images');

    // Sanitize filename and prepare path
    const safeName = file.name.replace(/[^a-z0-9.]/gi, '_').toLowerCase();
    const timestamp = Date.now();
    const path = `artworks/${user.id}/${timestamp}_${safeName}`;

    console.log('--- STORAGE UPLOAD DEBUG ---');
    console.log('File:', file.name, 'Size:', file.size, 'Type:', file.type);
    console.log('Path:', path);
    console.log('User ID:', user.id);

    try {
      const { data, error } = await supabase.storage
        .from(BUCKET_NAME)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false,
        });

      if (error) throw error;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(BUCKET_NAME)
        .getPublicUrl(data.path);

      console.log('Upload successful! Path:', data.path);
      console.log('Download URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Storage upload error:', error);
      if (error && typeof error === 'object' && 'message' in error) {
        if (String(error.message).includes('JWT')) {
          throw new Error('Error de autenticación. Por favor inicia sesión nuevamente.');
        }
        if (String(error.message).includes('policy')) {
          throw new Error('Error de permisos en Storage. Por favor verifica las políticas RLS.');
        }
      }
      throw error;
    }
  },

  async createArtwork(data: Omit<Artwork, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>): Promise<string> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to create artwork');

    try {
      const { data: result, error } = await supabase
        .from('artworks')
        .insert({
          name: data.name,
          description: data.description,
          price: data.price,
          image_url: data.imageUrl,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result.id;
    } catch (error) {
      console.error('Error creating artwork:', error);
      return '';
    }
  },

  async updateArtwork(id: string, data: Partial<Omit<Artwork, 'id' | 'createdAt' | 'updatedAt' | 'ownerId'>>): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {};
      if (data.name !== undefined) updateData.name = data.name;
      if (data.description !== undefined) updateData.description = data.description;
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
          // Refetch all artworks on any change
          this.getAllArtworks().then(callback);
        }
      )
      .subscribe();

    // Initial fetch
    this.getAllArtworks().then(callback);

    // Return unsubscribe function
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

    const channel = supabase
      .channel('settings-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'settings',
          filter: `id=eq.00000000-0000-0000-0000-000000000001`,
        },
        () => {
          fetchSettings();
        }
      )
      .subscribe();

    // Initial fetch
    fetchSettings();

    // Return unsubscribe function
    return () => {
      supabase.removeChannel(channel);
    };
  }
};
