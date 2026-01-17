# Environment Setup Instructions

## Missing Environment Variables

Your application requires Supabase configuration to work properly.

### Steps to Fix:

1. **Create `.env.local` file** in the project root:
   ```bash
   cp .env.example .env.local
   ```

2. **Get your Supabase credentials:**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Select your project
   - Go to Settings → API
   - Copy the following:
     - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
     - **anon/public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **Update `.env.local`:**
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
   ```

4. **Restart the development server:**
   ```bash
   npm run dev
   ```

### Current Error:
The application is trying to connect to Supabase but the environment variables are either:
- Not set in `.env.local`
- Set incorrectly (invalid API key format)
- Not loaded (server needs restart)

### Verify Setup:
Run this command to check if variables are loaded:
```bash
node -e "console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL, '\nKEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.slice(0,20) + '...')"
```

If you see `undefined`, the variables are not loaded.
