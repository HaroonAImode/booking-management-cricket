# 🚀 Security Implementation Guide

Quick reference for implementing security enhancements in the Cricket Booking Software.

---

## Step 1: Apply Database Security Hardening

```bash
# Connect to Supabase SQL Editor and run:
psql -h db.xxx.supabase.co -U postgres -d postgres -f security-hardening.sql

# OR copy/paste the contents of security-hardening.sql into Supabase SQL Editor
```

**Verify RLS is enabled:**
```sql
SELECT tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public' 
ORDER BY tablename;
```

Expected: All tables should show `rowsecurity = true`

---

## Step 2: Add Security Headers to next.config.js

```javascript
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          {
            key: 'Permissions-Policy',
            value: 'camera=(), microphone=(), geolocation=()',
          },
          {
            key: 'Strict-Transport-Security',
            value: 'max-age=63072000; includeSubDomains; preload',
          },
          {
            key: 'Content-Security-Policy',
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.supabase.co",
              "frame-ancestors 'none'",
            ].join('; '),
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
```

---

## Step 3: Add Rate Limiting to Public Booking API

```typescript
// app/api/bookings/route.ts (or similar public booking endpoint)
import { rateLimitMiddleware } from '@/lib/rate-limiting';

export async function POST(request: Request) {
  // Add rate limiting
  const rateLimit = await rateLimitMiddleware(request, 'createBooking');
  if (!rateLimit.allowed) {
    return rateLimit.response;
  }

  // ... rest of your booking logic
}
```

---

## Step 4: Add Rate Limiting to Admin Login

```typescript
// app/(admin)/login/page.tsx or login API route
import { ClientRateLimiter } from '@/lib/security';

// In your component
const loginRateLimiter = new ClientRateLimiter('admin-login', 5, 15); // 5 attempts per 15 minutes

const handleLogin = async () => {
  // Check rate limit
  if (!loginRateLimiter.canMakeRequest()) {
    const waitTime = Math.ceil(loginRateLimiter.getTimeUntilReset() / 1000 / 60);
    notifications.show({
      title: 'Too Many Attempts',
      message: `Please wait ${waitTime} minutes before trying again.`,
      color: 'red',
    });
    return;
  }

  // Attempt login
  const { data, error } = await signInAdmin(email, password);
  
  if (error) {
    // Record failed attempt
    loginRateLimiter.recordRequest();
    // ... show error
  } else {
    // Success - you might want to reset the limiter
    // ... redirect to dashboard
  }
};
```

---

## Step 5: Enhance BookingForm with Security Utilities

```typescript
// components/BookingForm.tsx
import { 
  sanitizeText, 
  sanitizePhone, 
  validateEmail, 
  validatePhone,
  validateName 
} from '@/lib/security';

// In your validation function
const validateForm = (): boolean => {
  const newErrors: Record<string, string> = {};

  // Sanitize and validate name
  const cleanName = sanitizeText(name);
  if (!validateName(cleanName)) {
    newErrors.name = 'Name must contain only letters, spaces, and hyphens';
  }

  // Sanitize and validate phone
  const cleanPhone = sanitizePhone(phone);
  if (!validatePhone(cleanPhone)) {
    newErrors.phone = 'Invalid phone number (must be 11 digits starting with 03)';
  }

  // Validate email if provided
  if (email && !validateEmail(email)) {
    newErrors.email = 'Invalid email address';
  }

  // ... rest of validation
  
  setErrors(newErrors);
  return Object.keys(newErrors).length === 0;
};

// When submitting
const handleSubmit = async () => {
  // Use sanitized values
  const bookingData = {
    customer: {
      name: sanitizeText(name),
      phone: sanitizePhone(phone),
      email: email ? sanitizeText(email) : undefined,
      address: address ? sanitizeText(address) : undefined,
      alternate_phone: alternatePhone ? sanitizePhone(alternatePhone) : undefined,
    },
    // ... rest of booking data
  };
};
```

---

## Step 6: Add Audit Logging to Critical Admin Actions

```typescript
// Example: In booking approval function
import { createClient } from '@/lib/supabase/server';

export async function approveBooking(bookingId: string) {
  const supabase = createClient();
  
  // Perform approval
  const { data, error } = await supabase.rpc('approve_booking', {
    p_booking_id: bookingId,
  });
  
  if (!error) {
    // Log the action
    await supabase.rpc('log_audit_event', {
      p_event_type: 'data_modify',
      p_resource_type: 'booking',
      p_resource_id: bookingId,
      p_action: 'approve',
      p_details: { status: 'approved', timestamp: new Date().toISOString() },
    });
  }
  
  return { data, error };
}
```

---

## Step 7: Update Supabase Storage Policies

Run these in Supabase SQL Editor:

```sql
-- Drop any existing overly permissive policies
DROP POLICY IF EXISTS "Public can upload payment proofs" ON storage.objects;

-- Admin-only read access
CREATE POLICY "Admin read payment proofs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND
    is_admin()
  );

-- Public can upload images only
CREATE POLICY "Public upload payment proofs"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (
    bucket_id = 'payment-proofs' AND
    (storage.foldername(name))[1] = 'payment-proofs' AND
    (lower(storage.extension(name)) IN ('jpg', 'jpeg', 'png', 'gif', 'webp'))
  );

-- Admin can delete payment proofs
CREATE POLICY "Admin delete payment proofs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'payment-proofs' AND
    is_admin()
  );
```

