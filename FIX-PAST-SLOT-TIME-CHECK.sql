-- ========================================
-- FIX: Past Slot Detection - Current Hour Should Be Unavailable
-- ========================================
-- Issue: At 1 AM, slots for 1 AM show as available (should be PAST)
-- Problem: Using hour < currentHour instead of hour <= currentHour
-- This means the current hour is bookable when it shouldn't be
-- ========================================

-- ========================================
-- Update get_available_slots function
-- ========================================

CREATE OR REPLACE FUNCTION public.get_available_slots(p_date DATE)
RETURNS TABLE (
  slot_hour INTEGER,
  slot_time TIME,
  is_available BOOLEAN,
  current_status TEXT,
  hourly_rate NUMERIC,
  is_night_rate BOOLEAN
) AS $$
DECLARE
  current_hour INTEGER;
  slot_time_val TIME;
  v_booking_id UUID;
  v_booking_status TEXT;
  v_slot_status TEXT;
  v_expired BOOLEAN;
  day_rate NUMERIC := 1500;
  night_rate NUMERIC := 2000;
  night_start TIME;
  night_end TIME;
BEGIN
  -- Clean up expired bookings first
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
    
    -- ✅ CRITICAL FIX: Check if slot is in the past (for today only)
    -- Changed from < to <= so current hour is also marked as past
    IF p_date = CURRENT_DATE AND current_hour <= EXTRACT(HOUR FROM CURRENT_TIME) THEN
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

COMMENT ON FUNCTION get_available_slots(DATE) IS 'Returns accurate slot availability. Current hour is marked as PAST (not bookable).';

-- ========================================
-- Update check_and_lock_slots function
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
    
    -- ✅ CRITICAL FIX: Check if slot is in the past (including current hour)
    -- Changed from < to <= so current hour cannot be booked
    IF p_date = CURRENT_DATE AND v_hour <= EXTRACT(HOUR FROM CURRENT_TIME) THEN
      v_conflict := true;
      v_conflict_reason := 'Cannot book past time slots';
    END IF;
    
    RETURN QUERY SELECT 
      v_hour AS slot_hour,
      NOT v_conflict AS is_available,
      v_conflict_reason AS conflict_reason;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION check_and_lock_slots(DATE, INTEGER[]) IS 'Checks and locks slots for booking. Current hour is considered past.';

-- ========================================
-- Force schema reload
-- ========================================

NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';
NOTIFY pgrst, 'reload schema';

-- ========================================
-- Test the fix
-- ========================================

-- Test: Get today's slots (should show current hour and earlier as PAST)
SELECT 
  slot_hour,
  slot_time,
  current_status,
  is_available,
  CASE 
    WHEN current_status = 'past' THEN '✅ Past (correct)'
    WHEN current_status = 'available' THEN '🟢 Available'
    WHEN current_status = 'booked' THEN '🔴 Booked'
    WHEN current_status = 'pending' THEN '🟡 Pending'
  END AS status_display
FROM get_available_slots(CURRENT_DATE)
ORDER BY slot_hour;

-- Expected: If it's currently 1 AM, slots 0 and 1 should show as 'past'

-- ========================================
-- SUCCESS INDICATORS
-- ========================================

-- ✅ Current hour and earlier hours show as 'past' status
-- ✅ Future hours show normal status (available/booked/pending)
-- ✅ Calendar no longer shows past hours as bookable
