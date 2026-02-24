-- ========================================
-- VERIFY CROSS-DATE BOOKING: BK-20260219-003
-- ========================================

-- 1. CHECK BOOKING DETAILS
SELECT 
  booking_number,
  booking_date,
  total_hours,
  total_amount,
  advance_payment,
  advance_payment_method,
  remaining_payment,
  status,
  created_at
FROM bookings
WHERE booking_number = 'BK-20260219-003';

-- 2. CHECK CUSTOMER DETAILS
SELECT 
  c.id,
  c.name,
  c.phone,
  c.created_at
FROM customers c
JOIN bookings b ON b.customer_id = c.id
WHERE b.booking_number = 'BK-20260219-003';

-- 3. CHECK BOOKING SLOTS (CRITICAL - VERIFY CROSS-DATE)
SELECT 
  slot_date,
  slot_hour,
  slot_time,
  is_night_rate,
  hourly_rate,
  status,
  created_at
FROM booking_slots
WHERE booking_id = (
  SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003'
)
ORDER BY slot_date, slot_hour;

-- 4. VERIFY SLOT COUNTS AND DATES
SELECT 
  '3 slots expected' as check_description,
  COUNT(*) as actual_slot_count,
  COUNT(DISTINCT slot_date) as distinct_dates,
  CASE 
    WHEN COUNT(*) = 3 THEN '✅ Correct'
    ELSE '❌ Wrong slot count'
  END as status
FROM booking_slots
WHERE booking_id = (
  SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003'
);

-- 5. VERIFY SLOT HOURS (Should be 23, 0, 1)
SELECT 
  'Expected: 23, 0, 1' as check_description,
  array_agg(slot_hour ORDER BY slot_date, slot_hour) as actual_hours,
  CASE 
    WHEN array_agg(slot_hour ORDER BY slot_date, slot_hour) = ARRAY[23, 0, 1]
    THEN '✅ Correct hours'
    ELSE '⚠️ Check slot hours'
  END as status
FROM booking_slots
WHERE booking_id = (
  SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003'
);

-- 6. VERIFY AMOUNTS (Night rate should be 2000 per hour)
WITH slot_calc AS (
  SELECT 
    slot_date,
    slot_hour,
    hourly_rate,
    is_night_rate
  FROM booking_slots
  WHERE booking_id = (
    SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003'
  )
)
SELECT 
  'Amount verification' as check,
  SUM(hourly_rate) as calculated_total,
  (SELECT total_amount FROM bookings WHERE booking_number = 'BK-20260219-003') as booking_total,
  CASE 
    WHEN SUM(hourly_rate) = (SELECT total_amount FROM bookings WHERE booking_number = 'BK-20260219-003')
    THEN '✅ Amount matches'
    ELSE '❌ Amount mismatch'
  END as status
FROM slot_calc;

-- 7. CHECK IF NIGHT RATE APPLIED CORRECTLY
SELECT 
  slot_date,
  slot_hour,
  is_night_rate,
  hourly_rate,
  CASE 
    WHEN slot_hour >= 17 OR slot_hour < 7 THEN 'Should be night rate (2000)'
    ELSE 'Should be day rate (1500)'
  END as expected,
  CASE 
    WHEN (slot_hour >= 17 OR slot_hour < 7) AND is_night_rate = true AND hourly_rate = 2000
    THEN '✅ Correct'
    WHEN (slot_hour >= 7 AND slot_hour < 17) AND is_night_rate = false AND hourly_rate = 1500
    THEN '✅ Correct'
    ELSE '❌ Rate error'
  END as status
FROM booking_slots
WHERE booking_id = (
  SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003'
)
ORDER BY slot_date, slot_hour;

-- 8. CHECK FOR SLOT CONFLICTS (Should be none)
SELECT 
  'Checking for conflicts' as check,
  COUNT(*) as conflict_count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ No conflicts'
    ELSE '❌ CONFLICTS FOUND!'
  END as status
FROM booking_slots bs1
WHERE EXISTS (
  SELECT 1 
  FROM booking_slots bs2
  WHERE bs2.slot_date = bs1.slot_date
    AND bs2.slot_hour = bs1.slot_hour
    AND bs2.booking_id != bs1.booking_id
    AND bs2.booking_id = (SELECT id FROM bookings WHERE booking_number = 'BK-20260219-003')
);

-- 9. CHECK PAYMENT CALCULATION
SELECT 
  booking_number,
  total_amount,
  advance_payment,
  remaining_payment,
  (total_amount - advance_payment) as calculated_remaining,
  CASE 
    WHEN remaining_payment = (total_amount - advance_payment)
    THEN '✅ Remaining payment correct'
    ELSE '❌ Remaining payment mismatch'
  END as status
FROM bookings
WHERE booking_number = 'BK-20260219-003';

-- 10. FULL BOOKING SUMMARY
SELECT 
  '=== BOOKING SUMMARY ===' as section,
  b.booking_number,
  c.name as customer_name,
  c.phone as customer_phone,
  b.booking_date,
  b.total_hours || ' hours' as hours,
  'Rs ' || b.total_amount as total,
  'Rs ' || b.advance_payment || ' (' || b.advance_payment_method || ')' as advance,
  'Rs ' || b.remaining_payment as due,
  b.status,
  (
    SELECT string_agg(
      slot_date::TEXT || ' ' || to_char(slot_time, 'HH12:MI AM'), 
      ', ' 
      ORDER BY slot_date, slot_hour
    )
    FROM booking_slots
    WHERE booking_id = b.id
  ) as slots
FROM bookings b
JOIN customers c ON c.id = b.customer_id
WHERE b.booking_number = 'BK-20260219-003';

-- ========================================
-- EXPECTED RESULTS:
-- ========================================
-- Slots should be:
--   - 2026-02-19 23:00 (11:00 PM) - Night rate Rs 2000
--   - 2026-02-20 00:00 (12:00 AM) - Night rate Rs 2000
--   - 2026-02-20 01:00 (01:00 AM) - Night rate Rs 2000
-- Total: 3 hours × Rs 2000 = Rs 6000
-- Advance: Rs 500 (Cash)
-- Remaining: Rs 5500
