# CORS and API Connection Troubleshooting

## Problem
- API works fine in Postman ✅
- API works when tested directly ✅
- But fails from browser (localhost and deployed) ❌
- No errors in Render logs

## Root Causes

### 1. CORS Configuration
The backend needs to explicitly allow requests from your frontend domain.

### 2. Frontend API URL
The frontend might not be using the correct API URL in production.

## Solutions

### Solution 1: Update CORS Configuration (Backend)

The backend CORS has been updated to explicitly allow your frontend URLs. Make sure your Render service has:

**Environment Variable:**
```
FRONTEND_URL=https://your-vercel-app.vercel.app
```

Replace with your actual Vercel frontend URL.

### Solution 2: Verify Frontend Environment Variable

**On Vercel:**
1. Go to your Vercel project
2. Settings → Environment Variables
3. Add/Verify:
   ```
   VITE_API_URL=https://your-backend.onrender.com/api
   ```
4. **Important**: Must start with `VITE_` prefix
5. Redeploy after adding/changing

**For Local Development:**
Create `client-side/.env`:
```
VITE_API_URL=http://localhost:3000/api
```

### Solution 3: Check Browser Console

Open browser DevTools (F12) and check:

1. **Console Tab**: Look for CORS errors like:
   - `Access to fetch at ... has been blocked by CORS policy`
   - `No 'Access-Control-Allow-Origin' header`

2. **Network Tab**: 
   - Check if request is being sent
   - Look at request headers
   - Check response headers for CORS headers

### Solution 4: Test API URL Directly

In browser console, test:
```javascript
fetch('https://your-backend.onrender.com/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', type: 'login' })
})
.then(r => r.json())
.then(console.log)
.catch(console.error)
```

This will show the exact error.

## Common Issues

### Issue 1: "CORS policy: No 'Access-Control-Allow-Origin'"
**Fix**: 
- Verify `FRONTEND_URL` is set in Render
- Restart Render service after adding variable
- Check CORS configuration in `app.js`

### Issue 2: "Network Error" or "Failed to fetch"
**Possible Causes**:
- Wrong API URL in frontend
- Backend service is down
- Network/firewall blocking

**Fix**:
- Verify `VITE_API_URL` in Vercel matches your Render URL
- Check Render service is running
- Test backend URL directly in browser

### Issue 3: "404 Not Found"
**Fix**:
- Ensure API URL ends with `/api`
- Check route paths match (e.g., `/api/auth/send-otp`)

### Issue 4: "500 Internal Server Error"
**Fix**:
- Check Render logs for specific error
- Verify all environment variables are set
- Check email service configuration

## Debugging Steps

### Step 1: Verify Backend is Accessible
```bash
curl https://your-backend.onrender.com/
```
Should return: `{"success":true,"message":"Split Wise API is running"}`

### Step 2: Test CORS from Browser
Open browser console on your frontend and run:
```javascript
fetch('https://your-backend.onrender.com/api/auth/send-otp', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'test@test.com', type: 'login' })
})
.then(r => r.json())
.then(data => console.log('Success:', data))
.catch(err => console.error('Error:', err))
```

### Step 3: Check Environment Variables

**Render (Backend):**
- `FRONTEND_URL` = Your Vercel URL
- `NODE_ENV=production`
- All other required variables

**Vercel (Frontend):**
- `VITE_API_URL` = Your Render API URL (must include `/api`)

### Step 4: Verify API URL in Built Code

After Vercel builds, the API URL should be baked into the JavaScript. Check:
1. Deploy on Vercel
2. Open deployed site
3. View page source
4. Search for your Render URL
5. Verify it's correct

## Quick Checklist

- [ ] `FRONTEND_URL` set in Render (your Vercel URL)
- [ ] `VITE_API_URL` set in Vercel (your Render URL + `/api`)
- [ ] Backend service is running on Render
- [ ] Frontend redeployed after adding environment variables
- [ ] Backend restarted after adding `FRONTEND_URL`
- [ ] No CORS errors in browser console
- [ ] API URL is correct (ends with `/api`)
- [ ] Tested API directly in browser console

## Still Not Working?

1. **Check Browser Console**: Look for specific error messages
2. **Check Network Tab**: See if request is being sent and what response you get
3. **Check Render Logs**: Even if no errors, check for incoming requests
4. **Test with curl**: Verify backend responds correctly
5. **Compare Postman vs Browser**: What's different in the request?

## Example Working Configuration

**Render Environment Variables:**
```
FRONTEND_URL=https://splitwise-frontend.vercel.app
NODE_ENV=production
DATABASE_URL=postgresql://...
UPSTASH_REDIS_REST_URL=https://...
JWT_SECRET=...
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_APP_PASSWORD=...
```

**Vercel Environment Variables:**
```
VITE_API_URL=https://splitwise-backend.onrender.com/api
```

