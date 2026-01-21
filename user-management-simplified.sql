-- =====================================================
-- SIMPLIFIED USER MANAGEMENT SYSTEM - DATABASE SCHEMA
-- =====================================================
-- This schema creates a simple role-based user management system
-- with admin and ground_manager roles
-- =====================================================

-- =====================================================
-- 1. USER ROLES TABLE
-- =====================================================
-- Stores all users with their roles and information

CREATE TABLE IF NOT EXISTS user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20),
  role VARCHAR(50) NOT NULL DEFAULT 'ground_manager',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON user_roles(role);
CREATE INDEX IF NOT EXISTS idx_user_roles_email ON user_roles(email);

-- =====================================================
-- 2. ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on user_roles table
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view own profile" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_roles;
DROP POLICY IF EXISTS "Admins can create users" ON user_roles;
DROP POLICY IF EXISTS "Admins can update users" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete ground managers" ON user_roles;

-- Create a SECURITY DEFINER function to check admin role
-- This bypasses RLS and prevents infinite recursion
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = auth.uid()
    AND role = 'admin'
    AND is_active = true
  );
END;
$$;

-- Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all profiles (using SECURITY DEFINER function)
CREATE POLICY "Admins can view all profiles"
  ON user_roles
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can insert new users (using SECURITY DEFINER function)
CREATE POLICY "Admins can create users"
  ON user_roles
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Admins can update users (using SECURITY DEFINER function)
CREATE POLICY "Admins can update users"
  ON user_roles
  FOR UPDATE
  USING (is_admin());

-- Policy: Admins can delete ground managers only (using SECURITY DEFINER function)
CREATE POLICY "Admins can delete ground managers"
  ON user_roles
  FOR DELETE
  USING (
    role = 'ground_manager' AND is_admin()
  );

-- =====================================================
-- 3. HELPER FUNCTIONS
-- =====================================================

-- Function to check if a user has a specific role
CREATE OR REPLACE FUNCTION check_user_role(
  p_user_id UUID,
  p_role VARCHAR
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  has_role BOOLEAN;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = p_user_id
    AND role = p_role
    AND is_active = true
  ) INTO has_role;
  
  RETURN has_role;
END;
$$;

-- Function to get user role
CREATE OR REPLACE FUNCTION get_user_role(p_user_id UUID)
RETURNS VARCHAR
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  user_role VARCHAR;
BEGIN
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = p_user_id
  AND is_active = true;
  
  RETURN user_role;
END;
$$;

-- =====================================================
-- 4. TRIGGERS FOR UPDATED_AT
-- =====================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for user_roles
CREATE TRIGGER update_user_roles_updated_at
  BEFORE UPDATE ON user_roles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- 5. INITIAL SETUP
-- =====================================================
-- After running this schema, you need to manually add your first admin:
--
-- INSERT INTO user_roles (user_id, name, email, role, is_active)
-- VALUES (
--   'YOUR_USER_ID_FROM_AUTH_USERS',  -- Get this from Supabase Auth > Users
--   'Admin Name',
--   'admin@example.com',
--   'admin',
--   true
-- );
--
-- Replace YOUR_USER_ID_FROM_AUTH_USERS with your actual user ID from auth.users table
-- =====================================================
