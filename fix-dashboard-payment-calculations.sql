-- ========================================
-- FIX DASHBOARD PAYMENT METHOD CALCULATIONS
-- ========================================
-- Purpose: Properly calculate cash, online, easypaisa, sadapay totals
-- - Use split payment data (remaining_cash_amount, remaining_online_amount)
-- - Calculate actual easypaisa vs sadapay amounts (not estimates)
-- - Only count approved and completed bookings
-- ========================================

-- Drop and recreate the get_dashboard_data function
DROP FUNCTION IF EXISTS get_dashboard_data() CASCADE;

CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
  v_revenue_stats RECORD;
  v_cash_payments NUMERIC;
  v_online_payments NUMERIC;
  v_easypaisa_payments NUMERIC;
  v_sadapay_payments NUMERIC;
BEGIN
  -- Get revenue stats first
  SELECT * INTO v_revenue_stats FROM get_revenue_stats();
  
  -- ===== PROPER PAYMENT METHOD BREAKDOWN =====
  
  -- Calculate CASH payments (advance + remaining split cash)
  SELECT 
    -- Advance payments made with cash
    COALESCE(SUM(
      CASE 
        WHEN advance_payment_method = 'cash' THEN advance_payment
        ELSE 0 
      END
    ), 0) + 
    -- Remaining payments made with cash (legacy single method)
    COALESCE(SUM(
      CASE 
        WHEN remaining_payment_method = 'cash' AND (remaining_cash_amount IS NULL OR remaining_cash_amount = 0)
        THEN COALESCE(remaining_payment_amount, 0)
        ELSE 0 
      END
    ), 0) +
    -- Remaining payments - split payment cash portion
    COALESCE(SUM(COALESCE(remaining_cash_amount, 0)), 0)
    INTO v_cash_payments
  FROM bookings 
  WHERE status IN ('approved', 'completed');
  
  -- Calculate EASYPAISA payments (advance + remaining split)
  SELECT 
    -- Advance payments made with easypaisa
    COALESCE(SUM(
      CASE 
        WHEN advance_payment_method = 'easypaisa' THEN advance_payment
        ELSE 0 
      END
    ), 0) + 
    -- Remaining payments made with easypaisa (legacy single method)
    COALESCE(SUM(
      CASE 
        WHEN remaining_payment_method = 'easypaisa' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
        THEN COALESCE(remaining_payment_amount, 0)
        ELSE 0 
      END
    ), 0) +
    -- Remaining payments - split payment easypaisa portion
    COALESCE(SUM(
      CASE
        WHEN remaining_online_method = 'easypaisa' THEN COALESCE(remaining_online_amount, 0)
        ELSE 0
      END
    ), 0)
    INTO v_easypaisa_payments
  FROM bookings 
  WHERE status IN ('approved', 'completed');
  
  -- Calculate SADAPAY payments (advance + remaining split)
  SELECT 
    -- Advance payments made with sadapay
    COALESCE(SUM(
      CASE 
        WHEN advance_payment_method = 'sadapay' THEN advance_payment
        ELSE 0 
      END
    ), 0) + 
    -- Remaining payments made with sadapay (legacy single method)
    COALESCE(SUM(
      CASE 
        WHEN remaining_payment_method = 'sadapay' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
        THEN COALESCE(remaining_payment_amount, 0)
        ELSE 0 
      END
    ), 0) +
    -- Remaining payments - split payment sadapay portion
    COALESCE(SUM(
      CASE
        WHEN remaining_online_method = 'sadapay' THEN COALESCE(remaining_online_amount, 0)
        ELSE 0
      END
    ), 0)
    INTO v_sadapay_payments
  FROM bookings 
  WHERE status IN ('approved', 'completed');
  
  -- Total online is easypaisa + sadapay
  v_online_payments := v_easypaisa_payments + v_sadapay_payments;
  
  -- Build result JSON
  SELECT json_build_object(
    'revenue', json_build_object(
      'total_revenue', v_revenue_stats.total_revenue,
      'total_advance_received', v_revenue_stats.total_advance_received,
      'total_remaining_received', v_revenue_stats.total_remaining_received,
      'total_actually_received', v_revenue_stats.total_revenue,
      'cash_total', v_cash_payments,
      'online_total', v_online_payments,
      'easypaisa_total', v_easypaisa_payments,
      'sadapay_total', v_sadapay_payments,
      'pending_revenue', v_revenue_stats.pending_revenue,
      'confirmed_revenue', v_revenue_stats.confirmed_revenue
    ),
    'pending_approvals', (SELECT get_pending_approvals_count()),
    'today_bookings', (SELECT row_to_json(t) FROM get_today_bookings() t),
    'last_7_days', (SELECT row_to_json(l) FROM get_last_7_days_stats() l),
    'monthly_summary', (SELECT json_agg(m) FROM get_monthly_summary() m),
    'daily_bookings_chart', (SELECT json_agg(d) FROM get_daily_bookings_chart(7) d),
    'daily_revenue_chart', (SELECT json_agg(r) FROM get_daily_revenue_chart(7) r),
    'slot_usage', (SELECT json_agg(s) FROM get_slot_usage_stats(7) s)
  ) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_dashboard_data() IS 'Returns all dashboard statistics with accurate payment method breakdown';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Test the updated function
