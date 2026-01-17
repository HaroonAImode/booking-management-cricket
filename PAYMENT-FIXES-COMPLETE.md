# Payment System Fixes - Complete Guide

## Issues Fixed

### 1. ✅ Remaining Payment Not Updating
**Problem**: After admin completed remaining payment, the booking still showed Rs 3,500 remaining.

**Cause**: The `verify_remaining_payment` function was only updating the payment proof/method but not zeroing out the `remaining_payment` amount.

**Solution**: Updated function to:
- Set `advance_payment` to `total_amount` (fully paid)
- Set `remaining_payment` to `0`
- Set `is_fully_paid` to `true`
- Added `SECURITY DEFINER` to bypass RLS

### 2. ✅ Payment Proof Images Returning 404
**Problem**: Clicking "View Proof Image" showed 404 errors like:
```
GET http://localhost:3000/admin/payment-proofs/2026-01-17/temp-1768628111766.png 404
```

**Cause**: The database stored relative paths (`payment-proofs/2026-01-17/file.png`) but frontend tried to load them as URLs without converting to Supabase public URLs.

**Solution**: Added URL conversion in API routes:
- `/api/admin/bookings/route.ts` - Converts all booking payment proofs to public URLs
- `/api/admin/calendar/[id]/route.ts` - Converts booking details payment proofs to public URLs

### 3. ✅ Payment Proof Buttons in Table
**Problem**: Had to open booking details modal to view payment proofs.

**Solution**: Added two distinct buttons in the bookings table:
- 🟢 **"Advance" button** (Green) - View customer's advance payment proof
- 🔵 **"Remaining" button** (Blue) - View admin's remaining payment proof
- Shows "-" if no proof uploaded

---

## 🚨 REQUIRED: Run This SQL Migration

**You MUST run this SQL in your Supabase SQL Editor to fix the remaining payment issue:**

```sql
-- ========================================
-- FIX REMAINING PAYMENT COMPLETION
-- ========================================

-- Drop and recreate the verify_remaining_payment function with fixes
CREATE OR REPLACE FUNCTION verify_remaining_payment(
  p_booking_id UUID,
  p_payment_method TEXT,
  p_payment_proof_path TEXT,
  p_admin_notes TEXT DEFAULT NULL
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER  -- Add SECURITY DEFINER to bypass RLS
SET search_path = public
AS $$
DECLARE
  v_result JSON;
  v_booking_number TEXT;
  v_remaining_amount NUMERIC;
  v_advance_payment NUMERIC;
  v_total_amount NUMERIC;
  v_current_status TEXT;
BEGIN
  -- Get current booking details
  SELECT 
    booking_number,
    remaining_payment,
    advance_payment,
    total_amount,
    status
  INTO 
    v_booking_number, 
    v_remaining_amount, 
    v_advance_payment,
    v_total_amount,
    v_current_status
  FROM bookings
  WHERE id = p_booking_id;

  -- Validate booking exists
  IF v_booking_number IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking not found'
    );
  END IF;

  -- Validate booking is approved
  IF v_current_status NOT IN ('approved') THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Booking must be in approved status. Current status: ' || v_current_status
    );
  END IF;

  -- Validate there is remaining payment
  IF v_remaining_amount = 0 THEN
    RETURN json_build_object(
      'success', false,
      'error', 'No remaining payment due for this booking'
    );
  END IF;

  -- Update booking: Zero out remaining payment and mark as completed
  UPDATE bookings
  SET 
    advance_payment = v_total_amount,  -- Set advance to total (fully paid)
    remaining_payment = 0,              -- Zero out remaining
    remaining_payment_method = p_payment_method,
    remaining_payment_proof = p_payment_proof_path,
    remaining_payment_date = NOW(),
    is_fully_paid = true,              -- Mark as fully paid
    status = 'completed',
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW()
  WHERE id = p_booking_id;

  -- Update associated slots to completed
  UPDATE booking_slots
  SET 
    status = 'completed',
    updated_at = NOW()
  WHERE booking_id = p_booking_id;

  -- Create notification
  INSERT INTO notifications (
    notification_type,
    title,
    message,
    booking_id,
    customer_id,
    priority
  )
  SELECT 
    'payment_completed',
    'Payment Completed',
    'Your remaining payment of Rs ' || v_remaining_amount::TEXT || ' for booking #' || v_booking_number || ' has been verified. Your booking is now complete.',
    p_booking_id,
    customer_id,
    'high'
  FROM bookings
  WHERE id = p_booking_id;

  RETURN json_build_object(
    'success', true,
    'booking_number', v_booking_number,
    'remaining_amount', v_remaining_amount,
    'message', 'Remaining payment verified and booking marked as completed'
  );
END;
$$;
```

