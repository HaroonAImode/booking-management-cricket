-- ========================================
-- FIX CALENDAR FUNCTIONS - Remove email references
-- ========================================
-- The email, address, and alternate_phone columns were removed
-- from customers table, but calendar functions still reference them.
-- This file updates the functions to remove those references.
-- ========================================

-- ========================================
-- 1. FIX GET_CALENDAR_BOOKINGS FUNCTION
-- ========================================

-- Drop the existing function first (required because return type changed)

DROP FUNCTION IF EXISTS get_calendar_bookings(DATE, DATE, TEXT);

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
  booking_date DATE,
  slot_hours INTEGER[],
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
    bs.slot_date AS booking_date,
    array_agg(bs.slot_hour ORDER BY bs.slot_hour) AS slot_hours,
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
  GROUP BY b.id, b.booking_number, c.id, c.name, c.phone, bs.slot_date, b.status, b.total_hours, b.total_amount, b.advance_payment, b.remaining_payment, b.advance_payment_method, b.created_at, b.pending_expires_at, b.customer_notes, b.admin_notes
  ORDER BY bs.slot_date, min(bs.slot_hour);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_calendar_bookings(DATE, DATE, TEXT) IS 'Returns bookings with slots for calendar view in date range (email field removed)';

-- ========================================
-- 2. FIX GET_BOOKING_DETAILS FUNCTION
-- ========================================

-- Drop the existing function first (required because return type changed)
DROP FUNCTION IF EXISTS get_booking_details(UUID);

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

COMMENT ON FUNCTION get_booking_details(UUID) IS 'Returns complete booking details with customer and slots (email/address/alternate_phone removed)';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================
-- Run these to test the functions work correctly:
-- SELECT * FROM get_calendar_bookings(CURRENT_DATE, CURRENT_DATE + INTERVAL '30 days', NULL);
-- SELECT get_booking_details('YOUR_BOOKING_ID_HERE'::UUID);

