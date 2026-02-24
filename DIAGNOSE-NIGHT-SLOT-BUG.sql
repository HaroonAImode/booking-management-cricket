-- ========================================
-- DIAGNOSE: Night Slots Showing as BOOKED
-- Bug: 11 AM, 12 PM, 1 AM (and nearby) slots
--      appear as BOOKED when viewed at night
-- ========================================

-- ==========================================
-- STEP 1: Check the timezone settings
-- Problem: CURRENT_DATE in PostgreSQL is UTC.
--          Pakistan (PKT) is UTC+5. Between
--          midnight and 5 AM PKT the UTC date
--          is STILL the previous day.
-- ==========================================

SELECT 
  NOW()                                                    AS db_utc_now,
  NOW() AT TIME ZONE 'Asia/Karachi'                        AS pkt_now,
  CURRENT_DATE                                             AS current_date_utc,
  (NOW() AT TIME ZONE 'Asia/Karachi')::DATE                AS current_date_pkt,
  EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Karachi'))   AS current_hour_pkt,
  CASE 
    WHEN CURRENT_DATE != (NOW() AT TIME ZONE 'Asia/Karachi')::DATE
    THEN '🔴 DATE MISMATCH! UTC date ≠ PKT date (between midnight-5AM PKT)'
    ELSE '✅ UTC date = PKT date'
  END AS date_mismatch_status;


-- ==========================================
-- STEP 2: What does get_available_slots return NOW?
-- Check whether the deployed live function
-- uses CURRENT_DATE (UTC) or PKT date.
-- ==========================================

-- Today in PKT
SELECT 
  slot_hour,
  slot_time,
  current_status,
  is_available
FROM get_available_slots((NOW() AT TIME ZONE 'Asia/Karachi')::DATE)
ORDER BY slot_hour;


-- ==========================================
-- STEP 3: Check the deployed function source
-- Look for CURRENT_DATE vs PKT date usage
-- ==========================================

SELECT 
  routine_name,
  routine_definition
FROM information_schema.routines
WHERE routine_name IN ('get_available_slots', 'check_and_lock_slots')
  AND routine_schema = 'public';


-- ==========================================
-- STEP 4: Find orphaned/stale booking_slots
-- These are slots still marked booked/pending
-- but their parent booking is cancelled
-- ==========================================

SELECT 
  bs.id               AS slot_id,
  bs.slot_date,
  bs.slot_hour,
  bs.status           AS slot_status,
  b.id                AS booking_id,
  b.booking_number,
  b.status            AS booking_status,
  b.pending_expires_at,
  CASE 
    WHEN b.status = 'cancelled' THEN '🔴 ORPHANED - booking cancelled but slot still active'
    WHEN b.status = 'pending' AND b.pending_expires_at < NOW() THEN '🟡 GHOST - pending expired but not cleaned'
    ELSE '✅ OK'
  END AS problem
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
WHERE bs.status IN ('pending', 'booked')
  AND (
    b.status = 'cancelled'
    OR (b.status = 'pending' AND b.pending_expires_at < NOW())
  )
ORDER BY bs.slot_date DESC, bs.slot_hour;


-- ==========================================
-- STEP 5: Check slots for the specific
-- problem hours (11, 12, 0, 1) across
-- the last 7 days and next 7 days
-- ==========================================

SELECT 
  bs.slot_date,
  bs.slot_hour,
  bs.status           AS slot_status,
  b.booking_number,
  b.status            AS booking_status,
  b.pending_expires_at,
  c.name              AS customer_name,
  c.phone             AS customer_phone
FROM booking_slots bs
JOIN bookings b   ON b.id = bs.booking_id
JOIN customers c  ON c.id = b.customer_id
WHERE bs.slot_hour IN (0, 1, 11, 12, 13, 22, 23)
  AND bs.slot_date BETWEEN 
    (NOW() AT TIME ZONE 'Asia/Karachi')::DATE - INTERVAL '3 days'
    AND (NOW() AT TIME ZONE 'Asia/Karachi')::DATE + INTERVAL '7 days'
  AND bs.status IN ('pending', 'booked')
  AND b.status NOT IN ('cancelled')
ORDER BY bs.slot_date, bs.slot_hour;


-- ==========================================
-- STEP 6: Simulate what the function returns
-- for TODAY (PKT) vs UTC CURRENT_DATE
-- to reproduce the bug
-- (Fixed: wrap in subquery for Supabase editor)
-- ==========================================

SELECT query_label, slot_hour, current_status, is_available
FROM (
  SELECT 'PKT Today' AS query_label, slot_hour, current_status, is_available
  FROM get_available_slots((NOW() AT TIME ZONE 'Asia/Karachi')::DATE)
  WHERE slot_hour IN (0, 1, 2, 11, 12, 13, 22, 23)
) pkt

UNION ALL

