# 🚀 Complete Database Integration Guide

## What We've Set Up

I've created a complete integration between your Next.js frontend and PostgreSQL database. Here's what's been configured:

### 📁 Files Created/Modified

1. **`.env.local`** - Environment variables (database credentials)
2. **`.env.example`** - Template for environment variables
3. **`.gitignore`** - Updated to exclude sensitive files
4. **`lib/db.js`** - Database connection pool and query helpers
5. **`app/api/ads/route.js`** - API to fetch ads with filtering
6. **`app/api/analytics/spend/route.js`** - API for spending analytics
7. **`app/api/analytics/trends/route.js`** - API for trend analysis
8. **`app/api/stats/route.js`** - API for overall statistics
9. **`app/api/test-db/route.js`** - API to test database connection
10. **`app/api/mock-data/route.js`** - Updated to use real database data
11. **`DATABASE_SETUP.md`** - Detailed technical documentation
12. **`start-dev.sh`** - Helper script to start the server

---

## 📋 Step-by-Step Setup Instructions

### **STEP 1: Update Your Database Password** ⚠️

Open the file `.env.local` and replace `YOUR_PASSWORD` with your actual database password:

```bash
DATABASE_URL="postgresql://harshit:YOUR_ACTUAL_PASSWORD_HERE@localhost:15432/political_ads_db"
```

**Example:**
If your password is `mypass123`, it should look like:
```bash
DATABASE_URL="postgresql://harshit:mypass123@localhost:15432/political_ads_db"
```

---

### **STEP 2: Keep Your SSH Tunnel Running** 🔌

You already have this running, but remember to keep it active. In a separate terminal window, run:

```bash
ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@172.16.12.166 -N
```

**This terminal must stay open!** The SSH tunnel forwards your local port 15432 to the remote database.

---

### **STEP 3: Start the Development Server** 🎯

You have two options:

#### Option A: Use the helper script (recommended)
```bash
./start-dev.sh
```

This script will:
- Check if your environment is configured correctly
- Verify the SSH tunnel is running
- Install dependencies if needed
- Start the dev server

#### Option B: Manual start
```bash
npm run dev
```

---

### **STEP 4: Test the Database Connection** 🧪

