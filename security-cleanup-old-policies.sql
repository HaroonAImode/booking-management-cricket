-- ========================================
-- CLEANUP OLD INSECURE POLICIES
-- ========================================
-- Run this script to remove duplicate/old policies
-- that conflict with the new security-hardened policies
-- ========================================

-- ========================================
-- REMOVE OLD BOOKING_SLOTS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Anyone can view slots" ON booking_slots;
DROP POLICY IF EXISTS "System can insert slots" ON booking_slots;
DROP POLICY IF EXISTS "Admins can update slots" ON booking_slots;

-- ========================================
-- REMOVE OLD BOOKINGS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Anyone can create bookings" ON bookings;
DROP POLICY IF EXISTS "Customers can view own bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can view all bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can update bookings" ON bookings;
DROP POLICY IF EXISTS "Admins can delete bookings" ON bookings;

-- ========================================
-- REMOVE OLD CUSTOMERS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Public can insert customers" ON customers;
DROP POLICY IF EXISTS "Admins can view customers" ON customers;
DROP POLICY IF EXISTS "System can manage customers" ON customers;

-- ========================================
-- REMOVE OLD NOTIFICATIONS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Admins can view notifications" ON notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON notifications;
DROP POLICY IF EXISTS "System can create notifications" ON notifications;

-- ========================================
-- REMOVE OLD PAYMENTS POLICIES
-- ========================================

DROP POLICY IF EXISTS "Admins can manage payments" ON payments;

-- ========================================
-- REMOVE OLD SETTINGS POLICIES (if exists)
-- ========================================

DROP POLICY IF EXISTS "Anyone can read settings" ON settings;
DROP POLICY IF EXISTS "Public can view settings" ON settings;
DROP POLICY IF EXISTS "Admins can manage settings" ON settings;
DROP POLICY IF EXISTS "Admins can update settings" ON settings;

-- ========================================
-- ENABLE RLS ON SYSTEM TABLES
-- ========================================

-- Enable RLS on api_rate_limits (optional - for extra security)
ALTER TABLE api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for api_rate_limits (service role only)
CREATE POLICY "Service role can manage rate limits"
  ON api_rate_limits FOR ALL
  USING (true)
  WITH CHECK (true);

-- Enable RLS on security_audit_log (optional - for extra security)
ALTER TABLE security_audit_log ENABLE ROW LEVEL SECURITY;

-- Create policy for security_audit_log (admins can read, service role can write)
CREATE POLICY "Admins can view audit logs"
  ON security_audit_log FOR SELECT
  TO authenticated
  USING (is_admin());

CREATE POLICY "Service role can insert audit logs"
  ON security_audit_log FOR INSERT
  WITH CHECK (true);

-- ========================================
-- VERIFICATION QUERIES
-- ========================================

-- Check remaining policies (should only see the new secure ones)
-- SELECT tablename, policyname FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename, policyname;

-- Verify RLS on all tables (all should be true now)
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename;

-- ========================================
-- CLEANUP COMPLETE
-- ========================================
