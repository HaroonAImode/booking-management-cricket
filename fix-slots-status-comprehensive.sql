-- ========================================
-- COMPREHENSIVE SLOT STATUS FIX
-- ========================================
-- This fixes the root cause of customers seeing incorrect slot statuses
-- Issues fixed:
-- 1. Expired pending bookings not reverting to available
-- 2. Incorrect status calculation in get_available_slots function
-- 3. Missing booking status checks
-- ========================================

-- Start transaction (will rollback on error)
BEGIN;

-- ========================================
-- 1. AUTO-CLEANUP EXPIRED PENDING BOOKINGS
-- ========================================

-- Function to automatically cancel expired pending bookings
CREATE OR REPLACE FUNCTION cleanup_expired_pending_bookings()
RETURNS INTEGER AS $$
DECLARE
  v_affected INTEGER := 0;
BEGIN
  -- Cancel bookings that have expired
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_reason = 'Automatic cancellation - Payment not received within time limit',
    updated_at = NOW()
  WHERE status = 'pending'
    AND pending_expires_at < NOW()
    AND cancelled_at IS NULL;
  
  GET DIAGNOSTICS v_affected = ROW_COUNT;
  
  -- Release the associated slots
  UPDATE booking_slots
  SET 
    status = 'available',
    updated_at = NOW()
  WHERE booking_id IN (
    SELECT id FROM bookings 
    WHERE status = 'cancelled' 
    AND cancelled_reason = 'Automatic cancellation - Payment not received within time limit'
  )
  AND status IN ('pending', 'booked');
  
  RETURN v_affected;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION cleanup_expired_pending_bookings() IS 'Automatically cancels expired pending bookings and releases slots';

-- ========================================
-- 2. IMPROVED GET_AVAILABLE_SLOTS FUNCTION
-- ========================================

DROP FUNCTION IF EXISTS get_available_slots(DATE) CASCADE;

CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE (
  slot_hour INTEGER,
  slot_time TIME,
  is_available BOOLEAN,
  current_status TEXT,
  hourly_rate NUMERIC,
  is_night_rate BOOLEAN
) AS $$
DECLARE
  day_rate NUMERIC;
  night_rate NUMERIC;
  night_start TIME;
  night_end TIME;
  current_hour INTEGER;
  slot_time_val TIME;
  v_booking_id UUID;
  v_booking_status TEXT;
  v_slot_status TEXT;
  v_expired BOOLEAN;
