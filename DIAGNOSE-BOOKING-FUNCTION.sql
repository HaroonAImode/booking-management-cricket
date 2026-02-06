-- ========================================
-- DIAGNOSE: Check create_booking_with_slots Function
-- ========================================
-- Purpose: Verify function exists and has correct signature
-- Run this in Supabase SQL Editor to diagnose the issue

-- ========================================
-- 1. Check if function exists
-- ========================================

SELECT 
    routine_name,
    routine_type,
    data_type,
    pg_get_function_arguments(p.oid) AS parameters,
    pg_get_function_result(p.oid) AS return_type
FROM information_schema.routines r
JOIN pg_proc p ON p.proname = r.routine_name
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE r.routine_schema = 'public'
  AND r.routine_name = 'create_booking_with_slots'
  AND n.nspname = 'public';

-- Expected output: Should show function with 10 parameters

-- ========================================
-- 2. Check function permissions
-- ========================================

SELECT 
    routine_name,
    grantee,
    privilege_type
FROM information_schema.routine_privileges
WHERE routine_schema = 'public'
  AND routine_name = 'create_booking_with_slots';

-- Expected: Should show grants to anon, authenticated, public

-- ========================================
-- 3. List ALL versions of create_booking functions
-- ========================================

SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS parameters,
    pg_get_function_result(p.oid) AS return_type,
    p.prosrc LIKE '%p_advance_payment_proof%' AS has_proof_param
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname LIKE '%create_booking%'
ORDER BY p.proname, p.oid;

-- This will show all booking functions and their signatures

-- ========================================
-- 4. Check if PostgREST can see the function
-- ========================================

-- Get the exact function signature PostgREST expects
SELECT 
    p.proname,
    p.pronargs AS num_args,
    pg_get_function_identity_arguments(p.oid) AS identity_args
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'create_booking_with_slots';

-- ========================================
-- INTERPRETATION GUIDE
-- ========================================
-- If Query 1 returns 0 rows: Function doesn't exist - run EMERGENCY-FIX-BOOKING-FUNCTION.sql
-- If Query 1 returns rows but wrong parameters: Function has wrong signature - run fix
-- If Query 2 returns 0 rows: Missing permissions - run GRANT commands
-- If Query 3 shows multiple versions: Need to drop old versions
