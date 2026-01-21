# User Management System Setup Guide

## Overview
This guide will help you set up the multi-user role management system with **Admin** and **Ground Manager** roles.

### Roles & Permissions

**Admin:**
- Full access to all features
- Can manage users (create, edit, delete ground managers)
- Can view all bookings (including completed payments)
- Can edit and delete bookings
- Can add remaining payments
- Can view calendar

**Ground Manager:**
- Limited access
- Can view only bookings with remaining payment > 0
- Can add remaining payments
- Can view calendar
- **CANNOT** edit or delete bookings
- Once remaining payment is completed (remaining_payment = 0), booking disappears from their view

---

## Step 1: Run Database Schema

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Create a new query
4. Copy and paste the contents of `user-management-simplified.sql`
5. Click **Run**

This will create:
- `user_roles` table
- RLS policies for role-based access
- Helper functions (`check_user_role`, `get_user_role`)
- Triggers for automatic timestamp updates

---

## Step 2: Create Your First Admin User

After running the schema, you need to manually add your admin account:

1. In Supabase dashboard, go to **Authentication** → **Users**
2. Find your user account and copy the **User UID** (UUID format)
3. Go to **SQL Editor** and run this query (replace with your details):

```sql
INSERT INTO user_roles (user_id, name, email, role, is_active)
VALUES (
  'YOUR_USER_ID_HERE',  -- Paste your User UID from step 2
  'Admin Name',         -- Your name
  'admin@example.com',  -- Your email
  'admin',              -- Role (must be 'admin')
  true                  -- Active status
);
```

4. Click **Run**

---

## Step 3: Verify Setup

1. Log out and log back into your admin panel
2. You should now see a **Users** option in the sidebar
3. Click on **Users** to access the User Management page
4. If you can see this page, your admin role is working!

---

## Step 4: Add Ground Managers

From the Users Management page:

1. Click **Add User** button
2. Fill in the form:
   - Full Name (required)
   - Email (required) - This will be their login
   - Phone (optional)
   - Password (required, min 6 characters)
   - Role: Select **Ground Manager**
3. Click **Create User**

The ground manager will be created with:
- Email confirmation automatically enabled
- Limited permissions
- Ability to login immediately

---

## Ground Manager Login Instructions

Send these instructions to your ground managers:

1. Go to: `https://your-app-url.com/admin` (or your admin login page)
2. Login with email and password provided to you
3. You will see:
   - **Bookings** page: Only bookings with remaining payment
   - **Calendar** page: Full calendar view
   - **Complete Payment** button for each booking
4. Once payment is completed, the booking will disappear from your view

---

## Features Overview

### Admin Panel (Users Page)

**List of all users:**
- Name, email, phone
- Role badge (Admin/Ground Manager)
- Active/Inactive toggle switch
- Creation date
- Actions (Delete for ground managers only)

**Add User Modal:**
- Form validation
- Role selection
- Password requirements (min 6 chars)
- Auto-confirmation enabled

**User Management:**
- Toggle active/inactive status
- Delete ground managers (admins cannot be deleted)
- View user details

---

## Security Features

### Row Level Security (RLS)
- Users can only see their own profile
- Admins can see all profiles
- Only admins can create/update/delete users
- Ground managers cannot be created by non-admins

### API Protection
- All user management endpoints require admin role
- Auth checks on every request
- Rollback on failure (if auth creation succeeds but role assignment fails, auth user is deleted)

### Permission Checks
- Edit/Delete buttons hidden for ground managers
- API filters bookings based on role
- Ground managers see only `remaining_payment > 0` bookings

---

## Role-Based Filtering

### Bookings Page

**Admin view:**
- All bookings (regardless of payment status)
- All filters available
- Edit and delete buttons in menu

**Ground Manager view:**
- Only bookings with `remaining_payment > 0`
- Same search and filters
- No edit/delete buttons in menu
- Complete Payment button visible

### API Filtering

The system automatically adds `?remainingOnly=true` parameter for ground managers:

```typescript
// In bookings page
if (isGroundManager) {
  params.append('remainingOnly', 'true');
}

// In API
if (remainingOnly) {
  query = query.gt('remaining_payment', 0);
}
```

---

## Testing Checklist

### Admin Role Testing
- [ ] Can access Users page
- [ ] Can create ground managers
- [ ] Can see all bookings
- [ ] Can edit bookings
- [ ] Can delete bookings
- [ ] Can add remaining payments
- [ ] Can view calendar

### Ground Manager Role Testing
- [ ] Cannot access Users page (sidebar link hidden)
- [ ] Can see only unpaid bookings
- [ ] Cannot edit bookings (buttons hidden)
- [ ] Cannot delete bookings (buttons hidden)
- [ ] Can add remaining payments
- [ ] Can view calendar
- [ ] Bookings disappear after payment completion

---

## Troubleshooting

### Issue: "Failed to fetch user role"
**Solution:** Run the database schema again. The `user_roles` table might not exist.

### Issue: "Only admins can create users"
**Solution:** Verify your admin role in database:
```sql
SELECT * FROM user_roles WHERE user_id = 'YOUR_USER_ID';
```
Make sure `role` is 'admin' and `is_active` is true.

### Issue: Ground manager can see all bookings
**Solution:** Check browser console for errors. The `useUserRole` hook might not be loaded. Refresh the page.

### Issue: Cannot delete ground manager
**Solution:** Make sure you're logged in as admin. Check RLS policies:
```sql
SELECT * FROM pg_policies WHERE tablename = 'user_roles';
```

### Issue: "User creation failed"
**Solution:** Check Supabase logs. Common issues:
- Email already exists
- Password too short (min 6 chars)
- Missing required fields

---

## Database Schema Reference

### user_roles table
```sql
id              UUID PRIMARY KEY
user_id         UUID (links to auth.users)
name            VARCHAR(255)
email           VARCHAR(255) UNIQUE
phone           VARCHAR(20)
role            VARCHAR(50) DEFAULT 'ground_manager'
is_active       BOOLEAN DEFAULT true
created_at      TIMESTAMPTZ
updated_at      TIMESTAMPTZ
```

### Helper Functions
- `check_user_role(user_id, role)` - Returns boolean
- `get_user_role(user_id)` - Returns VARCHAR role name

---

## Next Steps

Now that user management is set up, you can:

1. Create multiple ground managers for different shifts
2. Monitor user activity
3. Deactivate users temporarily (instead of deleting)
4. Add more roles in the future (e.g., 'viewer', 'accountant')

For calendar mobile UI improvements, refer to the next section of documentation.
