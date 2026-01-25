-- ========================================
-- TIME SLOT EDITING FEATURE SQL
-- ========================================
-- Description: Additional SQL for time slot editing in bookings
-- Date: January 25, 2026
-- ========================================

-- ========================================
-- 1. ADD INDEXES FOR SLOT QUERIES
-- ========================================
-- Improve performance when checking available slots

CREATE INDEX IF NOT EXISTS idx_booking_slots_booking_id 
ON booking_slots(booking_id);

CREATE INDEX IF NOT EXISTS idx_booking_slots_slot_hour 
ON booking_slots(slot_hour);

CREATE INDEX IF NOT EXISTS idx_bookings_date_status 
ON bookings(booking_date, status);

-- ========================================
-- 2. ADD FUNCTION TO CHECK SLOT CONFLICTS
-- ========================================
-- This function checks if any slots conflict with existing bookings

CREATE OR REPLACE FUNCTION check_slot_conflicts(
  p_booking_date DATE,
  p_slots INTEGER[],
  p_exclude_booking_id UUID DEFAULT NULL
)
RETURNS TABLE (
  conflicting_slot INTEGER,
  conflicting_booking_id UUID,
  conflicting_booking_number TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    bs.slot_hour AS conflicting_slot,
    b.id AS conflicting_booking_id,
    b.booking_number AS conflicting_booking_number
  FROM booking_slots bs
  INNER JOIN bookings b ON bs.booking_id = b.id
  WHERE b.booking_date = p_booking_date
    AND bs.slot_hour = ANY(p_slots)
    AND b.status IN ('pending', 'approved', 'completed')
    AND (p_exclude_booking_id IS NULL OR b.id != p_exclude_booking_id)
  ORDER BY bs.slot_hour;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_slot_conflicts IS 'Checks if time slots conflict with existing bookings for a given date';

-- ========================================
-- 3. ADD TRIGGER TO PREVENT OVERLAPPING SLOTS
-- ========================================
-- Prevent double-booking at the database level

CREATE OR REPLACE FUNCTION prevent_slot_overlap()
RETURNS TRIGGER AS $$
DECLARE
  v_booking_date DATE;
  v_booking_status TEXT;
  v_conflict_count INTEGER;
BEGIN
  -- Get booking date and status
  SELECT booking_date, status
  INTO v_booking_date, v_booking_status
  FROM bookings
  WHERE id = NEW.booking_id;

  -- Only check for active bookings
  IF v_booking_status IN ('pending', 'approved', 'completed') THEN
    -- Check for conflicts
    SELECT COUNT(*)
    INTO v_conflict_count
    FROM booking_slots bs
    INNER JOIN bookings b ON bs.booking_id = b.id
    WHERE b.booking_date = v_booking_date
      AND bs.slot_hour = NEW.slot_hour
      AND b.status IN ('pending', 'approved', 'completed')
      AND bs.booking_id != NEW.booking_id;

    IF v_conflict_count > 0 THEN
      RAISE EXCEPTION 'Slot % is already booked for date %', NEW.slot_hour, v_booking_date;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_slot_overlap ON booking_slots;

CREATE TRIGGER trg_prevent_slot_overlap
  BEFORE INSERT OR UPDATE ON booking_slots
  FOR EACH ROW
  EXECUTE FUNCTION prevent_slot_overlap();

COMMENT ON TRIGGER trg_prevent_slot_overlap ON booking_slots IS 'Prevents double-booking of time slots';

-- ========================================
-- 4. VERIFICATION QUERIES
-- ========================================

-- Check indexes exist
SELECT 
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename IN ('booking_slots', 'bookings')
  AND indexname LIKE 'idx_%'
ORDER BY tablename, indexname;

-- Check function exists
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'check_slot_conflicts'
ORDER BY routine_name;

-- Check trigger exists
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_timing
FROM information_schema.triggers
WHERE trigger_name = 'trg_prevent_slot_overlap';

-- ========================================
-- 5. TEST QUERIES (Optional - for testing)
-- ========================================

-- Test slot conflict checking
-- SELECT * FROM check_slot_conflicts('2026-01-26', ARRAY[9, 10, 11]);

-- Check all bookings with their slots
-- SELECT 
--   b.booking_number,
--   b.booking_date,
--   b.status,
--   array_agg(bs.slot_hour ORDER BY bs.slot_hour) AS booked_slots
-- FROM bookings b
-- LEFT JOIN booking_slots bs ON b.id = bs.booking_id
-- WHERE b.booking_date >= CURRENT_DATE
-- GROUP BY b.id, b.booking_number, b.booking_date, b.status
-- ORDER BY b.booking_date, b.booking_number;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TIME SLOT EDITING FEATURE COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features Added:';
  RAISE NOTICE '  ✓ Slot conflict checking function';
  RAISE NOTICE '  ✓ Database-level overlap prevention trigger';
  RAISE NOTICE '  ✓ Performance indexes for slot queries';
  RAISE NOTICE '  ✓ Booking date and status tracking';
  RAISE NOTICE '========================================';
END $$;
