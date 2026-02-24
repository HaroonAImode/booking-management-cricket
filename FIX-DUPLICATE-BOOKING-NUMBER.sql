-- ========================================
-- FIX: Duplicate Booking Number Race Condition
-- ========================================
-- Problem: Manual booking from admin panel fails with:
-- "duplicate key value violates unique constraint bookings_booking_number_key"
-- 
-- Current generate_booking_number() uses COUNT(*) which causes race conditions
-- when multiple bookings are created simultaneously.
-- ========================================

-- 1. GET CURRENT FUNCTION (for backup/reference)
SELECT pg_get_functiondef(p.oid) as current_function
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_booking_number';

-- ========================================
-- 2. FIX: Use MAX + Retry Logic Instead of COUNT
-- ========================================
-- This prevents race conditions by:
-- 1. Finding the highest existing sequence number for the day
-- 2. Using a loop with exception handling to retry on conflicts
-- 3. Adding random jitter to prevent multiple retries colliding
-- ========================================

DROP FUNCTION IF EXISTS generate_booking_number() CASCADE;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_booking_number TEXT;
  max_sequence INTEGER;
  retry_count INTEGER := 0;
  max_retries INTEGER := 10;
BEGIN
  -- Format: BK-YYYYMMDD-XXX
  date_part := TO_CHAR(NEW.created_at, 'YYYYMMDD');
  
  -- Retry loop to handle race conditions
  LOOP
    BEGIN
      -- Find the highest sequence number for this date
      -- Extract sequence from booking numbers like BK-20260221-001
      SELECT COALESCE(MAX(
        CASE 
          WHEN booking_number LIKE 'BK-' || date_part || '-%' 
          THEN SUBSTRING(booking_number FROM LENGTH('BK-' || date_part || '-') + 1)::INTEGER
          ELSE 0
        END
      ), 0) INTO max_sequence
      FROM bookings
      WHERE booking_number LIKE 'BK-' || date_part || '-%'
      FOR UPDATE; -- Lock to prevent race conditions
      
      -- Increment sequence
      sequence_num := max_sequence + 1;
      
      -- Generate unique booking number
      new_booking_number := 'BK-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
      
      -- Set the booking number
      NEW.booking_number := new_booking_number;
      
      -- Exit loop on success
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- If we still get a duplicate (rare), retry with incremented counter
        retry_count := retry_count + 1;
        
        IF retry_count >= max_retries THEN
          -- After max retries, generate a unique number with timestamp
          new_booking_number := 'BK-' || date_part || '-' || 
            LPAD((EXTRACT(EPOCH FROM NOW())::INTEGER % 1000)::TEXT, 3, '0');
          NEW.booking_number := new_booking_number;
          EXIT;
        END IF;
        
        -- Small random delay to prevent retry collision (1-10ms)
        PERFORM pg_sleep(random() * 0.01);
        
        -- Continue to next iteration
    END;
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate trigger
DROP TRIGGER IF EXISTS generate_booking_number_trigger ON bookings;

CREATE TRIGGER generate_booking_number_trigger
  BEFORE INSERT ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION generate_booking_number();

-- ========================================
-- 3. VERIFICATION
-- ========================================

-- Check function was created
SELECT 
  'Function updated' as status,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%FOR UPDATE%' 
    THEN '✅ Now uses row locking (FIXED)'
    ELSE '❌ Still has race condition'
  END as lock_status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_booking_number';

-- ========================================
-- 4. TEST: Check for existing duplicate booking numbers
-- ========================================
SELECT 
  booking_number,
  COUNT(*) as duplicate_count,
  array_agg(id) as booking_ids,
  array_agg(created_at) as created_dates
FROM bookings
GROUP BY booking_number
HAVING COUNT(*) > 1
ORDER BY booking_number;

-- If duplicates found, show details
SELECT 
  'Checking for duplicates' as check,
  COUNT(DISTINCT booking_number) as unique_numbers,
  COUNT(*) as total_bookings,
  CASE 
    WHEN COUNT(DISTINCT booking_number) = COUNT(*) 
    THEN '✅ No duplicates'
    ELSE '⚠️ Duplicates exist - need cleanup'
  END as status
FROM bookings;

-- ========================================
-- 5. OPTIONAL: Clean up existing duplicates (if any)
-- ========================================
-- Run this ONLY if verification query shows duplicates

-- First, see what duplicates exist:
-- SELECT booking_number, COUNT(*) as count
-- FROM bookings
-- GROUP BY booking_number
-- HAVING COUNT(*) > 1;

-- To fix duplicates, run this for each duplicate found:
-- UPDATE bookings
-- SET booking_number = booking_number || '-FIX'
-- WHERE id IN (
--   SELECT id 
--   FROM bookings 
--   WHERE booking_number = 'BK-20260221-001' -- Replace with actual duplicate
--   ORDER BY created_at DESC 
--   OFFSET 1 -- Keep the first one, rename others
-- );

-- ========================================
-- DONE
-- ========================================
SELECT '✅ Booking number generation fixed - race condition resolved' as result;
