# 🚀 Deployment Guide - Cricket Booking Management System

## 📦 Project Architecture

**Tech Stack:**
- **Frontend & Backend**: Next.js 14+ (App Router)
- **Database**: Supabase (PostgreSQL)
- **UI Library**: Mantine v8
- **Authentication**: Supabase Auth

**Structure:**
```
cricket-booking-software/
├── app/                    # Next.js pages & API routes
│   ├── (public)/          # Public pages (home, bookings, etc.)
│   ├── (admin)/           # Admin panel pages
│   └── api/               # Backend API routes
├── components/            # React components
├── lib/                   # Utilities & Supabase client
└── types/                 # TypeScript types
```

---

## 🌐 Deployment Options

### ✅ **Option 1: Vercel (Recommended for Next.js)**

Vercel is built by Next.js creators and offers:
- ✨ Zero-config deployment
- 🚀 Automatic CDN & edge functions
- 📊 Built-in analytics
- 🔄 Automatic deployments from GitHub
- 💰 Free tier available

#### **Steps to Deploy on Vercel:**

1. **Install Vercel CLI** (optional):
   ```bash
   npm i -g vercel
   ```

2. **Deploy via GitHub** (easiest):
   - Go to [vercel.com](https://vercel.com)
   - Sign in with GitHub
   - Click "New Project"
   - Import `haroonaimode/booking-management-cricket`
   - Vercel auto-detects Next.js settings
   - Click "Deploy"

3. **Configure Environment Variables** (Important!):
   
   In Vercel dashboard → Settings → Environment Variables, add:
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```
   
   Get these from: Supabase Dashboard → Project Settings → API

4. **Redeploy** after adding environment variables

5. **Custom Domain** (optional):
   - Vercel provides: `your-app.vercel.app`
   - Add custom domain in Settings → Domains

---

### 🔷 **Option 2: Netlify**

Netlify is another great option for Next.js:

#### **Steps:**

1. Go to [netlify.com](https://netlify.com)
2. Sign in with GitHub
3. Click "Add new site" → "Import an existing project"
4. Select your repo: `booking-management-cricket`
5. Build settings (auto-detected):
   - Build command: `npm run build`
   - Publish directory: `.next`
6. Add environment variables (same as Vercel)
7. Deploy

---

### 🟢 **Option 3: Render**

Render supports Node.js apps:

#### **Steps:**

1. Go to [render.com](https://render.com)
2. Sign in with GitHub
3. Click "New" → "Web Service"
4. Connect repo: `booking-management-cricket`
5. Settings:
   - Name: cricket-booking
   - Environment: Node
   - Build command: `npm install && npm run build`
   - Start command: `npm start`
   - Instance Type: Free
6. Add environment variables
7. Create Web Service

---

## 🔐 Environment Variables Required

**For Production Deployment:**

```env
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Optional: Admin-specific keys (if you have Row Level Security)
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

**Where to find these:**
1. Go to [supabase.com](https://supabase.com)
2. Open your project
3. Settings → API
4. Copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - Project API keys → `anon` public → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Project API keys → `service_role` → `SUPABASE_SERVICE_ROLE_KEY`

---

## 📝 Pre-Deployment Checklist

- [ ] Supabase project created and database schema deployed
- [ ] All SQL scripts executed (database-schema-v2.sql, etc.)
- [ ] Environment variables ready
- [ ] `.env.local` file NOT committed to Git (it's in .gitignore)
- [ ] Test build locally: `npm run build`
- [ ] Admin user created in database

---

## 🧪 Test Local Build Before Deploying

```bash
# Build production version
npm run build

# Run production build locally
npm start

# Visit http://localhost:3000
```

---

## 🔄 Auto-Deployment Workflow

**Once set up on Vercel/Netlify:**

1. Make changes locally
2. Commit: `git commit -m "Update feature"`
3. Push: `git push origin main`
4. **Automatic deployment starts!** 🎉
5. Live in ~2 minutes

---

## 🌍 Post-Deployment Steps

### 1. **Update Supabase Auth URLs**

In Supabase Dashboard → Authentication → URL Configuration:

```
Site URL: https://your-app.vercel.app
Redirect URLs:
- https://your-app.vercel.app/*
- https://your-app.vercel.app/admin/login
- https://your-app.vercel.app/admin/dashboard
```

### 2. **Test All Features**

- [ ] Public booking form
- [ ] Check booking search
- [ ] Admin login
- [ ] Admin dashboard
- [ ] Booking approvals
- [ ] Payment management
- [ ] Notifications

### 3. **Enable Production Features**

- [ ] Set up custom domain
- [ ] Configure email templates in Supabase
- [ ] Set up monitoring/analytics
- [ ] Enable CORS if needed

---

## 🐛 Common Deployment Issues

### **Issue 1: Environment Variables Not Working**

**Solution:** 
- Ensure variables start with `NEXT_PUBLIC_` for client-side
- Redeploy after adding variables
- Check Vercel build logs

### **Issue 2: Supabase Connection Fails**

**Solution:**
- Verify URL and keys are correct
- Check Supabase project is active
- Ensure RLS policies allow connections

### **Issue 3: Build Fails**

**Solution:**
```bash
# Test build locally first
npm run build

# Check error logs in deployment platform
# Usually TypeScript errors or missing dependencies
```

### **Issue 4: API Routes Not Working**

**Solution:**
- Next.js API routes should work automatically
- Ensure app/api/ folder structure is correct
- Check deployment logs for API errors

---

## 📊 Monitoring & Analytics

**Vercel Analytics** (if using Vercel):
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

---

## 🎯 Performance Optimization Tips

1. **Enable Image Optimization** (automatic on Vercel)
2. **Use Next.js Image component** for all images
3. **Enable caching** in Supabase queries
4. **Set up CDN** for static assets
5. **Monitor Core Web Vitals** in Vercel dashboard

---

## 📞 Need Help?

- **Next.js Docs**: https://nextjs.org/docs
- **Vercel Support**: https://vercel.com/support
- **Supabase Docs**: https://supabase.com/docs
- **Mantine Docs**: https://mantine.dev

---

## 🎉 You're All Set!

Your cricket booking system is now live and ready for customers! 🏏

**Live URL:** `https://your-app.vercel.app`
**Admin Panel:** `https://your-app.vercel.app/admin/login`
**GitHub Repo:** https://github.com/haroonaimode/booking-management-cricket
