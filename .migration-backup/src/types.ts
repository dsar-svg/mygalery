export interface Artwork {
  id: string;
  name: string;
  description?: string;
  technique?: string;
  price: number;
  imageUrl: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string;
}

export interface SiteSettings {
  galleryName: string;
  heroLine1: string;
  heroLine2: string;
  heroImageUrl?: string;
  footerDescription: string;
  currency: string;
  updatedAt: Date;
}

