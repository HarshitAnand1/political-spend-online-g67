# Political Ad Tracker

A comprehensive dashboard for tracking and analyzing political advertisements from Meta/Facebook and Google platforms, focusing on Indian political parties across all states.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to AWS RDS PostgreSQL database

### Installation

```bash
# 1. Navigate to project directory
cd political-ad-tracker

# 2. Install dependencies
npm install

# 3. Configure environment
# Create .env.local file:
echo 'DATABASE_URL="postgresql://g67:Mandi!05,@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb?sslmode=no-verify"' > .env.local

# 4. Start development server
npm run dev

# 5. Open browser
# http://localhost:3001
```

## ✨ Features

### 📊 Dashboard View
- **Real-time KPIs**: Total ads, unique advertisers, total spend, and reach
- **Interactive Charts**: Spend over time (line chart) and party-wise distribution (pie chart)
- **Top Advertisers**: Top 10 political advertisers by spending (excludes "Others")
- **Geographic Breakdown**: State-wise spending analysis
- **Party Spend Summary**: Detailed table with official and unofficial spending
- **Advanced Filters**: Date range, State/UT, Political party

### 🔍 Explorer View
- **Search & Filter**: Browse political ads with advanced filtering
- **Detailed Ad Cards**: Party-coded cards with spend, impressions, and target regions
- **Ad Details Modal**: View campaign period and original ad snapshots
- **Smart Defaults**: Automatically filters to show Indian political ads only

### 🗺️ Regional Analytics
- **State-wise Analysis**: Spending breakdown by state and UT
- **National vs Regional**: Distinguish national campaigns from state-specific ones
- **Geographic Distribution**: Visual representation of ad targeting

## 🎨 Recent Improvements

- ✅ Fixed line graph scaling issues with optimized chart configuration
- ✅ Enhanced dashboard UI with better visual hierarchy
- ✅ Improved chart legends with compact layout
- ✅ Added rupee currency symbols throughout the application
- ✅ Removed non-political advertisers from all analytics
- ✅ Fixed top advertisers to show exactly 10 political advertisers
- ✅ Added maximum date constraint to prevent future date selection
- ✅ Optimized API queries for better performance

## 🎯 Political Parties Tracked

Currently tracking **23+ political parties** including:

**National Parties:**
- BJP (Bharatiya Janata Party) - Orange
- INC (Indian National Congress) - Green
- AAP (Aam Aadmi Party) - Blue
- CPI(M) (Communist Party of India Marxist) - Red

**Regional Parties:**
- JD(U) (Janata Dal United) - Dark Green
- RJD (Rashtriya Janata Dal) - Green
- DMK (Dravida Munnetra Kazhagam) - Red
- AITC (All India Trinamool Congress) - Teal
- NCP (Nationalist Congress Party) - Blue
- TDP (Telugu Desam Party) - Yellow
- AIADMK (All India Anna Dravida Munnetra Kazhagam) - Green
- SP (Samajwadi Party) - Red
- BSP (Bahujan Samaj Party) - Blue
- Shiv Sena - Orange
- BJD (Biju Janata Dal) - Green
- YSRCP (YSR Congress Party) - Violet
- BRS (Bharat Rashtra Samithi) - Pink
- JD(S) (Janata Dal Secular) - Lime

**Bihar-specific Parties:**
- Jan Suraaj - Red
- LJP (Lok Janshakti Party) - Purple
- HAM (Hindustani Awam Morcha) - Amber
- VIP (Vikassheel Insaan Party) - Cyan
- AIMIM (All India Majlis-e-Ittehad-ul-Muslimeen) - Dark Green

## 📊 Data Source

- **Platform**: Meta/Facebook and Google Ads (Unified Schema)
- **Records**: 200,000+ political advertisements
- **Coverage**: All Indian states and UTs
- **Database**: AWS RDS PostgreSQL
- **Schema**: `unified` (combines meta_ads and google_ads)
- **Daily Tracking**: Historical spend data with daily granularity

## 🛠️ Technology Stack

