-- ============================================================
-- Migration: Fix smartdine-images RLS Policies
-- Uses public.get_user_restaurant_id(auth.uid()) for reliable checks
-- ============================================================

-- First, let's create the helper function if it doesn't exist
CREATE OR REPLACE FUNCTION public.get_user_restaurant_id(user_id uuid)
RETURNS uuid AS $$
  SELECT restaurant_id FROM public.profiles WHERE id = user_id LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER;

-- 1. Ensure the bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('smartdine-images', 'smartdine-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. (Skipped) RLS on storage.objects is enabled by default by Supabase.

-- 3. Drop existing policies to recreate them cleanly
DROP POLICY IF EXISTS "Public Access" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Uploads" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Updates" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Deletes" ON storage.objects;

-- 4. Create new policies

-- Read access is public for the images bucket
CREATE POLICY "Public Access" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'smartdine-images');

-- Insert access: Users can upload if they are authenticated and the folder name matches their restaurant_id
CREATE POLICY "Authenticated Uploads" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK (
  bucket_id = 'smartdine-images' AND 
  (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
);

-- Update access: Users can update if they are authenticated and the folder name matches their restaurant_id
CREATE POLICY "Authenticated Updates" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING (
  bucket_id = 'smartdine-images' AND 
  (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
);

-- Delete access: Users can delete if they are authenticated and the folder name matches their restaurant_id
CREATE POLICY "Authenticated Deletes" 
ON storage.objects FOR DELETE 
TO authenticated 
USING (
  bucket_id = 'smartdine-images' AND 
  (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
);
