-- ========================================
-- CHECK STORAGE CONFIGURATION
-- ========================================

-- 1. Check if payment-proofs bucket exists
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
FROM storage.buckets 
WHERE name = 'payment-proofs';

-- Expected: 1 row with name='payment-proofs'
-- public should be FALSE (private bucket)
-- file_size_limit should be 5242880 (5MB)

-- 2. Check RLS policies on storage.objects
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
  AND tablename = 'objects';

-- Expected policies:
-- - Policy allowing public INSERT (for customer uploads)
-- - Policy allowing authenticated SELECT (for admin viewing)
-- - Policy allowing authenticated DELETE (for admin cleanup)

-- 3. List all files in payment-proofs bucket
SELECT 
  name,
  bucket_id,
  created_at,
  metadata->>'size' as file_size,
  metadata->>'mimetype' as mime_type
FROM storage.objects
WHERE bucket_id = 'payment-proofs'
ORDER BY created_at DESC
LIMIT 20;

-- This will show if any files actually exist in the bucket

-- 4. Check for today's uploads (2026-01-17)
SELECT 
  name,
  created_at,
  metadata->>'size' as file_size
FROM storage.objects
WHERE bucket_id = 'payment-proofs'
  AND name LIKE '2026-01-17/%'
ORDER BY created_at DESC;

-- This will show files uploaded today

-- ========================================
-- TROUBLESHOOTING TIPS
-- ========================================

-- If bucket doesn't exist, create it:
/*
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs',
  'payment-proofs',
  false,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/jpg']
);
*/

-- If no RLS policies exist, you need to create them
-- See storage-rls-fix.sql for complete policy setup
