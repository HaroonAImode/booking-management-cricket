-- ========================================
-- SECURITY HARDENING & AUDIT FIXES
-- ========================================
-- Description: Enhanced security policies and fixes
-- Version: 1.0
-- Purpose: Harden RLS policies and fix security vulnerabilities
-- ========================================

-- ========================================
-- 1. ENHANCED RLS FOR CUSTOMERS
-- ========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can view customers" ON customers;
DROP POLICY IF EXISTS "Admins full access to customers" ON customers;

-- Public can only INSERT customers (for booking submission)
-- No SELECT access - prevents data enumeration
CREATE POLICY "Public insert customers only"
  ON customers FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Admin full access
CREATE POLICY "Admin full access to customers"
  ON customers FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "Public insert customers only" ON customers IS 'Allow public booking submission only';
COMMENT ON POLICY "Admin full access to customers" ON customers IS 'Admin complete access to customer data';

-- ========================================
-- 2. ENHANCED RLS FOR BOOKINGS
-- ========================================

-- Drop overly permissive policies
DROP POLICY IF EXISTS "Public can view bookings" ON bookings;
DROP POLICY IF EXISTS "Public can insert bookings" ON bookings;
DROP POLICY IF EXISTS "Admins full access to bookings" ON bookings;

-- Public can INSERT bookings only
CREATE POLICY "Public insert bookings only"
  ON bookings FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

-- Public can view ONLY their own booking via booking_number
-- Use function-based policy for secure lookup
CREATE POLICY "Public view own booking by number"
  ON bookings FOR SELECT
  TO anon, authenticated
  USING (
    -- Only allow if they have the exact booking_number
    -- This should be checked server-side via secure token/session
    false -- Disabled by default, use API for customer access
  );

-- Admin full access
CREATE POLICY "Admin full access to bookings"
  ON bookings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "Public insert bookings only" ON bookings IS 'Allow public booking creation only';
COMMENT ON POLICY "Admin full access to bookings" ON bookings IS 'Admin complete access to all bookings';

-- ========================================
-- 3. ENHANCED RLS FOR BOOKING_SLOTS
-- ========================================

-- Drop policies
DROP POLICY IF EXISTS "Public can view booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Public can insert booking slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins full access to slots" ON booking_slots;

-- Public can only SELECT to check availability (read-only)
CREATE POLICY "Public read slots for availability"
  ON booking_slots FOR SELECT
  TO anon, authenticated
  USING (true);

-- Only service role can INSERT slots (via RPC functions)
-- This prevents direct manipulation
CREATE POLICY "Service role insert slots"
  ON booking_slots FOR INSERT
  TO authenticated
  WITH CHECK (is_admin());

-- Admin full access
CREATE POLICY "Admin full access to slots"
  ON booking_slots FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "Public read slots for availability" ON booking_slots IS 'Public can only check availability';
COMMENT ON POLICY "Service role insert slots" ON booking_slots IS 'Only admins/service can create slots';

-- ========================================
-- 4. ENHANCED RLS FOR PAYMENTS
-- ========================================

-- Drop policies
DROP POLICY IF EXISTS "Admins full access to payments" ON payments;

-- Admin-only access
CREATE POLICY "Admin full access to payments"
  ON payments FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

-- No public access to payments table
COMMENT ON POLICY "Admin full access to payments" ON payments IS 'Only admins can access payment records';

-- ========================================
-- 5. ENHANCED RLS FOR NOTIFICATIONS
-- ========================================

-- Drop policies
DROP POLICY IF EXISTS "Admins full access to notifications" ON notifications;

-- Admin-only access
CREATE POLICY "Admin full access to notifications"
  ON notifications FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "Admin full access to notifications" ON notifications IS 'Only admins can access notifications';

-- ========================================
-- 6. ENHANCED RLS FOR SYSTEM_SETTINGS
-- ========================================

-- Drop policies
DROP POLICY IF EXISTS "settings_admin_read" ON system_settings;
DROP POLICY IF EXISTS "settings_admin_update" ON system_settings;

