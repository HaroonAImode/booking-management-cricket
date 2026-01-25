-- ========================================
-- BUG FIXES FOR DEPLOYMENT ISSUES
-- ========================================
-- Description: Fix runtime errors after deployment
-- Date: January 25, 2026
-- ========================================

-- ========================================
-- 1. FIX verify_remaining_payment FUNCTION
-- ========================================
-- Remove booking_status enum cast that doesn't exist

CREATE OR REPLACE FUNCTION verify_remaining_payment(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_amount NUMERIC,
  p_payment_proof_path TEXT DEFAULT NULL,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_booking RECORD;
  v_result JSON;
BEGIN
  -- Get booking details
  SELECT *
  INTO v_booking
  FROM bookings
  WHERE id = p_booking_id;

  -- Validate booking exists
  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Validate booking status
  IF v_booking.status != 'approved' THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Only approved bookings can have payment verified'
    );
  END IF;

  -- Validate remaining payment
  IF v_booking.remaining_payment <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No remaining payment due for this booking'
    );
  END IF;

  -- Validate payment amount
  IF p_payment_amount > v_booking.remaining_payment THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Payment amount (Rs %s) cannot exceed remaining amount (Rs %s)', 
                     p_payment_amount, v_booking.remaining_payment)
    );
  END IF;

  -- Update booking with remaining payment details
  UPDATE bookings
  SET
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = COALESCE(p_payment_proof_path, remaining_payment_proof),
    remaining_payment_amount = p_payment_amount,
    -- Calculate new remaining payment after this payment
    remaining_payment = remaining_payment - p_payment_amount,
    -- Mark as completed if fully paid (NO ENUM CAST)
    status = CASE 
      WHEN (remaining_payment - p_payment_amount) <= 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Create notification for payment completed
  IF (v_booking.remaining_payment - p_payment_amount) <= 0 THEN
    INSERT INTO notifications (
      user_id,
      notification_type,
      title,
      message,
      booking_id,
      booking_number,
      customer_name,
      priority
    )
    SELECT
      (SELECT id FROM users WHERE role IN ('admin', 'super_admin') LIMIT 1),
      'payment_completed',
      'Payment Completed',
      format('Remaining payment of Rs %s verified for booking %s', 
             p_payment_amount, v_booking.booking_number),
      p_booking_id,
      v_booking.booking_number,
      (SELECT name FROM customers WHERE id = v_booking.customer_id),
      'normal';
  END IF;

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking.booking_number,
    'remaining_amount', p_payment_amount,
    'new_remaining', v_booking.remaining_payment - p_payment_amount,
    'status', CASE 
      WHEN (v_booking.remaining_payment - p_payment_amount) <= 0 THEN 'completed'
      ELSE v_booking.status
    END
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================================
-- VERIFICATION
-- ========================================

SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'verify_remaining_payment';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'BUG FIXES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✓ Removed booking_status enum cast';
  RAISE NOTICE '  ✓ verify_remaining_payment function updated';
  RAISE NOTICE '========================================';
END $$;
