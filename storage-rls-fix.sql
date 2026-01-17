-- ========================================
-- STORAGE BUCKET RLS FIX
-- ========================================
-- Configure Supabase Storage bucket for payment proofs
-- Allow public to upload, admins to view/delete

-- ========================================
-- STEP 1: Create Storage Bucket (if not exists)
-- ========================================
-- Note: This should be done via Supabase Dashboard > Storage
-- Bucket name: payment-proofs
-- Public: false (we'll use RLS instead)
-- File size limit: 5MB
-- Allowed MIME types: image/png, image/jpeg, image/jpg

-- ========================================
-- STEP 2: Storage RLS Policies
-- ========================================

-- Policy 1: Allow public (anonymous) users to INSERT (upload) files
-- This allows customers to upload payment proofs when making bookings
INSERT INTO storage.objects (bucket_id, name, owner, metadata) 
SELECT 'payment-proofs', 'test', null, '{}'::jsonb 
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'payment-proofs'
);

-- Enable RLS on storage.objects for payment-proofs bucket
-- (RLS is already enabled by default on storage.objects)

-- Create policy: Allow public uploads to payment-proofs bucket
CREATE POLICY "Public can upload payment proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-proofs'
);

-- Create policy: Allow admins to view payment proofs
CREATE POLICY "Admins can view payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND is_active = true
  )
);

-- Create policy: Allow admins to delete payment proofs (if needed)
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND is_active = true
  )
);

-- Create policy: Allow admins to update payment proofs metadata (if needed)
CREATE POLICY "Admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM public.admin_profiles
    WHERE id = auth.uid() AND is_active = true
  )
);

-- ========================================
-- VERIFICATION
-- ========================================

-- Check storage policies
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
WHERE schemaname = 'storage' 
AND tablename = 'objects'
AND policyname LIKE '%payment%'
ORDER BY policyname;

-- Expected output:
-- 4 policies for payment-proofs bucket (INSERT for public, SELECT/DELETE/UPDATE for admins)
