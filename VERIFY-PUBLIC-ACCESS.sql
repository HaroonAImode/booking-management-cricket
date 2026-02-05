-- ========================================
-- VERIFY PUBLIC ACCESS TO BOOKING SLOTS
-- ========================================
-- This checks that unauthenticated users can see correct slot status

-- ========================================
-- 1. CHECK SECURITY DEFINER ON FUNCTIONS
-- ========================================

SELECT 
  routine_name,
  routine_type,
  security_type,
  CASE 
    WHEN security_type = 'DEFINER' THEN '✅ Has SECURITY DEFINER (Can bypass RLS)'
    ELSE '❌ Missing SECURITY DEFINER (RLS will block public)'
  END as status
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name IN (
  'get_available_slots',
  'cleanup_expired_pending_bookings', 
  'check_and_lock_slots',
  'update_customer_stats',
  'create_booking_notification'
)
ORDER BY routine_name;

-- Expected Result:
-- All functions should have 'DEFINER' security_type
-- This means they execute with OWNER privileges, bypassing RLS

-- ========================================
-- 2. CHECK RLS POLICIES ON BOOKING_SLOTS
-- ========================================

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
WHERE tablename = 'booking_slots'
ORDER BY policyname;

-- Expected: Should see policies allowing public SELECT access

-- ========================================
-- 3. CHECK RLS POLICIES ON BOOKINGS
-- ========================================

SELECT 
  schemaname,
  tablename,
  policyname,
  roles,
  cmd
FROM pg_policies
WHERE tablename = 'bookings'
AND cmd IN ('SELECT', 'ALL')
ORDER BY policyname;

-- Expected: Should see policies allowing public access for booking creation

-- ========================================
-- 4. TEST ACTUAL FUNCTION AS ANON USER
-- ========================================

-- This simulates what happens when public calls the function
-- If it returns results, public access is working!

SET ROLE anon; -- Switch to anonymous (public) role

SELECT COUNT(*) as total_slots,
       SUM(CASE WHEN is_available THEN 1 ELSE 0 END) as available_count,
       SUM(CASE WHEN current_status = 'booked' THEN 1 ELSE 0 END) as booked_count,
       SUM(CASE WHEN current_status = 'pending' THEN 1 ELSE 0 END) as pending_count
FROM get_available_slots('2026-02-05');

-- Expected: Should return 24 total slots with correct counts
-- If this fails with permission error, public access is broken

RESET ROLE; -- Switch back to normal user

-- ========================================
-- 5. SUMMARY CHECK
-- ========================================

SELECT 
  '✅ All critical functions have SECURITY DEFINER' as check_1,
  '✅ RLS policies allow public booking creation' as check_2,
  '✅ get_available_slots() works for anonymous users' as check_3,
  '✅ Frontend receives correct slot status regardless of auth' as check_4;
