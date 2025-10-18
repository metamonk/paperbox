# Supabase Email & Authentication Configuration Guide

**Project**: CollabCanvas
**Supabase Project**: snekuamfpiwauvfyecpu
**Date**: 2025-10-18

## Overview

This guide walks through configuring Supabase to:
1. Send emails using Resend SMTP
2. Support both local development and production domains
3. Enable email confirmation for new signups

## Configuration Steps

### Step 1: Configure Resend SMTP in Supabase

1. **Go to Supabase Dashboard**:
   - URL: https://app.supabase.com/project/snekuamfpiwauvfyecpu
   - Navigate to: **Project Settings → Auth**

2. **Scroll to SMTP Settings**:
   - Click **Enable Custom SMTP**

3. **Configure Resend SMTP**:
   ```
   SMTP Host: smtp.resend.com
   SMTP Port: 465 (or 587 for TLS)
   SMTP Username: resend
   SMTP Password: re_LcgLKd4R_JEz1aP6CF7MsXSvX9YuhjdwX
   Sender Email: noreply@yourdomain.com (or verified Resend domain)
   Sender Name: CollabCanvas
   ```

4. **Important**:
   - If using Resend free tier, you can only send FROM domains you've verified in Resend
   - Default: You can use `onboarding@resend.dev` for testing (no verification needed)
   - Production: Add and verify your custom domain in Resend dashboard first

5. **Test Configuration**:
   - Click **Send Test Email** button
   - Check that email arrives successfully

### Step 2: Configure Redirect URLs

Supabase needs to know which URLs are allowed for email confirmation redirects.

1. **Go to Authentication Settings**:
   - Navigate to: **Authentication → URL Configuration**

2. **Add Site URL**:
   - **Development**: `http://localhost:5174`
   - **Production**: Your production domain (e.g., `https://collabcanvas.app`)

3. **Add Redirect URLs** (Allowed list):
   Add both local and production URLs:
   ```
   http://localhost:5174/**
   http://localhost:5173/**
   http://localhost:5175/**
   https://yourdomain.com/**
   https://*.yourdomain.com/**
   ```

4. **Wildcard Pattern Explanation**:
   - `**` matches any path (e.g., `/auth/callback`, `/login`, etc.)
   - `*` in subdomain matches any subdomain (e.g., `app.yourdomain.com`, `staging.yourdomain.com`)

### Step 3: Configure Email Templates

1. **Navigate to**: **Authentication → Email Templates**

2. **Customize Templates** (Optional but recommended):

   **Confirm Signup Template**:
   ```html
   <h2>Welcome to CollabCanvas!</h2>
   <p>Thanks for signing up. Please confirm your email address by clicking the link below:</p>
   <p><a href="{{ .ConfirmationURL }}">Confirm your email</a></p>
   <p>If you didn't sign up for CollabCanvas, you can safely ignore this email.</p>
   ```

   **Important Variables**:
   - `{{ .ConfirmationURL }}` - Auto-generated confirmation link
   - `{{ .SiteURL }}` - Your site URL from settings
   - `{{ .Email }}` - User's email address

3. **Confirmation URL Path**:
   - Default: Redirects to your Site URL after confirmation
   - Custom: You can add a redirect path, e.g., `/auth/confirm`

### Step 4: Email Confirmation Settings

1. **Navigate to**: **Authentication → Email Auth**

2. **Configure Settings**:
   ```
   ✅ Enable email confirmations
   ✅ Double confirm email changes
   ✅ Secure email change
   ⏱️ Email confirmation timeout: 24 hours (default)
   ```

3. **Why Enable Confirmations**:
   - Verifies user owns the email address
   - Prevents spam accounts
   - Required for production apps
   - Industry standard security practice

### Step 5: Test Email Configuration

After configuration, test the complete flow:

1. **Clear browser localStorage** (to remove stale tokens):
   ```javascript
   // In browser console:
   localStorage.clear();
   ```

2. **Navigate to**: `http://localhost:5174/signup`

3. **Sign up with a real email** you have access to

4. **Expected Flow**:
   - Form submits successfully
   - You see: "Account created! Please check your email to confirm your account."
   - Email arrives within 1-2 minutes
   - Click confirmation link in email
   - Redirects to your app (login page)
   - You can now sign in

5. **Troubleshooting**:
   - **Email not arriving**: Check Supabase Logs → Auth Logs for errors
   - **Wrong sender email**: Update SMTP Sender Email in settings
   - **Redirect error**: Check Redirect URLs include your domain
   - **SMTP error**: Verify Resend API key is correct

## Environment-Specific Configuration

### Local Development
```env
# .env.local
VITE_PUBLIC_SUPABASE_URL=https://snekuamfpiwauvfyecpu.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
RESEND_API_KEY=re_LcgLKd4R_JEz1aP6CF7MsXSvX9YuhjdwX
```

