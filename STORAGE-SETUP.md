# Supabase Storage Setup Guide

## Overview
This guide explains how to configure Supabase Storage for payment proof screenshots.

## Storage Bucket Configuration

### Bucket Details
- **Name**: `payment-proofs`
- **Public**: `false` (requires signed URLs for viewing)
- **Max File Size**: 5MB
- **Allowed Types**: PNG, JPEG, JPG
- **Purpose**: Store payment screenshots uploaded by customers during booking

## Setup Instructions

### Step 1: Run SQL Setup
1. Open Supabase Dashboard → SQL Editor
2. Open the file `supabase-storage-setup.sql`
3. Execute the entire SQL script

This will:
- Create the `payment-proofs` bucket
- Configure file size limit (5MB)
- Set allowed MIME types (image/png, image/jpeg, image/jpg)
- Create storage policies for access control

### Step 2: Verify Bucket Creation
Run this query in SQL Editor:
```sql
SELECT 
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE id = 'payment-proofs';
```

Expected output:
```
id: payment-proofs
name: payment-proofs
public: false
file_size_limit: 5242880
allowed_mime_types: {image/png, image/jpeg, image/jpg}
```

### Step 3: Verify Storage Policies
Run this query:
```sql
SELECT 
  schemaname,
  tablename,
  policyname,
  cmd AS operation
FROM pg_policies
WHERE tablename = 'objects'
AND policyname LIKE '%payment proofs%'
ORDER BY policyname;
```

Expected policies:
1. ✅ "Public can upload payment proofs" (INSERT)
2. ✅ "Admins can view all payment proofs" (SELECT)
3. ✅ "Admins can update payment proofs" (UPDATE)
4. ✅ "Admins can delete payment proofs" (DELETE)

## Storage Policies Explained

### 1. Public Upload Policy
**Who**: Anyone (unauthenticated users)  
**What**: Can upload images  
**Why**: Customers need to upload payment proofs during booking without login

```sql
CREATE POLICY "Public can upload payment proofs"
ON storage.objects FOR INSERT TO public
WITH CHECK (
  bucket_id = 'payment-proofs' AND
  (storage.filename(name) ~* '\.(jpg|jpeg|png)$')
);
```

### 2. Admin View Policy
**Who**: Authenticated admins only  
**What**: Can view all uploaded images  
**Why**: Admins need to verify payment proofs for booking approval

```sql
CREATE POLICY "Admins can view all payment proofs"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'payment-proofs' AND
  EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND role = 'admin'
  )
);
```

### 3. Admin Update Policy
**Who**: Authenticated admins only  
**What**: Can update file metadata  
**Why**: Allows admins to organize or update file information

### 4. Admin Delete Policy
**Who**: Authenticated admins only  
**What**: Can delete files  
**Why**: Cleanup of invalid or outdated payment proofs

## File Path Convention

Files are organized by date and booking ID:
```
payment-proofs/
  ├── 2026-01-17/
  │   ├── booking-uuid-1705471200000.jpg
  │   ├── booking-uuid-1705471300000.png
  │   └── booking-uuid-1705471400000.jpeg
  ├── 2026-01-18/
  │   └── ...
  └── ...
```

**Format**: `payment-proofs/YYYY-MM-DD/booking-id-timestamp.ext`

## Usage in Application

### Upload Payment Proof (Public User)
```typescript
import { uploadPaymentProof } from '@/lib/supabase/storage';

const file = // File from input
const bookingId = 'uuid-here';
const bookingDate = '2026-01-17';

const { data, error } = await uploadPaymentProof(file, bookingId, bookingDate);

if (error) {
  console.error('Upload failed:', error);
} else {
  console.log('File uploaded:', data); // "payment-proofs/2026-01-17/..."
  // Store 'data' in bookings.advance_payment_proof
}
```

### View Payment Proof (Admin Only)
```typescript
import { getPaymentProofSignedUrl } from '@/lib/supabase/storage';

// Admin viewing a payment proof
const filePath = 'payment-proofs/2026-01-17/booking-uuid-123.jpg';

const { data: signedUrl, error } = await getPaymentProofSignedUrl(filePath, 3600);

if (signedUrl) {
  // Display image using signed URL
  return <img src={signedUrl} alt="Payment Proof" />;
}
```

### Delete Payment Proof (Admin Only)
```typescript
import { deletePaymentProof } from '@/lib/supabase/storage';

const filePath = 'payment-proofs/2026-01-17/booking-uuid-123.jpg';

const { success, error } = await deletePaymentProof(filePath);
```

## Security Notes

### ✅ What's Protected
- **Private Bucket**: Files are NOT publicly accessible via direct URLs
- **Upload Validation**: Only PNG/JPEG files under 5MB can be uploaded
- **Admin-Only Viewing**: Only authenticated admins can retrieve files
- **Signed URLs**: Admin previews use time-limited signed URLs (1 hour expiry)

### ⚠️ Important Considerations
1. **Public Upload**: Anyone can upload to this bucket (required for no-login booking)
2. **File Naming**: Use predictable naming convention to track bookings
3. **Storage Quota**: Monitor storage usage in Supabase Dashboard
4. **Cleanup**: Implement periodic cleanup of cancelled/rejected bookings

## Testing Storage Setup

### Test 1: Upload from Public Form
```typescript
// This should work without authentication
const file = new File(['test'], 'test.jpg', { type: 'image/jpeg' });
const result = await uploadPaymentProof(file, 'test-booking-id', '2026-01-17');
console.log(result); // Should succeed
```

### Test 2: Admin View
```typescript
// This requires admin authentication
const url = await getPaymentProofSignedUrl('payment-proofs/test.jpg');
console.log(url); // Should return signed URL
```

### Test 3: Public View (Should Fail)
```typescript
// This should fail - public users cannot view
const supabase = createClient();
const { data } = supabase.storage
  .from('payment-proofs')
  .getPublicUrl('test.jpg');
// Image won't load - bucket is private
```

## Troubleshooting

### Upload Fails with "Policy Violation"
**Problem**: Public upload policy not working  
**Solution**: Verify policy exists and bucket_id matches:
```sql
SELECT * FROM pg_policies 
WHERE tablename = 'objects' 
AND policyname = 'Public can upload payment proofs';
```

### Admin Cannot View Files
**Problem**: Admin view policy not working  
**Solution**: Check admin role in profiles table:
```sql
SELECT id, role FROM profiles WHERE id = auth.uid();
-- Should return role = 'admin'
```

### File Size Error
**Problem**: Upload fails with "File too large"  
**Solution**: Check bucket file_size_limit:
```sql
SELECT file_size_limit FROM storage.buckets WHERE id = 'payment-proofs';
-- Should be 5242880 (5MB)
```

### Invalid File Type
**Problem**: Upload fails with "Invalid MIME type"  
**Solution**: Verify allowed_mime_types:
```sql
SELECT allowed_mime_types FROM storage.buckets WHERE id = 'payment-proofs';
-- Should include: image/png, image/jpeg, image/jpg
```

## Next Steps

After storage setup:
1. ✅ Test file upload from public booking form
2. ✅ Test admin viewing with signed URLs
3. ✅ Integrate upload function in booking form component
4. ✅ Implement image preview in admin dashboard
5. ✅ Add file cleanup for cancelled bookings

## Related Files
- `supabase-storage-setup.sql` - SQL setup script
- `lib/supabase/storage.ts` - TypeScript utilities
- `database-schema-v2.sql` - Database schema (bookings.advance_payment_proof field)
