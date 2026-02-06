# Push Notification Issue Fixed! 🔔

## Problem
You were seeing **2 duplicate notifications** because:
1. ❌ Old push subscription from previous Vercel project (causing 404 error)
2. ✅ New push subscription from current project (working correctly)

## What Was Fixed

### 1. Service Worker URL Fix
Updated [sw.js](public/sw.js) to **always use the correct production URL**:
```javascript
const PRODUCTION_URL = 'https://cricket-booking-peach.vercel.app';
```

Instead of using `self.location.origin` (which used the old domain).

### 2. Environment Variable Added
Added to [.env.local](.env.local):
```env
NEXT_PUBLIC_APP_URL=https://cricket-booking-peach.vercel.app
```

## Action Required

### Step 1: Update Vercel Environment Variables
Go to your Vercel project settings and add:
```
NEXT_PUBLIC_APP_URL=https://cricket-booking-peach.vercel.app
```

### Step 2: Clean Up Old Subscriptions (Choose ONE method)

#### Method A: Simple Re-subscribe (Recommended) ✅
1. On **admin mobile device**, open https://cricket-booking-peach.vercel.app/admin
2. Toggle **Push Notifications OFF**
3. Wait 2 seconds
4. Toggle **Push Notifications ON** again
5. Done! Old subscription will be automatically deactivated

#### Method B: Database Cleanup (Advanced) 🔧
Run the SQL script [cleanup-old-push-subscriptions.sql](cleanup-old-push-subscriptions.sql) in Supabase SQL Editor:
```sql
-- Deactivate old subscriptions
UPDATE admin_push_subscriptions
SET is_active = false
WHERE endpoint NOT LIKE '%cricket-booking-peach.vercel.app%';
```

### Step 3: Redeploy (Important!)
After updating Vercel environment variable, **redeploy** your app:
```bash
git add .
git commit -m "fix: notification URL and cleanup duplicates"
git push
```

## Testing
1. Create a test booking from the public form
2. You should now receive **only 1 notification**
3. Clicking it should open the **correct** booking page (no 404 error)

## Notes
- The service worker cache may need to be cleared on mobile
- If still seeing duplicates, use Method B to force cleanup
- Check Supabase → Admin Push Subscriptions table to verify only 1 active subscription per device
