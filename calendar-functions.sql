-- ========================================
-- CALENDAR VIEW FUNCTIONS
-- ========================================
-- Description: SQL functions for calendar view
-- Features:
-- - Get bookings with slots in date range
-- - Optimized for calendar rendering
-- - Status filtering
-- - Performance indexes
-- ========================================

-- ========================================
-- 1. GET CALENDAR EVENTS
-- ========================================

CREATE OR REPLACE FUNCTION get_calendar_bookings(
  p_start_date DATE,
  p_end_date DATE,
  p_status TEXT DEFAULT NULL
)
RETURNS TABLE (
  booking_id UUID,
  booking_number TEXT,
  customer_id UUID,
  customer_name TEXT,
  customer_phone TEXT,
  customer_email TEXT,
  booking_date DATE,
  slot_hour INTEGER,
  slot_time TIME,
  is_night_rate BOOLEAN,
  hourly_rate NUMERIC,
  status TEXT,
  total_hours INTEGER,
  total_amount NUMERIC,
  advance_payment NUMERIC,
  remaining_payment NUMERIC,
  advance_payment_method TEXT,
  created_at TIMESTAMPTZ,
  pending_expires_at TIMESTAMPTZ,
  customer_notes TEXT,
  admin_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    b.booking_number,
    c.id AS customer_id,
    c.name AS customer_name,
    c.phone AS customer_phone,
    c.email AS customer_email,
    bs.slot_date AS booking_date,
    bs.slot_hour,
    bs.slot_time,
    bs.is_night_rate,
    bs.hourly_rate,
    b.status,
    b.total_hours,
    b.total_amount,
    b.advance_payment,
    b.remaining_payment,
    b.advance_payment_method,
    b.created_at,
    b.pending_expires_at,
    b.customer_notes,
    b.admin_notes
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  JOIN booking_slots bs ON bs.booking_id = b.id
  WHERE bs.slot_date >= p_start_date
    AND bs.slot_date <= p_end_date
    AND (p_status IS NULL OR b.status = p_status)
    AND b.status != 'cancelled'
  ORDER BY bs.slot_date, bs.slot_hour;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_calendar_bookings(DATE, DATE, TEXT) IS 'Returns bookings with slots for calendar view in date range';

-- ========================================
-- 2. GET BOOKING FULL DETAILS
-- ========================================

CREATE OR REPLACE FUNCTION get_booking_details(p_booking_id UUID)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'booking', json_build_object(
      'id', b.id,
      'booking_number', b.booking_number,
      'booking_date', b.booking_date,
      'total_hours', b.total_hours,
      'total_amount', b.total_amount,
      'advance_payment', b.advance_payment,
      'remaining_payment', b.remaining_payment,
      'advance_payment_method', b.advance_payment_method,
      'advance_payment_proof', b.advance_payment_proof,
      'advance_payment_date', b.advance_payment_date,
      'remaining_payment_method', b.remaining_payment_method,
      'remaining_payment_proof', b.remaining_payment_proof,
      'remaining_payment_date', b.remaining_payment_date,
      'status', b.status,
      'customer_notes', b.customer_notes,
      'admin_notes', b.admin_notes,
      'created_at', b.created_at,
      'updated_at', b.updated_at,
      'pending_expires_at', b.pending_expires_at,
      'approved_at', b.approved_at,
      'cancelled_at', b.cancelled_at,
      'cancelled_reason', b.cancelled_reason
    ),
    'customer', json_build_object(
      'id', c.id,
      'name', c.name,
      'phone', c.phone,
      'email', c.email,
      'address', c.address,
      'alternate_phone', c.alternate_phone,
      'total_bookings', c.total_bookings
    ),
    'slots', (
      SELECT json_agg(
        json_build_object(
          'id', bs.id,
          'slot_date', bs.slot_date,
          'slot_time', bs.slot_time,
          'slot_hour', bs.slot_hour,
          'is_night_rate', bs.is_night_rate,
          'hourly_rate', bs.hourly_rate,
          'status', bs.status
        ) ORDER BY bs.slot_hour
      )
      FROM booking_slots bs
      WHERE bs.booking_id = b.id
    )
  ) INTO v_result
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.id = p_booking_id;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_booking_details(UUID) IS 'Returns complete booking details with customer and slots';

-- ========================================
-- 3. APPROVE BOOKING
-- ========================================

