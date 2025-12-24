# Troubleshooting 500 Internal Server Error - OTP Email

## Problem
Getting `500 (Internal Server Error)` when trying to send OTP from deployed frontend to deployed backend.

Error message: `Failed to send OTP email. Please try again.`

## Root Cause
The email service is failing because of missing or incorrect environment variables on Render.

## Solution

### Step 1: Check Render Logs
1. Go to your Render dashboard
2. Select your backend service
3. Click on **Logs** tab
4. Look for error messages like:
   - `Error sending email`
   - `Missing environment variable`
   - `Authentication failed`

### Step 2: Configure Email Environment Variables

The code supports **two email configurations**:

#### Option A: Gmail (Recommended for Testing)

Add these environment variables in Render:

```
EMAIL_SERVICE=gmail
EMAIL_USER=your-email@gmail.com
EMAIL_APP_PASSWORD=your-16-digit-app-password
EMAIL_FROM=your-email@gmail.com
```

**Important**: You need a Gmail App Password, not your regular password:
1. Go to Google Account → Security
2. Enable 2-Step Verification
3. Go to App Passwords
4. Generate a new app password for "Mail"
5. Use that 16-digit password (no spaces)

#### Option B: SMTP (Generic Email Service)

Add these environment variables in Render:

```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your-email@gmail.com
SMTP_PASSWORD=your-app-password
EMAIL_FROM=your-email@gmail.com
```

### Step 3: Verify All Required Variables

Make sure these are set in Render:

**Required:**
- `NODE_ENV=production`
- `DATABASE_URL` (from Render PostgreSQL)
- `UPSTASH_REDIS_REST_URL` (from Upstash or Render Redis)
- `UPSTASH_REDIS_REST_TOKEN` (from Upstash or Render Redis)
- `JWT_SECRET` (generate with `openssl rand -base64 32`)

**Email (Choose one option above):**
- Gmail: `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_APP_PASSWORD`, `EMAIL_FROM`
- SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM`

**Optional:**
- `FRONTEND_URL` (your Vercel frontend URL)
- `MAX_OTP_REQUESTS_PER_HOUR=5`
- `ENABLE_REMINDER_JOB=true`
- `TZ=Asia/Kolkata`

### Step 4: Update Environment Variables in Render

1. Go to Render Dashboard → Your Service
2. Click **Environment** tab
3. Add/Update the email variables
4. Click **Save Changes**
5. Service will automatically restart

### Step 5: Test Again

1. Wait for service to restart (check logs)
2. Try sending OTP from your frontend
3. Check Render logs for success message: `✅ OTP email sent to...`

## Common Issues

### Issue 1: "Authentication failed"
**Cause**: Wrong password or using regular password instead of app password
**Fix**: Generate a new Gmail App Password and use that

### Issue 2: "Missing environment variable"
**Cause**: Required email variables not set
**Fix**: Add all required variables (see Step 2)

### Issue 3: "Connection timeout"
**Cause**: SMTP host/port incorrect or firewall blocking
**Fix**: Verify SMTP settings match your email provider

### Issue 4: "Service not found"
**Cause**: `EMAIL_SERVICE` not set to 'gmail' when using Gmail
**Fix**: Add `EMAIL_SERVICE=gmail` or use SMTP variables instead

## Quick Fix Checklist

- [ ] `EMAIL_SERVICE=gmail` is set (if using Gmail)
- [ ] `EMAIL_USER` is your Gmail address
- [ ] `EMAIL_APP_PASSWORD` is a 16-digit app password (not regular password)
- [ ] `EMAIL_FROM` is set
- [ ] All variables saved in Render
- [ ] Service restarted after adding variables
- [ ] Checked Render logs for specific error messages

## Alternative: Use Development Mode (Temporary)

If you need to test without email setup, you can temporarily set:

```
NODE_ENV=development
```

This will log OTPs to console instead of sending emails. **Only for testing!**

## Verify Configuration

After setting variables, check the logs. You should see:
- ✅ `Connected to PostgreSQL database`
- ✅ `Connected to Upstash Redis`
- ✅ `OTP email sent to...` (when testing)

If you see errors, the logs will tell you exactly what's missing.

