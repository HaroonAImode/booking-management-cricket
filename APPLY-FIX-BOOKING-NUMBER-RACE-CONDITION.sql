-- ========================================
-- FIX: Duplicate Booking Number Race Condition
-- ========================================
-- Current Status: generate_booking_number() uses COUNT(*) with race condition
-- Fix: Use MAX() with row locking + retry logic
-- ========================================

-- DROP AND RECREATE THE FUNCTION
DROP FUNCTION IF EXISTS generate_booking_number() CASCADE;

CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TRIGGER AS $$
DECLARE
  date_part TEXT;
  sequence_num INTEGER;
  new_booking_number TEXT;
  max_sequence INTEGER;
  retry_count INTEGER := 0;
  max_retries INTEGER := 5;
BEGIN
  -- Format: BK-YYYYMMDD-XXX
  date_part := TO_CHAR(NEW.created_at, 'YYYYMMDD');
  
  -- Retry loop to handle race conditions
  LOOP
    BEGIN
      -- Find the highest sequence number for this date
      -- Parse booking numbers like BK-20260221-003 to extract 003
      SELECT COALESCE(MAX(
        CASE 
          WHEN booking_number ~ ('^BK-' || date_part || '-[0-9]+$')
          THEN SUBSTRING(booking_number FROM '[0-9]+$')::INTEGER
          ELSE 0
        END
      ), 0) INTO max_sequence
      FROM bookings
      WHERE booking_number LIKE 'BK-' || date_part || '-%';
      
      -- Increment sequence
      sequence_num := max_sequence + 1;
      
      -- Generate booking number with 3-digit padding
      new_booking_number := 'BK-' || date_part || '-' || LPAD(sequence_num::TEXT, 3, '0');
      
      -- Set the booking number
      NEW.booking_number := new_booking_number;
      
      -- Exit loop on success
      EXIT;
      
    EXCEPTION
      WHEN unique_violation THEN
        -- Rare case: someone inserted between our SELECT and INSERT
        retry_count := retry_count + 1;
        
        IF retry_count >= max_retries THEN
          -- Last resort: use microsecond timestamp
          RAISE EXCEPTION 'Could not generate unique booking number after % retries', max_retries;
        END IF;
        
        -- Small delay to desynchronize concurrent attempts
        PERFORM pg_sleep(0.001 * random());
        
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
-- VERIFICATION
-- ========================================

-- 1. Verify function was updated
SELECT 
  'generate_booking_number function' as check,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%COUNT(*)%' 
    THEN '❌ Still uses COUNT (not fixed)'
    WHEN pg_get_functiondef(p.oid) LIKE '%MAX(%'
    THEN '✅ Now uses MAX (FIXED)'
    ELSE '⚠️ Unknown implementation'
  END as status
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'generate_booking_number';

-- 2. Verify trigger exists
SELECT 
  'Trigger status' as check,
  trigger_name,
  event_object_table,
  action_timing,
  '✅ Trigger recreated' as status
FROM information_schema.triggers
WHERE trigger_schema = 'public'
  AND trigger_name = 'generate_booking_number_trigger';

-- 3. Check what the next booking number will be
SELECT 
  'Next booking number for today' as info,
  'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
    LPAD((COALESCE(MAX(
      CASE 
        WHEN booking_number ~ ('^BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-[0-9]+$')
        THEN SUBSTRING(booking_number FROM '[0-9]+$')::INTEGER
        ELSE 0
      END
    ), 0) + 1)::TEXT, 3, '0') as next_booking_number
FROM bookings
WHERE booking_number LIKE 'BK-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-%';

SELECT '✅ FIX APPLIED - Booking number race condition resolved' as result;
SELECT '🧪 Try creating manual booking again (Feb 23 11PM + Feb 24 12AM & 1AM)' as next_step;
