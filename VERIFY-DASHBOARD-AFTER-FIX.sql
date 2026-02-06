-- ========================================
-- VERIFY DASHBOARD AFTER FIX
-- ========================================
-- This checks if dashboard revenue matches actual data

-- Get dashboard data
SELECT 
  '=== DASHBOARD DATA ===' as section,
  '' as metric,
  NULL::numeric as dashboard_amount,
  NULL::numeric as actual_amount,
  NULL::numeric as difference;

SELECT 
  'Dashboard' as section,
  'Total Revenue' as metric,
  (get_dashboard_data()->'revenue'->>'total_revenue')::numeric as dashboard_amount,
  (
    SELECT SUM(
      COALESCE(advance_payment, 0) + 
      COALESCE(remaining_payment_amount, 0)
    )
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as actual_amount,
  (get_dashboard_data()->'revenue'->>'total_revenue')::numeric - 
  (
    SELECT SUM(
      COALESCE(advance_payment, 0) + 
      COALESCE(remaining_payment_amount, 0)
    )
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as difference

UNION ALL

SELECT 
  'Dashboard' as section,
  'Cash Total' as metric,
  (get_dashboard_data()->'revenue'->>'cash_total')::numeric as dashboard_amount,
  (
    SELECT 
      SUM(CASE WHEN advance_payment_method = 'cash' THEN advance_payment ELSE 0 END) +
      SUM(COALESCE(remaining_cash_amount, 0))
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as actual_amount,
  (get_dashboard_data()->'revenue'->>'cash_total')::numeric -
  (
    SELECT 
      SUM(CASE WHEN advance_payment_method = 'cash' THEN advance_payment ELSE 0 END) +
      SUM(COALESCE(remaining_cash_amount, 0))
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as difference

UNION ALL

SELECT 
  'Dashboard' as section,
  'Easypaisa Total' as metric,
  (get_dashboard_data()->'revenue'->>'easypaisa_total')::numeric as dashboard_amount,
  (
    SELECT 
      SUM(CASE WHEN advance_payment_method = 'easypaisa' THEN advance_payment ELSE 0 END) +
      SUM(CASE WHEN remaining_online_method = 'easypaisa' THEN remaining_online_amount ELSE 0 END)
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as actual_amount,
  (get_dashboard_data()->'revenue'->>'easypaisa_total')::numeric -
  (
    SELECT 
      SUM(CASE WHEN advance_payment_method = 'easypaisa' THEN advance_payment ELSE 0 END) +
      SUM(CASE WHEN remaining_online_method = 'easypaisa' THEN remaining_online_amount ELSE 0 END)
    FROM bookings
    WHERE status IN ('approved', 'completed')
  ) as difference;
