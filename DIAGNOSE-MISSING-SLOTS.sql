-- ========================================
-- DIAGNOSTIC QUERY: Find Bookings with Missing Slots
-- ========================================
-- Purpose: Identify bookings that have no associated slots in booking_slots table
-- This could happen due to database errors, race conditions, or bugs in booking creation

-- 1. Find all bookings with no slots
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.status,
  b.created_at,
  c.name AS customer_name,
  c.phone AS customer_phone,
  b.total_hours,
  b.total_amount,
  COUNT(bs.id) AS slot_count
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
LEFT JOIN booking_slots bs ON b.id = bs.booking_id
GROUP BY b.id, b.booking_number, b.booking_date, b.status, b.created_at, c.name, c.phone, b.total_hours, b.total_amount
HAVING COUNT(bs.id) = 0
ORDER BY b.created_at DESC;

-- 2. Summary statistics
SELECT 
  COUNT(*) AS total_bookings,
  COUNT(DISTINCT bs.booking_id) AS bookings_with_slots,
  COUNT(*) - COUNT(DISTINCT bs.booking_id) AS bookings_without_slots
FROM bookings b
LEFT JOIN booking_slots bs ON b.id = bs.booking_id;

-- 3. Check recent bookings (last 7 days) for slot issues
SELECT 
  b.booking_number,
  b.booking_date,
  b.status,
  b.created_at::DATE AS created_date,
  b.total_hours AS expected_hours,
  COUNT(bs.id) AS actual_slots,
  CASE 
    WHEN COUNT(bs.id) = 0 THEN '❌ NO SLOTS'
    WHEN COUNT(bs.id) != b.total_hours THEN '⚠️ SLOT MISMATCH'
    ELSE '✅ OK'
  END AS slot_status,
  c.name AS customer_name,
  c.phone AS customer_phone
FROM bookings b
LEFT JOIN booking_slots bs ON b.id = bs.booking_id
LEFT JOIN customers c ON b.customer_id = c.id
WHERE b.created_at >= NOW() - INTERVAL '7 days'
GROUP BY b.id, b.booking_number, b.booking_date, b.status, b.created_at, b.total_hours, c.name, c.phone
ORDER BY b.created_at DESC;

-- 4. Check for orphaned slots (slots without booking)
SELECT 
  bs.*,
  b.booking_number
FROM booking_slots bs
LEFT JOIN bookings b ON bs.booking_id = b.id
WHERE b.id IS NULL;

-- 5. Detailed view of a specific booking with slot details
-- (Replace 'BOOKING_NUMBER' with actual booking number to investigate)
-- Example: WHERE b.booking_number = 'BK-20260206-0001'
SELECT 
  'Booking Info' AS section,
  b.booking_number,
  b.booking_date,
  b.status,
  b.total_hours,
  b.total_amount,
  b.created_at,
  c.name AS customer_name,
  c.phone AS customer_phone
FROM bookings b
LEFT JOIN customers c ON b.customer_id = c.id
-- WHERE b.booking_number = 'REPLACE_WITH_BOOKING_NUMBER'
ORDER BY b.created_at DESC
LIMIT 5;

SELECT 
  'Slot Details' AS section,
  bs.slot_date,
  bs.slot_time,
  bs.slot_hour,
  bs.is_night_rate,
  bs.hourly_rate,
  bs.status,
  b.booking_number
FROM booking_slots bs
LEFT JOIN bookings b ON bs.booking_id = b.id
-- WHERE b.booking_number = 'REPLACE_WITH_BOOKING_NUMBER'
ORDER BY b.created_at DESC, bs.slot_hour
LIMIT 20;
