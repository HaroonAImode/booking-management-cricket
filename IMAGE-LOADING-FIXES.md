# Payment Proof Image Loading Fixes

## Issues Fixed

### 1. ✅ Removed Public URL Conversion
**Problem**: API routes were trying to convert storage paths to public URLs, but the bucket is **private** and requires signed URLs.

**Solution**: 
- Removed `getStoragePublicUrl()` helper from both API routes
- Keep storage paths as-is in database
- Frontend fetches signed URLs when needed

**Files Modified**:
- `app/api/admin/bookings/route.ts` - Removed public URL conversion
- `app/api/admin/calendar/[id]/route.ts` - Removed public URL conversion

### 2. ✅ Fixed Signed URL API Route
**Problem**: The `/api/admin/storage/payment-proof` route wasn't properly handling the `{ data, error }` response from `getPaymentProofSignedUrl()`.

**Solution**: Updated to destructure the response correctly and return proper error responses.

**File Modified**:
- `app/api/admin/storage/payment-proof/route.ts`

### 3. ✅ Updated BookingDetailsModal to Fetch Signed URLs
**Problem**: Modal was trying to display images directly using storage paths instead of signed URLs.

**Solution**: 
- Added `fetchSignedUrl()` function to get signed URLs on-demand
- Updated "View Proof Image" buttons to call `fetchSignedUrl()` instead of directly setting image
- Added loading state while fetching signed URL

**File Modified**:
- `components/BookingDetailsModal.tsx`

### 4. ✅ Bookings Table Already Uses PaymentProofModal
**Status**: No changes needed - the bookings table already uses `PaymentProofModal` which properly handles signed URLs.

---

## How It Works Now

### Image Loading Flow:

```
User clicks "View Proof Image" button
  ↓
Frontend calls fetchSignedUrl(storagePath)
  ↓
Fetches from: /api/admin/storage/payment-proof?path=payment-proofs/2026-01-17/uuid-timestamp.png
  ↓
API calls getPaymentProofSignedUrl(path, 3600)
  ↓
Supabase generates temporary signed URL (valid 1 hour)
  ↓
Frontend displays image in lightbox using signed URL
```

---

## Why Images Still Don't Load

The logs show:
```
Signed URL error: Error [StorageApiError]: Object not found
```

This means **the files don't exist in Supabase Storage**. The files were supposed to be uploaded but either:

1. ❌ **Upload failed silently** during booking creation
2. ❌ **Files were deleted** after upload  
3. ❌ **Wrong bucket or path** is being used

### File Names from Logs:
- `temp-1768628111766-1768628111766.png` - Public booking with temp ID
- `7e85da7c-19ab-4103-857d-17c7ce440805-1768629415786.png` - Admin completion

---

## Troubleshooting Steps

### 1. Check if Files Exist in Supabase Storage

1. Go to **Supabase Dashboard** → **Storage**
2. Open **`payment-proofs`** bucket
3. Navigate to folder: **`2026-01-17`**
4. Look for files:
   - `temp-1768628111766-1768628111766.png`
   - `7e85da7c-19ab-4103-857d-17c7ce440805-1768629415786.png`

**If files DON'T exist**: The upload is failing.

### 2. Verify Storage Bucket Configuration

Run this SQL in Supabase to check RLS policies:

```sql
-- Check if bucket exists
SELECT * FROM storage.buckets WHERE name = 'payment-proofs';

-- Check RLS policies
SELECT * FROM storage.policies WHERE bucket_id = 'payment-proofs';
```

Expected policies:
- ✅ Public can INSERT (for customer uploads)
- ✅ Admins can SELECT (for viewing)
- ✅ Admins can DELETE (for cleanup)

### 3. Test Upload Manually

Try uploading a file manually in Supabase Dashboard:
1. Go to Storage → `payment-proofs` bucket
2. Create folder `2026-01-17` if it doesn't exist
3. Upload a test image
4. Try to generate a signed URL
5. Open the signed URL in browser

**If this fails**: Bucket configuration issue.

### 4. Check Browser Console

When clicking "View Proof Image":
- Open browser DevTools (F12)
- Go to **Network** tab
- Click "View Proof Image"
- Look for request to `/api/admin/storage/payment-proof`
- Check the response

**Expected**: `{ success: true, url: "https://...signedUrl" }`
**If error**: Check the error message

