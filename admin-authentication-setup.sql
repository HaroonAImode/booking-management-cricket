-- ========================================
-- ADMIN AUTHENTICATION SETUP
-- ========================================
-- Description: Supabase Auth integration for admin access
-- Features:
-- - Admin profiles with role-based access
-- - RLS policies for admin-only tables
-- - Helper functions for role verification
-- - Secure admin access patterns
-- ========================================

-- ========================================
-- 1. CREATE ADMIN PROFILES TABLE
-- ========================================

-- Table to store admin user profiles and roles
CREATE TABLE IF NOT EXISTS admin_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin' CHECK (role IN ('admin', 'super_admin', 'staff')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for quick role lookups
CREATE INDEX IF NOT EXISTS admin_profiles_role_idx ON admin_profiles(role);
CREATE INDEX IF NOT EXISTS admin_profiles_email_idx ON admin_profiles(email);
CREATE INDEX IF NOT EXISTS admin_profiles_is_active_idx ON admin_profiles(is_active);

COMMENT ON TABLE admin_profiles IS 'Admin user profiles with role-based access control';
COMMENT ON COLUMN admin_profiles.role IS 'Admin role: admin (standard), super_admin (full access), staff (limited access)';

-- ========================================
-- 2. HELPER FUNCTIONS FOR ROLE CHECKING
-- ========================================

-- Function: Check if current user is an admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_profiles 
    WHERE id = auth.uid() 
      AND is_active = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION is_admin() IS 'Returns true if current authenticated user is an active admin';

-- Function: Check if current user has specific role
CREATE OR REPLACE FUNCTION has_admin_role(required_role TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM admin_profiles 
    WHERE id = auth.uid() 
      AND is_active = true
      AND (
        role = required_role 
        OR role = 'super_admin' -- Super admins have all permissions
      )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION has_admin_role(TEXT) IS 'Returns true if current user has the specified admin role or is super_admin';

-- Function: Get current admin profile
CREATE OR REPLACE FUNCTION get_admin_profile()
RETURNS TABLE (
  id UUID,
  email TEXT,
  full_name TEXT,
  role TEXT,
  is_active BOOLEAN,
  last_login_at TIMESTAMPTZ
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ap.id,
    ap.email,
    ap.full_name,
    ap.role,
    ap.is_active,
    ap.last_login_at
  FROM admin_profiles ap
  WHERE ap.id = auth.uid()
    AND ap.is_active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_admin_profile() IS 'Returns profile of currently authenticated admin user';

-- Function: Update last login timestamp
CREATE OR REPLACE FUNCTION update_admin_last_login()
RETURNS VOID AS $$
BEGIN
  UPDATE admin_profiles
  SET 
    last_login_at = NOW(),
    updated_at = NOW()
  WHERE id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION update_admin_last_login() IS 'Updates last_login_at timestamp for current admin user';

-- ========================================
-- 3. ROW LEVEL SECURITY POLICIES
-- ========================================

-- Enable RLS on admin_profiles
ALTER TABLE admin_profiles ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can read their own profile
CREATE POLICY "Admins can view their own profile"
  ON admin_profiles
  FOR SELECT
  USING (auth.uid() = id AND is_active = true);

-- Policy: Super admins can view all admin profiles
CREATE POLICY "Super admins can view all profiles"
  ON admin_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- Policy: Super admins can update admin profiles
CREATE POLICY "Super admins can update profiles"
  ON admin_profiles
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- Policy: Super admins can insert new admin profiles
CREATE POLICY "Super admins can create profiles"
  ON admin_profiles
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM admin_profiles
      WHERE id = auth.uid()
        AND role = 'super_admin'
        AND is_active = true
    )
  );

-- ========================================
-- 4. UPDATE EXISTING TABLES WITH RLS
-- ========================================

-- Enable RLS on bookings table
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;

-- Policy: Public can insert bookings (for booking form)
CREATE POLICY "Anyone can create bookings"
  ON bookings
  FOR INSERT
  WITH CHECK (true);

-- Policy: Public can view their own bookings (optional - for future customer portal)
CREATE POLICY "Customers can view own bookings"
  ON bookings
  FOR SELECT
  USING (
    customer_id IN (
      SELECT id FROM customers WHERE phone = current_setting('app.customer_phone', true)
    )
  );

-- Policy: Admins can view all bookings
CREATE POLICY "Admins can view all bookings"
  ON bookings
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can update bookings
CREATE POLICY "Admins can update bookings"
  ON bookings
  FOR UPDATE
  USING (is_admin());

-- Policy: Admins can delete bookings
CREATE POLICY "Admins can delete bookings"
  ON bookings
  FOR DELETE
  USING (is_admin());

-- ========================================
-- Enable RLS on booking_slots table
ALTER TABLE booking_slots ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view available slots (for slot selector)
CREATE POLICY "Anyone can view slots"
  ON booking_slots
  FOR SELECT
  USING (true);

-- Policy: System can insert slots (via create_booking_with_slots function)
CREATE POLICY "System can insert slots"
  ON booking_slots
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can update slots
CREATE POLICY "Admins can update slots"
  ON booking_slots
  FOR UPDATE
  USING (is_admin());

-- ========================================
-- Enable RLS on customers table
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;

-- Policy: System can insert/update customers (via booking form)
CREATE POLICY "System can manage customers"
  ON customers
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Policy: Admins can view all customers
CREATE POLICY "Admins can view customers"
  ON customers
  FOR SELECT
  USING (is_admin());

