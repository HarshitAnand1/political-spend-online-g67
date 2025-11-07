# Local Setup Guide - Political Ad Tracker

This guide will help you set up and run the Political Ad Tracker application on your local machine.

## Prerequisites

Before you begin, ensure you have the following installed on your laptop:

1. **Node.js** (v18 or higher recommended)
   - Download from: https://nodejs.org/
   - Verify installation: `node --version`

2. **npm** (comes with Node.js) or **yarn**
   - Verify npm: `npm --version`
   - Or install yarn: `npm install -g yarn`

3. **Git** (optional, for version control)
   - Download from: https://git-scm.com/
   - Verify: `git --version`

## Setup Steps

### 1. Get the Project Files

If using Git:
```bash
git clone <repository-url>
cd political-ad-tracker
```

Or simply navigate to the project directory:
```bash
cd /path/to/political-ad-tracker
```

### 2. Install Dependencies

Install all required npm packages:

```bash
npm install
```

Or if using yarn:
```bash
yarn install
```

This will install:
- Next.js 14 (React framework)
- PostgreSQL client (pg)
- Chart.js (for visualizations)
- Framer Motion (for animations)
- Flatpickr (for date pickers)
- Tailwind CSS (for styling)
- And other dependencies from package.json

### 3. Configure Environment Variables

Create a `.env.local` file in the project root directory:

```bash
touch .env.local
```

Add the following content to `.env.local`:

```env
# Database Connection
# Using sslmode=no-verify to bypass certificate verification (AWS RDS uses self-signed certs)
DATABASE_URL="postgresql://g67:Mandi!05,@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb?sslmode=no-verify"

# Direct connection to AWS RDS PostgreSQL (SSL enabled, cert verification disabled)
```

**Important Notes:**
- This connects to the existing AWS RDS database
- The database contains 125,000+ Meta ads with party and person classifications
- SSL is required but certificate verification is disabled
- Do NOT commit `.env.local` to version control (it's in .gitignore)

### 4. Verify Database Connection

Test that the database connection works:

```bash
npm run dev
```

Then open your browser and navigate to:
```
http://localhost:3001/api/test-db
```

You should see a success message if the database connection is working.

### 5. Start the Development Server

Run the Next.js development server:

```bash
npm run dev
```

Or with yarn:
```bash
yarn dev
```

The server will start on port 3001 by default.

### 6. Access the Application

Open your web browser and navigate to:

```
http://localhost:3001
```

You should see the Political Ad Tracker dashboard with:
- Dashboard View (statistics, charts, tables)
- Explorer View (search and filter ads)
- Regional Analytics (state-wise breakdowns)
- Person Analytics (candidate spending)

## Application Structure

```
political-ad-tracker/
├── app/                          # Next.js 14 App Router
│   ├── api/                      # API Routes
│   │   ├── stats/               # Dashboard statistics
│   │   ├── analytics/           # Analytics endpoints
│   │   │   ├── trends/          # Spending trends
│   │   │   ├── top-advertisers/ # Top advertisers
│   │   │   └── person-spend/    # Person analytics
│   │   └── test-db/             # Database connection test
│   ├── page.jsx                 # Main page with tabs
│   └── layout.jsx               # Root layout
├── components/                   # React Components
│   ├── Dashboard/               # Dashboard view
│   ├── Explorer/                # Explorer view
│   ├── Analytics/               # Regional analytics
│   ├── PersonAnalytics/         # Person analytics
│   ├── Header.jsx               # App header
│   └── Tabs.jsx                 # Tab navigation
├── lib/                         # Utility Libraries
│   ├── db.js                    # Database connection
│   ├── partyUtils.js            # Party classification
│   ├── personUtils.js           # Person classification
│   ├── geoUtils.js              # Geographic utilities
│   └── cache.js                 # Caching utilities
├── public/                      # Static assets
├── .env.local                   # Environment variables (DO NOT COMMIT)
├── package.json                 # Dependencies
├── next.config.js               # Next.js configuration
└── tailwind.config.js           # Tailwind CSS configuration
```

## Features

### Dashboard View
- **Total Statistics**: Ads, Pages, Spend, Reach
- **Party Breakdown**: 10 political parties tracked
  - BJP, INC, AAP
  - Janata Dal (United), RJD, Jan Suraaj
  - LJP, HAM, VIP, AIMIM
- **Charts**: Line chart (trends), Donut chart (distribution)
- **Tables**: Top Spenders by Party, Top Advertisers
- **Filters**: Date range, State/UT, Party

### Explorer View
- Search and filter political ads
- View individual ad details
- Filter by multiple criteria

### Regional Analytics
- State-wise spending analysis
- Geographic distribution
- Regional breakdowns

### Person Analytics
- Track individual candidates:
  - **Binod Mishra** (Alinagar, RJD)
  - **Maithili Thakur** (Alinagar, Independent)
  - **Vijay Kumar Sinha** (Lakhisarai, BJP)
- Spending, ad count, impressions per person
- Filter by date, state, person

## Data Source

The application queries from the **`meta_ads` schema** in PostgreSQL:

- **Schema**: `meta_ads`
- **Main Table**: `ads` (125,000+ Meta/Facebook ads)
- **Regions Table**: `ad_regions` (for state filtering)

### Database Schema

```sql
-- Main ads table
meta_ads.ads
├── id (text)
├── page_id (text)
├── bylines (text)
├── spend_lower (numeric)
├── spend_upper (numeric)
├── impressions_lower (numeric)
├── impressions_upper (numeric)
├── ad_delivery_start_time (timestamp)
└── ad_delivery_stop_time (timestamp)

-- Regional distribution
meta_ads.ad_regions
├── ad_id (text)
├── region (text)
├── spend_percentage (numeric)
└── impressions_percentage (numeric)
```

## Available Scripts

```bash
# Development server (with hot reload)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Port Configuration

The application runs on **port 3001** by default.

To change the port, modify `package.json`:

```json
{
  "scripts": {
    "dev": "next dev -p 3001"
  }
}
```

Or run with a custom port:
```bash
npm run dev -- -p 3000
```

## Troubleshooting

### Port Already in Use

If port 3001 is already in use:

```bash
# Find the process using port 3001
lsof -ti:3001

# Kill the process
kill -9 $(lsof -ti:3001)

# Or use a different port
npm run dev -- -p 3000
```

### Database Connection Fails

1. Check `.env.local` has correct DATABASE_URL
2. Verify network connectivity to AWS RDS
3. Test connection: `http://localhost:3001/api/test-db`
4. Check AWS RDS security group allows your IP address

### No Data Showing (All Zeros)

1. Verify database connection
2. Check API routes are returning data:
   - `http://localhost:3001/api/stats`
   - `http://localhost:3001/api/analytics/trends`
   - `http://localhost:3001/api/analytics/top-advertisers`
3. Check browser console for errors
4. Verify `meta_ads.ads` table has data

### Dependencies Installation Fails

```bash
# Clear npm cache
npm cache clean --force

# Delete node_modules and package-lock.json
rm -rf node_modules package-lock.json

# Reinstall
npm install
```

### Build Errors

```bash
# Clear Next.js cache
rm -rf .next

# Rebuild
npm run build
```

## Browser Compatibility

The application works best on:
- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)

