-- Supabase Storage Policies for Artworks Bucket
-- Run this in the Supabase SQL Editor after creating the bucket

-- First, create the bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('artworks', 'artworks', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access to all files
CREATE POLICY "Artworks are publicly viewable"
ON storage.objects FOR SELECT
USING (bucket_id = 'artworks');

-- Allow authenticated users to upload files
CREATE POLICY "Authenticated users can upload artworks"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files
CREATE POLICY "Users can update their own artworks"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files
CREATE POLICY "Users can delete their own artworks"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'artworks'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Admin can manage all files (replace email with your admin email)
CREATE POLICY "Admin can manage all artworks"
ON storage.objects FOR ALL
USING (
  bucket_id = 'artworks'
  AND auth.jwt() ->> 'email' = 'dariomedina2619@gmail.com'
);
