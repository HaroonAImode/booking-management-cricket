-- ========================================
-- COMPREHENSIVE UPDATES SQL MIGRATION
-- ========================================
-- Description: SQL updates for all new features
-- Date: January 25, 2026
-- ========================================

-- ========================================
-- 1. ADD REMAINING_PAYMENT_AMOUNT COLUMN
-- ========================================
-- This tracks the actual amount paid for remaining payment
-- (useful for discounts)

ALTER TABLE bookings
ADD COLUMN IF NOT EXISTS remaining_payment_amount NUMERIC(10, 2) DEFAULT 0;

COMMENT ON COLUMN bookings.remaining_payment_amount IS 'Actual amount paid for remaining payment (may be less than calculated remaining_payment due to discounts)';

-- ========================================
-- 2. UPDATE VERIFY_REMAINING_PAYMENT FUNCTION
-- ========================================
-- Updated to handle custom payment amounts with discount support

-- Drop old function first (if exists)
DROP FUNCTION IF EXISTS verify_remaining_payment(UUID, TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS verify_remaining_payment(UUID, TEXT);

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
    -- Mark as completed if fully paid
    status = CASE 
      WHEN (remaining_payment - p_payment_amount) <= 0 THEN 'completed'::booking_status
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

COMMENT ON FUNCTION verify_remaining_payment IS 'Verifies remaining payment with support for custom amounts (discounts)';

-- ========================================
-- 3. UPDATE REVENUE STATS TO SHOW ONLY ACTUAL PAYMENTS
-- ========================================
-- Only count advance + actual remaining payments received

CREATE OR REPLACE FUNCTION get_revenue_stats()
RETURNS TABLE (
  total_revenue NUMERIC,
  total_advance_received NUMERIC,
  total_remaining_payment NUMERIC,
  pending_revenue NUMERIC,
  confirmed_revenue NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    -- Total revenue = advance + actual remaining payments received
    COALESCE(SUM(b.advance_payment), 0) + 
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.remaining_payment_amount ELSE 0 END), 0) AS total_revenue,
    
    COALESCE(SUM(b.advance_payment), 0) AS total_advance_received,
    
    -- Total remaining = unpaid remaining only
    COALESCE(SUM(CASE WHEN b.status = 'approved' THEN b.remaining_payment ELSE 0 END), 0) AS total_remaining_payment,
    
    -- Pending revenue = total amount for pending bookings
    COALESCE(SUM(CASE WHEN b.status = 'pending' THEN b.total_amount ELSE 0 END), 0) AS pending_revenue,
    
    -- Confirmed revenue = advance + remaining paid
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.advance_payment END), 0) +
    COALESCE(SUM(CASE WHEN b.status = 'completed' THEN b.remaining_payment_amount ELSE 0 END), 0) AS confirmed_revenue
  FROM bookings b;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_revenue_stats() IS 'Returns revenue statistics showing only actual payments received (advance + completed remaining payments)';

-- ========================================
-- 4. UPDATE GET_RECENT_BOOKINGS TO INCLUDE SLOTS
-- ========================================
-- This is now handled in the API layer with proper JOIN

-- ========================================
-- 5. ENSURE NOTIFICATION FUNCTIONS EXIST
-- ========================================

CREATE OR REPLACE FUNCTION mark_notification_read(p_notification_id UUID)
RETURNS JSON AS $$
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE id = p_notification_id;

  IF FOUND THEN
    RETURN json_build_object('success', true);
  ELSE
    RETURN json_build_object('success', false, 'error', 'Notification not found');
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS JSON AS $$
DECLARE
  v_count INTEGER;
BEGIN
  UPDATE notifications
  SET is_read = true,
      read_at = NOW()
  WHERE is_read = false;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  RETURN json_build_object(
    'success', true,
    'count', v_count
  );
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- 6. CREATE INDEX FOR BETTER PERFORMANCE
-- ========================================

CREATE INDEX IF NOT EXISTS idx_bookings_status_remaining 
ON bookings(status, remaining_payment) 
WHERE remaining_payment > 0;

CREATE INDEX IF NOT EXISTS idx_bookings_created_at_desc 
ON bookings(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_read_status 
ON notifications(is_read, created_at DESC);

-- ========================================
-- 7. UPDATE EXISTING BOOKINGS
-- ========================================
-- Set remaining_payment_amount for completed bookings

UPDATE bookings
SET remaining_payment_amount = (total_amount - advance_payment)
WHERE status = 'completed'
  AND remaining_payment_amount = 0
  AND remaining_payment = 0;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check column exists
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'bookings'
  AND column_name = 'remaining_payment_amount';

-- Check function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name IN ('verify_remaining_payment', 'get_revenue_stats', 'mark_notification_read', 'mark_all_notifications_read')
ORDER BY routine_name;

-- Test revenue calculation
SELECT * FROM get_revenue_stats();

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'bookings'
  AND indexname LIKE 'idx_%';

-- ========================================
-- SUCCESS MESSAGE
-- ========================================

DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'COMPREHENSIVE UPDATES APPLIED SUCCESSFULLY';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Features Updated:';
  RAISE NOTICE '  ✓ Adjustable remaining payment with discount support';
  RAISE NOTICE '  ✓ Revenue calculation shows only actual payments';
  RAISE NOTICE '  ✓ Notification read functionality';
  RAISE NOTICE '  ✓ Performance indexes added';
  RAISE NOTICE '  ✓ Data migration completed';
  RAISE NOTICE '========================================';
END $$;
