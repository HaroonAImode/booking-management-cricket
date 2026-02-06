# 🚨 CRITICAL: Booking Function Not Found - IMMEDIATE FIX REQUIRED

## Issue
**Status**: 🔴 BLOCKING ALL CUSTOMER BOOKINGS  
**Error**: `Could not find the function public.create_booking_with_slots in the schema cache`  
**Impact**: Customers cannot complete bookings - 404 error on function call

## Root Cause
The database function `create_booking_with_slots` is either:
1. **Not deployed** to your production database, OR
2. **Schema cache not refreshed** after function changes, OR
3. **Permission issues** preventing public access

This is a **PostgREST/Supabase schema cache issue** - common after database function updates.

## IMMEDIATE FIX (5 minutes)

### Step 1: Run Emergency SQL Script
1. **Open Supabase Dashboard** → Your Project
2. Go to **SQL Editor** (left sidebar)
3. Create **New Query**
4. Copy **ENTIRE contents** of: `EMERGENCY-FIX-BOOKING-FUNCTION.sql`
5. **Paste** into SQL Editor
6. Click **Run** (or press F5)

**Expected Output**:
```
Success (multiple statements executed)
```

### Step 2: Verify Function Exists
The script includes verification. You should see:
```
routine_name: create_booking_with_slots
routine_type: FUNCTION
data_type: record
```

### Step 3: Test Customer Booking
1. Go to your booking form
2. Fill in customer details
3. Select slots
4. Upload payment proof
5. Click "Book Now"

**Expected**: ✅ Success message or specific error (not 404 function not found)

## What The Fix Does

### 1. Drops ALL Versions
```sql
DROP FUNCTION IF EXISTS public.create_booking_with_slots CASCADE;
```
Removes any conflicting function versions.

### 2. Recreates With Exact Signature
```sql
CREATE OR REPLACE FUNCTION public.create_booking_with_slots(
  p_customer_name text,
  p_booking_date date,
  p_total_hours integer,
  p_total_amount numeric,
  p_advance_payment numeric,
  p_advance_payment_method text,
  p_advance_payment_proof text,
  p_slots jsonb,
  p_customer_phone text DEFAULT NULL,
  p_customer_notes text DEFAULT NULL
)
```
Matches EXACTLY what the frontend is calling.

### 3. Grants Public Access
```sql
GRANT EXECUTE ON FUNCTION ... TO anon;
GRANT EXECUTE ON FUNCTION ... TO authenticated;
GRANT EXECUTE ON FUNCTION ... TO public;
```
Ensures anonymous customers can call the function.

### 4. Forces Schema Reload
```sql
NOTIFY pgrst, 'reload schema';
```
Refreshes PostgREST's function cache (done multiple times).

### 5. Enhanced Error Handling
Added `WHEN OTHERS` exception handler to catch ANY database error and rollback cleanly.

## Why This Keeps Happening

### Problem: Schema Cache Out of Sync
When you run SQL scripts directly in Supabase SQL Editor:
1. Function gets created in PostgreSQL ✅
2. PostgREST might not notice the change immediately ❌
3. Schema cache shows old version or "not found" ❌

### Solution: Always Include Schema Reload
Every SQL script that modifies functions MUST include:
```sql
NOTIFY pgrst, 'reload schema';
```

But sometimes this isn't enough - PostgREST might need:
- Multiple reload notifications
- Waiting 1-2 minutes for cache refresh
- Restarting PostgREST (Supabase staff only)

## Prevention: Development Workflow

### For Future Database Changes

1. **Test in Supabase SQL Editor First**
   ```sql
   -- Make your changes
   CREATE OR REPLACE FUNCTION ...
   
   -- ALWAYS add at the end:
   NOTIFY pgrst, 'reload schema';
   
   -- Verify it worked:
   SELECT routine_name FROM information_schema.routines 
   WHERE routine_name = 'your_function_name';
   ```

2. **Wait 30 Seconds** after running
   - Give PostgREST time to refresh cache

3. **Test From Frontend**
   - Don't assume it worked - actually test the feature

