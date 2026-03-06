-- ========================================
-- FIX: Cancelled Slots Should Have Zero Impact
-- ========================================
-- CONFIRMED by diagnostics (run 2026-03-06):
--
-- ROOT CAUSE:
--   UNIQUE CONSTRAINT unique_slot_datetime ON booking_slots(slot_date, slot_time)
--   When a booking is cancelled:
--     1. booking_slots row gets status='cancelled' ← correct
--     2. get_available_slots() shows it as 'available' ← correct
--     3. check_and_reserve_slots() returns available=true (ignores status='cancelled') ← correct
--     4. create_booking_with_slots tries to INSERT new slot row for same date+time
--     5. → UNIQUE VIOLATION (old cancelled row still physically exists)
--     6. Exception handler fires, deletes the new booking, returns success=false
--   Result: Customer sees slot as free, selects it, booking silently fails
--
-- CONFIRMED STATE:
--   - No stuck/orphan slots exist (cancel path works correctly)
--   - Functions (check_and_reserve_slots, create_booking_with_slots) are correct
--   - ONLY the unique constraint needs changing
--
-- FIX:
--   Replace the GLOBAL unique constraint with a PARTIAL unique index
--   that only enforces uniqueness for non-cancelled slots.
--   Cancelled slots become completely invisible to the uniqueness check.
-- ========================================

BEGIN;

-- ========================================
-- STEP 1: Replace global unique constraint with partial unique index
-- ========================================
-- The ONLY change needed. Everything else is already correct.

-- Drop the old global constraint that blocks reuse of cancelled slot rows
ALTER TABLE booking_slots DROP CONSTRAINT IF EXISTS unique_slot_datetime;

-- Create a partial unique index:
--   - Enforces uniqueness ONLY for non-cancelled slots
--   - Rows with status='cancelled' are completely invisible to this index
--   - A new booking can INSERT a row for the same (date, time) as a cancelled one
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_slot_datetime
  ON booking_slots (slot_date, slot_time)
  WHERE status != 'cancelled';

-- ========================================
-- STEP 2: Belt-and-suspenders cleanup
--   Fix any future "stuck" slots where booking is cancelled but slot status wasn't updated.
--   (Diagnostics show none exist now, but this is a safety net.)
-- ========================================

UPDATE booking_slots bs
SET 
  status = 'cancelled',
  updated_at = NOW()
FROM bookings b
WHERE bs.booking_id = b.id
  AND b.status = 'cancelled'
  AND bs.status IN ('pending', 'booked');

-- Force schema reload
NOTIFY pgrst, 'reload schema';

COMMIT;

-- ========================================
-- VERIFICATION: Run these SELECT statements after COMMIT
-- ========================================

-- 1. Old constraint should be gone; partial index should be present
SELECT 
  'OLD constraint gone' AS check_type,
  CASE WHEN COUNT(*) = 0 THEN '✅ Constraint removed' ELSE '❌ Still exists' END AS result
FROM information_schema.table_constraints
WHERE table_name = 'booking_slots' AND constraint_name = 'unique_slot_datetime';

SELECT 
  'NEW partial index' AS check_type,
  CASE WHEN COUNT(*) = 1 THEN '✅ Partial index created' ELSE '❌ Missing' END AS result
FROM pg_indexes
WHERE tablename = 'booking_slots' AND indexname = 'unique_active_slot_datetime';

-- 2. Confirm no stuck slots remain
SELECT 
  'Stuck slots' AS check_type,
  CASE WHEN COUNT(*) = 0 THEN '✅ None' ELSE '❌ ' || COUNT(*) || ' stuck slots found' END AS result
FROM booking_slots bs
INNER JOIN bookings b ON b.id = bs.booking_id
WHERE b.status = 'cancelled'
  AND bs.status IN ('pending', 'booked');

-- 3. Confirm the fix works: slot 23 on March 14 should now be bookable
--    (its cancelled row won't block a new INSERT)
SELECT 
  'March 14 slot 23 (11PM)' AS check_type,
  current_status,
  is_available,
  CASE WHEN is_available THEN '✅ Bookable' ELSE '❌ Still blocked' END AS result
FROM get_available_slots('2026-03-14')
WHERE slot_hour = 23;