SELECT query_label, slot_hour, current_status, is_available
FROM (
  SELECT 'UTC Today (CURRENT_DATE)' AS query_label, slot_hour, current_status, is_available
  FROM get_available_slots(CURRENT_DATE)
  WHERE slot_hour IN (0, 1, 2, 11, 12, 13, 22, 23)
) utc

ORDER BY slot_hour, query_label;


-- ==========================================
-- STEP 7: Count pending bookings that have
-- expired but not been cleaned up
-- ==========================================

SELECT 
  COUNT(*)                  AS expired_pending_count,
  MIN(pending_expires_at)   AS oldest_expired,
  MAX(pending_expires_at)   AS newest_expired
FROM bookings
WHERE status = 'pending'
  AND pending_expires_at < NOW();


-- ========================================
-- STEP 8: Quick count to see tomorrow's
-- booked slots (should be 0 if no real booking)
-- ========================================

SELECT 
  bs.slot_hour,
  bs.status,
  b.status AS booking_status,
  b.booking_number
FROM booking_slots bs
JOIN bookings b ON b.id = bs.booking_id
WHERE bs.slot_date = (NOW() AT TIME ZONE 'Asia/Karachi')::DATE + INTERVAL '1 day'
  AND bs.status IN ('pending', 'booked')
  AND b.status NOT IN ('cancelled')
ORDER BY bs.slot_hour;


-- ==========================================
-- STEP 9 (NEW): Show all overnight bookings
-- that span midnight — these are the ones
-- causing "next day's 12AM/1AM looks booked"
-- ==========================================

SELECT
  b.booking_number,
  b.status                  AS booking_status,
  c.name                    AS customer_name,
  c.phone                   AS customer_phone,
  MIN(bs.slot_date)         AS first_date,
  MAX(bs.slot_date)         AS last_date,
  array_agg(
    bs.slot_date::TEXT || ' ' || LPAD(bs.slot_hour::TEXT,2,'0') || ':00'
    ORDER BY bs.slot_date, bs.slot_hour
  )                         AS all_slots
FROM bookings b
JOIN booking_slots bs ON bs.booking_id = b.id
JOIN customers c      ON c.id = b.customer_id
WHERE b.status NOT IN ('cancelled')
  AND bs.slot_date BETWEEN
    (NOW() AT TIME ZONE 'Asia/Karachi')::DATE - INTERVAL '7 days'
    AND (NOW() AT TIME ZONE 'Asia/Karachi')::DATE + INTERVAL '14 days'
GROUP BY b.id, b.booking_number, b.status, c.name, c.phone
HAVING COUNT(DISTINCT bs.slot_date) > 1   -- spans more than one calendar date
ORDER BY MIN(bs.slot_date) DESC;


-- ==========================================
-- STEP 10 (NEW): Verify the DB function is
-- still on the OLD version (timezone bug).
-- Should say 'OLD' if fix not yet applied.
-- ==========================================

SELECT
  routine_name,
  CASE
    WHEN routine_definition LIKE '%Asia/Karachi%' AND routine_definition LIKE '%v_pkt%'
      THEN '✅ NEW version (timezone fix applied)'
    WHEN routine_definition LIKE '%CURRENT_TIME%'
      THEN '❌ OLD version (timezone bug present) — run FIX-NIGHT-SLOT-TIMEZONE-BUG.sql'
    WHEN routine_definition LIKE '%Asia/Karachi%'
      THEN '⚠️ Partial fix (has Karachi but not v_pkt variable)'
    ELSE '❓ Unknown version'
  END AS version_status,
  CASE 
    WHEN routine_definition LIKE '%v_hour < EXTRACT%'
      THEN '❌ Uses < (current hour still bookable)'
    WHEN routine_definition LIKE '%v_hour <= EXTRACT%' OR routine_definition LIKE '%current_hour <= v_pkt%'
      THEN '✅ Uses <= (current hour blocked)'
    ELSE '❓ Cannot determine'
  END AS past_slot_operator
FROM information_schema.routines
WHERE routine_name = 'get_available_slots'
  AND routine_schema = 'public'
LIMIT 1;


-- ==========================================
-- STEP 11: Run AFTER applying the fix SQL
-- to confirm it was deployed correctly
-- ==========================================

-- Should show:
--   version_status    = ✅ NEW version
--   past_slot_operator = ✅ Uses <=
-- AND all hours <= current PKT hour should be 'past'

SELECT
  slot_hour,
  current_status,
  is_available,
  CASE
    WHEN current_status = 'past'      THEN '✅ Correctly blocked'
    WHEN current_status = 'booked'    THEN '🔴 Real booking'
    WHEN current_status = 'available' THEN '🟢 Open for booking'
    WHEN current_status = 'pending'   THEN '🟡 Pending approval'
  END AS display
FROM get_available_slots((NOW() AT TIME ZONE 'Asia/Karachi')::DATE)
ORDER BY slot_hour;

