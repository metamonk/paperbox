# Supabase Redirect URLs Configuration

**Project**: CollabCanvas
**Supabase Project**: snekuamfpiwauvfyecpu
**Date**: 2025-10-18

## Current Situation

✅ Resend SMTP already configured in Supabase
❌ Sign-up failing with HTTP 500 errors
🔍 **Root Cause**: Missing or incorrect redirect URL configuration

## Quick Fix: Configure Redirect URLs

Since SMTP is already working, the issue is likely the **email confirmation redirect URLs** are not configured for your domains.

### Step-by-Step Instructions

1. **Open Supabase Dashboard**:
   - Go to: https://app.supabase.com/project/snekuamfpiwauvfyecpu
   - Navigate to: **Authentication → URL Configuration**

2. **Configure Site URL**:

   **For Development** (current):
   ```
   Site URL: http://localhost:5174
   ```

   **For Production** (when deploying):
   ```
   Site URL: https://your-production-domain.com
   ```

3. **Configure Redirect URLs**:

   Add these URLs to the **Redirect URLs** whitelist:

   **Development URLs**:
   ```
   http://localhost:5173/**
   http://localhost:5174/**
   http://localhost:5175/**
   ```

   **Production URLs** (add your actual domain):
   ```
   https://yourdomain.com/**
   https://*.yourdomain.com/**
   ```

4. **Format Explanation**:
   - `**` = Wildcard matching any path (e.g., `/auth/callback`, `/login`)
   - `*` in subdomain = Matches any subdomain (e.g., `app.domain.com`, `staging.domain.com`)

5. **Save Changes**:
   - Click **Save** at the bottom of the page
   - Changes take effect immediately

## What This Fixes

When users click the email confirmation link, Supabase redirects them back to your app. Without proper redirect URLs configured:

❌ **Before**: Supabase rejects redirect → HTTP 500 error
✅ **After**: Supabase allows redirect → User confirmed → Success

## Testing After Configuration

1. **Clear browser cache**:
   ```javascript
   // In browser console (F12):
   localStorage.clear();
   ```

2. **Reload page**: `http://localhost:5174/signup`

3. **Try signing up** with a real email address

4. **Expected behavior**:
   - Sign-up form submits successfully ✅
   - Message: "Account created! Please check your email to confirm your account." ✅
   - Email arrives within 1-2 minutes ✅
   - Click confirmation link in email ✅
   - Redirects to your app (login page) ✅
   - No HTTP 500 errors ✅

## Common Redirect URL Patterns

### Development (Local)
```
http://localhost:5174/**
http://localhost:5173/**
http://127.0.0.1:5174/**
```

### Production (Single Domain)
```
https://collabcanvas.app/**
https://www.collabcanvas.app/**
```

### Production (Multiple Subdomains)
```
https://app.collabcanvas.com/**
https://staging.collabcanvas.com/**
https://*.collabcanvas.com/**  ← Wildcard for all subdomains
```

### Development + Production (Both)
```
http://localhost:5174/**
https://collabcanvas.app/**
https://*.collabcanvas.app/**
```

## Verification Checklist

After configuring redirect URLs:

- [ ] Site URL set to `http://localhost:5174` for development
- [ ] Redirect URLs include `http://localhost:5174/**`
- [ ] Redirect URLs include production domain (if applicable)
- [ ] Saved changes in Supabase dashboard
- [ ] Cleared browser localStorage
- [ ] Tested sign-up flow
- [ ] Received confirmation email
- [ ] Email link redirects successfully
- [ ] No HTTP 500 errors in console

## Screenshot Location for Reference

If you need visual guidance, Supabase URL Configuration page looks like:

```
Authentication → URL Configuration

Site URL: [http://localhost:5174]

Redirect URLs:
┌─────────────────────────────────────┐
│ http://localhost:5174/**            │
│ http://localhost:5173/**            │
│ https://yourdomain.com/**           │
│                                     │
│ [Add another URL]                   │
└─────────────────────────────────────┘

[Save]
```

## What's Your Production Domain?

To complete this configuration, I need to know:

1. **What is your production domain?** (e.g., `collabcanvas.app`, `myapp.vercel.app`)
2. **Are you using subdomains?** (e.g., `app.domain.com` vs just `domain.com`)

Once you provide this, I can give you the exact redirect URLs to add for production.

## If Issues Persist

If sign-up still fails after configuring redirect URLs:

1. **Check Supabase Auth Logs**:
   - Dashboard → Logs → Auth Logs
   - Look for detailed error messages

2. **Check Email Template**:
   - Authentication → Email Templates → Confirm Signup
   - Ensure `{{ .ConfirmationURL }}` variable is present

3. **Verify SMTP Status**:
   - Project Settings → Auth → SMTP Settings
   - Send test email to verify SMTP works

4. **Check Browser Console**:
   - F12 → Console tab
   - Look for specific error messages after sign-up attempt
