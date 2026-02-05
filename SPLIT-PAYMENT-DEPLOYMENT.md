# Split Payment System - Deployment Guide

## Overview
Complete implementation of split payment system that allows admins to divide remaining payments between **Cash** and **Online** (EasyPaisa/SadaPay) with automatic calculation.

## Features Implemented
✅ **Auto-calculation**: Change one amount → other auto-adjusts  
✅ **Real-time validation**: Color-coded total (green=correct, red=mismatch)  
✅ **Split payment support**: Cash + Online (EasyPaisa/SadaPay)  
✅ **Full cash option**: Set online to 0, cash takes full amount  
✅ **Full online option**: Set cash to 0, online takes full amount  
✅ **Database tracking**: Separate columns for cash/online amounts  

## Deployment Steps

### Step 1: Run Database Migrations (CRITICAL - DO THIS FIRST)

**Migration 1: Add Split Payment Columns**
```sql
-- Run in Supabase SQL Editor
-- File: split-payment-system.sql

-- This adds:
-- - remaining_cash_amount
-- - remaining_online_amount  
-- - remaining_online_method
```

**Migration 2: Update Payment Function**
```sql
-- Run in Supabase SQL Editor
-- File: update-verify-payment-split-payment.sql

-- This updates verify_remaining_payment_with_extra_charges to:
-- - Accept p_cash_amount, p_online_amount, p_online_method parameters
-- - Validate split amounts add up to total
-- - Store split payment data in bookings table
```

**Verification Queries**:
```sql
-- 1. Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' 
AND column_name IN ('remaining_cash_amount', 'remaining_online_amount', 'remaining_online_method');

-- Expected: 3 rows

-- 2. Check function updated
SELECT routine_name, 
       array_length(string_to_array(pg_get_function_arguments(p.oid), ','), 1) as param_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'verify_remaining_payment_with_extra_charges';

-- Expected: param_count = 11 (includes new split payment params)
```

### Step 2: Push Code Changes

**Files Modified**:
1. `components/CompletePaymentModal.tsx` - Split payment UI
2. `app/api/admin/bookings/[id]/complete-payment/route.ts` - Backend handler
3. `components/CalendarFirstBooking.tsx` - Multi-day booking (bonus feature)

**Git Commands**:
```bash
git add .
git commit -m "Feature: Split payment system with auto-calculation + Multi-day booking"
git push origin main
```

### Step 3: Verify Deployment

**Vercel Auto-Deployment**: ~2 minutes after push

**Test Scenarios**:

**Scenario 1: Full Cash Payment**
- Remaining: ₹4500
- Cash: ₹4500
- Online: ₹0
- Expected: ✅ Green total, saves successfully

**Scenario 2: Full Online Payment**
- Remaining: ₹4500
- Cash: ₹0
- Online: ₹4500
- Method: EasyPaisa
- Expected: ✅ Green total, requires payment proof, saves successfully

**Scenario 3: Split Payment**
- Remaining: ₹4500
- Cash: ₹2000
- Online: ₹2500
- Method: SadaPay
- Expected: ✅ Green total, requires payment proof, saves successfully

**Scenario 4: With Extra Charges**
- Remaining: ₹4500
- Extra Charges: ₹500
- Total Payable: ₹5000
- Cash: ₹3000
- Online: ₹2000
- Expected: ✅ Saves with correct split

**Scenario 5: Invalid Split**
- Remaining: ₹4500
- Cash: ₹2000
- Online: ₹2000 (Total = ₹4000 ❌)
- Expected: ❌ Red total, submit disabled

### Step 4: Database Verification

After completing test payments, verify data:

```sql
-- Check split payment data saved correctly
SELECT 
    booking_number,
    remaining_payment_method,
    remaining_cash_amount,
    remaining_online_amount,
    remaining_online_method,
    remaining_cash_amount + remaining_online_amount as total_split
FROM bookings
WHERE remaining_payment_completed_at > NOW() - INTERVAL '1 hour'
ORDER BY remaining_payment_completed_at DESC
LIMIT 5;
```

### Step 5: Revenue Reports (Optional)

Generate split payment revenue reports:

