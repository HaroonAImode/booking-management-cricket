# Quick Fix Guide - Admin Login Issues

## Issue 1: "Access denied. Admin privileges required"

### Cause
You logged in successfully, but your user account doesn't have an entry in the `admin_profiles` table.

### Solution

**Option A: Using Supabase Dashboard (Recommended)**

1. Go to https://app.supabase.com
2. Select your project
3. Go to **Table Editor** → **admin_profiles** table
4. Click **Insert** → **Insert row**
5. Fill in:
   - `id`: Select your user from the dropdown (or get from auth.users table)
   - `email`: Your login email
   - `full_name`: Your name
   - `role`: Select `super_admin`
   - `is_active`: Check the box (true)
6. Click **Save**

**Option B: Using SQL Editor**

1. Go to https://app.supabase.com
2. Select your project
3. Go to **SQL Editor**
4. First, find your user UUID:
   ```sql
   SELECT id, email, created_at 
   FROM auth.users 
   ORDER BY created_at DESC 
   LIMIT 5;
   ```
5. Copy your UUID, then run:
   ```sql
   INSERT INTO admin_profiles (id, email, full_name, role, is_active)
   VALUES (
     'YOUR_UUID_HERE',      -- Paste UUID from step 4
     'your@email.com',      -- Your actual email
     'Your Name',           -- Your actual name
     'super_admin',         -- Role (super_admin, admin, or staff)
     true                   -- Active status
   );
   ```

**Option C: Quick Script**

See `create-first-admin.sql` file for a complete script.

---

## Issue 2: "column reference 'slot_hour' is ambiguous"

### Cause
SQL query joining multiple tables with `slot_hour` column without proper qualification.

### Solution
This error typically happens when:
1. Database function `get_available_slots` conflicts with a JOIN
2. Multiple tables in query have `slot_hour` column

**Quick Fix - Update the SQL function:**

Run this in Supabase SQL Editor:

```sql
-- Fix ambiguous column reference in get_available_slots
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
  night_start TIME;
  night_end TIME;
  current_hour INTEGER;
  slot_time_val TIME;
  slot_exists BOOLEAN;
  slot_status TEXT;
BEGIN
  -- Get current rates from settings
  SELECT setting_value::NUMERIC INTO day_rate
  FROM settings WHERE setting_key = 'day_rate_per_hour';
  
  SELECT setting_value::NUMERIC INTO night_rate
  FROM settings WHERE setting_key = 'night_rate_per_hour';
  
  SELECT setting_value::TIME INTO night_start
  FROM settings WHERE setting_key = 'night_start_time';
  
  SELECT setting_value::TIME INTO night_end
  FROM settings WHERE setting_key = 'night_end_time';
  
  -- Generate all 24 hours
  FOR current_hour IN 0..23 LOOP
    slot_time_val := (current_hour || ':00:00')::TIME;
    
    -- Check if slot exists in booking_slots (qualified column names)
    SELECT EXISTS(
      SELECT 1 FROM booking_slots bs
      WHERE bs.slot_date = p_date
      AND bs.slot_hour = current_hour
      AND bs.status IN ('pending', 'booked')
    ) INTO slot_exists;
    
    -- Get slot status if exists (qualified column names)
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
    
    -- Determine rate (night vs day)
    RETURN QUERY SELECT
      current_hour AS slot_hour,
      slot_time_val AS slot_time,
      NOT slot_exists AS is_available,
      slot_status AS current_status,
      CASE
        WHEN (slot_time_val >= night_start OR slot_time_val < night_end) THEN night_rate
        ELSE day_rate
      END AS hourly_rate;
  END LOOP;
END;
$$ LANGUAGE plpgsql;
```

---

## Issue 3: API Returns 401 Unauthorized

### Cause
The authentication cookie is not being sent or the session expired.

### Solution

**Clear and Re-login:**

1. Open browser DevTools (F12)
2. Go to **Application** → **Storage** → **Clear site data**
3. Or manually:
   - Clear **Cookies** (all supabase-related)
   - Clear **Local Storage**
   - Clear **Session Storage**
4. Reload page
5. Login again

**Verify Environment Variables:**

Make sure `.env.local` has correct values:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...your-actual-key
```

After updating, restart the server:
```bash
# Kill server (Ctrl+C)
npm run dev
```

---

## Complete Setup Checklist

### ✅ Database Setup
- [ ] `admin_profiles` table created (run `admin-authentication-setup.sql`)
- [ ] At least one admin user in `admin_profiles` table
- [ ] RLS policies enabled on `admin_profiles`
- [ ] Database functions created (run `database-schema-v2.sql`)

### ✅ Environment Variables
- [ ] `.env.local` file exists
- [ ] `NEXT_PUBLIC_SUPABASE_URL` is set correctly
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` is set correctly
- [ ] Development server restarted after setting variables

### ✅ Authentication Flow
- [ ] Can access `/admin/login` page
- [ ] Can login with admin credentials
- [ ] After login, redirected to `/admin/dashboard`
- [ ] Dashboard loads without 401 errors
- [ ] Navigation menu appears

---

## Testing Steps

1. **Test Login Page Access:**
   ```
   Visit: http://localhost:3000/admin/login
   Expected: Login form appears
   ```

2. **Test Login:**
   ```
   Enter credentials and submit
   Expected: Redirect to dashboard
   ```

3. **Test Admin Profile:**
   ```
   SQL: SELECT * FROM admin_profiles WHERE email = 'your@email.com';
   Expected: One row with your user data
   ```

4. **Test API Access:**
   ```
   Browser Console: 
   fetch('/api/admin/dashboard').then(r => r.json()).then(console.log)
   Expected: Dashboard data (not 401 error)
   ```

5. **Test Bookings:**
   ```
   Visit: http://localhost:3000/bookings
   Select a date
   Expected: Available slots appear (not ambiguous column error)
   ```

---

## Common Issues & Solutions

### "Invalid login credentials"
- Check email/password are correct
- User must exist in `auth.users` table (sign up first)

### "Access denied. Admin privileges required"
- User exists in `auth.users` but NOT in `admin_profiles`
- Solution: Add entry to `admin_profiles` table (see Issue 1 above)

### "Ambiguous column" error
- Database function needs qualified column names
- Solution: Update function with `bs.slot_hour` instead of `slot_hour`

### Session expires immediately
- Check browser allows cookies
- Check for conflicts with browser extensions
- Try incognito mode

### Can't see admin profile in table
- Check RLS policies: `SELECT * FROM admin_profiles;` in SQL Editor
- Might need to run query as postgres user (Service Role key)

---

## Need Help?

1. Check browser console (F12) for JavaScript errors
2. Check terminal for server errors
3. Check Supabase logs in dashboard
4. Verify all SQL files have been executed in correct order

## Files to Run in Order:

1. `database-schema-v2.sql` - Core tables and functions
2. `admin-authentication-setup.sql` - Admin auth setup
3. `create-first-admin.sql` - Create your first admin user
4. Restart Next.js server: `npm run dev`
