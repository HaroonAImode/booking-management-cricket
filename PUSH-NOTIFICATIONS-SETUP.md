# Push Notifications Setup Guide

## 🚀 Quick Setup (3 Steps)

### **Step 1: Add VAPID Keys to .env.local**

Add these two lines to your `.env.local` file:

```env
NEXT_PUBLIC_VAPID_PUBLIC_KEY=BOPaastpzt6JBMCHygIX4Shk_NtkOrUqf1ZTQTRfTL6MqglC2n8Ct4MZnxocxRJuyHme6yHmeaognHwgpwvo4ArrAQ
VAPID_PRIVATE_KEY=jDtrZdSlNcik30R2mRf4WOmSzwlhVC-Vv6QgIasDBrQ
```

### **Step 2: Create Database Table**

Go to Supabase SQL Editor and run the SQL from `push-subscriptions-schema.sql` file.

This creates the `admin_push_subscriptions` table to store device subscriptions.

### **Step 3: Restart Your Dev Server**

```bash
npm run dev
```

---

## 📱 How It Works

### **For Admins:**

1. **Login to Admin Panel** → Go to Dashboard
2. **Enable Notifications** → Toggle the "Push Notifications" switch
3. **Allow Permission** → Click "Allow" in browser prompt
4. **You're Done!** → You'll receive a test notification

### **What Happens:**

- Customer books slot → Push notification sent to your phone
- Notification shows: "🏏 New Booking Request - [Customer Name] booked..."
- Click "Review & Approve" button → Opens admin panel to that booking
- Works even when browser is closed (on Android Chrome)

---

## 🔧 Testing Push Notifications

### **Test 1: From Dashboard**
1. Go to Admin Dashboard
2. Toggle "Push Notifications" ON
3. You should receive: "🎉 Push Notifications Enabled!" test notification

### **Test 2: Real Booking**
1. Open `/bookings` page (as customer)
2. Fill form and submit booking
3. Admin receives: "🏏 New Booking Request - [Customer Name]..."

---

## 📋 Features Included

✅ **Service Worker** - Handles push events and notification clicks  
✅ **Push Subscription Management** - Auto-subscribes admin devices  
✅ **API Routes** - Send notifications to all subscribed admins  
✅ **Toggle Component** - Easy enable/disable in dashboard  
✅ **Auto-notification** - Triggers on every new booking  
✅ **Direct Links** - Click notification → Opens booking details  
✅ **Multi-device Support** - Works on multiple admin phones  

---

## 🌐 Browser Support

| Browser | Mobile | Desktop |
|---------|--------|---------|
| Chrome | ✅ Full support | ✅ Full support |
| Edge | ✅ Full support | ✅ Full support |
| Firefox | ✅ Full support | ✅ Full support |
| Safari | ⚠️ Limited (iOS 16.4+) | ⚠️ Limited |
| Opera | ✅ Full support | ✅ Full support |

**Note:** Push notifications work best on Chrome/Edge mobile. Safari has limited support.

---

## ❓ Troubleshooting

### **Notifications not showing?**

1. Check browser permissions: Settings → Site Settings → Notifications
2. Make sure .env.local has both VAPID keys
3. Restart dev server after adding keys
4. Check browser console for errors

### **"Push notifications are not supported"**

- You're on Safari iOS < 16.4 (not supported)
- Try Chrome or Edge browser instead

### **Notification shows but doesn't open booking?**

- Service worker not registered
- Hard refresh page (Ctrl + Shift + R)
- Clear browser cache

---

## 🔐 Security Notes

- VAPID keys are **already generated** and included above
- Private key stays on server (not exposed to client)
- Public key is safe to use in frontend
- Each admin device gets unique subscription
- RLS policies protect subscription data

---

## 📝 Database Schema

The `admin_push_subscriptions` table stores:

- `user_id` - Admin user ID
- `endpoint` - Browser push endpoint
- `p256dh_key` - Encryption key
- `auth_key` - Authentication key
- `is_active` - Enable/disable without deletion

---

## 🎯 Next Steps

After setup is complete:

1. Test on your mobile device
2. Enable notifications for all admin users
3. Book a test slot and verify notification arrives
4. Customize notification messages in `/api/notifications/push/route.ts` if needed

---

**Setup completed! Push notifications are now fully functional! 🎉**
