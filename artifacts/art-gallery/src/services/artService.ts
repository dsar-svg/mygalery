import { supabase } from '../lib/supabase';
import { Artwork, SiteSettings } from '../types';

const BUCKET_NAME = 'artworks';

export const artService = {
  // Sincronizado: getArtworks para que el AdminPanel no de error
  async getArtworks(): Promise<Artwork[]> {
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

  async createArtwork(art: Omit<Artwork, 'id' | 'createdAt' | 'updatedAt'>): Promise<Artwork> {
    const { data, error } = await supabase
      .from('artworks')
      .insert([{
        name: art.name,
        description: art.description,
        technique: art.technique,
        price: art.price,
        image_url: art.imageUrl,
        owner_id: art.ownerId
      }])
      .select()
      .single();

    if (error) throw error;
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
  },

  async updateArtwork(id: string, art: Partial<Artwork>): Promise<Artwork> {
    const { data, error } = await supabase
      .from('artworks')
      .update({
        name: art.name,
        description: art.description,
        technique: art.technique,
        price: art.price,
        image_url: art.imageUrl,
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
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
  },

  async deleteArtwork(id: string): Promise<void> {
    const { error } = await supabase
      .from('artworks')
      .delete()
      .eq('id', id);
    if (error) throw error;
  },

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  async getSettings(): Promise<SiteSettings | null> {
    try {
      const { data, error } = await supabase
        .from('settings')
        .select('*')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;

      return {
        galleryName: data.gallery_name,
        heroLine1: data.hero_line1,
        heroLine2: data.hero_line2,
        heroImageUrl: data.hero_image_url,
        footerDescription: data.footer_description,
        currency: data.currency,
        updatedAt: new Date(data.updated_at),
      } as SiteSettings;
    } catch (error) {
      console.error('Error fetching settings:', error);
      return null;
    }
  },

  async updateSettings(settings: Partial<SiteSettings>): Promise<SiteSettings> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Must be logged in to update settings');

    const updateData: Record<string, any> = {};
    if (settings.galleryName !== undefined) updateData.gallery_name = settings.galleryName;
    if (settings.heroLine1 !== undefined) updateData.hero_line1 = settings.heroLine1;
    if (settings.heroLine2 !== undefined) updateData.hero_line2 = settings.heroLine2;
    if (settings.heroImageUrl !== undefined) updateData.hero_image_url = settings.heroImageUrl;
    if (settings.footerDescription !== undefined) updateData.footer_description = settings.footerDescription;
    if (settings.currency !== undefined) updateData.currency = settings.currency;

    const { data, error } = await supabase
      .from('settings')
      .update(updateData)
      .eq('id', '00000000-0000-0000-0000-000000000001')
      .select()
      .single();

    if (error) throw error;
    
    return {
      galleryName: data.gallery_name,
      heroLine1: data.hero_line1,
      heroLine2: data.hero_line2,
      heroImageUrl: data.hero_image_url,
      footerDescription: data.footer_description,
      currency: data.currency,
      updatedAt: new Date(data.updated_at),
    } as SiteSettings;
  },

  subscribeToSettings(callback: (settings: SiteSettings) => void) {
    const fetchSettings = async () => {
      const settings = await this.getSettings();
      if (settings) callback(settings);
    };

    const subscription = supabase
      .channel('settings_changes')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'settings' }, fetchSettings)
      .subscribe();

    fetchSettings();

    return () => {
      supabase.removeChannel(subscription);
    };
  }
};
