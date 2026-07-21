-- ============================================================
-- Migration: Fix Storage RLS Policies for smartdine-images
-- Replace auth.jwt()->user_metadata->>'restaurant_id' with
-- public.get_user_restaurant_id(auth.uid()) for all operations.
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1. Ensure bucket exists and is public
INSERT INTO storage.buckets (id, name, public)
VALUES ('smartdine-images', 'smartdine-images', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Enable RLS on storage.objects (idempotent)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- ============================================================
-- SELECT (public read) — anyone can view images
-- ============================================================
DROP POLICY IF EXISTS "Allow public read access to images" ON storage.objects;
CREATE POLICY "Allow public read access to images"
ON storage.objects FOR SELECT
USING (bucket_id = 'smartdine-images');

-- ============================================================
-- INSERT — authenticated staff can upload to their restaurant folder
-- ============================================================
DROP POLICY IF EXISTS "Allow staff to upload images" ON storage.objects;
CREATE POLICY "Allow staff to upload images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'smartdine-images'
  AND auth.role() = 'authenticated'
  AND (
    -- Primary: use the DB function (does NOT rely on JWT user_metadata)
    (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    -- Fallback: super_admin bypass
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- ============================================================
-- UPDATE — authenticated staff can overwrite their own images
-- ============================================================
DROP POLICY IF EXISTS "Allow staff to update images" ON storage.objects;
CREATE POLICY "Allow staff to update images"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'smartdine-images'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- ============================================================
-- DELETE — authenticated staff can delete their own images
-- ============================================================
DROP POLICY IF EXISTS "Allow staff to delete images" ON storage.objects;
CREATE POLICY "Allow staff to delete images"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'smartdine-images'
  AND auth.role() = 'authenticated'
  AND (
    (storage.foldername(name))[1] = public.get_user_restaurant_id(auth.uid())::text
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'super_admin'
    )
  )
);

-- ============================================================
-- Verify the helper function exists (read-only check)
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'get_user_restaurant_id'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) THEN
    RAISE EXCEPTION 'MISSING FUNCTION: public.get_user_restaurant_id(uuid) does not exist. Create it before running this migration.';
  END IF;
END $$;
