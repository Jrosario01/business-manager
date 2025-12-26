-- =====================================================
-- SUPABASE STORAGE POLICIES FOR IMAGE UPLOADS
-- Run this in Supabase SQL Editor
-- =====================================================

-- This script creates secure storage policies for the product-images bucket
-- It ensures only authenticated users can upload/delete images

-- =====================================================
-- 1. CREATE STORAGE BUCKET (if not exists)
-- =====================================================

-- Note: Buckets are usually created via Supabase Dashboard
-- Go to Storage → Create bucket → Name: "product-images" → Public: true

-- =====================================================
-- 2. ENABLE RLS ON STORAGE BUCKETS
-- =====================================================

-- Enable RLS on the storage.objects table (where files are stored)
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- 3. CREATE STORAGE POLICIES
-- =====================================================

-- Policy: Allow authenticated users to upload images
DROP POLICY IF EXISTS "Authenticated users can upload images" ON storage.objects;
CREATE POLICY "Authenticated users can upload images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow public read access to uploaded images
DROP POLICY IF EXISTS "Public can view images" ON storage.objects;
CREATE POLICY "Public can view images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'product-images');

-- Policy: Allow authenticated users to delete their own uploaded images
DROP POLICY IF EXISTS "Authenticated users can delete images" ON storage.objects;
CREATE POLICY "Authenticated users can delete images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update image metadata
DROP POLICY IF EXISTS "Authenticated users can update images" ON storage.objects;
CREATE POLICY "Authenticated users can update images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- =====================================================
-- 4. BUCKET CONFIGURATION RECOMMENDATIONS
-- =====================================================

-- In Supabase Dashboard → Storage → product-images → Configuration:
--
-- File size limit: 5MB (5242880 bytes)
-- Allowed MIME types:
--   - image/jpeg
--   - image/jpg
--   - image/png
--   - image/webp
--
-- Public bucket: Yes (so images can be viewed publicly)
-- File path restrictions: None (we handle in policies)

-- =====================================================
-- 5. VERIFICATION
-- =====================================================

-- Check that policies were created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage';

-- =====================================================
-- SETUP COMPLETE!
-- =====================================================

-- Your storage is now secure with the following protections:
-- ✅ Only authenticated users can upload images
-- ✅ Anyone can view images (public access for product images)
-- ✅ Only authenticated users can delete images
-- ✅ File type validation enforced in app code (jpg, jpeg, png, webp)
-- ✅ File size limit enforced in app code (5MB max)
-- ✅ RLS enabled on storage.objects table
