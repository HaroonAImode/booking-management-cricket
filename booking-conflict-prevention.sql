-- ========================================
-- BOOKING CONFLICT PREVENTION SYSTEM
-- ========================================
-- Description: Database-level mechanisms to prevent double booking
-- Features:
-- - Atomic slot reservation
-- - Race condition prevention
-- - Auto-release pending slots after timeout
-- - Transaction-safe booking creation
-- ========================================

-- ========================================
-- 1. ADD TIMEOUT COLUMN TO BOOKINGS
-- ========================================

-- Add column to track when pending bookings expire
ALTER TABLE bookings 
ADD COLUMN IF NOT EXISTS pending_expires_at TIMESTAMPTZ;

-- Index for quick lookup of expired bookings
CREATE INDEX IF NOT EXISTS bookings_pending_expires_idx 
ON bookings(pending_expires_at) 
WHERE status = 'pending' AND pending_expires_at IS NOT NULL;

COMMENT ON COLUMN bookings.pending_expires_at IS 'Timestamp when pending booking expires and slots are auto-released';

-- ========================================
-- 2. UPDATE BOOKING CREATION TO SET EXPIRY
-- ========================================

-- Function: Set pending expiry time on new bookings
CREATE OR REPLACE FUNCTION set_pending_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- Set expiry to 30 minutes from now for pending bookings
  IF NEW.status = 'pending' THEN
    NEW.pending_expires_at := NOW() + INTERVAL '30 minutes';
  ELSE
    -- Clear expiry if booking is approved/completed
    NEW.pending_expires_at := NULL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS set_pending_expiry_trigger ON bookings;

-- Create trigger on INSERT and UPDATE
CREATE TRIGGER set_pending_expiry_trigger
  BEFORE INSERT OR UPDATE ON bookings
  FOR EACH ROW
  EXECUTE FUNCTION set_pending_expiry();

COMMENT ON FUNCTION set_pending_expiry() IS 'Automatically sets expiry time for pending bookings (30 minutes)';

-- ========================================
-- 3. FUNCTION TO RELEASE EXPIRED PENDING SLOTS
-- ========================================

CREATE OR REPLACE FUNCTION release_expired_pending_slots()
RETURNS TABLE (
  released_booking_id UUID,
  released_booking_number TEXT,
  expired_at TIMESTAMPTZ
) AS $$
BEGIN
  -- Find expired pending bookings
  RETURN QUERY
  WITH expired_bookings AS (
    SELECT 
      id,
      booking_number,
      pending_expires_at
    FROM bookings
    WHERE status = 'pending'
      AND pending_expires_at IS NOT NULL
      AND pending_expires_at < NOW()
  ),
  -- Update booking status to cancelled
  updated_bookings AS (
    UPDATE bookings
    SET 
      status = 'cancelled',
      cancelled_reason = 'Auto-cancelled: Pending timeout expired (not approved within 30 minutes)',
      cancelled_at = NOW(),
      pending_expires_at = NULL,
      updated_at = NOW()
    WHERE id IN (SELECT id FROM expired_bookings)
    RETURNING id, booking_number, pending_expires_at
  ),
  -- Update associated slots to cancelled
  updated_slots AS (
    UPDATE booking_slots
    SET 
      status = 'cancelled',
      updated_at = NOW()
    WHERE booking_id IN (SELECT id FROM expired_bookings)
    RETURNING booking_id
  )
  -- Return released bookings
  SELECT 
    id,
    booking_number,
    pending_expires_at
  FROM updated_bookings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION release_expired_pending_slots() IS 'Releases slots from bookings that have been pending for more than 30 minutes';

-- ========================================
-- 4. FUNCTION TO CHECK SLOT AVAILABILITY (ATOMIC)
-- ========================================

CREATE OR REPLACE FUNCTION check_and_reserve_slots(
  p_slot_date DATE,
  p_slot_hours INTEGER[]
)
RETURNS TABLE (
  available BOOLEAN,
  conflicting_slots JSONB
) AS $$
DECLARE
  v_conflicts JSONB;
BEGIN
  -- Check for existing slots with same date/time
  SELECT jsonb_agg(
    jsonb_build_object(
      'slot_hour', slot_hour,
      'slot_time', slot_time,
      'status', status,
      'booking_id', booking_id
    )
  ) INTO v_conflicts
  FROM booking_slots
  WHERE slot_date = p_slot_date
    AND slot_hour = ANY(p_slot_hours)
    AND status IN ('pending', 'booked');

  -- Return availability status
  IF v_conflicts IS NULL THEN
    RETURN QUERY SELECT true AS available, '[]'::JSONB AS conflicting_slots;
  ELSE
    RETURN QUERY SELECT false AS available, v_conflicts AS conflicting_slots;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_and_reserve_slots(DATE, INTEGER[]) IS 'Atomically checks if slots are available before booking';

