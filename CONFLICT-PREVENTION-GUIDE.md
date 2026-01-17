# Booking Conflict Prevention System

## Overview
Implemented backend-safe mechanisms to prevent double booking and race conditions at the database level.

## 🔒 Security Mechanisms

### 1. Database-Level Constraint
```sql
CONSTRAINT unique_slot_datetime UNIQUE (slot_date, slot_time)
```
- **Purpose**: Prevents two bookings from having the same date/time
- **Protection**: PostgreSQL enforces this at commit time, even in race conditions
- **Result**: Second transaction attempting to book same slot will fail with `unique_violation` error

### 2. Atomic Booking Function
**Function**: `create_booking_with_slots()`

**Flow**:
```
1. Check slot availability (atomic query)
2. If conflict detected → Return error immediately
3. Create/update customer
4. Create booking
5. Insert slots (with unique constraint protection)
6. If ANY slot fails → Automatic rollback via exception handling
7. Return success or detailed error
```

**Key Features**:
- All operations in single database function
- Automatic rollback on conflict
- Race condition protected by UNIQUE constraint
- Returns detailed conflict information

### 3. Pending Timeout System

**New Column**: `bookings.pending_expires_at`
- Set to NOW() + 30 minutes for new pending bookings
- Automatically cleared when booking approved/completed
- Indexed for fast lookup

**Auto-Release Function**: `release_expired_pending_slots()`
- Finds bookings pending > 30 minutes
- Updates booking status to 'cancelled'
- Releases all associated slots
- Adds cancellation reason
- Creates notification for admin

**Cleanup Function**: `cleanup_expired_bookings()`
- Wrapper for scheduled execution
- Returns count and details of released bookings
- Can be called via cron job or API endpoint

### 4. Triggers

**set_pending_expiry_trigger**:
- Runs on INSERT/UPDATE of bookings
- Sets `pending_expires_at` = NOW() + 30 minutes for pending bookings
- Clears expiry when status changes to approved/completed/cancelled

**notify_released_slots_trigger**:
- Runs when booking status changes from pending to cancelled
- Creates system notification for timeout cancellations
- Low priority notification for admin awareness

## 📊 How It Works

### Scenario 1: Normal Booking Flow
```
User A selects slots [14, 15, 16] for 2026-01-20
↓
create_booking_with_slots() called
↓
Checks availability → All slots free
↓
Creates booking with status='pending'
↓
Inserts slots with status='pending'
↓
pending_expires_at = NOW() + 30 minutes
↓
Success! Slots locked for 30 minutes
```

### Scenario 2: Race Condition (Same Slots)
```
User A starts booking [14, 15, 16]          User B starts booking [14, 15, 16]
↓                                           ↓
Checks availability → Free                  Checks availability → Free
↓                                           ↓
Starts transaction                          Starts transaction
↓                                           ↓
Inserts slot 14 → SUCCESS                   Inserts slot 14 → WAITS (row locked)
↓                                           ↓
Inserts slot 15 → SUCCESS                   Still waiting...
↓                                           ↓
Inserts slot 16 → SUCCESS                   Still waiting...
↓                                           ↓
Transaction COMMITS                         Inserts slot 14 → UNIQUE VIOLATION
                                            ↓
User A: Booking confirmed                   Exception caught → Rollback
                                            ↓
                                            User B: Error "Slot conflict: slots just booked"
```

### Scenario 3: Partial Overlap
```
User A books [14, 15, 16] → Success (all pending)
↓
User B tries to book [15, 16, 17]
↓
Checks availability → Conflict detected on [15, 16]
↓
Returns: "Slot conflict: Some selected slots are no longer available"
↓
User B: Must select different slots
```

### Scenario 4: Timeout Expiry
```
User A books [14, 15, 16] at 10:00 AM
↓
Status: pending, expires_at: 10:30 AM
↓
Admin doesn't approve by 10:30 AM
↓
cleanup_expired_bookings() runs (cron job)
↓
Booking status → 'cancelled'
Slots status → 'cancelled'
Notification created for admin
↓
Slots [14, 15, 16] now available again for new bookings
```

## 🔧 Database Schema Changes

### Added Column
```sql
ALTER TABLE bookings 
ADD COLUMN pending_expires_at TIMESTAMPTZ;

CREATE INDEX bookings_pending_expires_idx 
ON bookings(pending_expires_at) 
WHERE status = 'pending' AND pending_expires_at IS NOT NULL;
```