SELECT get_dashboard_data();

-- Verify payment method totals manually
SELECT 
  'Cash Payments' as payment_type,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'cash' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'cash' AND (remaining_cash_amount IS NULL OR remaining_cash_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    COALESCE(remaining_cash_amount, 0)
  ), 0) as total_amount
FROM bookings 
WHERE status IN ('approved', 'completed')

UNION ALL

SELECT 
  'Easypaisa Payments' as payment_type,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'easypaisa' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'easypaisa' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    CASE WHEN remaining_online_method = 'easypaisa' THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as total_amount
FROM bookings 
WHERE status IN ('approved', 'completed')

UNION ALL

SELECT 
  'SadaPay Payments' as payment_type,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'sadapay' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'sadapay' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    CASE WHEN remaining_online_method = 'sadapay' THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as total_amount
FROM bookings 
WHERE status IN ('approved', 'completed');

-- ========================================
-- DETAILED VERIFICATION QUERIES
-- ========================================

-- Query 1: Check all bookings with payment breakdown
SELECT 
  booking_number,
  status,
  total_amount,
  advance_payment,
  advance_payment_method,
  remaining_payment_amount,
  remaining_payment_method,
  remaining_cash_amount,
  remaining_online_amount,
  remaining_online_method,
  -- Calculate actual received
  advance_payment + COALESCE(remaining_payment_amount, 0) as total_received
FROM bookings
WHERE status IN ('approved', 'completed')
ORDER BY created_at DESC;

-- Query 2: Revenue summary (must match dashboard)
SELECT 
  'Total Approved/Completed Bookings' as metric,
  COUNT(*) as count,
  SUM(total_amount) as booking_value,
  SUM(advance_payment + COALESCE(remaining_payment_amount, 0)) as actually_received
FROM bookings
WHERE status IN ('approved', 'completed');

-- Query 3: Verify split payment data
SELECT 
  booking_number,
  remaining_payment_amount as total_remaining,
  remaining_cash_amount,
  remaining_online_amount,
  remaining_online_method,
  remaining_payment_method,
  CASE 
    WHEN remaining_cash_amount IS NOT NULL OR remaining_online_amount IS NOT NULL 
    THEN 'Split Payment'
    ELSE 'Single Payment'
  END as payment_type
FROM bookings
WHERE status = 'completed'
  AND remaining_payment_amount > 0
ORDER BY remaining_payment_completed_at DESC;

-- Query 4: Payment method totals (should match dashboard exactly)
SELECT 
  'CASH TOTAL' as method,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'cash' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'cash' AND (remaining_cash_amount IS NULL OR remaining_cash_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    COALESCE(remaining_cash_amount, 0)
  ), 0) as total

FROM bookings 
WHERE status IN ('approved', 'completed')

UNION ALL

SELECT 
  'EASYPAISA TOTAL' as method,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'easypaisa' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'easypaisa' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    CASE WHEN remaining_online_method = 'easypaisa' THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as total
FROM bookings 
WHERE status IN ('approved', 'completed')

UNION ALL

SELECT 
  'SADAPAY TOTAL' as method,
  COALESCE(SUM(
    CASE WHEN advance_payment_method = 'sadapay' THEN advance_payment ELSE 0 END +
    CASE WHEN remaining_payment_method = 'sadapay' AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    CASE WHEN remaining_online_method = 'sadapay' THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as total
FROM bookings 
WHERE status IN ('approved', 'completed');

-- Query 5: Check for split payment bookings
SELECT 
  COUNT(*) as split_payment_bookings,
  SUM(remaining_cash_amount) as total_cash_from_split,
  SUM(remaining_online_amount) as total_online_from_split
FROM bookings
WHERE status IN ('approved', 'completed')
  AND (remaining_cash_amount > 0 OR remaining_online_amount > 0);