Also set max file size in Supabase Dashboard → Storage → payment-proofs bucket → Settings:
- Max file size: 5MB

---

## Step 8: Enable Email Verification (Supabase Dashboard)

1. Go to Supabase Dashboard → Authentication → Settings
2. Enable "Email Confirmations"
3. Update email templates if needed
4. Test registration flow

---

## Step 9: Configure CORS (Supabase Dashboard)

1. Go to Supabase Dashboard → Settings → API
2. Add your production domain to allowed origins:
   - `https://yourdomain.com`
   - `https://www.yourdomain.com`
3. Remove `*` if present (too permissive)

---

## Step 10: Set Up Monitoring

### Option A: Sentry (Recommended)

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  environment: process.env.NODE_ENV,
});
```

### Option B: Custom Error Logging

```typescript
// lib/error-logger.ts
export async function logError(
  error: Error,
  context?: { userId?: string; action?: string; data?: any }
) {
  // Log to Supabase
  const supabase = createClient();
  await supabase.rpc('log_audit_event', {
    p_event_type: 'error',
    p_resource_type: 'system',
    p_action: context?.action || 'error',
    p_details: {
      message: error.message,
      stack: error.stack,
      ...context,
    },
  });
  
  // Also log to console in dev
  if (process.env.NODE_ENV === 'development') {
    console.error('Error logged:', error, context);
  }
}
```

---

## Verification Steps

### 1. Test RLS Policies

```sql
-- Switch to anon role (public user)
SET ROLE anon;

-- Try to select from customers (should fail)
SELECT * FROM customers;
-- Expected: No rows returned

-- Try to select from bookings (should fail)
SELECT * FROM bookings;
-- Expected: No rows returned

-- Switch back to authenticated admin
RESET ROLE;
```

### 2. Test Rate Limiting

```bash
# Use curl to test rate limiting
for i in {1..10}; do
  curl -X POST http://localhost:3000/api/bookings \
    -H "Content-Type: application/json" \
    -d '{"test": "data"}' \
    && echo " - Request $i"
done

# After 5 requests, should get 429 Too Many Requests
```

### 3. Test File Upload Security

Try uploading:
- ✅ PNG image (should succeed)
- ✅ JPEG image (should succeed)
- ❌ PDF file (should fail)
- ❌ EXE file (should fail)
- ❌ 10MB file (should fail - over 5MB limit)

### 4. Test Input Validation

Try submitting booking with:
- `<script>alert('xss')</script>` in name → Should be sanitized
- `'; DROP TABLE bookings; --` in notes → Should be escaped
- Invalid phone number → Should show validation error
- Invalid email → Should show validation error

### 5. Test Admin Authentication

- ❌ Try accessing `/dashboard` without login → Should redirect to `/admin/login`
- ✅ Login with admin credentials → Should access dashboard
- ❌ Try accessing admin API without auth → Should get 401 Unauthorized

---

## Production Deployment Checklist

- [ ] Run `security-hardening.sql` on production database
- [ ] Verify RLS on all tables
- [ ] Add security headers to next.config.js
- [ ] Enable rate limiting on public APIs
- [ ] Enable rate limiting on admin login
- [ ] Configure Supabase storage policies
- [ ] Set file size limit in Supabase dashboard (5MB)
- [ ] Enable email verification in Supabase
- [ ] Configure CORS for production domain only
- [ ] Set up error monitoring (Sentry or custom)
- [ ] Remove all console.log statements
- [ ] Set NODE_ENV=production
- [ ] Enable HTTPS only (Vercel default)
- [ ] Configure custom domain with SSL
- [ ] Set up daily backup schedule
- [ ] Enable DDoS protection (Cloudflare recommended)
- [ ] Test all security measures
- [ ] Review audit logs after first 24 hours
- [ ] Set up alerts for failed auth attempts

---

## Maintenance Schedule

### Daily
- Review audit logs for suspicious activity
- Check error rates in monitoring dashboard
- Monitor failed login attempts

### Weekly
- Review rate limit violations
- Check for outdated dependencies: `npm outdated`
- Review and clear old audit logs (keep 90 days)

### Monthly
- Run security audit: `npm audit`
- Update dependencies: `npm update`
- Review and update security policies
- Test backup restoration

### Quarterly
- Full security audit review
- Penetration testing (if budget allows)
- Review and update access controls
- Team security training

---

## Support & Resources

**Documentation:**
- [SECURITY-AUDIT-CHECKLIST.md](SECURITY-AUDIT-CHECKLIST.md) - Complete security audit
- [SECURITY-HARDENING-COMPLETE.md](SECURITY-HARDENING-COMPLETE.md) - Detailed security guide
- [security-hardening.sql](security-hardening.sql) - Database security script

**Code References:**
- [lib/security.ts](lib/security.ts) - Input validation utilities
- [lib/rate-limiting.ts](lib/rate-limiting.ts) - Rate limiting utilities
- [lib/supabase/api-auth.ts](lib/supabase/api-auth.ts) - API authentication

**External Resources:**
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Next.js Security](https://nextjs.org/docs/app/building-your-application/configuring/security-headers)

**For Security Issues:**
- Email: security@yourcompany.com
- Responsible Disclosure: 90 days

---

**Last Updated:** January 2026  
**Version:** 1.0
