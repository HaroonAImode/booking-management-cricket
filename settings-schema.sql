-- ========================================
-- SYSTEM SETTINGS SCHEMA AND FUNCTIONS
-- ========================================
-- Description: System settings for booking rates and time configuration
-- Features:
-- - Store hourly rates (day and night)
-- - Configure night rate time range
-- - Get and update settings
-- - Settings apply immediately to new bookings
-- ========================================

-- ========================================
-- 1. CREATE SETTINGS TABLE
-- ========================================

CREATE TABLE IF NOT EXISTS system_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  setting_key TEXT UNIQUE NOT NULL,
  setting_value JSONB NOT NULL,
  description TEXT,
  updated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE system_settings IS 'System-wide configuration settings';

-- ========================================
-- 2. INSERT DEFAULT SETTINGS
-- ========================================

-- Insert default booking rates
INSERT INTO system_settings (setting_key, setting_value, description)
VALUES 
  ('booking_rates', 
   '{"day_rate": 1500, "night_rate": 2000}'::JSONB,
   'Hourly rates for day and night bookings'
  ),
  ('night_rate_hours',
   '{"start_hour": 17, "end_hour": 6}'::JSONB,
   'Night rate time range (17:00 to 06:00)'
  ),
  ('booking_settings',
   '{"advance_payment_percentage": 50, "max_booking_hours": 12, "min_booking_hours": 1}'::JSONB,
   'General booking configuration'
  )
ON CONFLICT (setting_key) DO NOTHING;

COMMENT ON COLUMN system_settings.setting_key IS 'Unique identifier for the setting';
COMMENT ON COLUMN system_settings.setting_value IS 'JSON value containing setting data';

-- ========================================
-- 3. GET ALL SETTINGS
-- ========================================

CREATE OR REPLACE FUNCTION get_system_settings()
RETURNS JSON AS $$
DECLARE
  v_result JSON;
BEGIN
  SELECT json_object_agg(setting_key, setting_value) INTO v_result
  FROM system_settings;
  
  RETURN COALESCE(v_result, '{}'::JSON);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_system_settings() IS 'Returns all system settings as a JSON object';

-- ========================================
-- 4. GET SPECIFIC SETTING
-- ========================================

CREATE OR REPLACE FUNCTION get_setting(p_setting_key TEXT)
RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  SELECT setting_value INTO v_result
  FROM system_settings
  WHERE setting_key = p_setting_key;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_setting(TEXT) IS 'Returns a specific setting value by key';

-- ========================================
-- 5. UPDATE SETTING
-- ========================================