**Supabase Settings**:
- Site URL: `http://localhost:5174`
- Redirect URLs: `http://localhost:5174/**`

### Production
```env
# .env.production
VITE_PUBLIC_SUPABASE_URL=https://snekuamfpiwauvfyecpu.supabase.co
VITE_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
# RESEND_API_KEY not needed on client (only in Supabase)
```

**Supabase Settings**:
- Site URL: `https://yourdomain.com`
- Redirect URLs: `https://yourdomain.com/**`, `https://*.yourdomain.com/**`

## Resend-Specific Configuration

Since you're using Resend, here are Resend-specific setup steps:

### Resend Dashboard Setup

1. **Login to Resend**: https://resend.com/login

2. **Verify Your Domain** (for production emails):
   - Navigate to: **Domains**
   - Click **Add Domain**
   - Enter your domain (e.g., `yourdomain.com`)
   - Add DNS records (SPF, DKIM) provided by Resend
   - Wait for verification (usually 5-30 minutes)

3. **For Testing** (no domain verification needed):
   - Use sender email: `onboarding@resend.dev`
   - This is Resend's shared testing domain
   - Works immediately, no setup required

### Resend API Key Management

Your current API key: `re_LcgLKd4R_JEz1aP6CF7MsXSvX9YuhjdwX`

**Security Best Practices**:
- ✅ API key is in `.env.local` (gitignored)
- ✅ Supabase SMTP uses the key (server-side only)
- ❌ Never expose in client-side code
- ✅ Rotate key if accidentally exposed

## Common Issues & Solutions

### Issue 1: Email Not Arriving

**Symptoms**: Sign-up succeeds but no email received

**Solutions**:
1. Check Supabase **Logs → Auth Logs** for SMTP errors
2. Verify Resend API key is correct
3. Check spam/junk folder
4. Test with different email provider (Gmail, Outlook, etc.)
5. Verify sender email domain is verified in Resend (for production)

### Issue 2: Confirmation Link Redirect Error

**Symptoms**: Click email link, get redirect error or 404

**Solutions**:
1. Add your domain to Supabase **Redirect URLs**
2. Check **Site URL** matches your actual domain
3. Ensure wildcard paths (`/**`) are included
4. Clear browser cache and cookies

### Issue 3: SMTP Authentication Failed

**Symptoms**: HTTP 500 on signup, SMTP auth error in logs

**Solutions**:
1. Verify SMTP credentials in Supabase settings
2. Check Resend API key is active (not expired)
3. Ensure SMTP port is correct (465 or 587)
4. Contact Resend support if API key issues

### Issue 4: Stale Refresh Token Errors

**Symptoms**: Console error "Invalid Refresh Token" on page load

**Solutions**:
1. Clear browser localStorage: `localStorage.clear()`
2. Add token cleanup code (see below)

**Code Fix** in `src/hooks/useAuth.ts`:
```typescript
useEffect(() => {
  const {
    data: { subscription },
  } = supabase.auth.onAuthStateChange(async (event, session) => {
    // Clean up stale tokens on error
    if (event === 'TOKEN_REFRESHED' && !session) {
      await supabase.auth.signOut();
      localStorage.clear();
    }

    if (event === 'SIGNED_IN' && session) {
      setUser(session.user);
    } else if (event === 'SIGNED_OUT') {
      setUser(null);
    }
  });

  return () => subscription.unsubscribe();
}, []);
```

## Testing Checklist

Before marking as complete, verify:

- [ ] SMTP settings configured in Supabase
- [ ] Test email sent successfully from Supabase
- [ ] Site URL configured for development
- [ ] Site URL configured for production
- [ ] Redirect URLs include `localhost:5174/**`
- [ ] Redirect URLs include production domain
- [ ] Email confirmation enabled
- [ ] Sign-up flow tested with real email
- [ ] Confirmation email received
- [ ] Email link redirects correctly
- [ ] Login works after confirmation
- [ ] No console errors on page load

## Production Deployment Notes

When deploying to production:

1. **Update Site URL** in Supabase to production domain
2. **Add production domain** to Redirect URLs
3. **Configure custom domain** in Resend (if not using testing domain)
4. **Update email templates** with production branding
5. **Test complete flow** on production before launch
6. **Monitor email delivery** in Resend dashboard

## Quick Reference

**Supabase Dashboard**: https://app.supabase.com/project/snekuamfpiwauvfyecpu

**Key Settings Locations**:
- SMTP: Project Settings → Auth → SMTP Settings
- URLs: Authentication → URL Configuration
- Templates: Authentication → Email Templates
- Logs: Logs → Auth Logs

**Resend Dashboard**: https://resend.com/domains

**Email Testing**: Use `onboarding@resend.dev` for immediate testing without domain setup.
