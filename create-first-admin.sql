-- ========================================
-- CREATE FIRST ADMIN USER
-- ========================================
-- Run this in Supabase SQL Editor to create your first admin user
-- 
-- IMPORTANT: Replace the values below with your actual data
-- ========================================

-- Step 1: Sign up a user through your Supabase Auth UI or API first
-- Then get their UUID from the auth.users table and insert here

-- Step 2: Insert admin profile for that user
-- Replace 'USER_UUID_HERE' with the actual UUID from auth.users
-- Replace email and name with actual values

INSERT INTO admin_profiles (id, email, full_name, role, is_active)
VALUES (
  'USER_UUID_HERE'::UUID,  -- Replace with actual UUID from auth.users
  'admin@example.com',      -- Replace with actual email
  'Admin User',             -- Replace with actual name
  'super_admin',           -- Options: 'super_admin', 'admin', 'staff'
  true
)
ON CONFLICT (id) DO UPDATE SET
  role = EXCLUDED.role,
  is_active = EXCLUDED.is_active,
  updated_at = NOW();

-- ========================================
-- HOW TO GET USER UUID:
-- ========================================
-- Run this query in Supabase SQL Editor:

SELECT id, email, created_at 
FROM auth.users 
ORDER BY created_at DESC 
LIMIT 10;

-- Copy the UUID of the user you want to make admin
-- Then use it in the INSERT statement above

-- ========================================
-- VERIFICATION:
-- ========================================
-- After inserting, verify the admin profile was created:

SELECT * FROM admin_profiles;

-- ========================================
-- GRANT NECESSARY PERMISSIONS:
-- ========================================
-- Make sure the admin_profiles table has proper permissions

GRANT SELECT, INSERT, UPDATE ON admin_profiles TO authenticated;
GRANT SELECT ON admin_profiles TO anon;
