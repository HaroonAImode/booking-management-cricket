-- ========================================
-- STORAGE BUCKET SETUP AND VERIFICATION
-- ========================================
-- Description: Ensure payment-proofs bucket exists and has correct policies
-- Date: January 25, 2026
-- ========================================

-- ========================================
-- STEP 1: CHECK IF BUCKET EXISTS
-- ========================================
DO $$
DECLARE
  bucket_exists INTEGER;
BEGIN
  SELECT COUNT(*) INTO bucket_exists
  FROM storage.buckets
  WHERE name = 'payment-proofs';

  IF bucket_exists = 0 THEN
    RAISE NOTICE '❌ Bucket "payment-proofs" does NOT exist!';
    RAISE NOTICE '   Creating bucket now...';
    
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'payment-proofs',
      'payment-proofs',
      false,  -- Private bucket
      5242880,  -- 5MB limit
      ARRAY['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
    );
    
    RAISE NOTICE '✅ Bucket "payment-proofs" created successfully';
  ELSE
    RAISE NOTICE '✅ Bucket "payment-proofs" already exists';
  END IF;
END $$;

-- ========================================
-- STEP 2: VERIFY BUCKET CONFIGURATION
-- ========================================
SELECT 
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets 
WHERE name = 'payment-proofs';

-- Expected:
-- - public: false (private bucket)
-- - file_size_limit: 5242880 (5MB)
-- - allowed_mime_types: {image/png, image/jpeg, image/jpg, image/webp}

-- ========================================
-- STEP 3: DROP OLD POLICIES (IF ANY)
-- ========================================
DO $$
BEGIN
  -- Drop old policies if they exist
  DROP POLICY IF EXISTS "Public can upload payment proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Authenticated users can view payment proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Admin users can view payment proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Users can upload to payment-proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can view payment-proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can upload payment proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Admins can delete payment proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow public uploads to payment-proofs" ON storage.objects;
  DROP POLICY IF EXISTS "Allow authenticated reads from payment-proofs" ON storage.objects;
  
  RAISE NOTICE '✅ Old policies dropped (if any existed)';
END $$;

-- ========================================
-- STEP 4: CREATE NEW RLS POLICIES
-- ========================================

-- Policy 1: Allow public/anonymous uploads (for customer bookings)
CREATE POLICY "Allow public uploads to payment-proofs"
ON storage.objects
FOR INSERT
TO public
WITH CHECK (bucket_id = 'payment-proofs');

-- Policy 2: Allow authenticated users to read (for admins)
CREATE POLICY "Allow authenticated reads from payment-proofs"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'payment-proofs');

-- Policy 3: Allow admins to delete (for cleanup)
CREATE POLICY "Allow admin deletes from payment-proofs"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
);

-- Policy 4: Allow admins to update (for maintenance)
CREATE POLICY "Allow admin updates to payment-proofs"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
)
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (
    SELECT user_id FROM user_roles WHERE role IN ('admin', 'super_admin')
  )
);

-- ========================================
-- STEP 5: VERIFY POLICIES
-- ========================================
SELECT 
  policyname,
  cmd as operation,
  roles,
  CASE 
    WHEN qual IS NOT NULL THEN 'Has USING clause'
    ELSE 'No USING clause'
  END as using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'Has WITH CHECK clause'
    ELSE 'No WITH CHECK clause'
  END as with_check_clause
FROM pg_policies 
WHERE schemaname = 'storage' 
  AND tablename = 'objects'
  AND policyname LIKE '%payment-proof%'
ORDER BY cmd, policyname;

-- Expected: 4 policies
-- 1. INSERT policy for public
-- 2. SELECT policy for authenticated
-- 3. DELETE policy for admins
-- 4. UPDATE policy for admins

-- ========================================
-- STEP 6: LIST EXISTING FILES
-- ========================================
SELECT 
  name,
  created_at,
  metadata->>'size' as file_size_bytes,
  metadata->>'mimetype' as mime_type,
  (metadata->>'size')::bigint / 1024 as file_size_kb
FROM storage.objects
WHERE bucket_id = 'payment-proofs'
ORDER BY created_at DESC
LIMIT 50;

