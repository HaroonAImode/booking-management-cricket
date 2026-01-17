-- ========================================
-- FIX REMAINING PAYMENT COMPLETION
-- ========================================
-- Issue 1: verify_remaining_payment doesn't zero out remaining_payment amount
-- Issue 2: Function needs SECURITY DEFINER to bypass RLS
-- Date: January 17, 2026
-- ========================================

-- Drop and recreate the verify_remaining_payment function with fixes
CREATE OR REPLACE FUNCTION verify_remaining_payment(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_proof_path TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- Add SECURITY DEFINER to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_booking_number TEXT;
  v_remaining_amount NUMERIC;
  v_advance_payment NUMERIC;
  v_total_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Get current booking details
  SELECT 
    booking_number,
    remaining_payment,
    advance_payment,
    total_amount,
    status
  INTO 
    v_booking_number, 
    v_remaining_amount, 
    v_advance_payment,
    v_total_amount,
    v_current_status
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

  -- Update booking: Move remaining_payment to advance_payment and mark as completed
  UPDATE bookings
  SET 
    advance_payment = v_total_amount,  -- Set advance to total (fully paid)
    remaining_payment = 0,              -- Zero out remaining
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = p_payment_proof_path,
    remaining_payment_date = NOW(),
    is_fully_paid = true,              -- Mark as fully paid
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
$$;

COMMENT ON FUNCTION verify_remaining_payment(UUID, TEXT, TEXT, TEXT) IS 'Verifies remaining payment, zeros out remaining amount, and marks booking as completed';

-- ========================================
-- VERIFICATION
-- ========================================
-- Test the function (replace with actual booking ID):
-- SELECT verify_remaining_payment(
--   'YOUR_BOOKING_ID_HERE'::UUID,
--   'cash',
--   'payment-proofs/2026-01-17/test.jpg',
--   'Payment received and verified'
-- );
-- ========================================
