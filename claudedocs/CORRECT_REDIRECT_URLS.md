# Correct Supabase Redirect URLs Configuration

**Current Dev Server**: http://localhost:5173
**Supabase Project**: snekuamfpiwauvfyecpu

## Exact Configuration Needed

### Site URL
```
http://localhost:5173
```

### Redirect URLs (Add ALL of these)
```
http://localhost:5173/**
http://localhost:5174/**
http://localhost:5175/**
```

**Why multiple ports?**
- Port 5173 is your current dev server
- Vite sometimes uses 5174, 5175 if 5173 is busy
- Having all three ensures it works regardless of which port Vite chooses

## Steps to Configure

1. **Go to**: https://app.supabase.com/project/snekuamfpiwauvfyecpu/auth/url-configuration

2. **Set Site URL to**:
   ```
   http://localhost:5173
   ```

3. **Add to Redirect URLs** (one per line):
   ```
   http://localhost:5173/**
   http://localhost:5174/**
   http://localhost:5175/**
   ```

4. **Click Save**

## For Production (Add Later)

When you deploy, also add your production domain:
```
https://yourdomain.com/**
https://*.yourdomain.com/**
```

The system will automatically use the correct domain based on where the request comes from.

## Still Getting HTTP 500?

If redirect URLs don't fix it, the issue is the **SMTP Sender Email**:

1. Go to: **Project Settings → Auth → SMTP Settings**
2. Change **Sender Email** to: `onboarding@resend.dev`
3. Save and test again

This is the most common cause of HTTP 500 on signup.
