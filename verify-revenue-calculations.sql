-- ========================================
-- COMPREHENSIVE REVENUE VERIFICATION QUERIES
-- ========================================
-- Purpose: Verify all revenue calculations are correct
-- Only counts: advance (approved bookings) + remaining (if paid)
-- Does NOT count: pending bookings or unpaid remaining amounts
--========================================

-- ========================================
-- 1. OVERALL REVENUE SUMMARY
-- ========================================
SELECT 
  '=== OVERALL REVENUE SUMMARY ===' as section,
  '' as metric,
  NULL::numeric as amount;

SELECT 
  'Total Bookings (All Status)' as metric,
  COUNT(*)::numeric as amount
FROM bookings;

SELECT 
  'Approved Bookings' as metric,
  COUNT(*)::numeric as amount
FROM bookings
WHERE status = 'approved';

SELECT 
  'Completed Bookings' as metric,
  COUNT(*)::numeric as amount
FROM bookings
WHERE status = 'completed';

SELECT 
  'Pending Bookings (NOT in revenue)' as metric,
  COUNT(*)::numeric as amount
FROM bookings
WHERE status = 'pending';

-- ========================================
-- 2. REVENUE BREAKDOWN
-- ========================================
SELECT 
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  '=== REVENUE BREAKDOWN ===' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  'Total Advance Received (Approved + Completed)' as metric,
  COALESCE(SUM(advance_payment), 0) as amount
FROM bookings
WHERE status IN ('approved', 'completed')
UNION ALL
SELECT 
  'Total Remaining Received (Completed Only)' as metric,
  COALESCE(SUM(remaining_payment_amount), 0) as amount
FROM bookings
WHERE status = 'completed'
  AND remaining_payment_amount IS NOT NULL
  AND remaining_payment_amount > 0
UNION ALL
SELECT 
  'TOTAL REVENUE (Advance + Remaining Paid)' as metric,
  COALESCE(SUM(
    CASE 
      WHEN status IN ('approved', 'completed') THEN advance_payment
      ELSE 0
    END +
    CASE 
      WHEN status = 'completed' THEN COALESCE(remaining_payment_amount, 0)
      ELSE 0
    END
  ), 0) as amount
FROM bookings;

-- ========================================
-- 3. PAYMENT METHOD BREAKDOWN
-- ========================================
SELECT 
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  '=== PAYMENT METHOD BREAKDOWN ===' as metric,
  NULL::numeric as amount
UNION ALL