### 5. Verify File Upload During Booking

1. Create a test booking
2. Watch browser console for errors
3. Check the network tab for upload request
4. Verify response shows success
5. Go to Storage and confirm file exists

---

## Common Issues & Solutions

### Issue: Files Upload But Don't Appear

**Cause**: Files uploaded with temp IDs that don't match database paths.

**Solution**: 
```typescript
// In BookingForm.tsx, the temp ID approach is fine
// The issue is the file actually needs to exist
// Check the upload is succeeding
```

### Issue: "Object not found" Error

**Cause**: File doesn't exist at the specified path.

**Solutions**:
1. Verify upload succeeded
2. Check path in database matches actual storage path
3. Check bucket name is correct (`payment-proofs`)

### Issue: "Access Denied" Error

**Cause**: RLS policies blocking access.

**Solution**: Verify storage RLS policies allow admin access:
```sql
-- Allow authenticated admins to view all payment proofs
CREATE POLICY "Admins can view payment proofs"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'payment-proofs'
  AND EXISTS (
    SELECT 1 FROM admin_profiles
    WHERE id = auth.uid() AND is_active = true
  )
);
```

### Issue: Image Loads But Shows Broken

**Cause**: Incorrect file type or corrupted upload.

**Solution**:
1. Check file MIME type is `image/png` or `image/jpeg`
2. Re-upload the file
3. Verify file isn't corrupted

---

## Testing Checklist

### After Applying Fixes:

1. **Test Public Booking Upload**:
   - [ ] Create new booking
   - [ ] Upload payment proof
   - [ ] Check file appears in Storage → payment-proofs → [date]
   - [ ] Verify file name format: `temp-[timestamp]-[timestamp].png`

2. **Test Admin View Advance Proof**:
   - [ ] Go to Admin → Bookings
   - [ ] Click green "Advance" button
   - [ ] Verify image loads in modal
   - [ ] No errors in console

3. **Test Admin Complete Payment**:
   - [ ] Approve a booking
   - [ ] Click "Complete Payment"
   - [ ] Upload remaining payment proof
   - [ ] Check file appears in Storage
   - [ ] Verify file name format: `[booking-id]-[timestamp].png`

4. **Test Admin View Remaining Proof**:
   - [ ] Go to completed booking
   - [ ] Click blue "Remaining" button
   - [ ] Verify image loads in modal

5. **Test Booking Details Modal**:
   - [ ] Click "View Details" on any booking
   - [ ] See two payment proof boxes (green and blue)
   - [ ] Click "View Proof Image" in each box
   - [ ] Images open in lightbox
   - [ ] X button closes lightbox

---

## Required SQL Migrations

Make sure you've run these SQL migrations:

### 1. Fix booking_slots Status Constraint
```sql
ALTER TABLE booking_slots DROP CONSTRAINT IF EXISTS booking_slots_status_check;
ALTER TABLE booking_slots ADD CONSTRAINT booking_slots_status_check 
CHECK (status IN ('available', 'pending', 'booked', 'completed', 'cancelled'));
```

### 2. Fix verify_remaining_payment Function
See `fix-remaining-payment-complete.sql` for complete function.

### 3. Verify Storage RLS Policies

```sql
-- Check current policies
SELECT * FROM storage.policies WHERE bucket_id = 'payment-proofs';

-- If missing, add them (see storage-rls-fix.sql)
```

---

## Next Steps

1. **Apply all code fixes** (already done ✅)
2. **Run SQL migrations** in Supabase SQL Editor
3. **Test file upload** with new booking
4. **Check files exist** in Storage dashboard
5. **Test image viewing** in admin panel

If images still don't load after these fixes:
1. The files genuinely don't exist in storage
2. Check upload errors during booking creation
3. Verify storage bucket exists and is configured correctly
4. Test manual upload in Supabase Dashboard

---

## Summary

The code is now correctly configured to:
- ✅ Store storage paths (not URLs) in database
- ✅ Fetch signed URLs on-demand when viewing images
- ✅ Handle private storage buckets properly
- ✅ Show loading states while fetching URLs
- ✅ Display clear error messages if images don't exist

The remaining issue is **the files don't exist in storage**, which is a separate problem from the code. You need to:
1. Investigate why uploads are failing
2. Verify storage bucket configuration
3. Test upload process manually
