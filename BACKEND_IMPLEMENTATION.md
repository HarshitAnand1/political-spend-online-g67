# Backend Implementation Summary

## ✅ What Has Been Implemented

### 1. Party Classification System (`lib/partyUtils.js`)

**Purpose**: Automatically classify ads to political parties based on content

**How it works**:
- Scans `page_id` and `bylines` fields for party keywords
- Classifies ads into: **BJP**, **INC** (Congress), **AAP**, or **Others**
- Uses comprehensive keyword matching:
  - **BJP**: "bjp", "bharatiya", "janata", "modi", "narendra modi", "amit shah", "yogi", "lotus", "saffron"
  - **INC**: "congress", "inc", "indian national", "rahul gandhi", "sonia gandhi", "priyanka gandhi", "hand", "aicc"
  - **AAP**: "aam aadmi", "aap", "kejriwal", "arvind kejriwal", "broom", "common man"
  - **Others**: Everything that doesn't match above keywords

**Functions**:
- `classifyParty(pageId, bylines)` → Returns party code
- `formatCurrency(amount)` → Smart formatting (₹500, ₹2.5 L, ₹15.6 Cr)
- `formatSpendRange(lower, upper)` → Format spend ranges properly
- `getPartyName(code)` → Get full party name
- `extractStates(targetLocations)` → Parse state names from JSON

---

### 2. Updated API Endpoints

#### `/api/stats` - Overall Statistics
**Query Parameters**:
- `startDate` - Filter by start date
- `endDate` - Filter by end date
- `state` - Filter by state/UT
- `party` - Filter by specific party

**Returns**:
```json
{
  "totalAds": 92100,
  "totalPages": 7444,
  "totalSpend": 1564.65,  // in Lakhs
  "avgImpressions": 50000,
  "partyBreakdown": {
    "BJP": 500.25,
    "INC": 300.50,
    "AAP": 150.75,
    "Others": 613.15
  }
}
```

**How it works**:
1. Fetches all ads from database with filters
2. Classifies each ad using `classifyParty()`
3. Aggregates spend by party
4. Returns totals

---

#### `/api/analytics/spend` - Party-wise Spending
**Query Parameters**:
- `startDate`, `endDate` - Date range filter
- `state` - State/UT filter  
- `party` - Show only specific party

**Returns**:
```json
{
  "spendData": {
    "BJP": 500.25,
    "INC": 300.50,
    "AAP": 150.75,
    "Others": 613.15
  }
}
```

**Used by**: Dashboard pie chart and spend cards

---

#### `/api/analytics/trends` - Daily Spend Trends
**Query Parameters**:
- `days` - Number of days to show (default: 30)
- `state` - State filter
- `party` - Party filter

**Returns**:
```json
{
  "lineSeries": {
    "labels": ["Oct 1", "Oct 2", "Oct 3", ...],
    "BJP": [10.5, 12.3, 15.6, ...],
    "INC": [8.2, 9.1, 10.5, ...],
    "AAP": [3.5, 4.2, 5.1, ...],
    "Others": [20.1, 22.3, 25.6, ...]
  }
}
```

**Used by**: Dashboard line chart "Spend Over Time"

---

#### `/api/ads` - Ad Listing with Filters
**Query Parameters**:
- `party` - Single party filter (e.g., "BJP")
- `parties` - Multiple parties (comma-separated: "BJP,INC")
- `state` - Single state filter
- `states` - Multiple states (comma-separated)
- `datePreset` - "Last 24 hours", "Last 7 days", "Last 30 days"
- `startDate`, `endDate` - Custom date range
- `search` - Text search in page_id and bylines
- `sortBy` - "date" (most recent) or "spend" (highest spend)
- `limit` - Results per page (default: 20)
- `offset` - Pagination offset

**Returns**:
```json
{
  "ads": [
    {
      "id": "123",
      "title": "BJP INDIA",
      "sponsor": "Bharatiya Janata Party",
      "party": "BJP",
      "spend": "₹2.5 L - ₹5 L",
      "spendLower": 250000,
      "spendUpper": 500000,
      "impressions": "100,000 - 500,000",
      "state": "Uttar Pradesh",
      "platforms": "Facebook, Instagram",
      "startDate": "2024-10-01",
      "endDate": "2024-10-15",
      "snapshotUrl": "https://...",
      ...
    }
  ],
  "total": 50,
  "offset": 0,
  "limit": 20
}
```

**Used by**: Explorer view ad cards

---

### 3. Frontend Component Updates

