-- ========================================
-- DASHBOARD STATISTICS FUNCTIONS
-- ========================================
-- Description: SQL functions for admin dashboard statistics
-- Features:
-- - Total revenue and payment tracking
-- - Pending approvals count
-- - Today's bookings
-- - Last 7 days statistics
-- - Monthly summary
-- - Daily bookings chart data
-- - Revenue trends
-- - Slot usage statistics
-- ========================================

-- ========================================
-- 1. TOTAL REVENUE STATISTICS
-- ========================================

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
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.advance_payment + b.remaining_payment ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.advance_payment ELSE 0 END), 0) AS total_advance_received,
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.remaining_payment ELSE 0 END), 0) AS total_remaining_payment,
    COALESCE(SUM(CASE WHEN b.status = 'pending' THEN b.total_amount ELSE 0 END), 0) AS pending_revenue,
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.total_amount ELSE 0 END), 0) AS confirmed_revenue
  FROM bookings b;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_revenue_stats() IS 'Returns total revenue, advance payments, and remaining payments statistics';

-- ========================================
-- 2. PENDING APPROVALS COUNT
-- ========================================

CREATE OR REPLACE FUNCTION get_pending_approvals_count()
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)::INTEGER
    FROM bookings
    WHERE status = 'pending'
      AND (pending_expires_at IS NULL OR pending_expires_at > NOW())
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_pending_approvals_count() IS 'Returns count of bookings pending approval';

-- ========================================
-- 3. TODAY'S BOOKINGS
-- ========================================

