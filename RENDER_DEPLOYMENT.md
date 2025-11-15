# Deploying AERAS Backend to Render

## Prerequisites

1. GitHub account with your code pushed
2. Render account (sign up at https://render.com)
3. PostgreSQL database (Render provides free tier)

## Step 1: Push Code to GitHub

```bash
cd /home/galib/my_workspace/running_projects/iotrix/backend

# Initialize git if not already done
git init
git add .
git commit -m "Initial commit - AERAS Backend ready for deployment"

# Create a new repository on GitHub named "aeras-backend"
# Then push your code
git remote add origin https://github.com/YOUR_USERNAME/aeras-backend.git
git branch -M main
git push -u origin main
```

## Step 2: Create PostgreSQL Database on Render

1. Go to https://dashboard.render.com
2. Click **"New +"** → **"PostgreSQL"**
3. Configure:
   - **Name:** `aeras-db` (or your preferred name)
   - **Database:** `aeras_db`
   - **User:** `aeras_user`
   - **Region:** Choose closest to your users
   - **Plan:** Free (or paid for production)
4. Click **"Create Database"**
5. Wait for provisioning (~2-3 minutes)
6. **Important:** Copy the **Internal Database URL** (starts with `postgres://`)

## Step 3: Create Web Service on Render

1. Click **"New +"** → **"Web Service"**
2. Connect your GitHub repository:
   - Click **"Connect account"** if first time
   - Select **"aeras-backend"** repository
3. Configure the service:

   **Basic Settings:**
   - **Name:** `aeras-backend`
   - **Region:** Same as database
   - **Branch:** `main`
   - **Root Directory:** Leave empty (or `backend` if in monorepo)
   - **Runtime:** `Node`
   - **Build Command:** `npm install && npm run build`
   - **Start Command:** `npm run start:prod`

   **Advanced Settings:**
   - **Auto-Deploy:** Yes

## Step 4: Add Environment Variables

In the Render dashboard, scroll to **"Environment Variables"** section and add:

```
DB_HOST=<from Internal Database URL>
DB_PORT=5432
DB_USERNAME=<from Internal Database URL>
DB_PASSWORD=<from Internal Database URL>
DB_DATABASE=aeras_db
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long
PORT=3000
NODE_ENV=production
MQTT_HOST=mqtt://broker.hivemq.com:1883
MQTT_PORT=1883
```

**To extract database credentials from Internal Database URL:**

Format: `postgres://USER:PASSWORD@HOST:PORT/DATABASE`

Example: `postgres://aeras_user:abc123@dpg-xxxxx.oregon-postgres.render.com:5432/aeras_db`

- **DB_HOST:** `dpg-xxxxx.oregon-postgres.render.com`
- **DB_USERNAME:** `aeras_user`
- **DB_PASSWORD:** `abc123`
- **DB_DATABASE:** `aeras_db`

## Step 5: Update TypeORM Configuration

Ensure your `src/app.module.ts` or TypeORM config handles production properly:

```typescript
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT, 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [__dirname + '/**/*.entity{.ts,.js}'],
  synchronize: process.env.NODE_ENV !== 'production', // IMPORTANT: false in production
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
})
```

## Step 6: Create and Deploy

1. Click **"Create Web Service"**
2. Render will:
   - Clone your repository
   - Install dependencies
   - Build the application
   - Deploy it

Wait 5-10 minutes for the first deployment.

## Step 7: Verify Deployment

Once deployed, you'll get a URL like: `https://aeras-backend.onrender.com`

Test your API:

```bash
# Check health
curl https://aeras-backend.onrender.com/

# Check Swagger docs
# Open in browser: https://aeras-backend.onrender.com/api-docs
```

## Step 8: Seed Database (Optional)

If you need to seed initial data:

1. In Render dashboard, go to your web service
2. Click **"Shell"** tab
3. Run:
   ```bash
   npm run seed
   ```

Alternatively, create a one-time **"Background Worker"** job for seeding.

## Step 9: Configure CORS for Frontend

Update your `main.ts` to allow your frontend domain:

```typescript
app.enableCors({
  origin: [
    'http://localhost:5173', // Local development
    'https://your-frontend-domain.com', // Production frontend
  ],
  credentials: true,
});
```

Redeploy after making this change.

## Troubleshooting

### Build Fails

**Check logs** in Render dashboard → Logs tab

Common issues:
- Missing dependencies: Ensure `package.json` has all dependencies
- TypeScript errors: Run `npm run build` locally first
- Node version: Add `.node-version` file with `18` or `20`

### Database Connection Failed

- Verify environment variables are correct
- Check Internal Database URL is used (not External)
- Ensure SSL is configured for production

### Application Crashes

- Check **Logs** tab for errors
- Verify `start:prod` command is correct
- Check if port is hardcoded (should use `process.env.PORT || 3000`)

### Slow Performance (Free Tier)

- Free tier spins down after 15 mins of inactivity
- First request after spin-down takes ~30 seconds
- Upgrade to paid tier for always-on service

## Production Checklist

- [ ] `synchronize: false` in TypeORM config
- [ ] SSL enabled for database connection
- [ ] Strong JWT_SECRET (min 32 characters)
- [ ] CORS configured for specific domains
- [ ] Error logging configured
- [ ] Health check endpoint available
- [ ] Database migrations ready (if not using synchronize)
- [ ] Environment variables properly set
- [ ] Secrets not committed to Git

## Monitoring

- **Logs:** Render Dashboard → Logs
- **Metrics:** Render Dashboard → Metrics (shows CPU, Memory, Requests)
- **Alerts:** Configure in Render settings

## Scaling (Paid Plans)

For production with high traffic:
- Upgrade to paid plan for better performance
- Enable auto-scaling
- Use connection pooling for database
- Add Redis for caching
- Set up a CDN for static assets

## Cost Estimate

**Free Tier:**
- Web Service: 750 hours/month free (then $7/month)
- PostgreSQL: 90 days free, then $7/month

**Starter Plan:**
- Web Service: $7/month (512 MB RAM, always-on)
- PostgreSQL: $7/month (256 MB RAM, 1 GB storage)

**Total:** ~$14/month for production-ready setup

## Next Steps

1. Set up custom domain (if needed)
2. Configure SSL certificate (automatic with Render)
3. Set up monitoring and alerts
4. Create backup strategy for database
5. Document API endpoints for frontend team

---

Your AERAS backend is now deployed and ready! 🚀
