# Admin Authentication Setup - Complete Guide

## ✅ Implementation Complete

Admin authentication with Supabase Auth is now fully implemented with:
- Database schema with admin profiles and roles
- Middleware-based route protection
- Admin login/logout functionality
- Role-based access control (RBAC)
- Protected API routes with HOC helpers

---

## 📁 Files Created/Modified

### **1. Database Schema** (`admin-authentication-setup.sql`)
- `admin_profiles` table with roles (admin, super_admin, staff)
- Helper functions: `is_admin()`, `has_admin_role()`, `get_admin_profile()`
- RLS policies for all tables
- Automated last_login tracking

### **2. Authentication Utilities** (`lib/supabase/auth.ts`)
- `signInAdmin()` - Login with email/password
- `signOutAdmin()` - Logout
- `getAdminSession()` - Get current session
- `getAdminProfile()` - Get admin profile
- `isAuthenticated()` - Check auth status
- `hasRole()` - Check specific role

### **3. Middleware** (`lib/supabase/middleware.ts`)
- Protects `/dashboard` and `/admin/*` routes
- Redirects unauthenticated users to `/admin/login`
- Verifies admin profile exists
- Adds admin info to request headers

### **4. API Route Protection** (`lib/supabase/api-auth.ts`)
- `withAdminAuth()` - HOC for admin-only routes
- `withAdminRole()` - HOC for role-specific routes
- `verifyAdminAuth()` - Manual verification helper

### **5. Admin Login Page** (`app/(admin)/login/page.tsx`)
- Email/password form
- Error handling
- Redirect after login
- Mobile-responsive design

### **6. Admin Header** (`components/layouts/AdminHeader.tsx`)
- Profile menu with user info
- Role badge display
- Logout button
- Loading states

### **7. Example Protected API** (`app/api/admin/bookings/route.ts`)
- GET endpoint with pagination and filtering
- PATCH endpoint for status updates
- Demonstrates `withAdminAuth()` usage

---

## 🚀 Setup Instructions

### **Step 1: Run Database Script**

```sql
-- Run in Supabase SQL Editor
-- File: admin-authentication-setup.sql
```

This creates:
- `admin_profiles` table
- Helper functions
- RLS policies
- Triggers

### **Step 2: Create Admin User**

1. **Go to Supabase Dashboard**
   - Authentication > Users > Add User

2. **Create user with email/password**
   - Email: `admin@cricketbooking.com`
   - Password: `your-secure-password`
   - Auto Confirm User: ✅ Yes

3. **Copy the User ID** from the newly created user

4. **Run in SQL Editor:**
```sql
SELECT create_admin_profile(
  'USER_ID_HERE'::UUID,
  'admin@cricketbooking.com',
  'System Administrator',
  'super_admin'
);
```

### **Step 3: Verify Installation**

```sql
-- Check admin profiles
SELECT * FROM admin_profiles;

-- Test helper function
SELECT is_admin();

-- Check RLS policies
SELECT 
  schemaname, 
  tablename, 
  policyname, 
  cmd
FROM pg_policies 
WHERE tablename IN ('bookings', 'admin_profiles', 'customers');
```

### **Step 4: Test Authentication**

1. **Start dev server:**
```powershell
npm run dev
```

2. **Visit admin login:**
```
http://localhost:3000/admin/login
```

3. **Login with credentials**
   - Email: `admin@cricketbooking.com`
   - Password: (your password)

4. **Should redirect to:**
```
http://localhost:3000/dashboard
```

---

## 🔐 Security Features

### **1. Middleware Protection**
- Automatically protects all `/dashboard` and `/admin/*` routes
- Redirects unauthenticated users to login
- Verifies admin profile exists and is active

### **2. Row Level Security (RLS)**
- All tables have RLS enabled
- Policies enforce admin-only access
- Public can only create bookings (no read/update/delete)

### **3. Role-Based Access Control**
- **super_admin**: Full access to everything
- **admin**: Standard admin access
- **staff**: Limited access (for future use)

### **4. API Route Protection**
```typescript
// Protect entire route
export const GET = withAdminAuth(async (request, { adminProfile }) => {
  // Only admins can access this
});

// Require specific role
export const DELETE = withAdminRole('super_admin', async (request, { adminProfile }) => {
  // Only super_admins can access this
});
```

---

## 📝 Usage Examples

