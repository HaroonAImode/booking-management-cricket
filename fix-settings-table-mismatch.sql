-- ========================================
-- FIX SETTINGS TABLE MISMATCH
-- ========================================
-- Problem: Admin updates go to system_settings table but booking functions
-- still read from old settings table causing rate discrepancies.
--
-- Solution: Update functions to read from system_settings table
-- ========================================

-- 1. Update get_available_slots to use system_settings
-- Drop existing function first to avoid return type conflicts
DROP FUNCTION IF EXISTS get_available_slots(DATE);

CREATE OR REPLACE FUNCTION get_available_slots(p_date DATE)
RETURNS TABLE (
  slot_hour INTEGER,
  slot_time TIME,
  is_available BOOLEAN,
  current_status TEXT,
  hourly_rate NUMERIC
) AS $$
DECLARE
  day_rate NUMERIC;
  night_rate NUMERIC;
  night_start_hour INTEGER;
  night_end_hour INTEGER;
  current_hour INTEGER;
  slot_time_val TIME;
  slot_exists BOOLEAN;
  slot_status TEXT;
BEGIN
  -- Get rates from system_settings (NEW TABLE)
  SELECT (setting_value->>'day_rate')::NUMERIC INTO day_rate
  FROM system_settings WHERE setting_key = 'booking_rates';
  
  SELECT (setting_value->>'night_rate')::NUMERIC INTO night_rate
  FROM system_settings WHERE setting_key = 'booking_rates';
  
  SELECT (setting_value->>'start_hour')::INTEGER INTO night_start_hour
  FROM system_settings WHERE setting_key = 'night_rate_hours';
  
  SELECT (setting_value->>'end_hour')::INTEGER INTO night_end_hour
  FROM system_settings WHERE setting_key = 'night_rate_hours';
  
  -- Generate all 24 hours
  FOR current_hour IN 0..23 LOOP
    slot_time_val := (current_hour || ':00:00')::TIME;
    
    -- Check if slot exists in booking_slots
    SELECT EXISTS(
      SELECT 1 FROM booking_slots bs
      WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
    ) INTO slot_exists;
    
    -- Get slot status if exists
    IF slot_exists THEN
      SELECT bs.status INTO slot_status
      FROM booking_slots bs
      WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
      LIMIT 1;
    ELSE
      slot_status := 'available';
    END IF;
    
    -- Determine rate (night vs day) using hour-based comparison
    RETURN QUERY SELECT
      current_hour AS slot_hour,
      slot_time_val AS slot_time,
      NOT slot_exists AS is_available,
      slot_status AS current_status,
      CASE
        WHEN (current_hour >= night_start_hour OR current_hour < night_end_hour) THEN night_rate
        ELSE day_rate
      END AS hourly_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- 2. Update calculate_booking_amount to use system_settings
-- Drop existing function first to avoid conflicts
DROP FUNCTION IF EXISTS calculate_booking_amount(DATE, INTEGER[]);

CREATE OR REPLACE FUNCTION calculate_booking_amount(
  p_slot_date DATE,
  p_slot_hours INTEGER[]
)
RETURNS NUMERIC AS $$
DECLARE
  total NUMERIC := 0;
  day_rate NUMERIC;
  night_rate NUMERIC;
  night_start_hour INTEGER;
  night_end_hour INTEGER;
  hour_val INTEGER;
BEGIN
  -- Get rates from system_settings (NEW TABLE)
  SELECT (setting_value->>'day_rate')::NUMERIC INTO day_rate
  FROM system_settings WHERE setting_key = 'booking_rates';
  
  SELECT (setting_value->>'night_rate')::NUMERIC INTO night_rate
  FROM system_settings WHERE setting_key = 'booking_rates';
  
  SELECT (setting_value->>'start_hour')::INTEGER INTO night_start_hour
  FROM system_settings WHERE setting_key = 'night_rate_hours';
  
  SELECT (setting_value->>'end_hour')::INTEGER INTO night_end_hour
  FROM system_settings WHERE setting_key = 'night_rate_hours';
  
  -- Calculate total for each hour using hour-based comparison
  FOREACH hour_val IN ARRAY p_slot_hours
  LOOP
    IF (hour_val >= night_start_hour OR hour_val < night_end_hour) THEN
      total := total + night_rate;
    ELSE
      total := total + day_rate;
    END IF;
  END LOOP;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify functions now use system_settings
SELECT 
  p.proname as function_name,
  CASE 
    WHEN pg_get_functiondef(p.oid) LIKE '%system_settings%' THEN '✅ Uses system_settings (FIXED)'
    WHEN pg_get_functiondef(p.oid) LIKE '%FROM settings%' THEN '❌ Still uses old settings'
    ELSE 'Unknown'
  END as table_used
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname IN ('get_available_slots', 'calculate_booking_amount')
ORDER BY p.proname;

-- Test the calculate_booking_amount function with night hours
SELECT 
  'Test calculate_booking_amount for night hours (17-23)' as test,
  calculate_booking_amount('2026-02-20'::DATE, ARRAY[17,18,19,20,21,22,23]) as total,
  'Should be 7 hours × 2500 = 17500' as expected;

-- Test shows current rates being used
SELECT 
  'Current rates in system_settings' as info,
  (setting_value->>'day_rate')::NUMERIC as day_rate,
  (setting_value->>'night_rate')::NUMERIC as night_rate
FROM system_settings 
WHERE setting_key = 'booking_rates';