CREATE OR REPLACE FUNCTION approve_booking(
  p_booking_id UUID,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_booking_number TEXT;
BEGIN
  -- Update booking status
  UPDATE bookings
  SET 
    status = 'approved',
    approved_at = NOW(),
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    pending_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id
    AND status = 'pending'
  RETURNING booking_number INTO v_booking_number;

  IF v_booking_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or already processed'
    );
  END IF;

  -- Update associated slots
  UPDATE booking_slots
  SET 
    status = 'booked',
    updated_at = NOW()
  WHERE booking_id = p_booking_id;

  -- Create notification
  INSERT INTO notifications (
    notification_type,
    title,
    message,
    booking_id,
    customer_id,
    priority
  )
  SELECT 
    'booking_approved',
    'Booking Approved',
    'Your booking #' || v_booking_number || ' has been approved by admin.',
    p_booking_id,
    customer_id,
    'high'
  FROM bookings
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking_number,
    'message', 'Booking approved successfully'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION approve_booking(UUID, TEXT) IS 'Approves a pending booking and updates related records';

-- ========================================
-- 4. REJECT/CANCEL BOOKING
-- ========================================

CREATE OR REPLACE FUNCTION reject_booking(
  p_booking_id UUID,
  p_reason TEXT
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_booking_number TEXT;
BEGIN
  -- Update booking status
  UPDATE bookings
  SET 
    status = 'cancelled',
    cancelled_at = NOW(),
    cancelled_reason = p_reason,
    pending_expires_at = NULL,
    updated_at = NOW()
  WHERE id = p_booking_id
    AND status IN ('pending', 'approved')
  RETURNING booking_number INTO v_booking_number;

  IF v_booking_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found or already cancelled'
    );
  END IF;

  -- Update associated slots
  UPDATE booking_slots
  SET 
    status = 'cancelled',
    updated_at = NOW()
  WHERE booking_id = p_booking_id;

  -- Create notification
  INSERT INTO notifications (
    notification_type,
    title,
    message,
    booking_id,
    customer_id,
    priority
  )
  SELECT 
    'booking_cancelled',
    'Booking Cancelled',
    'Your booking #' || v_booking_number || ' has been cancelled. Reason: ' || p_reason,
    p_booking_id,
    customer_id,
    'high'
  FROM bookings
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking_number,
    'message', 'Booking cancelled successfully'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION reject_booking(UUID, TEXT) IS 'Cancels a booking with reason and sends notification';

-- ========================================
-- 5. GET SLOT AVAILABILITY FOR DATE
-- ========================================

CREATE OR REPLACE FUNCTION get_date_slot_summary(p_date DATE)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'date', p_date,
    'total_slots', 24,
    'booked_slots', COUNT(*) FILTER (WHERE status IN ('pending', 'booked')),
    'available_slots', 24 - COUNT(*) FILTER (WHERE status IN ('pending', 'booked')),
    'pending_slots', COUNT(*) FILTER (WHERE status = 'pending'),
    'confirmed_slots', COUNT(*) FILTER (WHERE status = 'booked'),
    'slots', json_agg(
      json_build_object(
        'hour', slot_hour,
        'status', status
      ) ORDER BY slot_hour
    )
  ) INTO v_result
  FROM booking_slots
  WHERE slot_date = p_date;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_date_slot_summary(DATE) IS 'Returns slot availability summary for a specific date';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Test calendar bookings
-- SELECT * FROM get_calendar_bookings(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', NULL);

-- Test with status filter
-- SELECT * FROM get_calendar_bookings(CURRENT_DATE, CURRENT_DATE + INTERVAL '7 days', 'pending');

-- Test booking details
-- SELECT get_booking_details('BOOKING_ID_HERE'::UUID);

-- Test date summary
-- SELECT get_date_slot_summary(CURRENT_DATE);

-- ========================================
-- INDEXES FOR PERFORMANCE
-- ========================================

-- Index for calendar date range queries
CREATE INDEX IF NOT EXISTS booking_slots_date_range_idx 
ON booking_slots(slot_date, slot_hour) 
WHERE status IN ('pending', 'booked');

-- Index for booking status queries
CREATE INDEX IF NOT EXISTS bookings_status_date_idx 
ON bookings(status, booking_date) 
WHERE status != 'cancelled';

COMMENT ON INDEX booking_slots_date_range_idx IS 'Optimizes calendar view queries by date range';
COMMENT ON INDEX bookings_status_date_idx IS 'Optimizes status filtering in calendar view';

-- ========================================
-- SETUP COMPLETE
-- ========================================
