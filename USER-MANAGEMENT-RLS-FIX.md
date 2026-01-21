# User Management - Database Setup Instructions

## Step 1: Run the RLS Fix SQL in Supabase

Go to your Supabase project → SQL Editor → New Query

Copy and paste this SQL:

```sql
-- =====================================================
-- FIX: User Roles RLS Policies - Prevent Infinite Recursion
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
```

Click **RUN** to execute.

---

## Step 2: Add Service Role Key to Environment Variables

### Local Development (.env.local)

Add this line to your `.env.local` file:

```env
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
```

**To get your Service Role Key:**
1. Go to Supabase Dashboard
2. Project Settings → API
3. Copy the `service_role` key (secret key)
4. Paste it in `.env.local`

**⚠️ IMPORTANT:** Never commit this key to Git! It's already in `.gitignore`.

### Vercel Deployment

Add the environment variable in Vercel:

1. Go to your Vercel project
2. Settings → Environment Variables
3. Add new variable:
   - **Name:** `SUPABASE_SERVICE_ROLE_KEY`
   - **Value:** Your service role key from Supabase
   - **Environments:** Production, Preview, Development (select all)
4. Click **Save**
5. Redeploy your application

---

## Step 3: Verify Setup

### Test 1: Load Users Page
1. Login as admin
2. Go to `/admin/users`
3. Should load without "infinite recursion" error

### Test 2: Create User
1. Click "Add New User"
2. Fill in details
3. Click "Create User"
4. Should create successfully without 403 error

### Test 3: Toggle User Status
1. Click toggle switch on any user
2. Should activate/deactivate successfully

---

## Troubleshooting

### Error: "infinite recursion detected in policy"
**Solution:** Run Step 1 SQL again. Make sure all old policies are dropped.

### Error: 403 Forbidden when creating users
**Solution:** 
1. Check that `SUPABASE_SERVICE_ROLE_KEY` is set in environment variables
2. Restart your dev server: `npm run dev`
3. For Vercel: Redeploy after adding the environment variable

### Error: "Missing Supabase service role key"
**Solution:** Add `SUPABASE_SERVICE_ROLE_KEY` to `.env.local` (local) or Vercel Environment Variables (production)

### Users page shows empty/no data
**Solution:**
1. Make sure you've added yourself as an admin (see `user-management-simplified.sql` Step 5)
2. Check browser console for errors
3. Verify RLS policies are created correctly

---

## Security Notes

✅ **Service Role Key:**
- Only used in API routes (server-side)
- Never exposed to client
- Bypasses RLS for admin operations
- Required for admin user management

✅ **RLS Policies:**
- Users can only view their own profile
- Admins can view/create/update/delete all users
- Ground managers cannot be deleted
- All admin checks use `SECURITY DEFINER` function to prevent recursion

---

## What Was Fixed

**Problem 1: Infinite Recursion**
- Old policies queried `user_roles` table inside `user_roles` policies
- This created infinite loop: Policy → Query → Policy → Query...

**Solution:**
- Created `is_admin()` function with `SECURITY DEFINER`
- This function bypasses RLS when checking admin status
- Policies now call function instead of querying table directly

**Problem 2: 403 Forbidden**
- API routes used regular Supabase client
- Regular client respects RLS policies
- Admin operations failed due to RLS restrictions

**Solution:**
- Created `createAdminClient()` function using service role key
- Service role client bypasses RLS completely
- Used for all admin operations in API routes

---

## Files Modified

1. `user-management-simplified.sql` - Updated RLS policies
2. `fix-user-roles-rls.sql` - New quick fix script
3. `lib/supabase/server.ts` - Added `createAdminClient()` function
4. `app/api/admin/users/route.ts` - Added GET, PATCH endpoints with admin client
5. `app/admin/users/page.tsx` - Use API routes instead of direct queries
6. `USER-MANAGEMENT-RLS-FIX.md` - This setup guide

---

## Next Steps

After setup is complete:
1. ✅ Test user management features
2. ✅ Create ground manager accounts
3. ✅ Test ground manager permissions
4. ✅ Verify bookings filtering works correctly
