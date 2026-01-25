-- ========================================
-- DIAGNOSTIC QUERY FOR BOOKING ISSUES
-- ========================================
-- Purpose: Check booking data integrity and slot status
-- Date: January 25, 2026
-- ========================================

-- 1. Check specific booking details (replace with your booking ID)
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.status,
  b.total_hours,
  b.total_amount,
  b.advance_payment,
  b.remaining_payment,
  b.advance_payment_method,
  c.name as customer_name,
  c.phone as customer_phone
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
WHERE b.id = '9a203e5a-d146-4943-b08f-f0617758f1ed'  -- Replace with your booking ID
ORDER BY b.created_at DESC;

-- 2. Check booking slots for this booking
SELECT 
  bs.id,
  bs.slot_hour,
  bs.is_night_rate,
  b.booking_number,
  b.status
FROM booking_slots bs
INNER JOIN bookings b ON b.id = bs.booking_id
WHERE bs.booking_id = '9a203e5a-d146-4943-b08f-f0617758f1ed'  -- Replace with your booking ID
ORDER BY bs.slot_hour;

-- 3. Check all bookings with potential data issues
SELECT 
  id,
  booking_number,
  booking_date,
  status,
  total_hours,
  total_amount,
  advance_payment,
  remaining_payment,
  CASE 
    WHEN total_amount IS NULL THEN '❌ NULL total_amount'
    WHEN total_hours IS NULL THEN '❌ NULL total_hours'
    WHEN total_hours = 0 THEN '❌ Zero hours'
    WHEN total_amount = 0 THEN '❌ Zero amount'
    WHEN advance_payment > total_amount THEN '❌ Advance > Total'
    WHEN (advance_payment + remaining_payment) != total_amount THEN '⚠️ Payment mismatch'
    ELSE '✅ OK'
  END as data_status
FROM bookings
WHERE 
  total_amount IS NULL 
  OR total_hours IS NULL 
  OR total_hours = 0
  OR total_amount = 0
  OR advance_payment > total_amount
  OR (advance_payment + remaining_payment) != total_amount
ORDER BY created_at DESC
LIMIT 20;

-- 4. Check available slots for a specific date (for editing)
-- Replace the date with your booking date
WITH date_slots AS (
  SELECT 
    bs.slot_hour,
    b.status,
    b.booking_number,
    b.id as booking_id
  FROM booking_slots bs
  INNER JOIN bookings b ON b.id = bs.booking_id
  WHERE b.booking_date = '2026-01-25'  -- Replace with your date
    AND b.status IN ('pending', 'approved', 'completed')
)
SELECT 
  hour_num as slot_hour,
  CASE 
    WHEN ds.slot_hour IS NOT NULL THEN 
      CASE 
        WHEN ds.status = 'pending' THEN '⏳ Pending (' || ds.booking_number || ')'
        WHEN ds.status = 'approved' THEN '✅ Approved (' || ds.booking_number || ')'
        WHEN ds.status = 'completed' THEN '✔️ Completed (' || ds.booking_number || ')'
        ELSE '🔒 Booked'
      END
    ELSE '✅ Available'
  END as slot_status,
  ds.booking_id
FROM generate_series(0, 23) as hour_num
LEFT JOIN date_slots ds ON ds.slot_hour = hour_num
ORDER BY hour_num;

-- 5. Check for bookings with missing slots
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.status,
  b.total_hours,
  COUNT(bs.id) as actual_slot_count,
  CASE 
    WHEN COUNT(bs.id) = 0 THEN '❌ No slots found!'
    WHEN COUNT(bs.id) != b.total_hours THEN '⚠️ Slot count mismatch'
    ELSE '✅ OK'
  END as slot_status
FROM bookings b
LEFT JOIN booking_slots bs ON bs.booking_id = b.id
WHERE b.status IN ('pending', 'approved', 'completed')
GROUP BY b.id, b.booking_number, b.booking_date, b.status, b.total_hours
HAVING COUNT(bs.id) != b.total_hours OR COUNT(bs.id) = 0
ORDER BY b.created_at DESC
LIMIT 20;

-- 6. Verify booking constraints
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND contype = 'c'  -- Check constraints only
ORDER BY conname;

-- ========================================
-- INSTRUCTIONS:
-- ========================================
-- 1. Run Query #1 to check your specific booking data
-- 2. Run Query #2 to see the slots for that booking
-- 3. Run Query #3 to find any bookings with data issues
-- 4. Run Query #4 to see slot availability for the booking date
-- 5. Run Query #5 to find bookings with missing or mismatched slots
-- 6. Run Query #6 to verify database constraints
--
-- Share the results if you need help debugging!
-- ========================================
