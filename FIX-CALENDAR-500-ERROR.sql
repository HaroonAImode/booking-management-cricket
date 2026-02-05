-- ========================================
-- FIX CALENDAR 500 ERROR
-- ========================================
-- Issue: Calendar API returning 500 error
-- Root Cause: API checking user_roles table which may not have data
-- Solution: Check which table contains admin data and fix

-- ========================================
-- 1. CHECK WHICH TABLES EXIST AND HAVE DATA
-- ========================================

-- Check if user_roles table exists and has data
SELECT 'user_roles table' as table_name, COUNT(*) as row_count 
FROM user_roles;

-- Check if admin_profiles table exists and has data
SELECT 'admin_profiles table' as table_name, COUNT(*) as row_count 
FROM admin_profiles;

-- ========================================
-- 2. VIEW YOUR ADMIN DATA
-- ========================================

-- Show user_roles data
SELECT 'USER_ROLES DATA:' as info;
SELECT user_id, email, name, role, is_active, created_at
FROM user_roles
ORDER BY created_at DESC;

-- Show admin_profiles data
SELECT 'ADMIN_PROFILES DATA:' as info;
SELECT id, email, full_name, role, is_active, created_at
FROM admin_profiles
ORDER BY created_at DESC;

-- ========================================
-- 3. SYNC SOLUTION (if user_roles is empty but admin_profiles has data)
-- ========================================

-- Option A: Copy admin_profiles data to user_roles
INSERT INTO user_roles (user_id, email, name, role, is_active, created_at, updated_at)
SELECT 
  id as user_id,
  email,
  full_name as name,
  role,
  is_active,
  created_at,
  updated_at
FROM admin_profiles
WHERE id NOT IN (SELECT user_id FROM user_roles)
ON CONFLICT (user_id) DO UPDATE
SET 
  email = EXCLUDED.email,
  name = EXCLUDED.name,
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- Verify sync
SELECT 'AFTER SYNC:' as info;
SELECT COUNT(*) as user_roles_count FROM user_roles;
SELECT COUNT(*) as admin_profiles_count FROM admin_profiles;

-- ========================================
-- 4. VERIFICATION
-- ========================================

-- Test the exact query that API uses
SELECT 
  ur.user_id,
  ur.email,
  ur.name,
  ur.role,
  ur.is_active
FROM user_roles ur
WHERE ur.is_active = true
LIMIT 5;

-- Show your admin account specifically (replace with your email)
SELECT * FROM user_roles WHERE email ILIKE '%admin%';
SELECT * FROM admin_profiles WHERE email ILIKE '%admin%';