Minimum versions:
- Chrome 90+
- Firefox 88+
- Safari 14+

## Performance Notes

- **First Load**: May take 2-3 seconds to fetch initial data
- **Caching**: Stats are cached for 5 minutes
- **Filters**: Apply filters and click "Apply Filters" button
- **Date Ranges**: Large date ranges may take longer to process

## Security Notes

1. **DO NOT** commit `.env.local` to version control
2. **DO NOT** share database credentials publicly
3. Keep dependencies updated: `npm audit`
4. Use HTTPS in production

## Production Deployment

For production deployment:

1. Build the application:
   ```bash
   npm run build
   ```

2. Start the production server:
   ```bash
   npm start
   ```

3. Consider using a process manager like PM2:
   ```bash
   npm install -g pm2
   pm2 start npm --name "political-ad-tracker" -- start
   ```

4. Set up a reverse proxy (nginx, Apache)

5. Enable HTTPS with SSL certificate

6. Update DATABASE_URL to use verified SSL in production

## Support

For issues or questions:
- Check the API endpoint responses in browser
- Review server console logs
- Check database connectivity
- Verify all dependencies are installed

## Data Classification

### Party Classification
Ads are classified into parties using keyword matching in [lib/partyUtils.js](lib/partyUtils.js):
- BJP: saffron/orange color
- INC: green color
- AAP: blue color
- Bihar parties: RJD, JD(U), Jan Suraaj, LJP, HAM, VIP, AIMIM

### Person Classification
Candidates are classified using keyword matching in [lib/personUtils.js](lib/personUtils.js):
- Binod Mishra (Alinagar, RJD)
- Maithili Thakur (Alinagar, Independent)
- Vijay Kumar Sinha (Lakhisarai, BJP)

## License

[Add your license information here]

## Contributors

[Add contributor information here]