BEGIN
  -- FIRST: Clean up any expired pending bookings
  PERFORM cleanup_expired_pending_bookings();
  
  -- Get current rates from settings
  SELECT setting_value::NUMERIC INTO day_rate
  FROM settings WHERE setting_key = 'day_rate_per_hour';
  
  SELECT setting_value::NUMERIC INTO night_rate
  FROM settings WHERE setting_key = 'night_rate_per_hour';
  
  SELECT setting_value::TIME INTO night_start
  FROM settings WHERE setting_key = 'night_start_time';
  
  SELECT setting_value::TIME INTO night_end
  FROM settings WHERE setting_key = 'night_end_time';
  
  -- Set defaults if settings are missing
  day_rate := COALESCE(day_rate, 1500);
  night_rate := COALESCE(night_rate, 2000);
  night_start := COALESCE(night_start, '17:00:00'::TIME);
  night_end := COALESCE(night_end, '07:00:00'::TIME);
  
  -- Generate all 24 hours with CORRECT status logic
  FOR current_hour IN 0..23 LOOP
    slot_time_val := (current_hour || ':00:00')::TIME;
    
    -- Initialize defaults
    v_booking_id := NULL;
    v_booking_status := NULL;
    v_slot_status := 'available';
    v_expired := false;
    
    -- Check if this slot is booked AND check the booking status
    SELECT 
      bs.booking_id,
      b.status,
      bs.status,
      CASE 
        WHEN b.status = 'pending' AND b.pending_expires_at < NOW() THEN true
        ELSE false
      END
    INTO 
      v_booking_id,
      v_booking_status,
      v_slot_status,
      v_expired
    FROM booking_slots bs
    INNER JOIN bookings b ON b.id = bs.booking_id
    WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
      AND b.status NOT IN ('cancelled') -- Exclude cancelled bookings
    ORDER BY 
      CASE b.status 
        WHEN 'approved' THEN 1  -- Approved bookings take priority
        WHEN 'completed' THEN 2
        WHEN 'pending' THEN 3
        ELSE 4
      END
    LIMIT 1;
    
    -- Determine final status based on booking status
    IF v_booking_id IS NULL THEN
      -- No booking found for this slot
      v_slot_status := 'available';
    ELSIF v_expired THEN
      -- Booking has expired, slot should be available
      v_slot_status := 'available';
    ELSIF v_booking_status = 'approved' OR v_booking_status = 'completed' THEN
      -- Booking is confirmed
      v_slot_status := 'booked';
    ELSIF v_booking_status = 'pending' THEN
      -- Booking is awaiting approval
      v_slot_status := 'pending';
    ELSE
      -- Default to available for any other status
      v_slot_status := 'available';
    END IF;
    
    -- Check if slot is in the past (for today only)
    IF p_date = CURRENT_DATE AND current_hour < EXTRACT(HOUR FROM CURRENT_TIME) THEN
      v_slot_status := 'past';
    END IF;
    
    -- Determine rate and night status
    RETURN QUERY SELECT
      current_hour AS slot_hour,
      slot_time_val AS slot_time,
      (v_slot_status = 'available') AS is_available,
      v_slot_status AS current_status,
      CASE
        WHEN (slot_time_val >= night_start OR slot_time_val < night_end) THEN night_rate
        ELSE day_rate
      END AS hourly_rate,
      (slot_time_val >= night_start OR slot_time_val < night_end) AS is_night_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_slots(DATE) IS 'Returns accurate slot availability considering expired bookings and booking statuses';

-- ========================================
-- 3. FUNCTION TO GET SLOT STATUS WITH LOCK
-- ========================================

-- This function checks slot availability and locks rows to prevent race conditions
CREATE OR REPLACE FUNCTION check_and_lock_slots(
  p_date DATE,
  p_slot_hours INTEGER[]
)
RETURNS TABLE (
  slot_hour INTEGER,
  is_available BOOLEAN,
  conflict_reason TEXT
) AS $$
DECLARE
  v_hour INTEGER;
  v_conflict BOOLEAN;
  v_conflict_reason TEXT;
BEGIN
  -- Clean up expired bookings first
  PERFORM cleanup_expired_pending_bookings();
  
  -- Check each requested slot
  FOREACH v_hour IN ARRAY p_slot_hours
  LOOP
    v_conflict := false;
    v_conflict_reason := NULL;
    
    -- Check if slot exists and is blocked (WITH LOCK to prevent race conditions)
    SELECT EXISTS(
      SELECT 1 
      FROM booking_slots bs
      INNER JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.slot_date = p_date
        AND bs.slot_hour = v_hour
        AND bs.status IN ('pending', 'booked')
        AND b.status IN ('pending', 'approved', 'completed')
        AND (b.pending_expires_at IS NULL OR b.pending_expires_at > NOW())
      FOR UPDATE -- Lock these rows to prevent concurrent modifications
    ) INTO v_conflict;
    
    IF v_conflict THEN
      v_conflict_reason := 'Slot is already booked or pending';
    END IF;
    
    -- Check if slot is in the past
    IF p_date = CURRENT_DATE AND v_hour < EXTRACT(HOUR FROM CURRENT_TIME) THEN
      v_conflict := true;
      v_conflict_reason := 'Cannot book past time slots';
    END IF;
    
    RETURN QUERY SELECT 
      v_hour AS slot_hour,
      NOT v_conflict AS is_available,
      v_conflict_reason AS conflict_reason;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_lock_slots(DATE, INTEGER[]) IS 'Checks slot availability with row locking to prevent concurrent booking conflicts';

