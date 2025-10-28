# Political Ad Tracker - India

A comprehensive dashboard for tracking and analyzing political advertising spending across major Indian political parties (BJP, INC, AAP) using Meta's Ad Library data.

## 🎯 Features

- **Real-time Analytics Dashboard**
  - Party-wise spending breakdown (BJP, INC, AAP)
  - Interactive pie charts and line graphs
  - KPI cards showing total ads, pages, and spending
  - Top spenders table with percentage distribution

- **Advanced Filtering**
  - Date range filtering
  - State/UT filtering
  - Political party filtering
  - Search functionality

- **Ad Explorer**
  - Browse 90,000+ political ads
  - Filter by party, state, and date
  - Sort by recent or highest spend
  - Smart currency formatting (₹, Lakhs, Crores)

- **Automatic Party Classification**
  - ML-based keyword matching
  - Classifies ads into BJP, INC, AAP, or Others
  - Supports comprehensive party name variations

## 🚀 Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TailwindCSS
- **Backend**: Next.js API Routes, Node.js
- **Database**: PostgreSQL (92,100+ ad records)
- **Charts**: Chart.js, React-Chartjs-2
- **UI Components**: Framer Motion, Flatpickr

## 🛠️ Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- PostgreSQL database (local or remote)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/HarshitAnand1/political-spend-online-g67.git
   cd political-spend-online-g67
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   
   Create a `.env.local` file:
   ```env
   DATABASE_URL="postgresql://username:password@localhost:5432/political_ads_db"
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   ```

## 📁 Project Structure

```
political-ad-tracker/
├── app/
│   ├── api/                    # API routes
│   ├── globals.css
│   └── page.jsx               # Main dashboard
├── components/
│   ├── Dashboard/             # Dashboard components
│   └── Explorer/              # Ad explorer
├── lib/
│   ├── db.js                  # Database pool
│   └── partyUtils.js          # Party classification
└── README.md
```

## 🔍 API Endpoints

- `GET /api/stats` - Overall statistics
- `GET /api/analytics/spend` - Party-wise spending
- `GET /api/analytics/trends` - Daily trends
- `GET /api/ads` - Filtered ad listings

## 🎨 Party Classification

Automatic classification using keyword matching:
- **BJP**: "bjp", "modi", "bharatiya janata"
- **INC**: "congress", "rahul gandhi"
- **AAP**: "aam aadmi", "kejriwal"

## 👥 Authors

- **Harshit Anand** - [HarshitAnand1](https://github.com/HarshitAnand1)
- Course: IC202P, IIT Mandi, Group G67

## 📝 License

MIT License - Educational project for IIT Mandi