- **Frontend**: Next.js 14 (App Router), React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (AWS RDS)
- **Visualization**: Chart.js, React Chart.js 2
- **Animations**: Framer Motion
- **Date Picker**: Flatpickr
- **UI Components**: Custom React components with dark mode support

## 📁 Project Structure

```
political-ad-tracker/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes
│   │   ├── ads/          # Ad listing and filtering
│   │   ├── analytics/    # Analytics endpoints
│   │   └── stats/        # Dashboard statistics
│   └── page.jsx          # Main page
├── components/            # React Components
│   ├── Dashboard/        # Dashboard components
│   │   ├── Charts.jsx   # Line and pie charts
│   │   ├── KPICards.jsx # Metric cards
│   │   ├── TopAdvertisers.jsx
│   │   ├── SpendTable.jsx
│   │   └── FiltersPanel.jsx
│   └── Explorer/         # Explorer components
│       ├── AdCard.jsx   # Ad card design
│       ├── AdModal.jsx  # Ad details modal
│       └── FilterPanel.jsx
├── lib/                   # Utilities
│   ├── db.js             # Database connection pool
│   ├── partyUtils.js     # Party classification & formatting
│   └── geoUtils.js       # Geographic utilities
└── .env.local            # Environment variables (not in git)
```

## 🔌 API Endpoints

### Dashboard
- `GET /api/stats` - Overall statistics and KPIs
- `GET /api/analytics/spend` - Party-wise spending breakdown
- `GET /api/analytics/trends` - Daily spending trends over time
- `GET /api/analytics/top-advertisers` - Top 10 advertisers by spend
- `GET /api/analytics/geography` - State-wise spending data

### Explorer
- `GET /api/ads` - List and filter ads with pagination

### Testing
- `GET /api/test-db` - Database connection test

## 🔧 Available Scripts

```bash
# Development server with hot reload (port 3001)
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## 🌐 Browser Requirements

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 🐛 Troubleshooting

### No Data Showing
1. Test database connection: `http://localhost:3001/api/test-db`
2. Verify `.env.local` is configured correctly
3. Check network access to AWS RDS
4. Check browser console for API errors

### Port Already in Use
```bash
# Kill process on port 3001
lsof -ti:3001 | xargs kill -9

# Or use different port
npm run dev -- -p 3000
```

### Dependencies Issues
```bash
# Clear cache and reinstall
rm -rf node_modules package-lock.json
npm cache clean --force
npm install
```

### Database Connection Issues
- Verify AWS RDS security group allows your IP
- Check database credentials in `.env.local`
- Ensure `sslmode=no-verify` is set in DATABASE_URL

## 💡 Development Notes

### Party Classification Logic
Implemented in [lib/partyUtils.js](lib/partyUtils.js):
- Keyword-based matching on `page_id` and advertiser names
- Supports both English and Hindi keywords
- Filters out non-political advertisers (corporations, brands)
- Falls back to "Others" for unclassified political ads

### Currency Formatting
All currency values use Indian Rupee (₹):
- Values < ₹1L shown in rupees
- Values < ₹1Cr shown in lakhs (L)
- Values ≥ ₹1Cr shown in crores (Cr)

### Performance Optimizations
- Connection pooling (max 20 connections)
- API query optimization with indexed columns
- Efficient filtering using unified schema
- Chart data caching and optimization

## 📝 Known Issues

- Geographic data limited to ads with region targeting information
- Some minor parties may be classified as "Others"
- Historical data availability varies by advertiser

## 🚀 Deployment

For production deployment:

1. **Environment Variables**: Set DATABASE_URL on your hosting platform
2. **Build**: Run `npm run build`
3. **Start**: Run `npm start`
4. **SSL**: Ensure SSL is configured for database connections
5. **Monitoring**: Set up error logging and monitoring

## 👥 Authors

- **Harshit Anand** - [HarshitAnand1](https://github.com/HarshitAnand1)
- Course: IC202P, IIT Mandi, Group G67

## 📄 License

MIT License - Educational project for IIT Mandi

---

**Need Help?** Check the [API endpoints](#-api-endpoints) or test the database connection at `/api/test-db`
