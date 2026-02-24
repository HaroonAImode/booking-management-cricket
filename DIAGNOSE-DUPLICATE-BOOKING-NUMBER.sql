-- ========================================
-- DIAGNOSE DUPLICATE BOOKING NUMBER ISSUE
-- ========================================

-- 1. CHECK FOR EXISTING DUPLICATES
SELECT 
  'Duplicate booking numbers check' as test,
  booking_number,
  COUNT(*) as occurrences,
  array_agg(id ORDER BY created_at) as booking_ids,
  array_agg(TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS')) as created_times
FROM bookings
GROUP BY booking_number
HAVING COUNT(*) > 1
ORDER BY created_at DESC
LIMIT 10;

-- 2. CHECK TODAY'S BOOKINGS
SELECT 
  booking_number,
  customer_id,
  booking_date,
  created_at,
  status
FROM bookings
WHERE TO_CHAR(created_at, 'YYYY-MM-DD') = '2026-02-21'
ORDER BY created_at DESC;

-- 3. CHECK LATEST BOOKING NUMBERS
SELECT 
  booking_number,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI:SS.MS') as created_at,
  status
FROM bookings
ORDER BY created_at DESC
LIMIT 20;

-- 4. COUNT DUPLICATES
SELECT 
  COUNT(DISTINCT booking_number) as unique_booking_numbers,
  COUNT(*) as total_bookings,
  COUNT(*) - COUNT(DISTINCT booking_number) as duplicate_count
FROM bookings;

-- 5. CHECK CURRENT FUNCTION
SELECT 
  'Current function check' as info,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%COUNT(*)%' 
    THEN '❌ Uses COUNT - has race condition bug'
    WHEN pg_get_functiondef(p.oid) LIKE '%FOR UPDATE%'
    THEN '✅ Uses locking - fixed'
    ELSE 'Unknown implementation'
  END as function_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_booking_number';