CREATE OR REPLACE FUNCTION update_setting(
  p_setting_key TEXT,
  p_setting_value JSONB,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_updated BOOLEAN;
BEGIN
  UPDATE system_settings
  SET 
    setting_value = p_setting_value,
    updated_by = p_updated_by,
    updated_at = NOW()
  WHERE setting_key = p_setting_key
  RETURNING true INTO v_updated;

  IF v_updated IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Setting not found'
    );
  END IF;

  RETURN json_build_object(
    'success', true,
    'message', 'Setting updated successfully',
    'setting_key', p_setting_key,
    'setting_value', p_setting_value
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_setting(TEXT, JSONB, UUID) IS 'Updates a setting value by key';

-- ========================================
-- 6. GET BOOKING RATES
-- ========================================

CREATE OR REPLACE FUNCTION get_booking_rates()
RETURNS JSON AS $$
DECLARE
  v_rates JSONB;
  v_night_hours JSONB;
BEGIN
  -- Get rates
  SELECT setting_value INTO v_rates
  FROM system_settings
  WHERE setting_key = 'booking_rates';
  
  -- Get night hours
  SELECT setting_value INTO v_night_hours
  FROM system_settings
  WHERE setting_key = 'night_rate_hours';
  
  RETURN json_build_object(
    'day_rate', (v_rates->>'day_rate')::NUMERIC,
    'night_rate', (v_rates->>'night_rate')::NUMERIC,
    'night_start_hour', (v_night_hours->>'start_hour')::INTEGER,
    'night_end_hour', (v_night_hours->>'end_hour')::INTEGER
  );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_booking_rates() IS 'Returns current booking rates and night hour configuration';

-- ========================================
-- 7. CALCULATE SLOT RATE
-- ========================================

CREATE OR REPLACE FUNCTION calculate_slot_rate(p_hour INTEGER)
RETURNS NUMERIC AS $$
DECLARE
  v_rates JSONB;
  v_night_hours JSONB;
  v_start_hour INTEGER;
  v_end_hour INTEGER;
  v_is_night BOOLEAN;
BEGIN
  -- Get settings
  SELECT setting_value INTO v_rates FROM system_settings WHERE setting_key = 'booking_rates';
  SELECT setting_value INTO v_night_hours FROM system_settings WHERE setting_key = 'night_rate_hours';
  
  v_start_hour := (v_night_hours->>'start_hour')::INTEGER;
  v_end_hour := (v_night_hours->>'end_hour')::INTEGER;
  
  -- Determine if hour is in night range
  -- Night range can span midnight (e.g., 17:00 to 06:00)
  IF v_start_hour > v_end_hour THEN
    -- Range spans midnight
    v_is_night := (p_hour >= v_start_hour OR p_hour < v_end_hour);
  ELSE
    -- Normal range
    v_is_night := (p_hour >= v_start_hour AND p_hour < v_end_hour);
  END IF;
  
  -- Return appropriate rate
  IF v_is_night THEN
    RETURN (v_rates->>'night_rate')::NUMERIC;
  ELSE
    RETURN (v_rates->>'day_rate')::NUMERIC;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION calculate_slot_rate(INTEGER) IS 'Calculates the hourly rate for a given hour based on current settings';

-- ========================================
-- 8. UPDATE BOOKING RATES
-- ========================================

CREATE OR REPLACE FUNCTION update_booking_rates(
  p_day_rate NUMERIC,
  p_night_rate NUMERIC,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_new_value JSONB;
BEGIN
  -- Validate rates
  IF p_day_rate <= 0 OR p_night_rate <= 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Rates must be greater than zero'
    );
  END IF;
  
  v_new_value := json_build_object(
    'day_rate', p_day_rate,
    'night_rate', p_night_rate
  )::JSONB;
  
  RETURN update_setting('booking_rates', v_new_value, p_updated_by);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_booking_rates(NUMERIC, NUMERIC, UUID) IS 'Updates day and night hourly rates';

-- ========================================
-- 9. UPDATE NIGHT RATE HOURS
-- ========================================

CREATE OR REPLACE FUNCTION update_night_rate_hours(
  p_start_hour INTEGER,
  p_end_hour INTEGER,
  p_updated_by UUID DEFAULT NULL
)
RETURNS JSON AS $$
DECLARE
  v_new_value JSONB;
BEGIN
  -- Validate hours (0-23)
  IF p_start_hour < 0 OR p_start_hour > 23 OR p_end_hour < 0 OR p_end_hour > 23 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Hours must be between 0 and 23'
    );
  END IF;
  
  v_new_value := json_build_object(
    'start_hour', p_start_hour,
    'end_hour', p_end_hour
  )::JSONB;
  
  RETURN update_setting('night_rate_hours', v_new_value, p_updated_by);
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION update_night_rate_hours(INTEGER, INTEGER, UUID) IS 'Updates night rate time range';

-- ========================================
-- RLS POLICIES FOR SETTINGS
-- ========================================

-- Enable RLS
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

-- Admin can read all settings
CREATE POLICY settings_admin_read ON system_settings
  FOR SELECT
  TO authenticated
  USING (is_admin());

-- Admin can update all settings
CREATE POLICY settings_admin_update ON system_settings
  FOR UPDATE
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY settings_admin_read ON system_settings IS 'Admin can read all settings';
COMMENT ON POLICY settings_admin_update ON system_settings IS 'Admin can update all settings';

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Get all settings
-- SELECT get_system_settings();

-- Get specific setting
-- SELECT get_setting('booking_rates');

-- Get booking rates
-- SELECT get_booking_rates();

-- Calculate rate for specific hour
-- SELECT calculate_slot_rate(18); -- Should return night rate
-- SELECT calculate_slot_rate(10); -- Should return day rate

-- Update rates
-- SELECT update_booking_rates(1600, 2100, NULL);

-- Update night hours
-- SELECT update_night_rate_hours(18, 7, NULL);

-- ========================================
-- SETUP COMPLETE
-- ========================================