-- ========================================
-- 4. TRIGGER TO AUTO-CLEANUP ON SLOT QUERIES
-- ========================================

-- Create a function that runs cleanup before slot queries
CREATE OR REPLACE FUNCTION trigger_cleanup_before_slot_check()
RETURNS TRIGGER AS $$
BEGIN
  -- Auto cleanup expired bookings
  PERFORM cleanup_expired_pending_bookings();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 5. CREATE HELPER VIEW FOR REAL-TIME STATUS
-- ========================================

-- View that always shows current accurate slot status
CREATE OR REPLACE VIEW v_current_slot_status AS
SELECT 
  bs.id,
  bs.booking_id,
  bs.slot_date,
  bs.slot_hour,
  bs.slot_time,
  bs.status AS slot_status,
  b.status AS booking_status,
  b.booking_number,
  b.pending_expires_at,
  c.name AS customer_name,
  c.phone AS customer_phone,
  CASE
    WHEN b.status = 'cancelled' THEN 'available'
    WHEN b.status = 'pending' AND b.pending_expires_at < NOW() THEN 'available'
    WHEN b.status IN ('approved', 'completed') THEN 'booked'
    WHEN b.status = 'pending' THEN 'pending'
    ELSE bs.status
  END AS actual_status,
  CASE
    WHEN b.status = 'cancelled' THEN true
    WHEN b.status = 'pending' AND b.pending_expires_at < NOW() THEN true
    WHEN b.status IN ('approved', 'completed', 'pending') THEN false
    ELSE (bs.status = 'available')
  END AS is_actually_available
FROM booking_slots bs
LEFT JOIN bookings b ON b.id = bs.booking_id
LEFT JOIN customers c ON c.id = b.customer_id;

COMMENT ON VIEW v_current_slot_status IS 'Real-time view of slot status considering expired bookings';

-- ========================================
-- 6. SCHEDULED CLEANUP (using pg_cron if available)
-- ========================================

-- Note: This requires pg_cron extension
-- Run cleanup every minute to ensure expired bookings are handled promptly
-- Uncomment if pg_cron is available:

-- SELECT cron.schedule(
--   'cleanup-expired-bookings',
--   '*/1 * * * *', -- Every minute
--   $$SELECT cleanup_expired_pending_bookings();$$
-- );

-- ========================================
-- 7. GRANT PERMISSIONS
-- ========================================

-- Allow public access to check slots
GRANT EXECUTE ON FUNCTION get_available_slots(DATE) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_lock_slots(DATE, INTEGER[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_pending_bookings() TO anon, authenticated;
GRANT SELECT ON v_current_slot_status TO anon, authenticated;

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Test the function
-- SELECT * FROM get_available_slots(CURRENT_DATE);
-- SELECT * FROM get_available_slots(CURRENT_DATE + 1);

-- Check for any expired pending bookings
-- SELECT 
--   b.booking_number,
--   b.status,
--   b.pending_expires_at,
--   b.pending_expires_at < NOW() AS is_expired,
--   COUNT(bs.id) AS slot_count
-- FROM bookings b
-- JOIN booking_slots bs ON bs.booking_id = b.id
-- WHERE b.status = 'pending'
-- GROUP BY b.id, b.booking_number, b.status, b.pending_expires_at;

-- View current slot status
-- SELECT * FROM v_current_slot_status 
-- WHERE slot_date >= CURRENT_DATE 
-- ORDER BY slot_date, slot_hour;

-- ========================================
-- END OF SCRIPT
-- ========================================
-- If all commands executed successfully, commit the transaction
COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Slot status fix applied successfully!';
  RAISE NOTICE 'Functions created: cleanup_expired_pending_bookings, get_available_slots, check_and_lock_slots';
  RAISE NOTICE 'View created: v_current_slot_status';
  RAISE NOTICE 'Next step: Run verification queries from verify-database-state.sql';
END $$;