-- Public can READ booking rates (needed for public booking form)
-- But only via RPC function get_booking_rates()
CREATE POLICY "Public read rates via RPC"
  ON system_settings FOR SELECT
  TO anon, authenticated
  USING (
    setting_key IN ('booking_rates', 'night_rate_hours')
  );

-- Admin can do everything
CREATE POLICY "Admin full access to settings"
  ON system_settings FOR ALL
  TO authenticated
  USING (is_admin())
  WITH CHECK (is_admin());

COMMENT ON POLICY "Public read rates via RPC" ON system_settings IS 'Public can only read booking rates';
COMMENT ON POLICY "Admin full access to settings" ON system_settings IS 'Admin complete settings access';

-- ========================================
-- 7. STORAGE SECURITY POLICIES
-- ========================================

-- IMPORTANT: Storage policies must be configured in Supabase Dashboard
-- Go to: Storage > payment-proofs bucket > Policies
-- 
-- Because storage.objects requires special permissions, these policies 
-- cannot be created via SQL script. Follow these steps:
--
-- 1. Go to Supabase Dashboard > Storage > payment-proofs bucket
-- 2. Click "New Policy" and create these policies:
--
-- POLICY 1: Admin read payment proofs
--   Operation: SELECT
--   Policy name: Admin read payment proofs
--   Target roles: authenticated
--   USING expression:
--     bucket_id = 'payment-proofs' AND is_admin()
--
-- POLICY 2: Public upload payment proofs
--   Operation: INSERT
--   Policy name: Public upload payment proofs
--   Target roles: anon, authenticated
--   WITH CHECK expression:
--     bucket_id = 'payment-proofs' AND
--     (storage.foldername(name))[1] = 'payment-proofs' AND
--     lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp')
--
-- POLICY 3: Admin manage payment proofs
--   Operation: UPDATE
--   Policy name: Admin manage payment proofs
--   Target roles: authenticated
--   USING expression:
--     bucket_id = 'payment-proofs' AND is_admin()
--   WITH CHECK expression:
--     bucket_id = 'payment-proofs' AND is_admin()
--
-- POLICY 4: Admin delete payment proofs
--   Operation: DELETE
--   Policy name: Admin delete payment proofs
--   Target roles: authenticated
--   USING expression:
--     bucket_id = 'payment-proofs' AND is_admin()
--
-- 3. Also set bucket settings:
--    - Max file size: 5MB (5242880 bytes)
--    - Allowed MIME types: image/jpeg, image/png, image/gif, image/webp
--    - Public: false (keep private)

-- ========================================
-- 8. INPUT SANITIZATION FUNCTIONS
-- ========================================