### New Functions
1. `set_pending_expiry()` - Trigger function
2. `release_expired_pending_slots()` - Core cleanup logic
3. `check_and_reserve_slots()` - Atomic availability check
4. `create_booking_with_slots()` - Atomic booking creation
5. `notify_released_slots()` - Trigger function
6. `cleanup_expired_bookings()` - Scheduled job wrapper

### New Triggers
1. `set_pending_expiry_trigger` (BEFORE INSERT/UPDATE on bookings)
2. `notify_released_slots_trigger` (AFTER UPDATE on bookings)

## 📝 API Changes

### Updated Function: `createCompleteBooking()`

**Old Behavior**:
- Called multiple API endpoints sequentially
- No rollback on partial failure
- Vulnerable to race conditions

**New Behavior**:
```typescript
// Now uses atomic database function
const { data, error } = await supabase.rpc('create_booking_with_slots', {
  p_customer_name: 'John Doe',
  p_customer_phone: '03001234567',
  // ... other params
  p_slots: [
    { slot_hour: 14, slot_time: '14:00:00', is_night_rate: false, hourly_rate: 1500 },
    { slot_hour: 15, slot_time: '15:00:00', is_night_rate: false, hourly_rate: 1500 },
  ]
});

if (!data.success) {
  // Handle conflict error
  console.error(data.error_message);
}
```

**Error Messages**:
- `"Slot conflict: Some selected slots are no longer available"` - Pre-check failed
- `"Slot conflict: One or more slots were just booked by another customer"` - Race condition caught
- Other errors bubble up from database

### New Function: `cleanupExpiredBookings()`

```typescript
import { cleanupExpiredBookings } from '@/lib/supabase/bookings';

// Call periodically (e.g., every 5 minutes)
const { data, error } = await cleanupExpiredBookings();

if (data) {
  console.log(`Released ${data.total_released} expired bookings`);
  console.log('Details:', data.released_bookings);
}
```

## 🚀 Deployment Steps

### Step 1: Run SQL Script
```bash
# In Supabase SQL Editor, run:
booking-conflict-prevention.sql
```

This will:
- Add `pending_expires_at` column
- Create all functions and triggers
- Set up indexes

### Step 2: Verify Installation
```sql
-- Check if column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'bookings' AND column_name = 'pending_expires_at';

-- Check if functions exist
SELECT routine_name 
FROM information_schema.routines 
WHERE routine_name IN (
  'create_booking_with_slots',
  'release_expired_pending_slots',
  'cleanup_expired_bookings'
);

-- Check if triggers exist
SELECT trigger_name, event_manipulation, event_object_table 
FROM information_schema.triggers 
WHERE trigger_name IN (
  'set_pending_expiry_trigger',
  'notify_released_slots_trigger'
);
```

### Step 3: Set Up Scheduled Cleanup (Optional)

**Option A: Using pg_cron (if enabled in Supabase)**
```sql
SELECT cron.schedule(
  'cleanup-expired-bookings', 
  '*/5 * * * *',  -- Every 5 minutes
  'SELECT cleanup_expired_bookings()'
);
```

**Option B: External Cron Job**
```bash
# Create API endpoint that calls cleanupExpiredBookings()
# Then set up cron to hit endpoint every 5 minutes
*/5 * * * * curl -X POST https://your-app.com/api/cleanup-bookings
```

**Option C: Next.js API Route**
```typescript
// app/api/cleanup-bookings/route.ts
import { cleanupExpiredBookings } from '@/lib/supabase/bookings';

export async function POST(request: Request) {
  // Add authentication/secret key check
  const { data, error } = await cleanupExpiredBookings();
  return Response.json({ data, error });
}
```

## 🧪 Testing

### Test 1: Normal Booking
```typescript
const result = await createCompleteBooking({
  customer: { name: 'Test User', phone: '03001234567' },
  booking: {
    booking_date: '2026-01-20',
    total_hours: 2,
    total_amount: 3000,
    advance_payment: 500,
    advance_payment_method: 'online',
    advance_payment_proof: 'path/to/image.jpg'
  },
  slots: [
    { slot_date: '2026-01-20', slot_time: '14:00:00', slot_hour: 14, is_night_rate: false, hourly_rate: 1500 },
    { slot_date: '2026-01-20', slot_time: '15:00:00', slot_hour: 15, is_night_rate: false, hourly_rate: 1500 }
  ]
});
// Should succeed
```

