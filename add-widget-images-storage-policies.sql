-- Storage bucket policies for widget-images
-- This allows both users in a couple to access uploaded images
-- Note: The bucket should be set to "public" in Supabase dashboard for public URL access

-- Note: RLS is already enabled on storage.objects in Supabase by default
-- We just need to create the policies

-- Policy: Authenticated users can upload images
CREATE POLICY "Authenticated users can upload widget images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'widget-images' AND
  (storage.foldername(name))[1] = 'drawings'
);

-- Policy: Anyone can view images (since we use public URLs)
-- This is needed because the app uses getPublicUrl()
CREATE POLICY "Anyone can view widget images"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'widget-images');

-- Policy: Authenticated users can delete images
-- (Application logic should ensure only couple members can delete their drawings)
CREATE POLICY "Authenticated users can delete widget images"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'widget-images' AND
  (storage.foldername(name))[1] = 'drawings'
);