-- ========================================
-- 5. ENHANCED BOOKING CREATION FUNCTION
-- ========================================

CREATE OR REPLACE FUNCTION create_booking_with_slots(
  -- Customer data (required)
  p_customer_name TEXT,
  p_customer_phone TEXT,
  -- Booking data (required)
  p_booking_date DATE,
  p_total_hours INTEGER,
  p_total_amount NUMERIC,
  p_advance_payment NUMERIC,
  p_advance_payment_method TEXT,
  p_advance_payment_proof TEXT,
  -- Slots data (required)
  p_slots JSONB, -- Array of {slot_hour, slot_time, is_night_rate, hourly_rate}
  -- Optional parameters (with defaults)
  p_customer_email TEXT DEFAULT NULL,
  p_customer_address TEXT DEFAULT NULL,
  p_customer_alternate_phone TEXT DEFAULT NULL,
  p_customer_notes TEXT DEFAULT NULL
)
RETURNS TABLE (
  success BOOLEAN,
  booking_id UUID,
  booking_number TEXT,
  error_message TEXT
) AS $$
DECLARE
  v_customer_id UUID;
  v_booking_id UUID;
  v_booking_number TEXT;
  v_slot JSONB;
  v_slot_hours INTEGER[];
  v_conflicts JSONB;
  v_is_available BOOLEAN;
BEGIN
  -- Extract slot hours for conflict check
  SELECT array_agg((slot->>'slot_hour')::INTEGER)
  INTO v_slot_hours
  FROM jsonb_array_elements(p_slots) AS slot;

  -- Step 1: Check slot availability (atomic check)
  SELECT * INTO v_is_available, v_conflicts
  FROM check_and_reserve_slots(p_booking_date, v_slot_hours);

  IF NOT v_is_available THEN
    RETURN QUERY SELECT 
      false AS success,
      NULL::UUID AS booking_id,
      NULL::TEXT AS booking_number,
      'Slot conflict: Some selected slots are no longer available' AS error_message;
    RETURN;
  END IF;

  -- Step 2: Create or find customer
  -- Check if customer exists by phone
  SELECT id INTO v_customer_id
  FROM customers
  WHERE phone = p_customer_phone
  LIMIT 1;

  IF v_customer_id IS NULL THEN
    -- Create new customer
    INSERT INTO customers (name, phone, email, address, alternate_phone)
    VALUES (p_customer_name, p_customer_phone, p_customer_email, p_customer_address, p_customer_alternate_phone)
    RETURNING id INTO v_customer_id;
  ELSE
    -- Update existing customer info
    UPDATE customers
    SET 
      name = p_customer_name,
      email = COALESCE(p_customer_email, email),
      address = COALESCE(p_customer_address, address),
      alternate_phone = COALESCE(p_customer_alternate_phone, alternate_phone),
      updated_at = NOW()
    WHERE id = v_customer_id;
  END IF;

  -- Step 3: Create booking
  INSERT INTO bookings (
    customer_id,
    booking_date,
    total_hours,
    total_amount,
    advance_payment,
    advance_payment_method,
    advance_payment_proof,
    advance_payment_date,
    remaining_payment,
    customer_notes,
    status
  ) VALUES (
    v_customer_id,
    p_booking_date,
    p_total_hours,
    p_total_amount,
    p_advance_payment,
    p_advance_payment_method,
    p_advance_payment_proof,
    NOW(),
    p_total_amount - p_advance_payment,
    p_customer_notes,
    'pending'
  )
  RETURNING bookings.id, bookings.booking_number INTO v_booking_id, v_booking_number;

  -- Step 4: Create booking slots (atomic batch insert)
  FOR v_slot IN SELECT * FROM jsonb_array_elements(p_slots)
  LOOP
    BEGIN
      INSERT INTO booking_slots (
        booking_id,
        slot_date,
        slot_time,
        slot_hour,
        is_night_rate,
        hourly_rate,
        status
      ) VALUES (
        v_booking_id,
        p_booking_date,
        (v_slot->>'slot_time')::TIME,
        (v_slot->>'slot_hour')::INTEGER,
        (v_slot->>'is_night_rate')::BOOLEAN,
        (v_slot->>'hourly_rate')::NUMERIC,
        'pending'
      );
    EXCEPTION
      WHEN unique_violation THEN
        -- Slot was booked by someone else in race condition
        -- Rollback by deleting the booking
        DELETE FROM bookings WHERE id = v_booking_id;
        RETURN QUERY SELECT 
          false AS success,
          NULL::UUID AS booking_id,
          NULL::TEXT AS booking_number,
          'Slot conflict: One or more slots were just booked by another customer' AS error_message;
        RETURN;
    END;
  END LOOP;

  -- Success!
  RETURN QUERY SELECT 
    true AS success,
    v_booking_id AS booking_id,
    v_booking_number AS booking_number,
    NULL::TEXT AS error_message;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION create_booking_with_slots IS 'Atomically creates booking with conflict prevention and automatic rollback';

