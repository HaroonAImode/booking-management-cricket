-- ========================================
-- FIX REMAINING PAYMENT CONSTRAINT ERROR (CORRECTED VERSION)
-- ========================================
-- Description: Fix "valid_total" constraint violation when completing payments
-- Date: January 25, 2026
-- Issue: The constraint expects total_amount = advance_payment + remaining_payment
--        But we were subtracting from remaining_payment, violating the constraint
-- ========================================

-- ========================================
-- STEP 1: Drop old constraints and add new ones
-- ========================================

-- Drop old constraints if they exist
ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS valid_total;

ALTER TABLE bookings 
DROP CONSTRAINT IF EXISTS valid_payment_amounts;

-- Add the flexible constraint
ALTER TABLE bookings
ADD CONSTRAINT valid_payment_amounts CHECK (
  advance_payment >= 0 AND
  advance_payment <= total_amount AND
  remaining_payment >= 0
);

-- ========================================
-- STEP 2: Update verify_remaining_payment function
-- ========================================

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
  new_remaining NUMERIC;
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

  -- Validate remaining payment exists
  IF v_booking.remaining_payment <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No remaining payment due for this booking'
    );
  END IF;

  -- Validate payment amount
  IF p_payment_amount <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Payment amount must be greater than zero'
    );
  END IF;

  IF p_payment_amount > v_booking.remaining_payment THEN
    RETURN json_build_object(
      'success', false,
      'error', format('Payment amount (Rs %s) cannot exceed remaining amount (Rs %s)', 
                     p_payment_amount, v_booking.remaining_payment)
    );
  END IF;

  -- Calculate new remaining payment
  new_remaining := v_booking.remaining_payment - p_payment_amount;

  -- Update booking with remaining payment details
  UPDATE bookings
  SET
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = COALESCE(p_payment_proof_path, remaining_payment_proof),
    remaining_payment_amount = COALESCE(remaining_payment_amount, 0) + p_payment_amount,
    remaining_payment = v_booking.remaining_payment - p_payment_amount,
    status = CASE 
      WHEN (v_booking.remaining_payment - p_payment_amount) <= 0 THEN 'completed'
      ELSE status
    END,
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Create notification only when payment is fully completed
  IF new_remaining <= 0 THEN
      INSERT INTO notifications (
        customer_id,
        notification_type,
        title,
        message,
        booking_id,
        priority
      )
      VALUES (
        v_booking.customer_id,
        'payment_completed',
        'Payment Completed',
        format('Full payment of Rs %s verified for booking %s', 
               v_booking.total_amount, v_booking.booking_number),
        p_booking_id,
        'normal'
      );
  END IF;

  -- Return success with actual values
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
-- VERIFICATION QUERIES
-- ========================================

-- Check constraints on bookings table
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'bookings'::regclass
  AND contype = 'c'
ORDER BY conname;

-- Verify function exists and returns correct type
SELECT 
  routine_name, 
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'verify_remaining_payment';

-- Test the function logic (read-only check)
SELECT 
  id,
  booking_number,
  total_amount,
  advance_payment,
  remaining_payment,
  status
FROM bookings
WHERE status = 'approved' AND remaining_payment > 0
LIMIT 5;

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PAYMENT CONSTRAINT FIX COMPLETED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Changes Applied:';
  RAISE NOTICE '  ✅ Dropped restrictive valid_total constraint';
  RAISE NOTICE '  ✅ Added flexible valid_payment_amounts constraint';
  RAISE NOTICE '  ✅ Updated verify_remaining_payment function';
  RAISE NOTICE '';
  RAISE NOTICE 'Function Features:';
  RAISE NOTICE '  • Supports partial remaining payments';
  RAISE NOTICE '  • Tracks accumulated payment amounts';
  RAISE NOTICE '  • Updates status to completed when fully paid';
  RAISE NOTICE '  • Creates notification only when booking completes';
  RAISE NOTICE '  • Returns accurate remaining balance';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Ready to accept payments without errors! 🎉';
  RAISE NOTICE '========================================';
END $$;