#### Dashboard (`components/Dashboard/index.jsx`)
**What changed**:
- Now calls `/api/stats`, `/api/analytics/spend`, `/api/analytics/trends` with filter params
- Filters are sent as query parameters when "Apply Filters" is clicked
- Real-time party classification and aggregation
- Displays party breakdown in:
  - KPI cards (BJP Spend, INC Spend, AAP Spend, Others Spend)
  - Pie chart (party distribution)
  - Line chart (trends over time by party)
  - Table (top spenders with %)

**Filters supported**:
- Date Range (custom picker)
- State / UT (dropdown)
- Political Party (dropdown)

---

#### Explorer (`components/Explorer/index.jsx`)
**What changed**:
- Calls `/api/ads` with all filter parameters
- Filters applied:
  - Date presets (Last 24h, 7d, 30d)
  - Party checkboxes (BJP, INC, AAP)
  - State checkboxes (multiple states)
  - Search bar (searches in sponsor/party name)
  - Sort by (Most Recent or Highest Spend)

**Ad Cards display**:
- Party badge with color
- **Smart spend formatting**:
  - ₹500 (for small amounts)
  - ₹2.5 L (for lakhs)
  - ₹15.6 Cr (for crores)
- State name extracted from target_locations
- Sponsor name from bylines

---

## 🎯 How Party Classification Works

### Example 1: BJP Ad
```
page_id: "112188574470618"
bylines: "Paid for by Bharatiya Janata Party - BJP"

→ classifyParty() detects "bharatiya" and "bjp"
→ Result: "BJP"
```

### Example 2: Congress Ad
```
page_id: "145667348311"
bylines: "Paid for by Indian National Congress - INC"

→ classifyParty() detects "indian national" and "congress"
→ Result: "INC"
```

### Example 3: AAP Ad
```
page_id: "113571823732"
bylines: "Paid for by Aam Aadmi Party"

→ classifyParty() detects "aam aadmi party"
→ Result: "AAP"
```

### Example 4: Unknown Ad
```
page_id: "999888777666"
bylines: "Paid for by Local Community Group"

→ classifyParty() finds no matching keywords
→ Result: "Others"
```

---

## 📊 Data Flow

```
User clicks "Apply Filters" on Dashboard
         ↓
Frontend builds query params: ?state=Delhi&party=BJP&startDate=2024-10-01
         ↓
API receives request at /api/stats, /api/analytics/spend, /api/analytics/trends
         ↓
Each API queries database with SQL filters (state, date range)
         ↓
For each ad row returned:
  - Call classifyParty(page_id, bylines)
  - Aggregate spend by classified party
         ↓
Filter results by party parameter if specified
         ↓
Return JSON with party-wise totals
         ↓
Dashboard charts/cards update with real data
```

---

## 💰 Smart Currency Formatting

| Amount (₹) | Formatted Output |
|-----------|-----------------|
| 500 | ₹500 |
| 5,000 | ₹5,000 |
| 50,000 | ₹50,000 |
| 250,000 | ₹2.50 L |
| 1,500,000 | ₹15.00 L |
| 10,000,000 | ₹1.00 Cr |
| 50,000,000 | ₹5.00 Cr |

---

## 🔧 Testing the APIs

### Test 1: Get overall stats
```bash
curl http://localhost:3000/api/stats
```

### Test 2: Get BJP spending only
```bash
curl "http://localhost:3000/api/stats?party=BJP"
```

### Test 3: Get Delhi ads from last 7 days
```bash
curl "http://localhost:3000/api/ads?state=Delhi&datePreset=Last+7+days"
```

### Test 4: Get spending trends for last 30 days
```bash
curl "http://localhost:3000/api/analytics/trends?days=30"
```

### Test 5: Get party-wise spend distribution
```bash
curl http://localhost:3000/api/analytics/spend
```

---

## ✅ All Features Working

- ✅ Party classification (BJP, INC, AAP, Others)
- ✅ Smart currency formatting (₹, L, Cr)
- ✅ State/UT filtering
- ✅ Date range filtering
- ✅ Party filtering
- ✅ Search functionality
- ✅ Sortby spend or date
- ✅ Dashboard charts update with filters
- ✅ Explorer cards show correct formatted spend
- ✅ Pie chart shows party distribution
- ✅ Line chart shows trends over time
- ✅ KPI cards show totals by party
- ✅ Top spenders table with percentages

---

## 🚀 Ready for Presentation!

Your dashboard now:
1. **Classifies 92,100+ ads** into political parties automatically
2. **Displays spending** in easy-to-read format (Lakhs/Crores)
3. **Supports all filters** (Date, State, Party, Search)
4. **Shows real-time analytics** (Pie charts, Line graphs, Tables)
5. **Works with live database** via SSH tunnel

Run `./start-all.sh` or `./start-simple.sh` and open http://localhost:3000!