4. **Save SQL Script to Git**
   - Version control all database changes
   - Makes it easy to re-run if needed

### Recommended: Migration System
Consider using a proper migration system like:
- **Supabase Migrations** (CLI tool)
- **Flyway** or **Liquibase**
- Custom versioned SQL scripts with tracking table

## Troubleshooting

### If Function Still Not Found After Running Fix

#### Option 1: Wait 5 Minutes
PostgREST cache refresh isn't instantaneous. Wait 5 minutes then try again.

#### Option 2: Check Function Exists
Run in SQL Editor:
```sql
\df+ create_booking_with_slots
```
OR
```sql
SELECT routine_name, specific_name
FROM information_schema.routines
WHERE routine_name = 'create_booking_with_slots';
```

**If NO results**: Function wasn't created - check for SQL errors in output.  
**If HAS results**: Function exists but cache issue - wait or contact Supabase support.

#### Option 3: Check Permissions
```sql
SELECT 
  routine_name,
  grantee,
  privilege_type
FROM information_schema.routine_privileges
WHERE routine_name = 'create_booking_with_slots';
```

Should show:
- `anon` with `EXECUTE`
- `authenticated` with `EXECUTE`
- `public` with `EXECUTE`

#### Option 4: Check PostgREST Logs
Supabase Dashboard → Database → Logs → PostgREST

Look for errors mentioning `create_booking_with_slots`.

#### Option 5: Contact Supabase Support
If nothing works after 1 hour:
1. Open Supabase Dashboard
2. Click **Support** (bottom left)
3. Describe issue: "PostgREST not finding function after creation"
4. Provide function name: `public.create_booking_with_slots`
5. They can manually reload PostgREST

### If Different Error After Fix

✅ **GOOD NEWS**: Function is now found!

Handle the new error:
- "Slot conflict" = Normal (slot already booked)
- "check_and_reserve_slots not found" = Run `booking-conflict-prevention.sql`
- "Permission denied" = Check RLS policies on tables

## Current Status After Fix

✅ Function recreated with correct signature  
✅ Public access granted (anon, authenticated, public)  
✅ Schema reload notifications sent  
✅ Multi-day booking support included (slot_date)  
✅ Enhanced error handling (catches all exceptions)  
✅ Frontend updated to send slot_date  

## Testing Checklist

After running the fix:
- [ ] Run SQL verification query (included in script)
- [ ] Wait 2 minutes for cache refresh
- [ ] Test customer booking form
- [ ] Check admin panel shows new booking
- [ ] Verify slots appear correctly
- [ ] Test multi-day booking (select slots across 2 days)
- [ ] Monitor for next 24 hours

## Files Changed

1. **EMERGENCY-FIX-BOOKING-FUNCTION.sql** - Run this NOW in Supabase
2. **lib/supabase/bookings.ts** - Updated to include slot_date in JSON
3. **This document** - Reference for future issues

## Next Steps

1. ✅ **IMMEDIATE**: Run EMERGENCY-FIX-BOOKING-FUNCTION.sql
2. ✅ Commit code changes: `git add . && git commit -m "fix: Include slot_date in booking slots JSON"`
3. ✅ Deploy frontend changes
4. ⏰ Wait 2 minutes for schema cache refresh
5. ✅ Test customer booking flow end-to-end
6. 📊 Monitor error logs for next hour
7. 🔔 Inform customers booking system is back online

## Prevention Checklist

For ALL future database function changes:
- [ ] Write SQL script in file first
- [ ] Include `NOTIFY pgrst, 'reload schema';` at end
- [ ] Test in Supabase SQL Editor
- [ ] Wait 30 seconds after running
- [ ] Verify function exists with `\df+` command
- [ ] Test from frontend immediately
- [ ] Save SQL script to git
- [ ] Document in commit message

---

**Status**: 🔴 CRITICAL - FIX IMMEDIATELY  
**Priority**: P0 - Blocking production bookings  
**Estimated Fix Time**: 5 minutes  
**Files**: EMERGENCY-FIX-BOOKING-FUNCTION.sql (ready to run)

**ACTION REQUIRED**: Run emergency SQL script in Supabase NOW!