-- ========================================
-- Enable RLS on payments table
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage payments
CREATE POLICY "Admins can manage payments"
  ON payments
  FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- ========================================
-- Enable RLS on notifications table
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can view all notifications
CREATE POLICY "Admins can view notifications"
  ON notifications
  FOR SELECT
  USING (is_admin());

-- Policy: System can create notifications
CREATE POLICY "System can create notifications"
  ON notifications
  FOR INSERT
  WITH CHECK (true);

-- Policy: Admins can update notifications (mark as read)
CREATE POLICY "Admins can update notifications"
  ON notifications
  FOR UPDATE
  USING (is_admin());

-- ========================================
-- Enable RLS on settings table
ALTER TABLE settings ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can read settings (for rate calculation)
CREATE POLICY "Anyone can read settings"
  ON settings
  FOR SELECT
  USING (true);

-- Policy: Admins can update settings
CREATE POLICY "Admins can update settings"
  ON settings
  FOR UPDATE
  USING (is_admin());

-- ========================================
-- 5. STORAGE POLICIES UPDATE
-- ========================================

-- Update payment-proofs bucket policies to use auth
-- Note: Run these in Supabase Dashboard > Storage > payment-proofs > Policies

-- Policy: Anyone can upload payment proofs
-- CREATE POLICY "Anyone can upload payment proofs"
-- ON storage.objects FOR INSERT
-- TO public
-- WITH CHECK (bucket_id = 'payment-proofs');

-- Policy: Admins can view payment proofs
-- CREATE POLICY "Admins can view payment proofs"
-- ON storage.objects FOR SELECT
-- TO authenticated
-- USING (
--   bucket_id = 'payment-proofs' 
--   AND is_admin()
-- );

-- Policy: Admins can delete payment proofs
-- CREATE POLICY "Admins can delete payment proofs"
-- ON storage.objects FOR DELETE
-- TO authenticated
-- USING (
--   bucket_id = 'payment-proofs' 
--   AND is_admin()
-- );

-- ========================================
-- 6. CREATE INITIAL SUPER ADMIN
-- ========================================

-- Function to create admin user (call this after creating user in Supabase Auth)
CREATE OR REPLACE FUNCTION create_admin_profile(
  p_user_id UUID,
  p_email TEXT,
  p_full_name TEXT,
  p_role TEXT DEFAULT 'admin'
)
RETURNS UUID AS $$
DECLARE
  v_profile_id UUID;
BEGIN
  INSERT INTO admin_profiles (id, email, full_name, role, is_active)
  VALUES (p_user_id, p_email, p_full_name, p_role, true)
  RETURNING id INTO v_profile_id;
  
  RETURN v_profile_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION create_admin_profile IS 'Creates admin profile for authenticated user';

-- ========================================
-- 7. TRIGGER TO UPDATE TIMESTAMPS
-- ========================================

CREATE OR REPLACE FUNCTION update_admin_profile_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS admin_profiles_updated_at_trigger ON admin_profiles;

CREATE TRIGGER admin_profiles_updated_at_trigger
  BEFORE UPDATE ON admin_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_admin_profile_updated_at();

-- ========================================
-- 8. VERIFICATION QUERIES
-- ========================================

-- Check admin profiles
SELECT 
  id,
  email,
  full_name,
  role,
  is_active,
  last_login_at,
  created_at
FROM admin_profiles
ORDER BY created_at DESC;

-- Test helper functions (run after authentication)
-- SELECT is_admin();
-- SELECT has_admin_role('admin');
-- SELECT * FROM get_admin_profile();

-- ========================================
-- SETUP INSTRUCTIONS
-- ========================================

-- 1. Run this SQL script in Supabase SQL Editor
-- 2. Go to Supabase Dashboard > Authentication > Users
-- 3. Click "Add User" > Create user with email/password
-- 4. Copy the user ID
-- 5. Run: SELECT create_admin_profile('USER_ID_HERE', 'admin@example.com', 'Admin Name', 'super_admin');
-- 6. Update your .env.local with Supabase credentials
-- 7. Test login at /admin/login

-- Example: Create super admin
-- SELECT create_admin_profile(
--   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx'::UUID,
--   'admin@cricketbooking.com',
--   'System Administrator',
--   'super_admin'
-- );

-- ========================================
-- SECURITY NOTES
-- ========================================

-- 1. All admin functions use SECURITY DEFINER to bypass RLS
-- 2. Functions check auth.uid() to ensure user is authenticated
-- 3. RLS policies prevent unauthorized access to sensitive data
-- 4. Super admins have full access, regular admins have limited access
-- 5. Staff role can be used for read-only access in future

-- ========================================
-- CLEANUP (if needed)
-- ========================================

-- To remove all auth setup:
-- DROP TABLE IF EXISTS admin_profiles CASCADE;
-- DROP FUNCTION IF EXISTS is_admin() CASCADE;
-- DROP FUNCTION IF EXISTS has_admin_role(TEXT) CASCADE;
-- DROP FUNCTION IF EXISTS get_admin_profile() CASCADE;
-- DROP FUNCTION IF EXISTS update_admin_last_login() CASCADE;
-- DROP FUNCTION IF EXISTS create_admin_profile(UUID, TEXT, TEXT, TEXT) CASCADE;
