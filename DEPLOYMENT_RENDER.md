# Deploying Backend to Render

## Prerequisites
- GitHub repository with your code pushed
- Render account (sign up at https://render.com)
- PostgreSQL database (can be created on Render or use external like Neon)
- Redis instance (Upstash or Render Redis)

## Step-by-Step Deployment Guide

### Step 1: Prepare Your Repository
1. Ensure all code is pushed to GitHub
2. Verify `server-side/package.json` has a `start` script:
   ```json
   "scripts": {
     "start": "node app.js"
   }
   ```

### Step 2: Create PostgreSQL Database on Render
1. Go to Render Dashboard → **New +** → **PostgreSQL**
2. Fill in details:
   - **Name**: `splitwise-db` (or your preferred name)
   - **Database**: `splitwise` (or your preferred name)
   - **User**: Auto-generated
   - **Region**: Choose closest to your users
   - **PostgreSQL Version**: Latest stable
   - **Plan**: Free tier available (or paid for production)
3. Click **Create Database**
4. Wait for database to be provisioned (2-3 minutes)
5. **Important**: Copy the **Internal Database URL** (for Render services) or **External Database URL** (if using external services)

### Step 3: Create Redis Instance (Optional - if using Upstash, skip this)
1. Go to Render Dashboard → **New +** → **Redis**
2. Fill in details:
   - **Name**: `splitwise-redis`
   - **Region**: Same as database
   - **Plan**: Free tier available
3. Click **Create Redis**
4. Copy the **Internal Redis URL** or **External Redis URL**

### Step 4: Deploy Web Service
1. Go to Render Dashboard → **New +** → **Web Service**
2. Connect your GitHub repository:
   - Click **Connect account** if not connected
   - Select your repository: `Muppidi-Aditya/Splitwise`
   - Click **Connect**

### Step 5: Configure Web Service
Fill in the service configuration:

#### Basic Settings
- **Name**: `splitwise-backend` (or your preferred name)
- **Region**: Same as database
- **Branch**: `main` (or your default branch)
- **Root Directory**: `server-side` ⚠️ **IMPORTANT**
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

#### Environment Variables
Click **Add Environment Variable** and add the following:

```
NODE_ENV=production
PORT=10000
```

**Database Configuration:**
```
DATABASE_URL=<Internal Database URL from Step 2>
```

**Redis Configuration (if using Render Redis):**
```
UPSTASH_REDIS_REST_URL=<Redis URL>
UPSTASH_REDIS_REST_TOKEN=<Redis Password>
```

**Or if using Upstash:**
```
UPSTASH_REDIS_REST_URL=<Your Upstash URL>
UPSTASH_REDIS_REST_TOKEN=<Your Upstash Token>
```

**JWT Configuration:**
```
JWT_SECRET=<Generate a strong random secret>
JWT_EXPIRY=7d
```

**Email Configuration (Choose ONE option):**

**Option A: Gmail (Recommended)**
```
EMAIL_SERVICE=gmail
EMAIL_USER=<your-email@gmail.com>
EMAIL_APP_PASSWORD=<your-16-digit-gmail-app-password>
EMAIL_FROM=<your-email@gmail.com>
```

**Option B: SMTP (Generic)**
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<your-email@gmail.com>
SMTP_PASSWORD=<your-app-password>
EMAIL_FROM=<your-email@gmail.com>
```

**Note**: For Gmail, you need an App Password (not your regular password):
1. Go to Google Account → Security → 2-Step Verification
2. Generate App Password for "Mail"
3. Use the 16-digit password (no spaces)

**Frontend URL:**
```
FRONTEND_URL=<Your frontend URL, e.g., https://your-frontend.onrender.com>
```

**Rate Limiting:**
```
MAX_OTP_REQUESTS_PER_HOUR=5
```

**Reminder Job:**
```
ENABLE_REMINDER_JOB=true
TZ=Asia/Kolkata
```

### Step 6: Generate JWT Secret
Generate a strong JWT secret:
```bash
# On your local machine
openssl rand -base64 32
```
Copy the output and use it as `JWT_SECRET`

### Step 7: Deploy
1. Click **Create Web Service**
2. Render will:
   - Clone your repository
   - Install dependencies
   - Start your application
3. Wait for deployment to complete (3-5 minutes)
4. Your service will be available at: `https://splitwise-backend.onrender.com` (or your custom name)

### Step 8: Initialize Database
1. Once deployed, go to your service dashboard
2. Click on **Shell** tab (or use Render Shell)
3. Run database initialization:
   ```bash
   cd server-side
   npm run init-db
   ```
   Or manually run:
   ```bash
   node database/init.js
   ```

### Step 9: Verify Deployment
1. Check service logs in Render dashboard
2. Test health endpoint: `https://your-service.onrender.com/`
3. Should return:
   ```json
   {
     "success": true,
     "message": "Split Wise API is running",
     "version": "1.0.0"
   }
   ```

### Step 10: Update Frontend Environment
Update your frontend `.env` file:
```env
VITE_API_URL=https://your-backend-service.onrender.com/api
```

## Important Notes

### Render Free Tier Limitations
- Services spin down after 15 minutes of inactivity
- First request after spin-down takes 30-60 seconds (cold start)
- Consider upgrading to paid plan for production

### Database Connection
- Use **Internal Database URL** for services on Render (faster, no egress charges)
- Use **External Database URL** if connecting from outside Render

### Environment Variables
- Never commit `.env` files
- Use Render's environment variable management
- Secrets are encrypted at rest

### Custom Domain (Optional)
1. Go to service settings
2. Click **Custom Domains**
3. Add your domain
4. Update DNS records as instructed

### Monitoring
- View logs in real-time from Render dashboard
- Set up alerts for service failures
- Monitor database connections and performance

## Troubleshooting

### Service Won't Start
- Check logs in Render dashboard
- Verify `start` command in package.json
- Ensure `PORT` environment variable is set (Render uses dynamic ports)

### Database Connection Issues
- Verify `DATABASE_URL` is correct
- Check if database is in same region
- Ensure database allows connections from Render

### Build Failures
- Check build logs
- Verify all dependencies in package.json
- Ensure Node version compatibility

### Environment Variables Not Working
- Restart service after adding variables
- Check variable names match code exactly
- Verify no typos or extra spaces

## Production Checklist
- [ ] Database backed up
- [ ] Environment variables configured
- [ ] JWT secret is strong and unique
- [ ] Email service configured
- [ ] Frontend URL updated
- [ ] Database initialized
- [ ] Health endpoint responding
- [ ] Custom domain configured (if needed)
- [ ] Monitoring and alerts set up

## Quick Reference Commands

### View Logs
```bash
# In Render dashboard, go to Logs tab
```

### Restart Service
```bash
# In Render dashboard, click Manual Deploy → Clear build cache & deploy
```

### Update Environment Variables
```bash
# In Render dashboard → Environment → Add/Edit variables → Save Changes
# Service will auto-restart
```

