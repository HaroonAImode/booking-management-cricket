# Quick Fix Guide - Action Required ⚡

## ⚠️ CRITICAL: Database Migration Required

Your complete payment feature will NOT work until you run this SQL file:

### Step 1: Run bug-fixes.sql

1. Open Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** (left sidebar)
4. Click **+ New Query**
5. Open `bug-fixes.sql` file from your project
6. Copy ALL contents
7. Paste into Supabase SQL Editor
8. Click **RUN** button
9. Wait for "Success" message

**This fixes:** Complete payment 400 error ("booking_status does not exist")

---

## ✅ Already Fixed (Deployed to Vercel)

The following issues are already fixed in the code and will work after deployment:

1. **Calendar Mobile Error** - Changed to dayGridMonth view
2. **PDF Missing Columns** - Now includes Cash/Online columns
3. **Excel Export** - Updated with full payment breakdown
4. **Mobile Table** - Horizontal scrolling enabled
5. **Badge Display** - Full names (Cash, SadaPay, Easypaisa)

---

## 🔍 Payment Proof Images (404 Error)

If you still see 404 errors when viewing payment proof images:

### Check Storage Bucket:

1. Go to Supabase Dashboard
2. Click **Storage** (left sidebar)
3. Look for bucket named: `payment-proofs`

### If Bucket Doesn't Exist:

1. Click **Create a new bucket**
2. Name: `payment-proofs`
3. Public: **OFF** (Private)
4. Click **Create bucket**

### Add RLS Policy for Admin Access:

Go to SQL Editor and run:

```sql
-- Allow admins to view payment proofs
CREATE POLICY "Admins can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin')
);

-- Allow admins to upload payment proofs
CREATE POLICY "Admins can upload payment proofs"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  auth.uid() IN (SELECT id FROM user_roles WHERE role = 'admin')
);
```

---

## Testing After Fixes

1. **Complete Payment:**
   - Go to Bookings page
   - Click "Complete Payment" on a booking
   - Upload proof and verify
   - Should work without 400 error

2. **PDF Export:**
   - Click "Export to PDF" button
   - Open downloaded PDF
   - Verify it shows: Booking #, Customer, Phone, Date, Hours, Total, Paid, **Cash**, **Online**, Status

3. **Mobile View:**
   - Open site on phone
   - Go to Bookings page
   - Swipe table horizontally to see all columns
   - Go to Calendar page
   - Should show month view without errors

4. **Badge Labels:**
   - Look at Cash and Online columns in bookings table
   - Should show full names: "Cash", "SadaPay", "Easypaisa"
   - Not truncated like "C...", "S...", "E..."

---

## Deployment Status

Check: https://vercel.com/dashboard

Current deployment building with fixes for:
- Calendar mobile view
- PDF/Excel exports
- Table scrolling
- Badge display

**⚠️ Remember:** Still need to run `bug-fixes.sql` for payment completion!

---

## Quick Summary

| Issue | Status | Action |
|-------|--------|--------|
| Complete Payment Error | 🔧 Needs SQL | Run bug-fixes.sql |
| Calendar Mobile Error | ✅ Fixed | Deployed |
| PDF Missing Columns | ✅ Fixed | Deployed |
| Excel Export | ✅ Fixed | Deployed |
| Mobile Table UX | ✅ Fixed | Deployed |
| Badge Truncation | ✅ Fixed | Deployed |
| Payment Proof 404 | 🔍 Check | Verify storage bucket |

---

## Need Help?

1. Check `PRODUCTION-FIXES-COMPLETE.md` for detailed explanations
2. Check browser console (F12) for error messages
3. Check Vercel deployment logs
4. Check Supabase logs (Database → Logs)

**Most Important:** Run `bug-fixes.sql` in Supabase SQL Editor! 🚀
