# 📱 What Admin Receives on Mobile

## Notification Preview

When a customer books, the admin gets a mobile push notification that looks like this:

---

### **🔔 Notification Appearance:**

```
┌─────────────────────────────────────┐
│  🏏 New Booking Request             │
│  ────────────────────────────────   │
│  Ahmed Khan booked for Mon, Jan 20  │
│  - 2 hour(s)                        │
│                                     │
│  ┌──────────────┐  ┌──────────┐   │
│  │ Review &     │  │ Dismiss  │   │
│  │ Approve      │  │          │   │
│  └──────────────┘  └──────────┘   │
└─────────────────────────────────────┘
```

---

## Notification Details

### **Title:** 
🏏 New Booking Request

### **Message:**
[Customer Name] booked for [Date] - [Hours] hour(s)

**Example:**
"Ahmed Khan booked for Mon, Jan 20 - 2 hour(s)"

### **Actions:**
1. **"Review & Approve"** button - Opens admin panel directly to bookings page
2. **"Dismiss"** button - Closes notification

### **Features:**
- ✅ **Sound alert** when received
- ✅ **Vibration** on mobile (pattern: buzz, pause, buzz)
- ✅ **Works even when browser closed** (Android Chrome)
- ✅ **Shows on lock screen** (if permissions granted)
- ✅ **Badge icon** showing cricket arena logo
- ✅ **Clickable** - Opens to booking details

---

## Click Behavior

**When admin clicks notification:**
- 🔗 Opens: `https://your-app.vercel.app/admin/bookings?id=[booking-id]`
- 📱 If admin panel already open in another tab → Focuses that tab
- 📱 If no tab open → Opens new tab with booking details

---

## Troubleshooting

### **Not receiving notifications?**

1. **Check browser permissions:**
   - Mobile Chrome: Settings → Site Settings → cricket-booking-six.vercel.app → Notifications → Allow

2. **Enable in admin dashboard:**
   - Go to Dashboard → Toggle "Push Notifications" ON

3. **Make sure VAPID keys are in Vercel:**
   - Vercel Dashboard → Settings → Environment Variables
   - Check both `NEXT_PUBLIC_VAPID_PUBLIC_KEY` and `VAPID_PRIVATE_KEY` exist

4. **Test with test button:**
   - Go to customer booking page
   - Click "Send Test Notification" button
   - Should receive immediately if setup correct

---

## Testing Steps

1. **Use Test Button** (added temporarily):
   - Go to: `/bookings` page
   - See orange test box at top
   - Click "Send Test Notification"
   - Check mobile phone for notification

2. **Real Booking Test:**
   - Fill booking form completely
   - Submit booking
   - Admin gets notification within 1-2 seconds

---

**Current Status:** Test button added to `/bookings` page for quick testing without filling forms!
