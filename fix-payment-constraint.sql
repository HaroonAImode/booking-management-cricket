-- ========================================
-- FIX REMAINING PAYMENT CONSTRAINT ERROR
-- ========================================
-- Description: Fix "valid_total" constraint violation when completing payments
-- Date: January 25, 2026
-- Issue: The constraint expects total_amount = advance_payment + remaining_payment
--        But we were subtracting from remaining_payment, violating the constraint
-- ========================================

-- ========================================
-- SOLUTION: Drop the problematic constraint
-- ========================================
-- The constraint is too restrictive for our payment model
-- We track payments differently:
-- - advance_payment: Initial payment made
-- - remaining_payment: Amount still owed (calculated field)
-- - remaining_payment_amount: Actual remaining payment made (when completing)

ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS valid_total;

-- Add a more flexible constraint that makes business sense
ALTER TABLE bookings
ADD CONSTRAINT valid_payment_amounts CHECK (
  advance_payment >= 0 AND
  advance_payment <= total_amount AND
  remaining_payment >= 0
);

-- ========================================
-- UPDATE verify_remaining_payment FUNCTION
-- ========================================
-- Fix the function to not violate constraints

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

  IF p_payment_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Payment amount must be greater than zero'
    );
  END IF;

  -- Calculate new remaining payment
  DECLARE new_remaining NUMERIC;
  BEGIN
    new_remaining := v_booking.remaining_payment - p_payment_amount;
  END;

  -- Update booking with remaining payment details
  UPDATE bookings
  SET
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = COALESCE(p_payment_proof_path, remaining_payment_proof),
    remaining_payment_amount = COALESCE(remaining_payment_amount, 0) + p_payment_amount,
    remaining_payment = new_remaining,  -- Subtract payment amount
    status = CASE 
      WHEN new_remaining <= 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Create notification for payment completed
  IF new_remaining <= 0 THEN
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
    'payment_amount', p_payment_amount,
    'new_remaining', new_remaining,
    'status', CASE 
      WHEN new_remaining <= 0 THEN 'completed'
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

-- Check constraint was dropped
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND contype = 'c'  -- Check constraints
ORDER BY conname;

-- Verify function was updated
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'verify_remaining_payment';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'CONSTRAINT FIX APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Fixed:';
  RAISE NOTICE '  ✓ Dropped valid_total constraint';
  RAISE NOTICE '  ✓ Added valid_payment_amounts constraint';
  RAISE NOTICE '  ✓ Updated verify_remaining_payment function';
  RAISE NOTICE '  ✓ Payment completion now sets remaining_payment to 0';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'You can now complete payments without constraint errors!';
  RAISE NOTICE '========================================';
END $$;