-- Function to sanitize phone numbers
CREATE OR REPLACE FUNCTION sanitize_phone(p_phone TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove all non-numeric characters
  RETURN regexp_replace(p_phone, '[^0-9]', '', 'g');
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION sanitize_phone(TEXT) IS 'Remove non-numeric characters from phone';

-- Function to validate email format
CREATE OR REPLACE FUNCTION is_valid_email(p_email TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN p_email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$';
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION is_valid_email(TEXT) IS 'Validate email format';

-- Function to sanitize text input (prevent XSS)
CREATE OR REPLACE FUNCTION sanitize_text(p_text TEXT)
RETURNS TEXT AS $$
BEGIN
  -- Remove HTML tags and suspicious characters
  RETURN regexp_replace(
    regexp_replace(p_text, '<[^>]*>', '', 'g'), -- Remove HTML tags
    '[<>"'';]', '', 'g' -- Remove special characters
  );
END;
$$ LANGUAGE plpgsql IMMUTABLE;

COMMENT ON FUNCTION sanitize_text(TEXT) IS 'Remove HTML and special characters';

-- ========================================
-- 9. RATE LIMITING (DATABASE LEVEL)
-- ========================================

-- Table to track API requests
CREATE TABLE IF NOT EXISTS api_rate_limits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS api_rate_limits_ip_endpoint_idx 
  ON api_rate_limits(ip_address, endpoint, window_start);

COMMENT ON TABLE api_rate_limits IS 'Track API requests for rate limiting';

-- Function to check rate limit
CREATE OR REPLACE FUNCTION check_rate_limit(
  p_ip_address INET,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 1
)
RETURNS BOOLEAN AS $$
DECLARE
  v_count INTEGER;
  v_window_start TIMESTAMPTZ;
BEGIN
  v_window_start := NOW() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Get request count in current window
  SELECT COALESCE(SUM(request_count), 0) INTO v_count
  FROM api_rate_limits
  WHERE ip_address = p_ip_address
    AND endpoint = p_endpoint
    AND window_start >= v_window_start;
  
  -- Check if limit exceeded
  IF v_count >= p_max_requests THEN
    RETURN false;
  END IF;
  
  -- Increment counter
  INSERT INTO api_rate_limits (ip_address, endpoint, window_start)
  VALUES (p_ip_address, p_endpoint, NOW())
  ON CONFLICT DO NOTHING;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_rate_limit(INET, TEXT, INTEGER, INTEGER) IS 'Check if IP has exceeded rate limit';

-- Cleanup old rate limit records
CREATE OR REPLACE FUNCTION cleanup_rate_limits()
RETURNS void AS $$
BEGIN
  DELETE FROM api_rate_limits
  WHERE window_start < NOW() - INTERVAL '1 hour';
END;
$$ LANGUAGE plpgsql;

-- Schedule cleanup (requires pg_cron extension)
-- SELECT cron.schedule('cleanup-rate-limits', '*/15 * * * *', $$SELECT cleanup_rate_limits()$$);

-- ========================================
-- 10. AUDIT LOGGING
-- ========================================

-- Table for security audit log
CREATE TABLE IF NOT EXISTS security_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type TEXT NOT NULL, -- 'login', 'data_access', 'data_modify', 'failed_auth'
  user_id UUID REFERENCES auth.users(id),
  ip_address INET,
  user_agent TEXT,
  resource_type TEXT, -- 'booking', 'customer', 'payment', etc.
  resource_id UUID,
  action TEXT, -- 'read', 'create', 'update', 'delete'
  details JSONB,
  success BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX security_audit_log_user_idx ON security_audit_log(user_id, created_at DESC);
CREATE INDEX security_audit_log_event_idx ON security_audit_log(event_type, created_at DESC);
CREATE INDEX security_audit_log_resource_idx ON security_audit_log(resource_type, resource_id);

COMMENT ON TABLE security_audit_log IS 'Security and compliance audit trail';

-- Function to log audit events
CREATE OR REPLACE FUNCTION log_audit_event(
  p_event_type TEXT,
  p_resource_type TEXT DEFAULT NULL,
  p_resource_id UUID DEFAULT NULL,
  p_action TEXT DEFAULT NULL,
  p_details JSONB DEFAULT NULL
)
RETURNS void AS $$
BEGIN
  INSERT INTO security_audit_log (
    event_type,
    user_id,
    resource_type,
    resource_id,
    action,
    details
  ) VALUES (
    p_event_type,
    auth.uid(),
    p_resource_type,
    p_resource_id,
    p_action,
    p_details
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION log_audit_event IS 'Log security audit events';

-- ========================================
-- 11. PREVENT SQL INJECTION IN FUNCTIONS
-- ========================================

-- All database functions should use parameterized queries
-- Example: CORRECT usage
CREATE OR REPLACE FUNCTION safe_get_booking(p_booking_id UUID)
RETURNS JSON AS $$
BEGIN
  -- Uses parameter binding - safe from SQL injection
  RETURN (SELECT row_to_json(b) FROM bookings b WHERE id = p_booking_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- NEVER use dynamic SQL with string concatenation
-- INCORRECT (vulnerable to SQL injection):
-- EXECUTE 'SELECT * FROM bookings WHERE id = ' || user_input;

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Verify RLS is enabled on all tables
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
-- SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Test rate limiting
-- SELECT check_rate_limit('192.168.1.1'::INET, '/api/bookings', 5, 1);

-- View audit log
-- SELECT * FROM security_audit_log ORDER BY created_at DESC LIMIT 10;

-- ========================================
-- SETUP COMPLETE
-- ========================================