CREATE OR REPLACE FUNCTION get_today_bookings()
RETURNS TABLE (
  total_bookings INTEGER,
  total_hours INTEGER,
  total_amount NUMERIC,
  pending_count INTEGER,
  approved_count INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_bookings,
    COALESCE(SUM(b.total_hours), 0)::INTEGER AS total_hours,
    COALESCE(SUM(b.total_amount), 0) AS total_amount,
    COUNT(*) FILTER (WHERE b.status = 'pending')::INTEGER AS pending_count,
    COUNT(*) FILTER (WHERE b.status = 'approved')::INTEGER AS approved_count
  FROM bookings b
  WHERE b.booking_date = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_today_bookings() IS 'Returns statistics for bookings scheduled for today';

-- ========================================
-- 4. LAST 7 DAYS STATISTICS
-- ========================================

CREATE OR REPLACE FUNCTION get_last_7_days_stats()
RETURNS TABLE (
  total_bookings INTEGER,
  total_revenue NUMERIC,
  total_hours INTEGER,
  average_booking_value NUMERIC,
  approved_bookings INTEGER,
  cancelled_bookings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER AS total_bookings,
    COALESCE(SUM(CASE WHEN b.status IN ('approved', 'completed') THEN b.advance_payment + b.remaining_payment ELSE 0 END), 0) AS total_revenue,
    COALESCE(SUM(b.total_hours), 0)::INTEGER AS total_hours,
    COALESCE(AVG(b.total_amount), 0) AS average_booking_value,
    COUNT(*) FILTER (WHERE b.status = 'approved')::INTEGER AS approved_bookings,
    COUNT(*) FILTER (WHERE b.status = 'cancelled')::INTEGER AS cancelled_bookings
  FROM bookings b
  WHERE b.booking_date >= CURRENT_DATE - INTERVAL '7 days';
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_last_7_days_stats() IS 'Returns statistics for bookings created in the last 7 days';

-- ========================================
-- 5. MONTHLY SUMMARY
-- ========================================

CREATE OR REPLACE FUNCTION get_monthly_summary()
RETURNS TABLE (
  month_name TEXT,
  total_bookings INTEGER,
  total_revenue NUMERIC,
  total_hours INTEGER,
  average_booking_value NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    TO_CHAR(b.created_at, 'Month YYYY') AS month_name,
    COUNT(*)::INTEGER AS total_bookings,
    COALESCE(SUM(b.total_amount), 0) AS total_revenue,
    COALESCE(SUM(b.total_hours), 0)::INTEGER AS total_hours,
    COALESCE(AVG(b.total_amount), 0) AS average_booking_value
  FROM bookings b
  WHERE b.created_at >= DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '5 months'
  GROUP BY TO_CHAR(b.created_at, 'Month YYYY'), DATE_TRUNC('month', b.created_at)
  ORDER BY DATE_TRUNC('month', b.created_at) DESC
  LIMIT 6;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_monthly_summary() IS 'Returns monthly summary statistics for the last 6 months';

-- ========================================
-- 6. DAILY BOOKINGS CHART DATA
-- ========================================

CREATE OR REPLACE FUNCTION get_daily_bookings_chart(days INTEGER DEFAULT 7)
RETURNS TABLE (
  booking_date DATE,
  total_bookings INTEGER,
  pending_bookings INTEGER,
  approved_bookings INTEGER,
  cancelled_bookings INTEGER
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  )
  SELECT 
    ds.date AS booking_date,
    COALESCE(COUNT(b.id), 0)::INTEGER AS total_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'pending')::INTEGER AS pending_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'approved')::INTEGER AS approved_bookings,
    COUNT(b.id) FILTER (WHERE b.status = 'cancelled')::INTEGER AS cancelled_bookings
  FROM date_series ds
  LEFT JOIN bookings b ON b.booking_date = ds.date
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_daily_bookings_chart(INTEGER) IS 'Returns daily booking counts for chart (default last 7 days)';

-- ========================================
-- 7. DAILY REVENUE CHART DATA
-- ========================================

CREATE OR REPLACE FUNCTION get_daily_revenue_chart(days INTEGER DEFAULT 7)
RETURNS TABLE (
  booking_date DATE,
  total_revenue NUMERIC,
  advance_received NUMERIC,
  remaining_payment NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH date_series AS (
    SELECT generate_series(
      CURRENT_DATE - (days - 1),
      CURRENT_DATE,
      '1 day'::INTERVAL
    )::DATE AS date
  )
  SELECT 
    ds.date AS booking_date,
    COALESCE(SUM(b.total_amount), 0) AS total_revenue,
    COALESCE(SUM(b.advance_payment), 0) AS advance_received,
    COALESCE(SUM(b.remaining_payment), 0) AS remaining_payment
  FROM date_series ds
  LEFT JOIN bookings b ON b.booking_date = ds.date
  GROUP BY ds.date
  ORDER BY ds.date;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_daily_revenue_chart(INTEGER) IS 'Returns daily revenue data for chart (default last 7 days)';

-- ========================================
-- 8. SLOT USAGE STATISTICS
-- ========================================

CREATE OR REPLACE FUNCTION get_slot_usage_stats(days INTEGER DEFAULT 7)
RETURNS TABLE (
  slot_hour INTEGER,
  total_bookings INTEGER,
  is_night_slot BOOLEAN,
  usage_percentage NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  WITH total_slots AS (
    SELECT COUNT(*)::NUMERIC AS total
    FROM booking_slots
    WHERE slot_date >= CURRENT_DATE - days
      AND status IN ('pending', 'booked')
  )
  SELECT 
    bs.slot_hour,
    COUNT(*)::INTEGER AS total_bookings,
    bs.is_night_rate AS is_night_slot,
    ROUND((COUNT(*)::NUMERIC / NULLIF((SELECT total FROM total_slots), 0) * 100), 2) AS usage_percentage
  FROM booking_slots bs
  WHERE bs.slot_date >= CURRENT_DATE - days
    AND bs.status IN ('pending', 'booked')
  GROUP BY bs.slot_hour, bs.is_night_rate
  ORDER BY bs.slot_hour;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_slot_usage_stats(INTEGER) IS 'Returns slot usage statistics by hour (default last 7 days)';

-- ========================================
-- 9. COMPREHENSIVE DASHBOARD DATA
-- ========================================

CREATE OR REPLACE FUNCTION get_dashboard_data()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_build_object(
    'revenue', (SELECT row_to_json(r) FROM get_revenue_stats() r),
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

COMMENT ON FUNCTION get_dashboard_data() IS 'Returns all dashboard statistics in a single JSON object';

-- ========================================
-- 10. RECENT BOOKINGS FOR DASHBOARD
-- ========================================

CREATE OR REPLACE FUNCTION get_recent_bookings(limit_count INTEGER DEFAULT 10)
RETURNS TABLE (
  id UUID,
  booking_number TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  booking_date DATE,
  total_hours INTEGER,
  total_amount NUMERIC,
  advance_payment NUMERIC,
  status TEXT,
  created_at TIMESTAMPTZ,
  pending_expires_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.id,
    b.booking_number,
    c.name AS customer_name,
    c.phone AS customer_phone,
    b.booking_date,
    b.total_hours,
    b.total_amount,
    b.advance_payment,
    b.status,
    b.created_at,
    b.pending_expires_at
  FROM bookings b
  JOIN customers c ON c.id = b.customer_id
  ORDER BY b.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_recent_bookings(INTEGER) IS 'Returns recent bookings for dashboard display';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Test revenue stats
-- SELECT * FROM get_revenue_stats();

-- Test pending approvals
-- SELECT get_pending_approvals_count();

-- Test today's bookings
-- SELECT * FROM get_today_bookings();

-- Test last 7 days
-- SELECT * FROM get_last_7_days_stats();

-- Test monthly summary
-- SELECT * FROM get_monthly_summary();

-- Test daily bookings chart
-- SELECT * FROM get_daily_bookings_chart(7);

-- Test daily revenue chart
-- SELECT * FROM get_daily_revenue_chart(7);

-- Test slot usage
-- SELECT * FROM get_slot_usage_stats(7);

-- Test comprehensive dashboard data
-- SELECT get_dashboard_data();

-- Test recent bookings
-- SELECT * FROM get_recent_bookings(5);

-- ========================================
-- SETUP COMPLETE
-- ========================================

