# STEP-BY-STEP DATABASE FIX APPLICATION

## 🎯 OBJECTIVE
Apply the comprehensive slot status fix to your database and verify it works.

---

## 📋 STEP 1: Check Current State

**Run this in Supabase SQL Editor:**
```sql
-- Copy and paste all content from: verify-database-state.sql
```

**What to look for:**
- Query #1: Check if functions exist (should show `get_available_slots` but maybe not the new functions)
- Query #5: Check for expired pending bookings
- Query #6: Check for status inconsistencies
- Summary Report: Overview of your database

**Expected Result:** You'll see what's currently working and what needs fixing.

---

## 📋 STEP 2: Apply the Fix

**In Supabase SQL Editor, run the entire file:**
```sql
-- Copy ALL content from: fix-slots-status-comprehensive.sql
-- Paste into Supabase SQL Editor
-- Click "Run" or press Ctrl+Enter
```

**Expected Output:**
```
✅ Slot status fix applied successfully!
Functions created: cleanup_expired_pending_bookings, get_available_slots, check_and_lock_slots
View created: v_current_slot_status
```

**If you get errors:**
- Share the error message with me
- Don't worry - the BEGIN/COMMIT will prevent partial application

---

## 📋 STEP 3: Verify Installation

**Run these queries ONE BY ONE:**

### 3.1 Check Functions Exist
```sql
SELECT proname 
FROM pg_proc 
WHERE proname IN (
  'cleanup_expired_pending_bookings',
  'get_available_slots',
  'check_and_lock_slots'
);
```
**Expected:** Should return 3 rows with those function names.

---

### 3.2 Test Cleanup Function
```sql
SELECT cleanup_expired_pending_bookings();
```
**Expected:** Returns a number (count of expired bookings cleaned up, could be 0).

---

### 3.3 Test Get Available Slots
```sql
SELECT * FROM get_available_slots(CURRENT_DATE) LIMIT 5;
```
**Expected:** Returns 5 rows with columns:
- slot_hour
- slot_time
- is_available
- current_status
- hourly_rate
- is_night_rate

---

### 3.4 Check Slot Status View
```sql
SELECT * FROM v_current_slot_status 
WHERE slot_date = CURRENT_DATE
LIMIT 5;
```
**Expected:** Returns current slot bookings with accurate status.

---

### 3.5 Test Conflict Check Function
```sql
SELECT * FROM check_and_lock_slots(
  CURRENT_DATE, 
  ARRAY[14, 15, 16]
);
```
**Expected:** Returns 3 rows showing if slots 14, 15, 16 are available.

---

## 📋 STEP 4: Manual Cleanup (if needed)

**If you have expired bookings, clean them up:**
```sql
-- First, see what will be cleaned
SELECT 
  booking_number,
  status,
  pending_expires_at,
  EXTRACT(HOUR FROM (NOW() - pending_expires_at)) AS hours_expired
FROM bookings
WHERE status = 'pending' 
AND pending_expires_at < NOW();

-- Then clean them up
SELECT cleanup_expired_pending_bookings();

-- Verify they're gone
SELECT COUNT(*) 
FROM bookings
WHERE status = 'pending' 
AND pending_expires_at < NOW();
-- Should return 0
```

---

## 📋 STEP 5: Test Real Slot Fetching

**Test for today:**
```sql
SELECT 
  slot_hour,
  current_status,
  is_available,
  hourly_rate
FROM get_available_slots(CURRENT_DATE)
ORDER BY slot_hour;
```

**What to verify:**
- All 24 hours (0-23) are returned
- Status is one of: 'available', 'pending', 'booked', 'past'
- Past hours (before current time) show status = 'past'
- Night hours (17-23, 0-6) have higher rate (2000)
- Day hours (7-16) have lower rate (1500)

---

## 📋 STEP 6: Test on Frontend

1. **Open booking page:** `/bookings`
2. **Check browser console** (F12):
   - Should see: `🔍 Fetching slots for date:`
   - Should see: `✅ Public API response:`
   - Should see: `🎯 Processed slots:`
3. **Wait 10 seconds:**
   - Should see: `🔄 Auto-refreshing slots...`
4. **Check slots display:**
   - Available slots = Green with ✓
   - Booked slots = Gray with "BOOKED"
   - Pending slots = Orange with ⏳
   - Past slots = Red with ⏱️

---

## 📋 STEP 7: Test Concurrent Booking Prevention

**Open TWO browser tabs:**

**Tab 1:**
1. Select slots 14, 15, 16
2. Fill booking form
3. **STOP before submitting**

**Tab 2:**
1. Select same slots 14, 15, 16
2. Fill booking form
3. Submit booking

**Tab 1:**
1. Now try to submit
2. **Expected:** Should get error: "Booking Conflict" with message about slots already booked
3. Page should reload showing updated status

---

## ✅ SUCCESS CHECKLIST

- [ ] All 3 functions exist in database
- [ ] `cleanup_expired_pending_bookings()` returns a number
- [ ] `get_available_slots(CURRENT_DATE)` returns 24 rows
- [ ] `v_current_slot_status` view exists and has data
- [ ] Frontend shows "🔄 Auto-refreshing" in console
- [ ] Live status indicator visible on booking page
- [ ] Concurrent booking test prevents conflicts
- [ ] Past time slots show as "past" status
- [ ] No expired pending bookings remain

---

## 🐛 TROUBLESHOOTING

### Error: "function does not exist"
**Solution:** You haven't run `fix-slots-status-comprehensive.sql` yet. Go to Step 2.

### Error: "column does not exist"
**Solution:** Your database schema might be different. Share the error and I'll adjust.

### Functions exist but slots show wrong status
**Solution:**
```sql
-- Force cleanup
SELECT cleanup_expired_pending_bookings();

-- Check specific date
SELECT * FROM get_available_slots(CURRENT_DATE);

-- Check if any booking has wrong status
SELECT * FROM v_current_slot_status 
WHERE actual_status != slot_status
AND slot_date >= CURRENT_DATE;
```

### Auto-refresh not working
**Solution:**
- Check browser console for errors
- Verify you're on the calendar view (not form view)
- Check network tab - should see requests every 10 seconds

### Still getting booking conflicts
**Solution:**
```sql
-- Check if conflict check function works
SELECT * FROM check_and_lock_slots(CURRENT_DATE, ARRAY[14]);

-- Verify it's being called from frontend
-- Check browser console for: "🔒 Performing enhanced conflict check"
```

---

## 📞 NEED HELP?

**If something doesn't work:**

1. Run the verification queries from `verify-database-state.sql`
2. Share the output with me
3. Share any error messages you see
4. Share browser console logs if frontend issue

**Common Issues:**
- ❌ Function doesn't exist → Run Step 2 again
- ❌ RLS blocking access → Check permissions (Query #10 in verify script)
- ❌ Wrong slot status → Run cleanup: `SELECT cleanup_expired_pending_bookings();`
- ❌ Frontend not updating → Check console, verify auto-refresh is enabled

---

**Files you need:**
1. `fix-slots-status-comprehensive.sql` - The fix to apply
2. `verify-database-state.sql` - Queries to check current state
3. This guide - Follow steps in order

**Estimated Time:** 10-15 minutes
**Difficulty:** Easy (just copy-paste SQL)
**Risk:** Low (uses transactions, can rollback)

---

Good luck! Let me know when you've completed Step 3 so we can verify everything works! 🚀
