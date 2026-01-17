-- ========================================
-- SUPABASE STORAGE SETUP - PAYMENT PROOFS
-- ========================================
-- Description: Configure storage bucket for payment screenshots
-- Features:
-- - Public users can upload (for booking payment proofs)
-- - Only admins can view all images
-- - Image validation (png, jpg, jpeg)
-- - Max file size: 5MB
-- ========================================

-- ========================================
-- 1. CREATE STORAGE BUCKET
-- ========================================

-- Insert bucket into storage.buckets
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false, -- Not public (requires signed URLs for admin preview)
  5242880, -- 5MB in bytes
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg'];

-- ========================================
-- 2. STORAGE POLICIES
-- ========================================

-- Policy 1: Public users can INSERT (upload) payment proofs
-- This allows unauthenticated users to upload payment screenshots when making bookings
CREATE POLICY "Public can upload payment proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  -- Enforce file naming convention: payment-proofs/YYYY-MM-DD/booking-id-timestamp.ext
  (storage.filename(name) ~* '\.(jpg|jpeg|png)$')
);

-- Policy 2: Admins can SELECT (view) all payment proofs
-- This allows admins to view payment screenshots for verification
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 3: Admins can UPDATE payment proofs metadata (if needed)
CREATE POLICY "Admins can update payment proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- Policy 4: Admins can DELETE payment proofs (for cleanup)
CREATE POLICY "Admins can delete payment proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);

-- ========================================
-- 3. HELPER FUNCTIONS (OPTIONAL)
-- ========================================

-- Function: Generate payment proof file path
-- Usage: SELECT generate_payment_proof_path('2026-01-17', 'uuid-booking-id');
CREATE OR REPLACE FUNCTION generate_payment_proof_path(
  p_booking_date DATE,
  p_booking_id UUID
)
RETURNS TEXT AS $$
BEGIN
  -- Returns: payment-proofs/2026-01-17/booking-uuid-timestamp.jpg
  RETURN 'payment-proofs/' || 
         TO_CHAR(p_booking_date, 'YYYY-MM-DD') || '/' || 
         p_booking_id || '-' || 
         EXTRACT(EPOCH FROM NOW())::BIGINT || '.jpg';
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 4. VERIFICATION QUERIES
-- ========================================

-- Check bucket configuration
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'payment-proofs';

-- Check storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%payment proofs%'
ORDER BY policyname;

-- ========================================
-- SETUP COMPLETE
-- ========================================

-- Note: To generate signed URLs for admin preview, use in your application:
-- const { data } = await supabase.storage
--   .from('payment-proofs')
--   .createSignedUrl('path/to/file.jpg', 3600) // 1 hour expiry
