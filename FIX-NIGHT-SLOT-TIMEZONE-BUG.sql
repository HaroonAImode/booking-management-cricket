-- ========================================
-- FIX: Night Slot Bug - CURRENT_DATE Timezone
-- ========================================
-- ROOT CAUSE: PostgreSQL CURRENT_DATE is UTC.
-- Pakistan (PKT) is UTC+5.
-- Between 12:00 AM – 4:59 AM PKT:
--   • UTC date  = YESTERDAY
--   • PKT date  = TODAY
-- So when user views today (PKT), the function
-- compares p_date (PKT today) with CURRENT_DATE
-- (UTC yesterday) → they don't match → past-slot
-- check is SKIPPED → early morning PKT slots not
-- marked as past → appear available/booked wrong.
--
-- Also fixes: the inverse problem where slots on
-- the UTC-current-date get accidentally marked "past"
-- when the user is viewing a different PKT date.
-- ========================================

-- Drop first to allow return type change (slot_time type differs from old version)
DROP FUNCTION IF EXISTS public.get_available_slots(DATE);

CREATE OR REPLACE FUNCTION public.get_available_slots(p_date DATE)
RETURNS TABLE (
  slot_hour      INTEGER,
  slot_time      TEXT,
  is_available   BOOLEAN,
  current_status TEXT,
  hourly_rate    NUMERIC,
  is_night_rate  BOOLEAN
) AS $$
DECLARE
  current_hour    INTEGER;
  slot_time_val   TIME;
  v_booking_id    UUID;
  v_booking_status TEXT;
  v_slot_status   TEXT;
  v_expired       BOOLEAN;
  day_rate        NUMERIC := 1500;
  night_rate      NUMERIC := 2000;
  night_start     TIME;
  night_end       TIME;
  -- ✅ FIX: Use PKT current date, NOT CURRENT_DATE (which is UTC)
  v_pkt_now       TIMESTAMPTZ;
  v_pkt_date      DATE;
  v_pkt_hour      INTEGER;
BEGIN
  -- Clean up expired bookings first
  PERFORM cleanup_expired_pending_bookings();

  -- ✅ FIX: Derive all date/time values from PKT timezone in ONE place
  v_pkt_now  := NOW() AT TIME ZONE 'Asia/Karachi';
  v_pkt_date := v_pkt_now::DATE;
  v_pkt_hour := EXTRACT(HOUR FROM v_pkt_now)::INTEGER;

  -- Get current rates from settings
  BEGIN
    SELECT setting_value::NUMERIC INTO day_rate
    FROM settings WHERE setting_key = 'day_rate_per_hour' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    SELECT setting_value::NUMERIC INTO night_rate
    FROM settings WHERE setting_key = 'night_rate_per_hour' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    SELECT setting_value::TIME INTO night_start
    FROM settings WHERE setting_key = 'night_start_time' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  BEGIN
    SELECT setting_value::TIME INTO night_end
    FROM settings WHERE setting_key = 'night_end_time' LIMIT 1;
  EXCEPTION WHEN OTHERS THEN NULL;
  END;

  -- Set defaults if settings are missing
  day_rate    := COALESCE(day_rate,   1500);
  night_rate  := COALESCE(night_rate, 2000);
  night_start := COALESCE(night_start, '17:00:00'::TIME);
  night_end   := COALESCE(night_end,   '07:00:00'::TIME);

  -- Generate all 24 hours
  FOR current_hour IN 0..23 LOOP
    slot_time_val    := (current_hour || ':00:00')::TIME;
    v_booking_id     := NULL;
    v_booking_status := NULL;
    v_slot_status    := 'available';
    v_expired        := false;

    -- Check if this slot has an active booking
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
      AND b.status NOT IN ('cancelled')
    ORDER BY 
      CASE b.status 
        WHEN 'approved'   THEN 1
        WHEN 'completed'  THEN 2
        WHEN 'pending'    THEN 3
        ELSE 4
      END
    LIMIT 1;

    -- Determine status from booking
    IF v_booking_id IS NULL THEN
      v_slot_status := 'available';
    ELSIF v_expired THEN
      v_slot_status := 'available';
    ELSIF v_booking_status IN ('approved', 'completed') THEN
      v_slot_status := 'booked';
    ELSIF v_booking_status = 'pending' THEN
      v_slot_status := 'pending';
    ELSE
      v_slot_status := 'available';
    END IF;

    -- ✅ FIX: Compare p_date with PKT date (not CURRENT_DATE which is UTC)
    --         This is the core fix for the midnight-crossing timezone bug.
    IF p_date = v_pkt_date AND current_hour <= v_pkt_hour THEN
      v_slot_status := 'past';
    END IF;

    -- Return row
    RETURN QUERY SELECT
      current_hour AS slot_hour,
      LPAD(current_hour::TEXT, 2, '0') || ':00' AS slot_time,
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

