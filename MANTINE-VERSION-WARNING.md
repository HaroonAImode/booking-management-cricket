# ⚠️ MANTINE VERSION COMPATIBILITY WARNING

## Critical Issue Resolved: January 22, 2026

### 🔴 THE PROBLEM
```
Uncaught TypeError: i?.includes is not a function
```

This error occurred when clicking "Continue to Booking Form" and was caused by **Mantine version incompatibility**.

---

## 🎯 ROOT CAUSE

### What Happened:
1. **Initial Setup**: Project used Mantine v8.3.12 + React 19
2. **Responsive Props Used**: Components had responsive size objects:
   ```tsx
   <Text size={{ base: 'xs', sm: 'sm' }} />
   <Title size={{ base: 'h3', sm: 'h2', md: 'h1' }} />
   ```

3. **Downgrade Required**: React 19 incompatible with Mantine v7, so we downgraded to:
   - React 18.2.0
   - Mantine 7.12.2

4. **Breaking Change**: Responsive size objects `{{ base: 'xs', sm: 'sm' }}` are **ONLY supported in Mantine v8+**

5. **Error Triggered**: Mantine v7 expects `size` to be a STRING, not an object. When it tried to validate using `.includes()` on an object, it crashed.

---

## ✅ THE SOLUTION

**Replaced ALL responsive size objects with simple strings:**

### ❌ WRONG (Mantine v8 only):
```tsx
<Text size={{ base: 'xs', sm: 'sm' }} />
<Title size={{ base: 'h3', sm: 'h2', md: 'h1' }} />
<Button size={{ base: 'sm', sm: 'md' }} />
```

### ✅ CORRECT (Mantine v7):
```tsx
<Text size="sm" />
<Title size="h2" />
<Button size="md" />
```

---

## 🚨 RULES TO FOLLOW

### 1. **Mantine v7 Limitations**
- ❌ NO responsive size objects
- ❌ NO `overlayProps` in Modal/LoadingOverlay
- ❌ NO `transitionProps` with duration/transition objects in defaultProps
- ✅ Use simple string values: `"xs"`, `"sm"`, `"md"`, `"lg"`, `"xl"`

### 2. **Mantine v8+ Features**
- ✅ Responsive objects supported: `{{ base: 'xs', sm: 'sm' }}`
- ✅ Advanced theme configurations
- ⚠️ **BUT**: Requires React 18.2+ (not React 19 yet as of Jan 2026)

### 3. **Current Project Setup (STABLE)**
```json
{
  "dependencies": {
    "@mantine/core": "7.12.2",
    "@mantine/dates": "7.12.2",
    "@mantine/hooks": "7.12.2",
    "@mantine/notifications": "7.12.2",
    "react": "^18.2.0",
    "react-dom": "^18.2.0"
  }
}
```

---

## 📋 CHECKLIST BEFORE UPGRADING MANTINE

- [ ] Check React version compatibility
- [ ] Review Mantine breaking changes documentation
- [ ] Search codebase for responsive size objects: `size={{ base:`
- [ ] Test booking flow completely after upgrade
- [ ] Verify theme configuration matches new version API
- [ ] Clear Vercel build cache when deploying

---

## 🔍 HOW TO DETECT THIS ISSUE

### Symptoms:
1. White screen on specific pages
2. "Application error: a client-side exception has occurred"
3. Console error: `i?.includes is not a function`
4. Error occurs in Mantine theme validation code

### Quick Fix:
```bash
# Search for responsive size objects
grep -r "size={{ base:" components/
grep -r "size={{ base:" app/

# Replace with simple strings
size={{ base: 'xs', sm: 'sm' }} → size="sm"
```

---

## 📚 FILES AFFECTED IN THIS FIX

1. `components/CalendarFirstBooking.tsx` - Removed responsive sizes
2. `components/BookingForm.tsx` - Removed responsive sizes
3. `package.json` - Downgraded to Mantine v7.12.2 + React 18
4. `app/layout.tsx` - Removed theme (now using default)
5. `styles/theme-new.ts` - Minimal theme configuration

---

## ⚡ LESSON LEARNED

**NEVER mix Mantine v8 syntax with Mantine v7 runtime!**

When downgrading Mantine versions:
1. ✅ Update package.json
2. ✅ Update ALL components to use v7 syntax
3. ✅ Remove v8-only features
4. ✅ Test thoroughly before deploying
5. ✅ Clear build caches

---

## 🎓 FOR FUTURE DEVELOPERS

If you see the `.includes is not a function` error:
1. Check your Mantine version
2. Search for responsive size objects in components
3. Replace them with simple strings
4. Redeploy with cleared cache

**This issue cost multiple hours of debugging. Learn from it!**

---

## 📞 NEED HELP?

If this error reoccurs:
1. Read this file first
2. Check Mantine version in package.json
3. Verify no responsive size objects exist
4. Clear browser cache AND Vercel build cache
5. Redeploy from scratch if needed

**Last Updated**: January 22, 2026
**Status**: ✅ RESOLVED