---

## Files Modified

### Backend/API Files:
1. **`fix-remaining-payment-complete.sql`** ✨ NEW
   - Complete SQL fix for remaining payment function

2. **`app/api/admin/bookings/route.ts`**
   - Added `getStoragePublicUrl()` helper function
   - Converts payment proof paths to Supabase public URLs
   - Returns full URLs in bookings list API

3. **`app/api/admin/calendar/[id]/route.ts`**
   - Added `getStoragePublicUrl()` helper function
   - Converts payment proof paths to public URLs for booking details

### Frontend Files:
4. **`app/admin/bookings/page.tsx`**
   - Added `remaining_payment_proof` to Booking interface
   - Added "Payment Proofs" column header
   - Added two buttons: "Advance" (green) and "Remaining" (blue)
   - Removed inline payment proof icon, moved to dedicated column

5. **`components/BookingDetailsModal.tsx`**
   - Already updated with two-box payment proof display
   - Green box: Advance Payment (By Customer)
   - Blue box: Remaining Payment (By Admin)
   - Each box has "View Proof Image" button with lightbox

---

## How It Works Now

### 1. Public Booking Flow:
```
Customer → Create Booking → Upload Advance Proof → Submit
  ↓
Admin Dashboard → Sees new booking notification
  ↓
Admin → View Details → See advance proof (green box)
  ↓
Admin → Click "Approve" button
  ↓
Booking status: pending → approved
```

### 2. Complete Payment Flow:
```
Admin → Bookings Table → Click "Complete Payment" for approved booking
  ↓
Admin → Upload remaining payment proof
  ↓
System calls verify_remaining_payment()
  ↓
Function updates:
  - advance_payment = total_amount (4000)
  - remaining_payment = 0
  - is_fully_paid = true
  - status = 'completed'
  - remaining_payment_proof = [uploaded image]
  ↓
Booking shows: Remaining: Rs 0 (Fully Paid ✅)
```

### 3. View Payment Proofs:
**Option A - From Table:**
- Click green "Advance" button → View customer's payment proof
- Click blue "Remaining" button → View admin's payment proof

**Option B - From Details Modal:**
- Click "View Details" on booking
- See two colored boxes with payment info
- Click "View Proof Image" button in each box
- Image opens in lightbox with X button to close

---

## Testing Steps

1. **Run the SQL migration in Supabase SQL Editor**
   - Copy the SQL from above
   - Execute in SQL Editor
   - Verify: `SELECT proname FROM pg_proc WHERE proname = 'verify_remaining_payment';`

2. **Test existing booking with remaining payment:**
   - Go to Admin → Bookings
   - Find an approved booking with remaining payment
   - Click "Complete Payment" button
   - Upload payment proof
   - Submit
   - **Verify**: Remaining payment shows Rs 0
   - **Verify**: Status changes to "completed"
   - **Verify**: Blue "Remaining" button appears in table

3. **Test payment proof viewing:**
   - In bookings table, click green "Advance" button
   - **Verify**: Customer's payment proof image opens
   - Click blue "Remaining" button  
   - **Verify**: Admin's payment proof image opens
   - **Verify**: No 404 errors in browser console

4. **Test booking details modal:**
   - Click "View Details" on any booking
   - **Verify**: Two colored boxes show (green and blue)
   - Click "View Proof Image" in green box
   - **Verify**: Image opens in lightbox with close button
   - Click "View Proof Image" in blue box
   - **Verify**: Image opens in lightbox

---

## Summary of Changes

✅ **Remaining payment now properly zeros out** after admin completes payment
✅ **Payment proof images load correctly** with full Supabase Storage URLs  
✅ **Two payment proof buttons** added to bookings table for quick access
✅ **Distinct visual indicators**: Green for customer's advance, Blue for admin's remaining
✅ **No more 404 errors** when viewing payment proofs
✅ **Fully paid bookings** now show "Remaining: Rs 0" correctly

---

## Important Notes

⚠️ **The SQL migration is REQUIRED** - Without it, remaining payments will still show incorrect amounts after completion.

💡 **Storage Bucket Setup** - Ensure your Supabase `payment-proofs` bucket has public access enabled, or the images won't load even with public URLs.

🎨 **UI/UX Improvements** - Users can now quickly scan the table and see which bookings have payment proofs without opening details.

---

## Support

If you encounter any issues:
1. Check browser console for errors
2. Verify the SQL migration ran successfully
3. Confirm Supabase storage bucket has correct permissions
4. Check that payment proof files were uploaded correctly