COMMENT ON FUNCTION public.get_available_slots(DATE) IS
  'Returns 24-hour slot availability for a given date using PKT timezone. '
  'Past slots (current hour and earlier, PKT) are marked as past. '
  'Fix: Uses PKT date from NOW() AT TIME ZONE Asia/Karachi instead of CURRENT_DATE (UTC).';


-- ========================================
-- Also fix check_and_lock_slots
-- ========================================

CREATE OR REPLACE FUNCTION public.check_and_lock_slots(
  p_date       DATE,
  p_slot_hours INTEGER[]
)
RETURNS TABLE (
  slot_hour       INTEGER,
  is_available    BOOLEAN,
  conflict_reason TEXT
) AS $$
DECLARE
  v_hour        INTEGER;
  v_conflict    BOOLEAN;
  v_conflict_reason TEXT;
  -- ✅ FIX: Use PKT values
  v_pkt_date    DATE;
  v_pkt_hour    INTEGER;
BEGIN
  -- Clean up expired bookings first
  PERFORM cleanup_expired_pending_bookings();

  -- ✅ FIX: Derive PKT date and hour once
  v_pkt_date := (NOW() AT TIME ZONE 'Asia/Karachi')::DATE;
  v_pkt_hour := EXTRACT(HOUR FROM (NOW() AT TIME ZONE 'Asia/Karachi'))::INTEGER;

  FOREACH v_hour IN ARRAY p_slot_hours
  LOOP
    v_conflict        := false;
    v_conflict_reason := NULL;

    -- Check for booking conflicts (with row lock)
    SELECT EXISTS(
      SELECT 1 
      FROM booking_slots bs
      INNER JOIN bookings b ON b.id = bs.booking_id
      WHERE bs.slot_date = p_date
        AND bs.slot_hour = v_hour
        AND bs.status IN ('pending', 'booked')
        AND b.status IN ('pending', 'approved', 'completed')
        AND (b.pending_expires_at IS NULL OR b.pending_expires_at > NOW())
      FOR UPDATE
    ) INTO v_conflict;

    IF v_conflict THEN
      v_conflict_reason := 'Slot is already booked or pending';
    END IF;

    -- ✅ FIX: Use PKT date for past-slot check (not CURRENT_DATE which is UTC)
    IF p_date = v_pkt_date AND v_hour <= v_pkt_hour THEN
      v_conflict        := true;
      v_conflict_reason := 'Cannot book past time slots';
    END IF;

    RETURN QUERY SELECT 
      v_hour AS slot_hour,
      NOT v_conflict AS is_available,
      v_conflict_reason AS conflict_reason;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_and_lock_slots(DATE, INTEGER[]) IS
  'Checks and locks slots. Uses PKT timezone for past-slot detection.';


-- ========================================
-- Clean up any orphaned booking_slots
-- whose parent booking is cancelled or
-- whose pending expiry has passed
-- ========================================

-- Mark orphaned slots as 'cancelled' so they stop blocking
UPDATE booking_slots bs
SET    status = 'cancelled',
       updated_at = NOW()
FROM   bookings b
WHERE  b.id = bs.booking_id
  AND  bs.status IN ('pending', 'booked')
  AND  (
         b.status = 'cancelled'
    OR   (b.status = 'pending' AND b.pending_expires_at < NOW())
  );

-- Report how many were cleaned
DO $$
DECLARE v_count INTEGER;
BEGIN
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % orphaned booking_slot rows', v_count;
END;
$$;


-- ========================================
-- Force PostgREST schema reload
-- ========================================
NOTIFY pgrst, 'reload schema';


-- ========================================
-- Verification
-- ========================================

-- Run this to verify the fix works:
SELECT 
  'PKT NOW'                                             AS label,
  (NOW() AT TIME ZONE 'Asia/Karachi')::TEXT             AS pkt_time,
  (NOW() AT TIME ZONE 'Asia/Karachi')::DATE             AS pkt_date,
  CURRENT_DATE                                          AS utc_date,
  CASE 
    WHEN CURRENT_DATE != (NOW() AT TIME ZONE 'Asia/Karachi')::DATE
    THEN '⚠️ Date mismatch (midnight window) - fix was necessary!'
    ELSE '✅ Dates match - but fix is still correct for midnight window'
  END AS diagnosis;

-- Check today (PKT) slots
SELECT slot_hour, current_status, is_available
FROM get_available_slots((NOW() AT TIME ZONE 'Asia/Karachi')::DATE)
ORDER BY slot_hour;
