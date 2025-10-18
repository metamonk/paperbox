# Supabase HTTP 500 Error - Diagnostic Checklist

**Error**: `Failed to load resource: the server responded with a status of 500`
**Endpoint**: `https://snekuamfpiwauvfyecpu.supabase.co/auth/v1/signup`
**Date**: 2025-10-18

## Current Status

✅ SMTP configured with Resend
✅ Redirect URLs configured
✅ Site URL configured
❌ Still getting HTTP 500 on signup

## Root Cause: Server-Side Supabase Configuration

The HTTP 500 error from `/auth/v1/signup` indicates a **server-side configuration issue in Supabase**, not a client-side code issue. This is different from redirect URL problems (which would be 400 errors).

## Critical Checks in Supabase Dashboard

### Check 1: Email Confirmation Settings

**Location**: Authentication → Providers → Email

**What to Check**:
```
Navigate to: https://app.supabase.com/project/snekuamfpiwauvfyecpu/auth/providers

Email Provider Section:
  ✓ Enable email provider: [ENABLED]
  ✓ Confirm email: [CHECK THIS SETTING]

  Options:
  [ ] Confirm email (DISABLED - users can sign up immediately)
  [x] Confirm email (ENABLED - requires SMTP working)
```

**Action Required**:
- If SMTP is properly configured, keep "Confirm email" ENABLED
- If SMTP has issues, temporarily DISABLE "Confirm email" to test

### Check 2: SMTP Configuration Status

**Location**: Project Settings → Auth → SMTP Settings

**What to Verify**:
```
SMTP Enabled: [x] Yes
SMTP Host: smtp.resend.com
SMTP Port: 465 or 587
SMTP User: resend
SMTP Password: re_LcgLKd4R_*** (your key)
Sender Email: _______________ ← CRITICAL: What is this set to?
Sender Name: CollabCanvas
```

**Common Issue**:
- **Sender email MUST be from a verified domain in Resend**
- If using unverified domain → HTTP 500 error
- **Solution**: Use `onboarding@resend.dev` for testing (no verification needed)

### Check 3: Auth Logs for Detailed Error

**Location**: Logs → Auth Logs

**What to Do**:
1. Go to: https://app.supabase.com/project/snekuamfpiwauvfyecpu/logs/auth-logs
2. Filter by: Last 1 hour
3. Look for red error entries
4. Click on error to see full details

**What to Look For**:
- SMTP authentication failed
- Email send failed
- Invalid sender email
- Rate limit exceeded
- Database constraint violation

### Check 4: Email Rate Limits

**Location**: Project Settings → Auth → Rate Limits

**What to Check**:
```
Email sending rate limit: _____ emails per hour
Current usage: _____ emails sent
```

**Common Issue**:
- Free tier: Limited emails per hour
- If limit exceeded → HTTP 500 error
- **Solution**: Wait for rate limit reset or upgrade plan

### Check 5: Database Tables & Policies

**Location**: Database → Tables → auth.users

**What to Verify**:
1. Table exists: `auth.users`
2. RLS policies not blocking inserts
3. No database constraints causing conflicts

**Rare Issue**:
- Custom RLS policies can block user creation
- Database constraints can cause signup failures

## Quick Workaround: Disable Email Confirmation

To test if SMTP is the issue:

**Steps**:
1. Go to: Authentication → Providers → Email
2. **UNCHECK** "Confirm email"
3. Save changes
4. Try signing up again
5. If works → Problem is SMTP configuration
6. If still fails → Problem is elsewhere (database, RLS policies)

## Most Likely Causes (Ranked)

### 1. Invalid Sender Email (80% probability)

**Symptom**: HTTP 500 on signup
**Cause**: Sender email in SMTP settings not verified in Resend
**Solution**:
- Change sender email to `onboarding@resend.dev` (no verification needed)
- OR verify your domain in Resend dashboard first

### 2. SMTP Authentication Failed (15% probability)

**Symptom**: HTTP 500 on signup
**Cause**: Invalid Resend API key or SMTP credentials
**Solution**:
- Verify API key in `.env.local` matches Supabase SMTP password
- Test email sending from Supabase dashboard
- Generate new Resend API key if needed

### 3. Rate Limit Exceeded (4% probability)

**Symptom**: HTTP 500 after multiple signup attempts
**Cause**: Exceeded Resend free tier email limits
**Solution**:
- Check Resend dashboard for usage
- Wait for rate limit reset
- Temporarily disable email confirmation

### 4. Database Constraint Violation (1% probability)

**Symptom**: HTTP 500 with specific user data
**Cause**: Email already exists, RLS policy blocking, constraint violation
**Solution**:
- Check auth logs for specific error
- Review RLS policies on auth.users table
- Try different email address

## Action Plan

### Immediate Actions (Do These Now)

1. **Check Sender Email**:
   ```
   Go to: Project Settings → Auth → SMTP Settings
   Current sender email: ___________________

   If NOT "onboarding@resend.dev":
   → Change to: onboarding@resend.dev
   → Save
   → Test signup again
   ```

2. **Check Auth Logs**:
   ```
   Go to: Logs → Auth Logs
   Look for error details
   Screenshot error message
   ```

3. **Test Email Sending**:
   ```
   Go to: Project Settings → Auth → SMTP Settings
   Click: "Send Test Email"
   Check: Did email arrive?

   If YES → SMTP works, issue is elsewhere
   If NO → SMTP broken, fix configuration
   ```

### If Quick Fixes Don't Work

4. **Temporarily Disable Email Confirmation**:
   ```
   Go to: Authentication → Providers → Email
   Uncheck: "Confirm email"
   Save
   Test signup

   If works → Issue is SMTP/email related
   If fails → Issue is database/RLS related
   ```

5. **Check Database & RLS**:
   ```
   Go to: Database → Tables → auth.users
   Check: Table structure
   Check: RLS policies
   Check: Insert permissions
   ```

## Expected Outcome

After fixing the configuration:

✅ Sign-up form submits successfully (no HTTP 500)
✅ If email confirmation enabled: Confirmation email arrives
✅ If email confirmation disabled: User can login immediately
✅ No console errors
✅ User appears in Authentication → Users table

## Next Steps After Fix

Once signup works:

1. **Document the Fix**:
   - What was the root cause?
   - What setting needed to be changed?

2. **Test Complete Flow**:
   - Sign up with new email
   - Receive confirmation email (if enabled)
   - Click confirmation link
   - Login successfully

3. **Production Preparation**:
   - Verify domain in Resend
   - Update sender email to custom domain
   - Re-enable email confirmation
   - Test with production URL

## Getting Detailed Error Information

Since I cannot access your Supabase dashboard, you need to:

1. **Go to Auth Logs**: https://app.supabase.com/project/snekuamfpiwauvfyecpu/logs/auth-logs

2. **Find the error** from your latest signup attempt

3. **Share the error details**:
   - Error type
   - Error message
   - Stack trace
   - Timestamp

With the actual error message from Supabase logs, I can provide a more specific solution.

## Contact Points

If none of these fixes work:

- **Supabase Support**: https://supabase.com/dashboard/support
- **Supabase Discord**: https://discord.supabase.com
- **Resend Support**: https://resend.com/support

They can check server-side logs that we cannot access from the client.