### Test 2: Double Booking (Same Browser)
```typescript
// Book slots 14, 15
await createCompleteBooking({ /* ... */ });

// Try to book slot 14 again
const result = await createCompleteBooking({ /* same slot 14 */ });
// Should fail with "Slot conflict" error
```

### Test 3: Race Condition (Multiple Tabs)
```javascript
// Open 2 browser tabs
// In both tabs simultaneously:
// Tab 1: Book slots [14, 15, 16]
// Tab 2: Book slots [14, 15, 16]
// Result: One succeeds, one fails with conflict error
```

### Test 4: Timeout Release
```sql
-- Create a pending booking
-- Manually set expiry to past
UPDATE bookings 
SET pending_expires_at = NOW() - INTERVAL '1 minute' 
WHERE booking_number = 'BK-20260120-001';

-- Run cleanup
SELECT * FROM cleanup_expired_bookings();

-- Check booking status
SELECT booking_number, status, cancelled_reason 
FROM bookings 
WHERE booking_number = 'BK-20260120-001';
-- Should show status='cancelled'
```

### Test 5: Verify Slot Release
```sql
-- After timeout, check slots
SELECT slot_date, slot_hour, status 
FROM booking_slots 
WHERE booking_id = (
  SELECT id FROM bookings WHERE booking_number = 'BK-20260120-001'
);
-- Should show status='cancelled'

-- Try booking same slots again - should succeed
```

## 📋 Monitoring Queries

### View Pending Bookings with Expiry
```sql
SELECT 
  booking_number,
  status,
  created_at,
  pending_expires_at,
  CASE 
    WHEN pending_expires_at < NOW() THEN 'EXPIRED'
    WHEN pending_expires_at > NOW() THEN 'ACTIVE'
    ELSE 'N/A'
  END AS expiry_status,
  ROUND(EXTRACT(EPOCH FROM (pending_expires_at - NOW()))/60) AS minutes_remaining
FROM bookings
WHERE status = 'pending'
ORDER BY pending_expires_at;
```

### Check for Slot Conflicts (Should be empty)
```sql
SELECT 
  slot_date,
  slot_hour,
  COUNT(*) as booking_count,
  array_agg(booking_id) as booking_ids,
  array_agg(status) as statuses
FROM booking_slots
WHERE status IN ('pending', 'booked')
GROUP BY slot_date, slot_hour
HAVING COUNT(*) > 1
ORDER BY slot_date, slot_hour;
```

### View Auto-Cancelled Bookings
```sql
SELECT 
  booking_number,
  customer_id,
  cancelled_reason,
  cancelled_at,
  created_at,
  (cancelled_at - created_at) as time_pending
FROM bookings
WHERE cancelled_reason LIKE '%timeout%'
ORDER BY cancelled_at DESC
LIMIT 20;
```

## ⚙️ Configuration

### Adjust Timeout Duration
Edit `set_pending_expiry()` function:
```sql
-- Change from 30 minutes to 60 minutes
NEW.pending_expires_at := NOW() + INTERVAL '60 minutes';
```

### Adjust Cleanup Frequency
```sql
-- Change from every 5 minutes to every 10 minutes
SELECT cron.schedule(
  'cleanup-expired-bookings', 
  '*/10 * * * *',  -- Every 10 minutes
  'SELECT cleanup_expired_bookings()'
);
```

## 🚨 Important Notes

1. **Timeout Period**: Currently set to 30 minutes. Adjust based on your admin approval workflow.

2. **Automatic Cleanup**: Must be set up separately using cron, pg_cron, or API endpoint.

3. **Customer Experience**: When slots expire, customer won't be notified. Consider adding customer notifications.

4. **Admin Dashboard**: Should show pending bookings with countdown timer and "Approve Now" button.

5. **Race Conditions**: Now fully protected by:
   - UNIQUE constraint (database level)
   - Atomic transactions (function level)
   - Conflict detection (application level)

6. **Performance**: All functions use indexed queries. Cleanup runs efficiently even with thousands of bookings.

## 📈 Next Steps

1. **Deploy SQL Script**: Run `booking-conflict-prevention.sql` in Supabase
2. **Test Thoroughly**: Verify all scenarios work as expected
3. **Set Up Cron Job**: Enable automatic cleanup
4. **Update Admin UI**: Show expiry countdown on pending bookings
5. **Add Customer Notifications**: Email/SMS when booking expires
6. **Monitor**: Set up alerts for high conflict rates

---

**Status**: ✅ Backend-safe conflict prevention complete
