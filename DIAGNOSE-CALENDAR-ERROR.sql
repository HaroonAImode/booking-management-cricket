-- ========================================
-- DIAGNOSE CALENDAR 500 ERROR
-- ========================================
-- Find the real cause of calendar API failure

-- ========================================
-- 1. CHECK BOOKINGS TABLE STRUCTURE
-- ========================================

-- See what columns exist in bookings table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'bookings'
ORDER BY ordinal_position;

-- ========================================
-- 2. TEST THE EXACT QUERY THE API USES
-- ========================================

-- This is the EXACT query from calendar API route.ts line 54-73
SELECT 
  id,
  booking_number,
  booking_date,
  total_hours,
  total_amount,
  advance_payment,
  remaining_payment,
  status,
  created_at,
  customer_name,
  customer_phone,
  customer_notes,
  admin_notes
FROM bookings
WHERE booking_date >= '2026-02-01'
  AND booking_date <= '2026-03-01'
ORDER BY booking_date ASC, created_at ASC
LIMIT 5;

-- ========================================
-- 3. CHECK IF COLUMNS ARE MISSING
-- ========================================

-- Check if these critical columns exist
SELECT 
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_name') 
    THEN '✅ customer_name exists' 
    ELSE '❌ customer_name MISSING' 
  END as customer_name_check,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_phone') 
    THEN '✅ customer_phone exists' 
    ELSE '❌ customer_phone MISSING' 
  END as customer_phone_check,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'customer_notes') 
    THEN '✅ customer_notes exists' 
    ELSE '❌ customer_notes MISSING' 
  END as customer_notes_check,
  
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'admin_notes') 
    THEN '✅ admin_notes exists' 
    ELSE '❌ admin_notes MISSING' 
  END as admin_notes_check;

-- ========================================
-- 4. CHECK BOOKING_SLOTS JOIN
-- ========================================

-- Test the join with booking_slots (used for slot_hour)
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.customer_name,
  array_agg(bs.slot_hour ORDER BY bs.slot_hour) as slot_hours
FROM bookings b
LEFT JOIN booking_slots bs ON bs.booking_id = b.id
WHERE b.booking_date >= '2026-02-01'
  AND b.booking_date <= '2026-03-01'
GROUP BY b.id, b.booking_number, b.booking_date, b.customer_name
LIMIT 5;

-- ========================================
-- 5. CHECK USER_ROLES FOR ADMIN AUTH
-- ========================================

-- Verify user_roles has active admins
SELECT 
  user_id,
  name,
  role,
  is_active,
  created_at
FROM user_roles
WHERE is_active = true
ORDER BY created_at DESC;

-- ========================================
-- 6. ALTERNATIVE: CHECK IF IT'S A CUSTOMER_ID ISSUE
-- ========================================

-- Check if bookings are linked to customers table
SELECT 
  b.id,
  b.booking_number,
  b.customer_id,
  c.name as customer_name_from_table,
  b.customer_name as customer_name_field,
  b.customer_phone
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
LIMIT 5;

-- ========================================
-- 7. FINAL CHECK: SIMULATE FULL API QUERY
-- ========================================

-- This replicates the FULL query with subquery for booking_slots
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.total_hours,
  b.total_amount,
  b.advance_payment,
  b.remaining_payment,
  b.status,
  b.created_at,
  b.customer_name,
  b.customer_phone,
  b.customer_notes,
  b.admin_notes,
  (
    SELECT json_agg(json_build_object('slot_hour', slot_hour))
    FROM booking_slots
    WHERE booking_id = b.id
  ) as booking_slots
FROM bookings b
WHERE b.booking_date >= '2026-02-01'
  AND b.booking_date <= '2026-03-01'
ORDER BY b.booking_date ASC, b.created_at ASC;
