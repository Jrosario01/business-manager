-- Setup Supabase Storage bucket for product images
-- Run this in Supabase SQL Editor

-- Note: Storage buckets are created through the Supabase Dashboard UI, not SQL
-- Go to: Storage > Create a new bucket

-- Bucket Name: product-images
-- Public: Yes (so images can be viewed without authentication)

-- After creating the bucket, run these policies:

-- Policy: Allow anyone to read images (public access)
CREATE POLICY "Allow public read access to product images"
ON storage.objects FOR SELECT
USING (bucket_id = 'product-images');

-- Policy: Allow authenticated users to upload images
CREATE POLICY "Allow authenticated users to upload product images"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'product-images'
  AND auth.role() = 'authenticated'
);

-- Policy: Allow authenticated users to update their uploaded images
CREATE POLICY "Allow authenticated users to update product images"
ON storage.objects FOR UPDATE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');

-- Policy: Allow authenticated users to delete images
CREATE POLICY "Allow authenticated users to delete product images"
ON storage.objects FOR DELETE
USING (bucket_id = 'product-images' AND auth.role() = 'authenticated');
