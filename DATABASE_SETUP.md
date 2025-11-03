# Database Setup Guide - AWS RDS

## Overview
This guide explains how to connect your Next.js application to the PostgreSQL database hosted on AWS RDS.

## Prerequisites
- AWS RDS database credentials
- Node.js and npm installed
- Network access to AWS RDS (security group configured)

## Step-by-Step Setup

### 1. AWS RDS Connection
The application connects directly to AWS RDS PostgreSQL without needing SSH tunnels.

**Database Details:**
- **Host**: `political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com`
- **Port**: `5432`
- **Database**: `mydb`
- **User**: `g67`
- **Region**: ap-south-1 (Mumbai, India)

### 2. Environment Variables
Create a `.env.local` file in the project root:

```env
DATABASE_URL="postgresql://g67:YOUR_PASSWORD@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb"
```

**Replace `YOUR_PASSWORD` with your actual database password.**

### 3. Test Connection (Optional)
```bash
./test-direct-connection.sh
```

Or manually with psql:
```bash
psql -h political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com -p 5432 -U g67 -d mydb
```

### 4. Install Dependencies
Dependencies are already installed in package.json:
- `pg` - PostgreSQL client for Node.js

### 5. Start the Development Server
```bash
npm run dev
# or use the automated script:
./start-dev.sh
```

The server will start on http://localhost:3000

## API Endpoints

### Test Database Connection
```
GET /api/test-db
```
Tests if the database connection is working.

### Get All Ads (with filtering)
```
GET /api/ads?party=BJP&state=Delhi&limit=50&offset=0
```
Query parameters:
- `party` - Filter by party name
- `state` - Filter by state
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `limit` - Number of results (default: 50)
- `offset` - Pagination offset (default: 0)

### Get Spending Analytics
```
GET /api/analytics/spend?startDate=2024-01-01&endDate=2024-12-31
```
Returns total spending by party.

### Get Trend Analytics
```
GET /api/analytics/trends?days=7&party=BJP
```
Returns daily spending trends.

### Get Statistics
```
GET /api/stats
```
Returns overall statistics (total ads, parties, spending, etc.).

### Get Mock Data (Real Data Now)
```
GET /api/mock-data
```
Now returns real data from the database with fallback to mock data on error.

## Database Schema
The application expects an `ads` table with the following columns:
- `id` - Primary key
- `ad_creative_link_caption` - Ad caption/text
- `ad_delivery_start_time` - When ad started showing
- `ad_delivery_stop_time` - When ad stopped showing
- `page_name` - Page/Party name
- `spend_lower` - Lower bound of spend
- `spend_upper` - Upper bound of spend
- `impressions_lower` - Lower bound of impressions
- `impressions_upper` - Upper bound of impressions
- `demographic_distribution` - JSON field
- `region_distribution` - JSON field
- `publisher_platform` - Platform name

## Testing the Connection

### 1. Test the database endpoint:
```bash
curl http://localhost:3000/api/test-db
```

Expected response:
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

### 2. Test fetching ads:
```bash
curl http://localhost:3000/api/ads?limit=5
```

### 3. Test analytics:
```bash
curl http://localhost:3000/api/analytics/spend
```

## Troubleshooting

### Connection Refused
- Make sure SSH tunnel is running in Terminal 1
- Check if port 15432 is not already in use: `lsof -i :15432`

### Authentication Failed
- Verify password in `.env.local`
- Ensure user has proper permissions

### Pool Connection Errors
- Check if database server is accessible
- Verify DATABASE_URL format

### Port Already in Use
If port 3000 is taken, modify next.config.mjs or run:
```bash
PORT=3001 npm run dev
```

## Important Notes

1. **Keep SSH Tunnel Running**: The SSH tunnel must be active for the database connection to work.

2. **Environment Variables**: Never commit `.env.local` to git. Use `.env.example` as a template.

3. **Connection Pooling**: The app uses connection pooling (max 20 connections) for better performance.

4. **Error Handling**: API routes have fallback mechanisms to handle database errors gracefully.

## Production Deployment

For production, consider:
1. Using a direct database connection (no SSH tunnel)
2. Setting up SSL/TLS for database connections
3. Using environment variables from your hosting platform
4. Implementing proper connection pooling limits
5. Adding database query caching

## Database Connection Architecture

```
Next.js App (port 3000)
    ↓
lib/db.js (Connection Pool)
    ↓
localhost:15432 (SSH Tunnel)
    ↓
172.16.10.127:5432 (Remote PostgreSQL)
    ↓
political_ads_db
```