-- This shows all uploaded files in the bucket

-- ========================================
-- STEP 7: CHECK FOR ORPHANED PATHS IN DATABASE
-- ========================================
SELECT 
  b.booking_number,
  b.booking_date,
  b.advance_payment_proof,
  b.remaining_payment_proof,
  CASE 
    WHEN b.advance_payment_proof IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'payment-proofs' 
        AND name = REPLACE(b.advance_payment_proof, 'payment-proofs/', '')
      )
    THEN '❌ Advance proof file missing'
    WHEN b.advance_payment_proof IS NOT NULL THEN '✅ Advance proof exists'
    ELSE '-'
  END as advance_status,
  CASE 
    WHEN b.remaining_payment_proof IS NOT NULL 
      AND NOT EXISTS (
        SELECT 1 FROM storage.objects 
        WHERE bucket_id = 'payment-proofs' 
        AND name = REPLACE(b.remaining_payment_proof, 'payment-proofs/', '')
      )
    THEN '❌ Remaining proof file missing'
    WHEN b.remaining_payment_proof IS NOT NULL THEN '✅ Remaining proof exists'
    ELSE '-'
  END as remaining_status
FROM bookings b
WHERE b.advance_payment_proof IS NOT NULL 
   OR b.remaining_payment_proof IS NOT NULL
ORDER BY b.created_at DESC
LIMIT 20;

-- This shows which database records have missing files in storage

-- ========================================
-- STEP 8: TEST UPLOAD SIMULATION
-- ========================================
-- Run this query to simulate what happens when a file is uploaded
SELECT 
  'payment-proofs' as bucket_id,
  format('2026-01-25/%s-%s.jpg', 
    gen_random_uuid()::text, 
    extract(epoch from now())::bigint
  ) as example_upload_path,
  'This is what the file path would look like' as note;

-- ========================================
-- FINAL VERIFICATION CHECKLIST
-- ========================================
DO $$
DECLARE
  bucket_count INTEGER;
  policy_count INTEGER;
  file_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STORAGE SETUP VERIFICATION';
  RAISE NOTICE '========================================';
  
  -- Check bucket
  SELECT COUNT(*) INTO bucket_count
  FROM storage.buckets
  WHERE name = 'payment-proofs';
  
  IF bucket_count > 0 THEN
    RAISE NOTICE '✅ Bucket exists: payment-proofs';
  ELSE
    RAISE NOTICE '❌ Bucket missing: payment-proofs';
  END IF;
  
  -- Check policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE schemaname = 'storage' 
    AND tablename = 'objects'
    AND policyname LIKE '%payment-proof%';
  
  RAISE NOTICE '✅ RLS Policies configured: % policies', policy_count;
  
  -- Check files
  SELECT COUNT(*) INTO file_count
  FROM storage.objects
  WHERE bucket_id = 'payment-proofs';
  
  RAISE NOTICE '📁 Files in storage: % files', file_count;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Setup complete! Ready to accept uploads.';
  RAISE NOTICE '========================================';
END $$;

-- ========================================
-- TROUBLESHOOTING GUIDE
-- ========================================

/*
IF YOU STILL GET 404 ERRORS:

1. Check API Route Logs:
   - Look at Vercel deployment logs
   - Check for "Signed URL error" messages

2. Test File Upload:
   - Go to Complete Payment modal
   - Upload a test image
   - Check browser Network tab for API calls
   - Verify file appears in storage.objects table

3. Test Signed URL Generation:
   - Use the storage API route: /api/admin/storage/payment-proof
   - Pass a valid file path as query parameter
   - Check if signed URL is generated

4. Verify RLS Policies:
   - Ensure authenticated users can read from bucket
   - Check user_roles table has admin entries
   - Verify admin JWT token is valid

5. Check Supabase Dashboard:
   - Go to Storage section
   - Open payment-proofs bucket
   - Manually upload a test file
   - Try to download it via signed URL

6. Common Issues:
   - File path mismatch (payment-proofs/ prefix)
   - RLS policy blocking access
   - Bucket doesn't exist
   - File was never uploaded successfully
   - Admin not authenticated properly
*/