### **Client-Side Authentication Check**
```typescript
import { isAuthenticated, getAdminProfile } from '@/lib/supabase/auth';

// Check if logged in
const authenticated = await isAuthenticated();

// Get profile
const profile = await getAdminProfile();
console.log(profile?.role); // 'super_admin'
```

### **Protected API Route**
```typescript
// app/api/admin/settings/route.ts
import { withAdminRole } from '@/lib/supabase/api-auth';

export const PATCH = withAdminRole('super_admin', async (request, { adminProfile }) => {
  // Only super_admins can update settings
  return NextResponse.json({ success: true });
});
```

### **Manual Auth Check**
```typescript
import { verifyAdminAuth } from '@/lib/supabase/api-auth';

export async function GET(request: NextRequest) {
  const { authorized, response, adminProfile } = await verifyAdminAuth(request);
  
  if (!authorized) {
    return response; // 401 or 403
  }
  
  // Continue with authenticated request
}
```

---

## 🔧 Configuration

### **Environment Variables** (`.env.local`)
```env
NEXT_PUBLIC_SUPABASE_URL=https://ntitdskrcuwgqwzwhjkm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### **Middleware Config** (`lib/supabase/middleware.ts`)
```typescript
// Protected routes
const isAdminRoute = request.nextUrl.pathname.startsWith('/dashboard') || 
                     request.nextUrl.pathname.startsWith('/admin');

// Login page
const isLoginPage = request.nextUrl.pathname === '/admin/login';
```

---

## 🧪 Testing Checklist

- [ ] Run SQL script successfully
- [ ] Create admin user in Supabase Auth
- [ ] Create admin profile via SQL function
- [ ] Login at `/admin/login`
- [ ] Redirect to `/dashboard` after login
- [ ] See profile menu in AdminHeader
- [ ] Logout successfully
- [ ] Try accessing `/dashboard` without login (should redirect)
- [ ] Test protected API route
- [ ] Verify RLS policies block unauthorized access

---

## 🎯 Next Steps

1. **Build Admin Dashboard** (`app/(admin)/dashboard/page.tsx`)
   - Booking statistics
   - Recent bookings list
   - Quick actions

2. **Build Booking Management** (`app/(admin)/bookings/page.tsx`)
   - List all bookings
   - Filter by status
   - Approve/reject actions
   - View details

3. **Add More Admin Features**
   - Settings management
   - Customer management
   - Payment tracking
   - Reports & analytics

4. **Add Staff Role Features**
   - Read-only dashboard for staff
   - Limited booking view
   - No settings access

---

## 🔍 Troubleshooting

### **"Authentication failed" error**
- Check email/password are correct
- Verify user exists in Supabase Auth
- Check user email is confirmed

### **"Access denied. Admin privileges required"**
- Verify admin_profile exists for user
- Check `is_active = true` in admin_profiles
- Run: `SELECT * FROM admin_profiles WHERE email = 'your@email.com';`

### **Redirect loop on login**
- Clear browser cookies
- Check middleware isn't blocking login page
- Verify env variables are set

### **API returns 401 Unauthorized**
- Check user is logged in
- Verify session is valid
- Check RLS policies aren't too restrictive

### **RLS blocking legitimate requests**
- Check helper functions: `is_admin()`, `has_admin_role()`
- Verify functions use `SECURITY DEFINER`
- Test: `SELECT is_admin();` (should return true when logged in)

---

## 📚 Reference

### **Admin Roles**
- `super_admin` - Full system access
- `admin` - Standard admin access  
- `staff` - Limited read access

### **Helper Functions**
- `is_admin()` - Returns true if current user is active admin
- `has_admin_role(role)` - Check specific role
- `get_admin_profile()` - Get current admin's profile
- `update_admin_last_login()` - Update login timestamp
- `create_admin_profile()` - Create new admin user

### **RLS Policies**
All tables protected with RLS:
- `bookings` - Admins: full access, Public: insert only
- `booking_slots` - Admins: update, Public: read
- `customers` - Admins: read, System: write
- `payments` - Admins: full access
- `notifications` - Admins: read/update, System: insert
- `settings` - Admins: update, Public: read
- `admin_profiles` - Self: read, Super admin: full access

---

## ✅ Implementation Status

**Database:** ✅ Complete
**Middleware:** ✅ Complete  
**Auth Utils:** ✅ Complete
**Login Page:** ✅ Complete
**Admin Header:** ✅ Complete
**API Protection:** ✅ Complete

**Ready for Testing!** 🎉
