-- ========================================
-- VERIFICATION QUERIES - RUN AFTER FIX
-- ========================================
-- Run these queries AFTER applying FINAL-FIX-RUN-THIS.sql
-- to verify everything is working correctly
-- ========================================

-- ========================================
-- TEST 1: Check All Functions Exist
-- ========================================

SELECT 
    p.proname AS function_name,
    pg_get_function_arguments(p.oid) AS arguments,
    CASE 
        WHEN p.prosecdef THEN 'SECURITY DEFINER'
        ELSE 'SECURITY INVOKER'
    END AS security_type
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN (
    'get_available_slots',
    'cleanup_expired_pending_bookings',
    'check_and_lock_slots'
)
ORDER BY p.proname;

-- EXPECTED: Should return 3 rows
-- ✓ cleanup_expired_pending_bookings()
-- ✓ check_and_lock_slots(date, integer[])
-- ✓ get_available_slots(text)

-- ========================================
-- TEST 2: Test Cleanup Function
-- ========================================

SELECT cleanup_expired_pending_bookings() AS expired_bookings_cleaned;

-- EXPECTED: Returns a number (probably 0 since you have none)
-- This proves the function works

-- ========================================
-- TEST 3: Test Get Available Slots (TEXT parameter)
-- ========================================

-- Use TEXT parameter (your current format)
SELECT * FROM get_available_slots('2026-02-05') LIMIT 5;

-- EXPECTED: Returns 5 rows with:
-- - slot_hour (0, 1, 2, 3, 4)
-- - slot_time ('00:00', '01:00', '02:00', '03:00', '04:00')
-- - is_available (true/false)
-- - current_status ('available', 'booked', 'pending', 'past')
-- - hourly_rate (1500 or 2000)
-- - is_night_rate (true/false)

-- ========================================
-- TEST 4: Test Full Day (All 24 Hours)
-- ========================================

SELECT 
  slot_hour,
  current_status,
  is_available,
  hourly_rate,
  is_night_rate
FROM get_available_slots('2026-02-05')
ORDER BY slot_hour;

-- EXPECTED: Returns 24 rows (hours 0-23)
-- Check:
-- - Hours 0-6: night rate (2000), is_night_rate = true
-- - Hours 7-16: day rate (1500), is_night_rate = false
-- - Hours 17-23: night rate (2000), is_night_rate = true
-- - Your existing bookings show as 'booked'
--   (Today at 14, 15, 16 should show as 'booked' - Mr Shehzad's booking)

-- ========================================
-- TEST 5: Check Today's Specific Slots
-- ========================================

-- Check the booking from Mr Shehzad (hours 14, 15, 16 on Feb 5)
SELECT 
  slot_hour,
  current_status,
  is_available
FROM get_available_slots('2026-02-05')
WHERE slot_hour IN (14, 15, 16);

-- EXPECTED:
-- slot_hour | current_status | is_available
-- ----------+----------------+-------------
--    14     |    booked      |    false
--    15     |    booked      |    false
--    16     |    booked      |    false

-- ========================================
-- TEST 6: Test Conflict Check Function
-- ========================================

-- Try to check slots that are already booked (14, 15, 16)
SELECT * FROM check_and_lock_slots('2026-02-05', ARRAY[14, 15, 16]);

-- EXPECTED:
-- slot_hour | is_available |         conflict_reason
-- ----------+--------------+--------------------------------
--    14     |    false     | Slot is already booked or pending
--    15     |    false     | Slot is already booked or pending
--    16     |    false     | Slot is already booked or pending

-- Try available slots
SELECT * FROM check_and_lock_slots('2026-02-05', ARRAY[17, 18]);

-- EXPECTED:
-- slot_hour | is_available | conflict_reason
-- ----------+--------------+-----------------
--    17     |    true      | null
--    18     |    true      | null

-- ========================================
-- TEST 7: Check Real-Time Status View
-- ========================================

SELECT * FROM v_current_slot_status 
WHERE slot_date = '2026-02-05'
ORDER BY slot_hour;

-- EXPECTED: Shows slots with actual_status and is_actually_available
-- Your 3 slots (14, 15, 16) should show:
-- - slot_status: booked
-- - booking_status: approved
-- - actual_status: booked
-- - is_actually_available: false

-- ========================================
-- TEST 8: Test Tomorrow (Should be all available)
-- ========================================

SELECT 
  slot_hour,
  current_status,
  is_available
FROM get_available_slots('2026-02-06')
WHERE slot_hour IN (10, 11, 12, 13, 14);

-- EXPECTED: Most should be available except:
-- Hours 18, 19, 20 have booking from Nasir janjua (BK-20260203-001)
-- So those should show as 'booked'

-- ========================================
-- TEST 9: Verify Past Slots Logic (for today only)
-- ========================================

-- Check if past hours show as 'past' status
SELECT 
  slot_hour,
  current_status,
  is_available
FROM get_available_slots(CURRENT_DATE::text)
WHERE slot_hour < EXTRACT(HOUR FROM CURRENT_TIME)
LIMIT 3;

-- EXPECTED: All should have current_status = 'past' and is_available = false

-- ========================================
-- TEST 10: Summary Check
-- ========================================

SELECT 
    'Total Bookings' AS metric,
    COUNT(*)::text AS value
FROM bookings
UNION ALL
SELECT 
    'Functions Exist',
    COUNT(*)::text
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname IN ('get_available_slots', 'cleanup_expired_pending_bookings', 'check_and_lock_slots');

-- EXPECTED:
-- metric            | value
-- ------------------+-------
-- Total Bookings    | 6
-- Functions Exist   | 3     ← This should now be 3 (was 1 before)

-- ========================================
-- SUCCESS CRITERIA
-- ========================================

-- ✅ TEST 1: Should return 3 functions
-- ✅ TEST 2: cleanup function returns a number
-- ✅ TEST 3: get_available_slots returns data
-- ✅ TEST 4: All 24 hours returned
-- ✅ TEST 5: Existing bookings show as 'booked'
-- ✅ TEST 6: Conflict check detects booked slots
-- ✅ TEST 7: View shows accurate status
-- ✅ TEST 8: Tomorrow's slots work correctly
-- ✅ TEST 9: Past slots show as 'past'
-- ✅ TEST 10: Functions Exist count = 3

-- ========================================
-- IF ALL TESTS PASS
-- ========================================

-- You're ready to test the frontend!
-- Open your booking page and check:
-- 1. Slots display correctly
-- 2. Console shows auto-refresh logs
-- 3. Try booking in two tabs (conflict prevention)

-- ========================================
-- END OF VERIFICATION
-- ========================================