-- CASH TOTAL
SELECT 
  'CASH TOTAL' as metric,
  COALESCE(SUM(
    -- Advance cash
    CASE WHEN advance_payment_method = 'cash' AND status IN ('approved', 'completed')
         THEN advance_payment ELSE 0 END +
    -- Remaining cash (legacy single method)
    CASE WHEN remaining_payment_method = 'cash' AND status = 'completed'
              AND (remaining_cash_amount IS NULL OR remaining_cash_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    -- Remaining cash (split payment)
    CASE WHEN status = 'completed' THEN COALESCE(remaining_cash_amount, 0) ELSE 0 END
  ), 0) as amount
FROM bookings

UNION ALL

-- EASYPAISA TOTAL
SELECT 
  'EASYPAISA TOTAL' as metric,
  COALESCE(SUM(
    -- Advance easypaisa
    CASE WHEN advance_payment_method = 'easypaisa' AND status IN ('approved', 'completed')
         THEN advance_payment ELSE 0 END +
    -- Remaining easypaisa (legacy single method)
    CASE WHEN remaining_payment_method = 'easypaisa' AND status = 'completed'
              AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    -- Remaining easypaisa (split payment)
    CASE WHEN status = 'completed' AND remaining_online_method = 'easypaisa' 
         THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as amount
FROM bookings

UNION ALL

-- SADAPAY TOTAL
SELECT 
  'SADAPAY TOTAL' as metric,
  COALESCE(SUM(
    -- Advance sadapay
    CASE WHEN advance_payment_method = 'sadapay' AND status IN ('approved', 'completed')
         THEN advance_payment ELSE 0 END +
    -- Remaining sadapay (legacy single method)
    CASE WHEN remaining_payment_method = 'sadapay' AND status = 'completed'
              AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    -- Remaining sadapay (split payment)
    CASE WHEN status = 'completed' AND remaining_online_method = 'sadapay' 
         THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as amount
FROM bookings

UNION ALL

-- ONLINE TOTAL (Easypaisa + SadaPay)
SELECT 
  'ONLINE TOTAL (Easypaisa + SadaPay)' as metric,
  COALESCE(SUM(
    -- Advance online
    CASE WHEN advance_payment_method IN ('easypaisa', 'sadapay') AND status IN ('approved', 'completed')
         THEN advance_payment ELSE 0 END +
    -- Remaining online (legacy single method)
    CASE WHEN remaining_payment_method IN ('easypaisa', 'sadapay') AND status = 'completed'
              AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
         THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
    -- Remaining online (split payment)
    CASE WHEN status = 'completed' AND remaining_online_method IN ('easypaisa', 'sadapay')
         THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
  ), 0) as amount
FROM bookings;

-- ========================================
-- 4. VALIDATION: Cash + Online = Total Revenue
-- ========================================
SELECT 
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  '=== VALIDATION CHECK ===' as metric,
  NULL::numeric as amount
UNION ALL

WITH totals AS (
  SELECT 
    -- Total Revenue
    COALESCE(SUM(
      CASE WHEN status IN ('approved', 'completed') THEN advance_payment ELSE 0 END +
      CASE WHEN status = 'completed' THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END
    ), 0) as total_revenue,
    
    -- Total Cash
    COALESCE(SUM(
      CASE WHEN advance_payment_method = 'cash' AND status IN ('approved', 'completed')
           THEN advance_payment ELSE 0 END +
      CASE WHEN remaining_payment_method = 'cash' AND status = 'completed'
                AND (remaining_cash_amount IS NULL OR remaining_cash_amount = 0)
           THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
      CASE WHEN status = 'completed' THEN COALESCE(remaining_cash_amount, 0) ELSE 0 END
    ), 0) as total_cash,
    
    -- Total Online
    COALESCE(SUM(
      CASE WHEN advance_payment_method IN ('easypaisa', 'sadapay') AND status IN ('approved', 'completed')
           THEN advance_payment ELSE 0 END +
      CASE WHEN remaining_payment_method IN ('easypaisa', 'sadapay') AND status = 'completed'
                AND (remaining_online_amount IS NULL OR remaining_online_amount = 0)
           THEN COALESCE(remaining_payment_amount, 0) ELSE 0 END +
      CASE WHEN status = 'completed' AND remaining_online_method IN ('easypaisa', 'sadapay')
           THEN COALESCE(remaining_online_amount, 0) ELSE 0 END
    ), 0) as total_online
  FROM bookings
)
SELECT 
  'Total Revenue' as metric,
  total_revenue as amount
FROM totals
UNION ALL
SELECT 
  'Cash + Online' as metric,
  total_cash + total_online as amount
FROM totals
UNION ALL
SELECT 
  'Difference (should be 0)' as metric,
  total_revenue - (total_cash + total_online) as amount
FROM totals;

-- ========================================
-- 5. DETAILED BOOKING LIST WITH PAYMENTS
-- ========================================
SELECT 
  '=== RECENT COMPLETED BOOKINGS ===' as title,
  '' as booking_number,
  '' as status,
  NULL::numeric as advance,
  '' as adv_method,
  NULL::numeric as remaining,
  '' as rem_method,
  NULL::numeric as cash_split,
  NULL::numeric as online_split,
  '' as online_method,
  NULL::numeric as total_received

UNION ALL

SELECT 
  '' as title,
  booking_number,
  status,
  advance_payment as advance,
  COALESCE(advance_payment_method, 'N/AGMT') as adv_method,
  COALESCE(remaining_payment_amount, 0) as remaining,
  COALESCE(remaining_payment_method, 'N/A') as rem_method,
  COALESCE(remaining_cash_amount, 0) as cash_split,
  COALESCE(remaining_online_amount, 0) as online_split,
  COALESCE(remaining_online_method, 'N/A') as online_method,
  advance_payment + COALESCE(remaining_payment_amount, 0) as total_received
FROM bookings
WHERE status IN ('approved', 'completed')
ORDER BY created_at DESC
LIMIT 20;

-- ========================================
-- 6. UNPAID REMAINING AMOUNTS (NOT IN REVENUE)
-- ========================================
SELECT 
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  '=== UNPAID AMOUNTS (NOT IN REVENUE) ===' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  'Approved Bookings - Unpaid Remaining' as metric,
  COALESCE(SUM(remaining_payment), 0) as amount
FROM bookings
WHERE status = 'approved'
  AND remaining_payment > 0
UNION ALL
SELECT 
  'Pending Bookings - Total Amount' as metric,
  COALESCE(SUM(total_amount), 0) as amount
FROM bookings
WHERE status = 'pending'
UNION ALL
SELECT 
  'Cancelled Bookings - Total' as metric,
  COALESCE(SUM(total_amount), 0) as amount
FROM bookings
WHERE status = 'cancelled';

-- ========================================
-- 7. SPLIT PAYMENT ANALYSIS
-- ========================================
SELECT 
  '' as metric,
  NULL::numeric as count,
  NULL::numeric as cash_total,
  NULL::numeric as online_total
UNION ALL
SELECT 
  '=== SPLIT PAYMENT ANALYSIS ===' as metric,
  NULL::numeric as count,
  NULL::numeric as cash_total,
  NULL::numeric as online_total
UNION ALL
SELECT 
  'Bookings with Split Payments' as metric,
  COUNT(*)::numeric as count,
  SUM(COALESCE(remaining_cash_amount, 0)) as cash_total,
  SUM(COALESCE(remaining_online_amount, 0)) as online_total
FROM bookings
WHERE status = 'completed'
  AND (remaining_cash_amount > 0 OR remaining_online_amount > 0);

-- ========================================
-- 8. DASHBOARD DATA COMPARISON
-- ========================================
SELECT 
  '' as source,
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  '=== COMPARE WITH DASHBOARD ===' as source,
  '' as metric,
  NULL::numeric as amount
UNION ALL
SELECT 
  'From get_dashboard_data()' as source,
  'total_revenue' as metric,
  (get_dashboard_data()->'revenue'->>'total_revenue')::numeric as amount
UNION ALL
SELECT 
  'From get_dashboard_data()' as source,
  'cash_total' as metric,
  (get_dashboard_data()->'revenue'->>'cash_total')::numeric as amount
UNION ALL
SELECT 
  'From get_dashboard_data()' as source,
  'online_total' as metric,
  (get_dashboard_data()->'revenue'->>'online_total')::numeric as amount
UNION ALL
SELECT 
  'From get_dashboard_data()' as source,
  'easypaisa_total' as metric,
  (get_dashboard_data()->'revenue'->>'easypaisa_total')::numeric as amount
UNION ALL
SELECT 
  'From get_dashboard_data()' as source,
  'sadapay_total' as metric,
  (get_dashboard_data()->'revenue'->>'sadapay_total')::numeric as amount;