-- ========================================
-- 6. NOTIFICATION FOR RELEASED SLOTS
-- ========================================

CREATE OR REPLACE FUNCTION notify_released_slots()
RETURNS TRIGGER AS $$
BEGIN
  -- Create notification when booking is auto-cancelled due to timeout
  IF NEW.status = 'cancelled' 
     AND NEW.cancelled_reason LIKE '%timeout%' 
     AND OLD.status = 'pending' THEN
    
    INSERT INTO notifications (
      notification_type,
      title,
      message,
      booking_id,
      customer_id,
      priority
    ) VALUES (
      'system',
      'Booking Auto-Cancelled',
      'Booking #' || NEW.booking_number || ' was automatically cancelled due to pending timeout. Slots have been released.',
      NEW.id,
      NEW.customer_id,
      'low'
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS notify_released_slots_trigger ON bookings;

CREATE TRIGGER notify_released_slots_trigger
  AFTER UPDATE ON bookings
  FOR EACH ROW
  WHEN (NEW.status = 'cancelled' AND OLD.status = 'pending')
  EXECUTE FUNCTION notify_released_slots();

-- ========================================
-- 7. SCHEDULED CLEANUP JOB SIMULATION
-- ========================================

-- Function to be called periodically (e.g., via cron job or scheduler)
CREATE OR REPLACE FUNCTION cleanup_expired_bookings()
RETURNS TABLE (
  total_released INTEGER,
  released_bookings JSONB
) AS $$
DECLARE
  v_released JSONB;
  v_count INTEGER;
BEGIN
  -- Call release function and collect results
  SELECT 
    COUNT(*)::INTEGER,
    jsonb_agg(
      jsonb_build_object(
        'booking_id', released_booking_id,
        'booking_number', released_booking_number,
        'expired_at', expired_at
      )
    )
  INTO v_count, v_released
  FROM release_expired_pending_slots();

  RETURN QUERY SELECT 
    COALESCE(v_count, 0) AS total_released,
    COALESCE(v_released, '[]'::JSONB) AS released_bookings;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_bookings() IS 'Wrapper function for scheduled cleanup of expired pending bookings';

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Check bookings with pending expiry
SELECT 
  booking_number,
  status,
  pending_expires_at,
  CASE 
    WHEN pending_expires_at < NOW() THEN 'EXPIRED'
    WHEN pending_expires_at > NOW() THEN 'ACTIVE'
    ELSE 'N/A'
  END AS expiry_status,
  EXTRACT(EPOCH FROM (pending_expires_at - NOW()))/60 AS minutes_remaining
FROM bookings
WHERE status = 'pending'
ORDER BY pending_expires_at;

-- Manually trigger cleanup (for testing)
-- SELECT * FROM cleanup_expired_bookings();

-- Check slot conflicts
SELECT 
  slot_date,
  slot_hour,
  COUNT(*) as booking_count,
  array_agg(booking_id) as booking_ids,
  array_agg(status) as statuses
FROM booking_slots
GROUP BY slot_date, slot_hour
HAVING COUNT(*) > 1
ORDER BY slot_date, slot_hour;

-- ========================================
-- SETUP COMPLETE
-- ========================================

-- Note: The UNIQUE constraint on booking_slots(slot_date, slot_time) 
-- prevents double booking at the database level.
-- Combined with the atomic transaction handling in create_booking_with_slots(),
-- this provides robust protection against race conditions.

-- To enable automatic cleanup, set up a cron job or use pg_cron extension:
-- SELECT cron.schedule('cleanup-expired-bookings', '*/5 * * * *', 'SELECT cleanup_expired_bookings()');