Once the server is running (usually on http://localhost:3000), open your browser or use curl to test:

#### Test 1: Database Connection
Open in browser: http://localhost:3000/api/test-db

Or in terminal:
```bash
curl http://localhost:3000/api/test-db
```

**Expected Response:**
```json
{
  "success": true,
  "message": "Database connection successful!",
  "data": {
    "user": "harshit",
    "database": "political_ads_db",
    "totalAds": 86387
  }
}
```

#### Test 2: Fetch Real Ads
```bash
curl http://localhost:3000/api/ads?limit=5
```

#### Test 3: Get Analytics
```bash
curl http://localhost:3000/api/analytics/spend
```

---

## 🎨 How Your Frontend Will Use the Database

### Current Setup
Your existing components will now automatically use real data! The `/api/mock-data` endpoint has been updated to fetch from the database.

### Example: Fetching Data in Components

```javascript
// In any component
const fetchData = async () => {
  const response = await fetch('/api/mock-data');
  const data = await response.json();
  // data now contains real database information!
}
```

### Available API Endpoints

| Endpoint | Method | Description | Parameters |
|----------|--------|-------------|------------|
| `/api/test-db` | GET | Test connection | None |
| `/api/ads` | GET | Get ads with filtering | `party`, `state`, `startDate`, `endDate`, `limit`, `offset` |
| `/api/analytics/spend` | GET | Spending by party | `startDate`, `endDate` |
| `/api/analytics/trends` | GET | Daily trends | `days`, `party` |
| `/api/stats` | GET | Overall statistics | None |
| `/api/mock-data` | GET | Dashboard data | None |

---

## 🔍 Understanding the Database Schema

Your PostgreSQL `ads` table has these important columns:

```
id                          - Unique identifier
ad_creative_link_caption    - Ad text/description
ad_delivery_start_time      - When ad started
ad_delivery_stop_time       - When ad ended
page_name                   - Political party/page name
spend_lower                 - Minimum spend (in paisa)
spend_upper                 - Maximum spend (in paisa)
impressions_lower           - Minimum impressions
impressions_upper           - Maximum impressions
demographic_distribution    - JSON with demographic data
region_distribution         - JSON with regional data
publisher_platform          - Platform (Facebook, Instagram, etc.)
```

**Note:** Spend values in the database are in paisa (smallest currency unit). The API converts them to Lakhs for display.

---

## 💡 Examples of API Usage

### 1. Get BJP ads from Delhi
```bash
curl "http://localhost:3000/api/ads?party=BJP&state=Delhi&limit=10"
```

### 2. Get spending trends for last 30 days
```bash
curl "http://localhost:3000/api/analytics/trends?days=30"
```

### 3. Get spending by party in 2024
```bash
curl "http://localhost:3000/api/analytics/spend?startDate=2024-01-01&endDate=2024-12-31"
```

### 4. Pagination example
```bash
# First page
curl "http://localhost:3000/api/ads?limit=20&offset=0"

# Second page
curl "http://localhost:3000/api/ads?limit=20&offset=20"
```

---

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────┐
│  Browser/Frontend Components            │
│  (React, Next.js)                       │
└────────────────┬────────────────────────┘
                 │
                 │ HTTP Requests
                 ▼
┌─────────────────────────────────────────┐
│  Next.js API Routes                     │
│  /app/api/*                             │
└────────────────┬────────────────────────┘
                 │
                 │ Function Calls
                 ▼
┌─────────────────────────────────────────┐
│  Database Pool                          │
│  lib/db.js                              │
└────────────────┬────────────────────────┘
                 │
                 │ SQL Queries
                 ▼
┌─────────────────────────────────────────┐
│  PostgreSQL via SSH Tunnel              │
│  localhost:15432 → 172.16.12.166:5432  │
└─────────────────────────────────────────┘
```

---

## ⚠️ Important Reminders

### 1. **SSH Tunnel Must Be Active**
Before starting your Next.js app, ensure the SSH tunnel is running:
```bash
ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@172.16.12.166 -N
```

### 2. **Environment Variables Are Not Committed**
The `.env.local` file is in `.gitignore` and will NOT be committed to git. This keeps your password safe.

### 3. **Connection Pooling**
The app uses a connection pool (max 20 connections). This means:
- Multiple requests can use the same connection
- Better performance
- Automatic connection management

### 4. **Error Handling**
All API routes have error handling. If the database is unreachable, the `/api/mock-data` endpoint will fall back to the mock data in `data/spendData.js`.

---

## 🐛 Troubleshooting

### Issue: "Connection refused" error

**Solution:**
1. Check if SSH tunnel is running
2. Verify the tunnel is on port 15432:
   ```bash
   lsof -i :15432
   ```

### Issue: "Authentication failed"

**Solution:**
1. Check your password in `.env.local`
2. Test connection manually:
   ```bash
   psql -h localhost -p 15432 -U harshit -d political_ads_db -W
   ```

### Issue: "Cannot find module '@/lib/db'"

**Solution:**
Restart the dev server:
```bash
# Press Ctrl+C to stop, then:
npm run dev
```

### Issue: Port 3000 already in use

**Solution:**
```bash
PORT=3001 npm run dev
```

### Issue: API returns empty data

**Solution:**
1. Check database has data:
   ```bash
   psql -h localhost -p 15432 -U harshit -d political_ads_db -W -c 'SELECT COUNT(*) FROM ads;'
   ```
2. Check the API logs in terminal for SQL errors

---

## 🎯 Next Steps

### 1. Update Your Components (Optional)
Your components can now use these endpoints. For example, in `Dashboard/index.jsx`:

```javascript
useEffect(() => {
  const fetchRealData = async () => {
    const res = await fetch('/api/mock-data');
    const data = await res.json();
    setSpendData(data.spendData);
    setLineSeries(data.lineSeries);
    setAds(data.ads);
  };
  fetchRealData();
}, []);
```

### 2. Add More Features
You can create new API endpoints for:
- Regional analysis
- Demographic analysis
- Platform comparison
- Time-series predictions

### 3. Optimize Queries
For better performance:
- Add database indexes
- Implement caching (Redis)
- Use query optimization

---

## 📚 Quick Reference

### Start Everything:
```bash
# Terminal 1: SSH Tunnel
ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@172.16.12.166 -N

# Terminal 2: Dev Server
./start-dev.sh
# or
npm run dev
```

### Test Connection:
```bash
curl http://localhost:3000/api/test-db
```

### View in Browser:
- Main App: http://localhost:3000
- Test DB: http://localhost:3000/api/test-db
- Get Ads: http://localhost:3000/api/ads

---

## ✅ Checklist

Before running your app, ensure:

- [ ] SSH tunnel is active in a separate terminal
- [ ] `.env.local` has your actual password (not `YOUR_PASSWORD`)
- [ ] Dependencies are installed (`npm install`)
- [ ] Port 3000 is available (or use different port)
- [ ] Database connection test passes

---

## 🎉 Success!

If you can see data from `/api/test-db`, congratulations! Your database is now connected to your Next.js frontend.

Your app now has access to 86,387 real political ads! 🚀

---

## Need Help?

Check these files for more info:
- **`DATABASE_SETUP.md`** - Technical documentation
- **`lib/db.js`** - Database connection code
- **`app/api/*/route.js`** - API endpoint implementations
