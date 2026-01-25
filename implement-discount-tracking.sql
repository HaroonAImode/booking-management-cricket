-- ========================================
-- COMPREHENSIVE DISCOUNT TRACKING SYSTEM
-- ========================================
-- Purpose: Add proper discount tracking to bookings
-- Date: January 25, 2026
-- Features:
-- - Track discount amount separately
-- - Show discount in admin UI
-- - Exclude discount from revenue calculations
-- - Display discount history
-- ========================================

-- STEP 1: Add discount_amount column to bookings table
-- ========================================

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(10, 2) DEFAULT 0 NOT NULL;

COMMENT ON COLUMN bookings.discount_amount IS 'Total discount given on this booking (not counted in revenue)';

-- Add constraint to ensure discount is valid
ALTER TABLE bookings
ADD CONSTRAINT IF NOT EXISTS valid_discount CHECK (
  discount_amount >= 0 AND
  discount_amount <= total_amount
);

-- ========================================
-- STEP 2: Update verify_remaining_payment function to track discount
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
  discount_given NUMERIC;
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

  -- Calculate discount if payment is less than remaining
  discount_given := v_booking.remaining_payment - p_payment_amount;
  new_remaining := 0; -- If payment is being made, remaining becomes 0

  -- Update booking with remaining payment details and discount
  UPDATE bookings
  SET
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = COALESCE(p_payment_proof_path, remaining_payment_proof),
    remaining_payment_amount = COALESCE(remaining_payment_amount, 0) + p_payment_amount,
    remaining_payment = 0, -- Mark as fully paid
    discount_amount = COALESCE(discount_amount, 0) + discount_given, -- Track discount
    status = 'completed', -- Mark as completed
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Create notification when payment is completed
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
    format('Full payment verified for booking %s. Discount: Rs %s', 
           v_booking.booking_number, discount_given),
    p_booking_id,
    'normal'
  );

  -- Return success with details
  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking.booking_number,
    'payment_amount', p_payment_amount,
    'discount_given', discount_given,
    'new_remaining', new_remaining,
    'status', 'completed'
  );

EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object(
      'success', false,
      'error', SQLERRM
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION verify_remaining_payment IS 'Verifies remaining payment with automatic discount tracking';

-- ========================================
-- STEP 3: Update revenue calculation to exclude discounts
-- ========================================

CREATE OR REPLACE FUNCTION get_revenue_stats(
  p_start_date DATE DEFAULT NULL,
  p_end_date DATE DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_start_date DATE;
  v_end_date DATE;
  v_stats JSON;
BEGIN
  -- Default to current month if no dates provided
  v_start_date := COALESCE(p_start_date, DATE_TRUNC('month', CURRENT_DATE)::DATE);
  v_end_date := COALESCE(p_end_date, CURRENT_DATE);

  SELECT json_build_object(
    'period', json_build_object(
      'start_date', v_start_date,
      'end_date', v_end_date
    ),
    'total_bookings', COUNT(*),
    'completed_bookings', COUNT(*) FILTER (WHERE status = 'completed'),
    'pending_bookings', COUNT(*) FILTER (WHERE status IN ('pending', 'approved')),
    'cancelled_bookings', COUNT(*) FILTER (WHERE status = 'cancelled'),
    
    -- Revenue (actual cash received, excluding discounts)
    'total_revenue', COALESCE(SUM(
      CASE 
        WHEN status = 'completed' 
        THEN (advance_payment + COALESCE(remaining_payment_amount, 0))
        ELSE 0 
      END
    ), 0),
    
    -- Total discounts given
    'total_discounts', COALESCE(SUM(
      CASE 
        WHEN status = 'completed' 
        THEN COALESCE(discount_amount, 0)
        ELSE 0 
      END
    ), 0),
    
    -- Potential revenue (if no discounts)
    'potential_revenue', COALESCE(SUM(
      CASE 
        WHEN status = 'completed' 
        THEN total_amount
        ELSE 0 
      END
    ), 0),
    
    -- Pending revenue
    'pending_revenue', COALESCE(SUM(
      CASE 
        WHEN status IN ('pending', 'approved') 
        THEN remaining_payment
        ELSE 0 
      END
    ), 0)
  )
  INTO v_stats
  FROM bookings
  WHERE booking_date BETWEEN v_start_date AND v_end_date;

  RETURN v_stats;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_revenue_stats IS 'Calculate revenue statistics excluding discounts';

-- ========================================
-- STEP 4: Add helpful queries for discount tracking
-- ========================================

-- View all bookings with discounts
CREATE OR REPLACE VIEW bookings_with_discounts AS
SELECT 
  b.id,
  b.booking_number,
  b.booking_date,
  b.status,
  c.name as customer_name,
  c.phone as customer_phone,
  b.total_amount,
  b.advance_payment,
  b.remaining_payment_amount as remaining_paid,
  b.discount_amount,
  (b.advance_payment + COALESCE(b.remaining_payment_amount, 0)) as total_paid,
  (b.total_amount - b.advance_payment - COALESCE(b.remaining_payment_amount, 0)) as actual_remaining,
  CASE 
    WHEN b.discount_amount > 0 
    THEN ROUND((b.discount_amount / b.total_amount * 100), 2)
    ELSE 0
  END as discount_percentage
FROM bookings b
LEFT JOIN customers c ON c.id = b.customer_id
WHERE b.discount_amount > 0 OR b.status = 'completed'
ORDER BY b.booking_date DESC, b.discount_amount DESC;

COMMENT ON VIEW bookings_with_discounts IS 'Shows all bookings with discount information';

-- ========================================
-- STEP 5: Migrate existing data
-- ========================================

-- Calculate and set discount for existing completed bookings
UPDATE bookings
SET discount_amount = (
  total_amount - advance_payment - COALESCE(remaining_payment_amount, 0)
)
WHERE 
  status = 'completed'
  AND remaining_payment = 0
  AND (total_amount - advance_payment - COALESCE(remaining_payment_amount, 0)) > 0;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- 1. Check if discount_amount column exists
SELECT 
  column_name,
  data_type,
  column_default
FROM information_schema.columns
WHERE table_name = 'bookings' 
  AND column_name = 'discount_amount';

-- 2. Check verify_remaining_payment function
SELECT 
  routine_name,
  routine_type,
  data_type
FROM information_schema.routines
WHERE routine_name = 'verify_remaining_payment';

-- 3. Sample discount report
SELECT 
  booking_number,
  customer_name,
  total_amount,
  total_paid,
  discount_amount,
  discount_percentage || '%' as discount_pct
FROM bookings_with_discounts
WHERE discount_amount > 0
LIMIT 10;

-- 4. Revenue summary (excluding discounts)
SELECT 
  get_revenue_stats(
    DATE_TRUNC('month', CURRENT_DATE)::DATE,
    CURRENT_DATE
  );

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DISCOUNT TRACKING SYSTEM IMPLEMENTED';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Features Added:';
  RAISE NOTICE '  ✅ discount_amount column added to bookings';
  RAISE NOTICE '  ✅ verify_remaining_payment tracks discounts';
  RAISE NOTICE '  ✅ Revenue calculation excludes discounts';
  RAISE NOTICE '  ✅ Discount view for reporting';
  RAISE NOTICE '  ✅ Existing data migrated';
  RAISE NOTICE '';
  RAISE NOTICE 'How It Works:';
  RAISE NOTICE '  • Admin enters payment amount (can be less than remaining)';
  RAISE NOTICE '  • Discount = remaining_payment - payment_amount';
  RAISE NOTICE '  • Discount stored separately';
  RAISE NOTICE '  • Revenue = actual cash received (excludes discount)';
  RAISE NOTICE '  • Discount visible in booking details';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Discount tracking ready! 💰';
  RAISE NOTICE '========================================';
END $$;
