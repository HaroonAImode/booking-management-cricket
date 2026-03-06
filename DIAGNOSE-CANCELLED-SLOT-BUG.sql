-- ========================================
-- DIAGNOSTIC: Cancelled Slot Bug Investigation
-- ========================================
-- Run this in Supabase SQL Editor and share the output
-- This will show us exactly what's blocking slot reuse for cancelled bookings
-- ========================================

-- ----------------------------------------
-- 1. Check the unique constraint on booking_slots
--    If this shows type = 'u' (unique), that's the root bug
-- ----------------------------------------
SELECT 
  'UNIQUE CONSTRAINT CHECK' AS section,
  tc.constraint_name,
  tc.constraint_type,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) AS columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_name = kcu.table_name
WHERE tc.table_name = 'booking_slots'
  AND tc.constraint_type = 'UNIQUE'
GROUP BY tc.constraint_name, tc.constraint_type;

-- ----------------------------------------
-- 2. Show ALL booking_slots for March 14, 2026
--    Including cancelled ones that may be blocking
-- ----------------------------------------
SELECT 
  'SLOTS FOR MARCH 14' AS section,
  bs.slot_hour,
  bs.slot_time,
  bs.status AS slot_status,
  b.booking_number,
  b.status AS booking_status,
  b.created_at AS booking_created,
  b.cancelled_at,
  b.cancelled_reason,
  c.name AS customer_name,
  c.phone AS customer_phone
FROM booking_slots bs
LEFT JOIN bookings b ON b.id = bs.booking_id
LEFT JOIN customers c ON c.id = b.customer_id
WHERE bs.slot_date = '2026-03-14'
ORDER BY bs.slot_hour, b.created_at;

-- ----------------------------------------
-- 3. Show what get_available_slots returns for March 14
--    (what the calendar SHOWS to the customer)
-- ----------------------------------------
SELECT 
  'AVAILABLE SLOTS FUNCTION' AS section,
  slot_hour,
  slot_time,
  is_available,
  current_status
FROM get_available_slots('2026-03-14')
WHERE slot_hour BETWEEN 18 AND 23  -- Night hours only
ORDER BY slot_hour;

-- ----------------------------------------
-- 4. Find any orphan booking_slots
--    (booking_slots where parent booking is cancelled but slot is still pending/booked)
-- ----------------------------------------
SELECT 
  'ORPHAN / STUCK SLOTS' AS section,
  bs.slot_date,
  bs.slot_hour,
  bs.slot_time,
  bs.status AS slot_status,
  b.booking_number,
  b.status AS booking_status,
  b.cancelled_at,
  b.cancelled_reason
FROM booking_slots bs
INNER JOIN bookings b ON b.id = bs.booking_id
WHERE b.status = 'cancelled'
  AND bs.status IN ('pending', 'booked')  -- Should be 'cancelled', not 'pending'/'booked'
ORDER BY bs.slot_date, bs.slot_hour;

-- ----------------------------------------
-- 5. Show all cancelled bookings from last 30 days
--    with their slot statuses
-- ----------------------------------------
SELECT 
  'RECENT CANCELLED BOOKINGS' AS section,
  b.booking_number,
  b.status AS booking_status,
  b.booking_date,
  b.cancelled_at,
  b.cancelled_reason,
  COUNT(bs.id) AS total_slots,
  COUNT(CASE WHEN bs.status = 'cancelled' THEN 1 END) AS cancelled_slots,
  COUNT(CASE WHEN bs.status IN ('pending', 'booked') THEN 1 END) AS stuck_slots,
  string_agg(bs.slot_hour::text || '(' || bs.status || ')', ', ' ORDER BY bs.slot_hour) AS slot_details
FROM bookings b
LEFT JOIN booking_slots bs ON bs.booking_id = b.id
WHERE b.status = 'cancelled'
  AND b.cancelled_at > NOW() - INTERVAL '30 days'
GROUP BY b.id, b.booking_number, b.status, b.booking_date, b.cancelled_at, b.cancelled_reason
ORDER BY b.cancelled_at DESC;

-- ----------------------------------------
-- 6. Check which version of check_and_reserve_slots is deployed
-- ----------------------------------------
SELECT 
  'FUNCTION SIGNATURES' AS section,
  p.proname AS function_name,
  pg_get_function_arguments(p.oid) AS arguments,
  LEFT(pg_get_functiondef(p.oid), 500) AS definition_preview
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('check_and_reserve_slots', 'create_booking_with_slots')
ORDER BY p.proname;
