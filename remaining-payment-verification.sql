-- ========================================
-- REMAINING PAYMENT VERIFICATION SYSTEM
-- ========================================
-- Description: SQL functions for remaining payment processing
-- Features:
-- - Upload remaining payment proof
-- - Auto-complete booking
-- - Update payment status
-- - Trigger notifications
-- ========================================

-- ========================================
-- 1. VERIFY REMAINING PAYMENT
-- ========================================

CREATE OR REPLACE FUNCTION verify_remaining_payment(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_proof_path TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_booking_number TEXT;
  v_remaining_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Get current booking details
  SELECT 
    booking_number,
    remaining_payment,
    status
  INTO v_booking_number, v_remaining_amount, v_current_status
  FROM bookings
  WHERE id = p_booking_id;

  -- Validate booking exists
  IF v_booking_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Validate booking is approved (not pending or already completed)
  IF v_current_status NOT IN ('approved') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking must be in approved status. Current status: ' || v_current_status
    );
  END IF;

  -- Validate there is remaining payment
  IF v_remaining_amount = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No remaining payment due for this booking'
    );
  END IF;

  -- Update booking with remaining payment details and mark as completed
  UPDATE bookings
  SET 
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = p_payment_proof_path,
    remaining_payment_date = NOW(),
    status = 'completed',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Update associated slots to completed
  UPDATE booking_slots
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE booking_id = p_booking_id;

  -- Create notification for customer
  INSERT INTO notifications (
    notification_type,
    title,
    message,
    booking_id,
    customer_id,
    priority
  )
  SELECT 
    'payment_completed',
    'Payment Completed',
    'Your remaining payment of Rs ' || v_remaining_amount::TEXT || ' for booking #' || v_booking_number || ' has been verified. Your booking is now complete.',
    p_booking_id,
    customer_id,
    'high'
  FROM bookings
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking_number,
    'remaining_amount', v_remaining_amount,
    'message', 'Remaining payment verified and booking marked as completed'
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION verify_remaining_payment(UUID, TEXT, TEXT, TEXT) IS 'Verifies remaining payment and marks booking as completed';

-- ========================================
-- 2. GET BOOKINGS WITH PENDING PAYMENTS
-- ========================================

CREATE OR REPLACE FUNCTION get_bookings_with_pending_payments()
RETURNS TABLE (
  booking_id UUID,
  booking_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  booking_date DATE,
  total_amount NUMERIC,
  advance_payment NUMERIC,
  remaining_payment NUMERIC,
  advance_payment_date TIMESTAMPTZ,
  days_since_booking INTEGER,
  status TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id AS booking_id,
    b.booking_number,
    c.name AS customer_name,
    c.phone AS customer_phone,
    b.booking_date,
    b.total_amount,
    b.advance_payment,
    b.remaining_payment,
    b.advance_payment_date,
    EXTRACT(DAY FROM NOW() - b.booking_date)::INTEGER AS days_since_booking,
    b.status
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  WHERE b.remaining_payment > 0
    AND b.status IN ('approved', 'completed')
    AND b.remaining_payment_date IS NULL
  ORDER BY b.booking_date DESC;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_bookings_with_pending_payments() IS 'Returns all bookings with outstanding remaining payments';

-- ========================================
-- 3. GET PAYMENT STATISTICS
-- ========================================

CREATE OR REPLACE FUNCTION get_payment_statistics()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'total_bookings', COUNT(*),
    'fully_paid', COUNT(*) FILTER (WHERE remaining_payment = 0),
    'partial_paid', COUNT(*) FILTER (WHERE remaining_payment > 0),
    'total_remaining_amount', COALESCE(SUM(remaining_payment), 0),
    'average_remaining', COALESCE(AVG(remaining_payment) FILTER (WHERE remaining_payment > 0), 0),
    'by_status', json_build_object(
      'pending', COUNT(*) FILTER (WHERE status = 'pending'),
      'approved', COUNT(*) FILTER (WHERE status = 'approved' AND remaining_payment > 0),
      'completed', COUNT(*) FILTER (WHERE status = 'completed')
    )
  ) INTO v_result
  FROM bookings
  WHERE status != 'cancelled';
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_payment_statistics() IS 'Returns comprehensive payment statistics for dashboard';

-- ========================================
-- 4. UPDATE DASHBOARD FUNCTION (Enhanced)
-- ========================================
-- This updates the existing get_dashboard_data to include payment completion stats

-- Note: Run this to enhance the existing dashboard function
CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'revenue_stats', (SELECT get_revenue_stats()),
    'pending_approvals', (SELECT get_pending_approvals_count()),
    'today_bookings', (SELECT get_today_bookings()),
    'last_7_days', (SELECT get_last_7_days_stats()),
    'monthly_summary', (SELECT get_monthly_summary()),
    'daily_bookings_chart', (SELECT get_daily_bookings_chart()),
    'daily_revenue_chart', (SELECT get_daily_revenue_chart()),
    'slot_usage_stats', (SELECT get_slot_usage_stats()),
    'recent_bookings', (SELECT get_recent_bookings()),
    'payment_stats', (SELECT get_payment_statistics())
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_data() IS 'Returns complete dashboard data including payment statistics';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Test verify remaining payment
-- SELECT verify_remaining_payment(
--   'BOOKING_ID_HERE'::UUID,
--   'cash',
--   'payment-proofs/remaining-payment-123.jpg',
--   'Remaining payment verified by admin'
-- );

-- Get bookings with pending payments
-- SELECT * FROM get_bookings_with_pending_payments();

-- Get payment statistics
-- SELECT get_payment_statistics();

-- ========================================
-- SETUP COMPLETE
-- ========================================
