-- =====================================================
-- FIX: User Roles RLS Policies - Prevent Infinite Recursion
-- =====================================================
-- Run this SQL in Supabase SQL Editor to fix the RLS policies
-- =====================================================

-- Step 1: Drop all existing policies to start fresh
DROP POLICY IF EXISTS "Users can view own profile" ON user_roles;
DROP POLICY IF EXISTS "Admins can view all profiles" ON user_roles;
DROP POLICY IF EXISTS "Admins can create users" ON user_roles;
DROP POLICY IF EXISTS "Admins can update users" ON user_roles;
DROP POLICY IF EXISTS "Admins can delete ground managers" ON user_roles;

-- Step 2: Create a SECURITY DEFINER function to check admin role
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

-- Step 3: Create new policies using the SECURITY DEFINER function

-- Policy: Users can read their own profile
CREATE POLICY "Users can view own profile"
  ON user_roles
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON user_roles
  FOR SELECT
  USING (is_admin());

-- Policy: Admins can insert new users
CREATE POLICY "Admins can create users"
  ON user_roles
  FOR INSERT
  WITH CHECK (is_admin());

-- Policy: Admins can update users
CREATE POLICY "Admins can update users"
  ON user_roles
  FOR UPDATE
  USING (is_admin());

-- Policy: Admins can delete ground managers only
CREATE POLICY "Admins can delete ground managers"
  ON user_roles
  FOR DELETE
  USING (
    role = 'ground_manager' AND is_admin()
  );

-- Step 4: Grant execute permission on the function
GRANT EXECUTE ON FUNCTION is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION is_admin() TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================
-- After running this, verify with:
-- SELECT * FROM user_roles; (should work without infinite recursion)
-- =====================================================
