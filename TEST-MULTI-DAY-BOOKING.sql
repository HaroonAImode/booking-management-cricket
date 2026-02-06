-- ========================================
-- MULTI-DAY BOOKING TEST
-- ========================================
-- Test booking with slots across 2 days (Feb 10 11PM + Feb 11 12AM)

-- Create multi-day test booking
SELECT '=== CREATE MULTI-DAY BOOKING ===' as step;

SELECT * FROM public.create_booking_with_slots(
  'Multi-Day Test Customer',
  '2026-02-10',  -- First date
  2,              -- 2 hours
  2400.00,        -- Rs 1,200/hr night rate
  1000.00,        -- Advance
  'cash',
  'proof.jpg',
  '[
    {"slot_hour": 23, "slot_time": "11:00 PM", "is_night_rate": true, "hourly_rate": 1200},
    {"slot_hour": 0, "slot_time": "12:00 AM", "is_night_rate": true, "hourly_rate": 1200}
  ]'::jsonb,
  '0300-8888888',
  'Testing multi-day slots'
);

-- ========================================
-- CHECK BOOKING SLOTS DATES
-- ========================================
SELECT '=== SLOTS WITH DATES ===' as step;

-- Show slots with their actual dates
SELECT 
  b.booking_number,
  b.booking_date as booking_main_date,
  bs.slot_date,
  bs.slot_hour,
  bs.slot_time,
  bs.is_night_rate,
  CASE 
    WHEN bs.slot_date != b.booking_date 
    THEN '⚠️ Different date!'
    ELSE '✅ Same date'
  END as date_check
FROM bookings b
JOIN booking_slots bs ON b.id = bs.booking_id
WHERE b.customer_id IN (
  SELECT id FROM customers WHERE phone = '0300-8888888'
)
ORDER BY bs.slot_date, bs.slot_hour;

-- ========================================
-- DATE RANGE QUERY FOR ADMIN DISPLAY
-- ========================================
SELECT '=== BOOKING WITH DATE RANGE ===' as step;

-- Query to show date range for admin bookings page
SELECT 
  b.booking_number,
  b.booking_date as main_booking_date,
  -- Get first and last slot dates
  MIN(bs.slot_date) as date_from,
  MAX(bs.slot_date) as date_to,
  -- Create date range display
  CASE 
    WHEN MIN(bs.slot_date) = MAX(bs.slot_date) 
    THEN TO_CHAR(MIN(bs.slot_date), 'Mon DD, YYYY')
    ELSE TO_CHAR(MIN(bs.slot_date), 'Mon DD') || ' - ' || TO_CHAR(MAX(bs.slot_date), 'Mon DD, YYYY')
  END as date_range_display,
  -- Booking details
  c.name as customer_name,
  c.phone,
  b.total_hours,
  b.total_amount,
  b.status,
  -- Slot times
  string_agg(
    TO_CHAR(bs.slot_date, 'Mon DD') || ': ' || bs.slot_time::text, 
    ', ' 
    ORDER BY bs.slot_date, bs.slot_hour
  ) as slot_details
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN booking_slots bs ON b.id = bs.booking_id
WHERE c.phone = '0300-8888888'
GROUP BY b.id, b.booking_number, b.booking_date, c.name, c.phone, b.total_hours, b.total_amount, b.status;

-- ========================================
-- EXPECTED OUTPUT FOR ADMIN UI
-- ========================================
SELECT '=== EXPECTED ADMIN UI DISPLAY ===' as step;

SELECT 
  booking_number,
  CASE 
    WHEN MIN(slot_date) = MAX(slot_date) 
    THEN TO_CHAR(MIN(slot_date), 'DD Mon YYYY')
    ELSE TO_CHAR(MIN(slot_date), 'DD Mon') || ' - ' || TO_CHAR(MAX(slot_date), 'DD Mon YYYY')
  END as "Date Column Display",
  string_agg(
    TO_CHAR(slot_date, 'DD Mon') || ' ' || slot_time::text,
    ', '
    ORDER BY slot_date, slot_hour
  ) as "Slot Times",
  COUNT(*) as total_slots
FROM bookings b
JOIN booking_slots bs ON b.id = bs.booking_id
WHERE b.customer_id IN (SELECT id FROM customers WHERE phone = '0300-8888888')
GROUP BY booking_number;

-- ========================================
-- FRONTEND QUERY SUGGESTION
-- ========================================
SELECT '=== QUERY FOR get_bookings API ===' as step;

/*
  This is what your API should return for admin bookings table:
  Use this in lib/supabase/bookings.ts or similar
*/

WITH booking_dates AS (
  SELECT 
    b.id,
    MIN(bs.slot_date) as start_date,
    MAX(bs.slot_date) as end_date,
    COUNT(DISTINCT bs.slot_date) as date_span_days
  FROM bookings b
  JOIN booking_slots bs ON b.id = bs.booking_id
  GROUP BY b.id
)
SELECT 
  b.booking_number,
  b.booking_date,
  bd.start_date,
  bd.end_date,
  bd.date_span_days,
  CASE 
    WHEN bd.start_date = bd.end_date 
    THEN bd.start_date::text
    ELSE bd.start_date::text || ' to ' || bd.end_date::text
  END as date_range,
  c.name as customer_name,
  c.phone,
  b.total_hours,
  b.total_amount,
  b.status
FROM bookings b
JOIN customers c ON b.customer_id = c.id
JOIN booking_dates bd ON b.id = bd.id
WHERE c.phone = '0300-8888888';

-- ========================================
-- CLEANUP (OPTIONAL)
-- ========================================
SELECT '=== CLEANUP TEST ===' as step;

/*
-- Uncomment to remove test booking:
DELETE FROM booking_slots 
WHERE booking_id IN (
  SELECT b.id FROM bookings b
  JOIN customers c ON b.customer_id = c.id
  WHERE c.phone = '0300-8888888'
);

DELETE FROM bookings 
WHERE customer_id IN (
  SELECT id FROM customers WHERE phone = '0300-8888888'
);

DELETE FROM customers WHERE phone = '0300-8888888';
*/

SELECT '✅ Multi-day booking test complete!' as result;
SELECT 'Check the "Date Column Display" output above - it should show: "10 Feb - 11 Feb 2026"' as note;