```sql
-- Daily split payment breakdown
SELECT 
    DATE(remaining_payment_completed_at) as payment_date,
    SUM(remaining_cash_amount) as total_cash,
    SUM(CASE WHEN remaining_online_method = 'easypaisa' THEN remaining_online_amount ELSE 0 END) as total_easypaisa,
    SUM(CASE WHEN remaining_online_method = 'sadapay' THEN remaining_online_amount ELSE 0 END) as total_sadapay,
    SUM(remaining_cash_amount + remaining_online_amount) as total_payments
FROM bookings
WHERE status = 'completed'
AND remaining_payment_completed_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY DATE(remaining_payment_completed_at)
ORDER BY payment_date DESC;
```

## UI Behavior

### Auto-Calculation Logic
```typescript
// When user changes ONLINE amount
handleOnlineAmountChange(value) {
  setOnlineAmount(value);
  setCashAmount(totalPayable - value); // Auto-adjust cash
}

// When user changes CASH amount  
handleCashAmountChange(value) {
  setCashAmount(value);
  setOnlineAmount(totalPayable - value); // Auto-adjust online
}
```

### Visual Feedback
- **Cash Input**: Black border (`rgba(0, 0, 0, 0.3)`)
- **Online Input**: Gold border (`rgba(255, 215, 0, 0.3)`)
- **Total Box**: Green background when correct, red when mismatch
- **Submit Button**: Disabled when total doesn't match

### Online Payment Method
- Only shown when `onlineAmount > 0`
- Required when online amount > 0
- Options: EasyPaisa, SadaPay
- Payment proof required for online payments

## Rollback Plan (If Issues Occur)

### Quick Rollback
```bash
# Revert code changes
git revert HEAD
git push origin main

# Keep database changes (they're backward compatible)
# Old bookings without split data will work fine
```

### Full Rollback (If Database Issues)
```sql
-- Remove split payment columns
ALTER TABLE bookings 
DROP COLUMN IF EXISTS remaining_cash_amount,
DROP COLUMN IF EXISTS remaining_online_amount,
DROP COLUMN IF EXISTS remaining_online_method;

-- Restore old function (from last-time-complete-payment-updated.sql)
-- Copy and run the previous version
```

## Support

### Common Issues

**Issue 1: Function parameter mismatch error**
- **Cause**: Function not updated with new parameters
- **Fix**: Run `update-verify-payment-split-payment.sql` again

**Issue 2: Column does not exist error**
- **Cause**: Migration 1 not run
- **Fix**: Run `split-payment-system.sql`

**Issue 3: Auto-calculation not working**
- **Cause**: Browser cache
- **Fix**: Hard refresh (Ctrl+F5)

**Issue 4: Split amounts don't save**
- **Cause**: Backend not extracting formData correctly
- **Fix**: Check API route has cashAmount/onlineAmount/onlineMethod extraction

### Debug Queries

```sql
-- Check if function accepts new parameters
SELECT pg_get_function_arguments(p.oid) as function_signature
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
AND p.proname = 'verify_remaining_payment_with_extra_charges';

-- Check recent bookings have split data
SELECT 
    booking_number,
    COALESCE(remaining_cash_amount, 0) as cash,
    COALESCE(remaining_online_amount, 0) as online,
    remaining_online_method as method,
    remaining_payment_completed_at
FROM bookings
WHERE status = 'completed'
ORDER BY remaining_payment_completed_at DESC
LIMIT 10;
```

## Bonus Feature: Multi-Day Booking

Also included in this deployment:

**Feature**: Select consecutive time slots across multiple days  
**Example**: 11 PM Feb 5 + 12 AM Feb 6  
**File**: `components/CalendarFirstBooking.tsx`

**No database changes required** - uses existing booking system.

---

## Summary

✅ **Phase 1**: Database migrations (2 SQL files)  
✅ **Phase 2**: Code deployment (3 files modified)  
✅ **Phase 3**: Testing (5 scenarios)  
✅ **Phase 4**: Verification (SQL queries)  
✅ **Phase 5**: Revenue reports (optional)

**Total Deployment Time**: ~10 minutes  
**Risk Level**: Low (backward compatible)  
**Rollback Time**: ~2 minutes
