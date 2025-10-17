# Email Confirmation Troubleshooting Guide

**Issue**: Users not receiving confirmation emails after signup

**Date**: 2025-10-17

---

## Root Cause Analysis

### Primary Issue: Missing Supabase Auth Configuration

The signup code is correct, but Supabase Auth requires specific configuration settings to send confirmation emails.

### Current Signup Implementation

```typescript
// src/hooks/useAuth.ts (lines 45-61)
const signUp = async (email: string, password: password) => {
  const displayName = email.split('@')[0];

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }
};
```

**Status**: Code is correct ✅ - Issue is in Supabase dashboard configuration

---

## Required Supabase Dashboard Settings

### Step 1: Check Email Auth Provider

**Location**: Supabase Dashboard → Authentication → Providers → Email

**Required Settings**:
- ✅ **Enable Email provider** - Must be toggled ON
- ✅ **Confirm email** - Must be toggled ON (this is the critical setting)
- ✅ **Secure email change** - Recommended ON for production

**How to Check**:
1. Go to https://supabase.com/dashboard
2. Select your project: `snekuamfpiwauvfyecpu`
3. Navigate to: **Authentication** → **Providers**
4. Click on **Email**
5. Verify "Confirm email" toggle is **ON**

### Step 2: Configure Email Templates

**Location**: Supabase Dashboard → Authentication → Email Templates

**Templates to Configure**:
1. **Confirm signup** - This is the email users should receive
   - Default template should work for testing
   - Can customize later for branding

**How to Check**:
1. Go to **Authentication** → **Email Templates**
2. Click on **Confirm signup**
3. Verify template exists and is not disabled

### Step 3: Verify Site URL Configuration

**Location**: Supabase Dashboard → Authentication → URL Configuration

**Required URLs**:
- **Site URL**: `http://localhost:5173` (for development)
- **Redirect URLs**: Add these to the list:
  - `http://localhost:5173/**`
  - `http://localhost:5173/auth/callback`

**How to Check**:
1. Go to **Authentication** → **URL Configuration**
2. Verify Site URL matches your dev server
3. Add redirect URLs if missing

### Step 4: Check Email Rate Limits

**Location**: Supabase Dashboard → Authentication → Rate Limits

**Potential Issue**: Rate limiting may block emails

**How to Check**:
1. Go to **Authentication** → **Rate Limits**
2. Verify email rate limits are not set too low
3. Check if your test email has been rate-limited

---

## Code Enhancement (Optional)

While not required, adding `emailRedirectTo` can improve the user experience:

```typescript
// Enhanced signup with redirect URL
const signUp = async (email: string, password: string) => {
  const displayName = email.split('@')[0];

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${window.location.origin}/auth/callback`, // Optional but recommended
      data: {
        display_name: displayName,
      },
    },
  });

  if (error) {
    throw error;
  }
};
```

**Benefits**:
- Better control over post-confirmation redirect
- Cleaner user experience
- Matches production patterns

---

## Testing Email Confirmation

### Test Plan After Configuration

1. **Enable "Confirm email"** in Supabase dashboard
2. **Sign up with a new test email**:
   - Use an email you have access to
   - Try a different domain if previous attempts failed (Gmail, Outlook, etc.)
3. **Check email** (typically arrives within 1-2 minutes):
   - Check inbox
   - Check spam/junk folder
   - Check "Promotions" tab (Gmail)
4. **Click confirmation link** in email
5. **Verify user is confirmed** in Supabase dashboard:
   - Authentication → Users
   - Check if "Email Confirmed" shows timestamp

### Expected Email Content

**Subject**: "Confirm Your Signup"

**Content**: Link to confirm email address

**From**: noreply@mail.app.supabase.com (or custom SMTP if configured)

---

## Alternative: Disable Email Confirmation (Development Only)

**⚠️ NOT RECOMMENDED FOR PRODUCTION**

If you want to skip email confirmation during development:

1. Go to **Authentication** → **Providers** → **Email**
2. Toggle **OFF** the "Confirm email" setting
3. Users will be auto-confirmed on signup

**Drawback**: Users can sign up with any email (including fake ones)

---

## Debugging Steps

### Check Supabase Auth Logs

1. Go to **Logs** → **Auth Logs** in Supabase dashboard
2. Filter by your test email
3. Look for:
   - `user.signup` event
   - `email.sent` event (if email was attempted)
   - Any error messages

### Check Browser Console

Open DevTools console during signup and look for:
- Supabase client initialization: `🔌 Supabase client initialized`
- Any auth errors or warnings

### Check Network Tab

1. Open DevTools → Network
2. Submit signup form
3. Find the POST request to `https://snekuamfpiwauvfyecpu.supabase.co/auth/v1/signup`
4. Check response:
   - Status should be 200
   - Response should include user object
   - Check if `confirmation_sent_at` field is present

---

## Most Likely Solution

**Primary Fix**: Enable "Confirm email" in Supabase dashboard

**Steps**:
1. Supabase Dashboard → Authentication → Providers → Email
2. Toggle **ON**: "Confirm email"
3. Save settings
4. Try signup again with a fresh email

**Expected Result**: Confirmation email arrives within 1-2 minutes

---

## Email Provider Considerations

### Using Supabase's Built-in Email

**Default**: Supabase sends emails via their own SMTP server
- **From**: noreply@mail.app.supabase.com
- **Deliverability**: Generally good, but may land in spam
- **Rate Limits**: 3 emails per hour per user (development tier)

### Spam Folder Likelihood

Emails from Supabase's default sender may land in spam because:
- New domain (not established sender reputation)
- Automated transactional emails
- Some email providers are aggressive with filtering

**Mitigation**:
1. Check spam/junk folders thoroughly
2. Add noreply@mail.app.supabase.com to contacts/safe senders
3. For production: Configure custom SMTP (SendGrid, AWS SES, etc.)

---

## If Email Still Not Received

### Troubleshooting Checklist

- [ ] "Confirm email" toggle is ON in Supabase dashboard
- [ ] Email template "Confirm signup" is enabled
- [ ] Site URL is correctly set to `http://localhost:5173`
- [ ] Redirect URLs include `http://localhost:5173/**`
- [ ] Check Supabase Auth Logs for `email.sent` event
- [ ] Try different email provider (Gmail → Outlook, etc.)
- [ ] Check email hasn't been rate-limited
- [ ] Verify no typos in email address
- [ ] Check "All Mail" folder (Gmail) not just Inbox

### Contact Points

If issue persists after all checks:
1. Review Supabase Auth Logs for specific error messages
2. Check Supabase status page: https://status.supabase.com
3. Consider posting in Supabase Discord/GitHub discussions with:
   - Project ID: `snekuamfpiwauvfyecpu`
   - Auth log screenshots (redact sensitive info)
   - Specific error messages

---

## Summary

**Most Likely Fix**: Enable "Confirm email" in Supabase Dashboard → Authentication → Providers → Email

**Verification**: Check Supabase Auth Logs for `email.sent` event after signup

**Timeline**: Emails typically arrive within 1-2 minutes if properly configured

**Fallback**: Disable email confirmation temporarily for development (not recommended for production)

---

**Last Updated**: 2025-10-17
**Status**: Awaiting Supabase dashboard configuration verification
