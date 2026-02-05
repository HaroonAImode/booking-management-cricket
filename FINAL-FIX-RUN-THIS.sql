-- ========================================
-- FINAL COMPREHENSIVE SLOT STATUS FIX
-- ========================================
-- Tailored for your specific database state
-- This will:
-- 1. Replace get_available_slots with improved version
-- 2. Add cleanup_expired_pending_bookings function
-- 3. Add check_and_lock_slots function
-- 4. Add v_current_slot_status view
-- ========================================

BEGIN;

-- ========================================
-- 1. CREATE AUTO-CLEANUP FUNCTION
-- ========================================

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
-- 2. REPLACE get_available_slots WITH IMPROVED VERSION
-- ========================================

DROP FUNCTION IF EXISTS get_available_slots(text) CASCADE;

CREATE OR REPLACE FUNCTION get_available_slots(p_date text)
RETURNS TABLE (
  slot_hour INTEGER,
  slot_time TEXT,
  is_available BOOLEAN,
  current_status TEXT,
  hourly_rate NUMERIC,
  is_night_rate BOOLEAN
) AS $$
DECLARE
  v_day_rate NUMERIC := 1500;
  v_night_rate NUMERIC := 2000;
  v_night_start INTEGER := 17;
  v_night_end INTEGER := 7;
  v_hour INTEGER;
  v_booking_id UUID;
  v_booking_status TEXT;
  v_slot_status TEXT;
  v_expired BOOLEAN;
  v_date DATE;
BEGIN
  -- FIRST: Clean up any expired pending bookings
  PERFORM cleanup_expired_pending_bookings();
  
  -- Convert text to date
  v_date := p_date::date;
  
  -- Get rates from settings
  BEGIN
    SELECT setting_value::NUMERIC INTO v_day_rate
    FROM settings WHERE setting_key = 'day_rate_per_hour' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    SELECT setting_value::NUMERIC INTO v_night_rate
    FROM settings WHERE setting_key = 'night_rate_per_hour' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    SELECT EXTRACT(HOUR FROM setting_value::time)::integer INTO v_night_start
    FROM settings WHERE setting_key = 'night_start_time' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  BEGIN
    SELECT EXTRACT(HOUR FROM setting_value::time)::integer INTO v_night_end
    FROM settings WHERE setting_key = 'night_end_time' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;
  
  -- Generate all 24 hours with CORRECT status logic
  FOR v_hour IN 0..23 LOOP
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
    WHERE bs.slot_date = v_date
      AND bs.slot_hour = v_hour
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
    IF v_date = CURRENT_DATE AND v_hour < EXTRACT(HOUR FROM CURRENT_TIME) THEN
      v_slot_status := 'past';
    END IF;
    
    -- Determine if it's night rate
    RETURN QUERY SELECT
      v_hour AS slot_hour,
      LPAD(v_hour::text, 2, '0') || ':00' AS slot_time,
      (v_slot_status = 'available') AS is_available,
      v_slot_status AS current_status,
      CASE
        WHEN (v_night_start > v_night_end) THEN
          CASE WHEN v_hour >= v_night_start OR v_hour < v_night_end 
               THEN v_night_rate ELSE v_day_rate END
        ELSE
          CASE WHEN v_hour >= v_night_start AND v_hour < v_night_end 
               THEN v_night_rate ELSE v_day_rate END
      END AS hourly_rate,
      CASE
        WHEN (v_night_start > v_night_end) THEN
          (v_hour >= v_night_start OR v_hour < v_night_end)
        ELSE
          (v_hour >= v_night_start AND v_hour < v_night_end)
      END AS is_night_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_available_slots(text) IS 'Returns accurate slot availability considering expired bookings and booking statuses';

-- ========================================
-- 3. CREATE CONFLICT CHECK FUNCTION WITH LOCKING
-- ========================================

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
-- 4. CREATE REAL-TIME STATUS VIEW
-- ========================================

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
-- 5. GRANT PERMISSIONS
-- ========================================

-- Allow public access to check slots
GRANT EXECUTE ON FUNCTION get_available_slots(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION check_and_lock_slots(DATE, INTEGER[]) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION cleanup_expired_pending_bookings() TO anon, authenticated;
GRANT SELECT ON v_current_slot_status TO anon, authenticated;

-- ========================================
-- COMMIT AND VERIFY
-- ========================================

COMMIT;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '✅ Slot status fix applied successfully!';
  RAISE NOTICE 'Functions created/updated:';
  RAISE NOTICE '  - cleanup_expired_pending_bookings()';
  RAISE NOTICE '  - get_available_slots(text)';
  RAISE NOTICE '  - check_and_lock_slots(date, integer[])';
  RAISE NOTICE 'View created: v_current_slot_status';
  RAISE NOTICE '';
  RAISE NOTICE 'Next: Run verification queries below';
END $$;
