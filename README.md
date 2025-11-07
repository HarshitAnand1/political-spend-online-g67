# Political Ad Tracker

A comprehensive dashboard for tracking and analyzing political advertisements from Meta/Facebook platform, focusing on Indian political parties and candidates in Bihar.

## Quick Start

### Prerequisites
- Node.js 18+ and npm
- Access to the AWS RDS PostgreSQL database

### Installation

1. **Navigate to project directory**
   ```bash
   cd political-ad-tracker
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment**

   Create `.env.local` file in the project root:
   ```env
   DATABASE_URL="postgresql://g67:Mandi!05,@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb?sslmode=no-verify"
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

5. **Open browser**
   ```
   http://localhost:3001
   ```

## Features

### 📊 Dashboard View
- Real-time statistics (ads, pages, spend, reach)
- Party-wise spending breakdown
- Interactive charts (trends, distribution)
- Top advertisers and top spenders tables
- Filters: Date range, State/UT, Party

### 🔍 Explorer View
- Search and filter political ads
- View detailed ad information
- Advanced filtering capabilities

### 🗺️ Regional Analytics
- State-wise spending analysis
- Geographic distribution
- Regional breakdowns with heat maps

### 👤 Person Analytics
- Individual candidate tracking:
  - **Binod Mishra** (Alinagar, RJD)
  - **Maithili Thakur** (Alinagar, Independent)
  - **Vijay Kumar Sinha** (Lakhisarai, BJP)
- Per-person spending, ad count, and impressions
- Custom filters per candidate

## Political Parties Tracked

1. **BJP** (Bharatiya Janata Party) - Orange
2. **INC** (Indian National Congress) - Green
3. **AAP** (Aam Aadmi Party) - Blue
4. **JD(U)** (Janata Dal United) - Dark Green
5. **RJD** (Rashtriya Janata Dal) - Green
6. **Jan Suraaj** - Red
7. **LJP** (Lok Janshakti Party) - Purple
8. **HAM** (Hindustani Awam Morcha) - Amber
9. **VIP** (Vikassheel Insaan Party) - Cyan
10. **AIMIM** (All India Majlis-e-Ittehad-ul-Muslimeen) - Dark Green

## Data Source

- **Platform**: Meta/Facebook Ads
- **Records**: 125,000+ political advertisements
- **Schema**: `meta_ads` (PostgreSQL)
- **Regional Data**: State-wise ad distribution
- **Database**: AWS RDS PostgreSQL

## Technology Stack

- **Frontend**: Next.js 14, React 18, Tailwind CSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (AWS RDS)
- **Visualization**: Chart.js, React Chart.js 2
- **Animations**: Framer Motion
- **Date Picker**: Flatpickr

## Available Scripts

```bash
# Development server with hot reload
npm run dev

# Production build
npm run build

# Start production server
npm start

# Run linter
npm run lint
```

## Project Structure

```
political-ad-tracker/
├── app/                    # Next.js 14 App Router
│   ├── api/               # API Routes
│   └── page.jsx           # Main page
├── components/            # React Components
│   ├── Dashboard/        # Dashboard components
│   ├── Explorer/         # Explorer components
│   ├── Analytics/        # Analytics components
│   └── PersonAnalytics/  # Person analytics
├── lib/                   # Utilities
│   ├── db.js             # Database connection
│   ├── partyUtils.js     # Party classification
│   ├── personUtils.js    # Person classification
│   └── geoUtils.js       # Geographic utilities
└── .env.local            # Environment variables
```

## API Endpoints

- `GET /api/stats` - Dashboard statistics
- `GET /api/analytics/trends` - Spending trends over time
- `GET /api/analytics/top-advertisers` - Top advertisers by spending
- `GET /api/analytics/person-spend` - Person-wise spending data
- `GET /api/test-db` - Database connection test

## Documentation

For detailed setup instructions, troubleshooting, and deployment guide, see:

**[SETUP.md](SETUP.md)** - Complete setup and deployment guide

## Key Files

- **[SETUP.md](SETUP.md)** - Detailed setup instructions
- **[REVERT_TO_META_ADS.md](REVERT_TO_META_ADS.md)** - Schema migration notes
- **[TOP_ADVERTISERS_FIX.md](TOP_ADVERTISERS_FIX.md)** - Top advertisers fix documentation
- **[lib/partyUtils.js](lib/partyUtils.js)** - Party classification logic
- **[lib/personUtils.js](lib/personUtils.js)** - Person classification logic

## Browser Requirements

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Port Configuration

Default port: **3001**

To change port, edit [package.json](package.json:6):
```json
"dev": "next dev -p 3000"
```

## Troubleshooting

### No Data Showing
1. Check database connection: `http://localhost:3001/api/test-db`
2. Verify `.env.local` is configured correctly
3. Check API responses in browser console

### Port Already in Use
```bash
# Kill process on port 3001
kill -9 $(lsof -ti:3001)

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

## Development Notes

### Classification Logic

**Party Classification** ([lib/partyUtils.js](lib/partyUtils.js)):
- Keyword-based matching on `page_id` and `bylines`
- Matches against English and Hindi keywords
- Falls back to "Others" if no match

**Person Classification** ([lib/personUtils.js](lib/personUtils.js)):
- Keyword-based matching for individual candidates
- Supports bilingual keywords (English/Hindi)
- Constituency and party information included

### Caching

Stats are cached for 5 minutes to improve performance. Cache is implemented in [lib/cache.js](lib/cache.js).

## Known Issues

- Currently showing Meta ads only (not Google ads)
- Regional filtering limited to Meta ads with region data
- Some candidates may not have ads in the database

## Future Enhancements

- [ ] Add Google ads from `unified` schema
- [ ] Implement more detailed time series analysis
- [ ] Add export functionality (CSV, PDF)
- [ ] Add more candidates for person analytics
- [ ] Implement admin panel for keyword management
- [ ] Add real-time data updates

## Authors

- **Harshit Anand** - [HarshitAnand1](https://github.com/HarshitAnand1)
- Course: IC202P, IIT Mandi, Group G67

## License

MIT License - Educational project for IIT Mandi
