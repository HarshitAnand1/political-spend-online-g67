# Person Analytics Feature

## Overview
Added a new "Person Analytics" tab to track advertising expenditure for individual political candidates. Similar to party classification, this feature uses keyword-based matching to identify and aggregate spending data for specific persons.

## Initial Tracked Persons

### 1. **Binod Mishra**
- **Constituency**: Various
- **Party**: Jan Suraaj
- **Color**: Tomato Red (#FF6347)
- **Keywords**: 10 keywords including 'binod mishra', 'binod', 'advocate binod', Hindi variations

### 2. **Maithili Thakur**
- **Constituency**: Alinagar
- **Party**: Independent
- **Color**: Brown (#8B4513)
- **Keywords**: 10 keywords including 'maithili thakur', 'maithili', 'alinagar', 'singer maithili', Hindi variations

### 3. **Vijay Kumar Sinha**
- **Constituency**: Lakhisarai
- **Party**: BJP
- **Color**: Saffron (#FF9933)
- **Keywords**: 10 keywords including 'vijay kumar sinha', 'vijay sinha', 'lakhisarai', 'vk sinha', Hindi variations

## Files Created

### 1. **lib/personUtils.js**
Utility functions for person classification (similar to partyUtils.js).

**Key Functions**:
```javascript
classifyPerson(pageId, text)      // Classify ad to person based on keywords
getPersonDetails(personName)       // Get person details (constituency, party, color)
getPersonColor(personName)         // Get person color for UI
getAllPersons()                    // Get list of all tracked persons
formatPersonCurrency(amount)       // Format currency for display
```

**Person Keywords Structure**:
```javascript
const PERSON_KEYWORDS = {
  'Binod Mishra': [
    'binod mishra',
    'binod',
    'mishra ji',
    // ... 10 keywords total
  ],
  'Maithili Thakur': [
    'maithili thakur',
    'maithili',
    'alinagar',
    // ... 10 keywords total
  ],
  'Vijay Kumar Sinha': [
    'vijay kumar sinha',
    'vijay sinha',
    'lakhisarai',
    // ... 10 keywords total
  ]
};
```

### 2. **app/api/analytics/person-spend/route.js**
API endpoint to fetch person-wise spending statistics.

**Endpoint**: `GET /api/analytics/person-spend`

**Query Parameters**:
- `startDate` - Start date filter (YYYY-MM-DD)
- `endDate` - End date filter (YYYY-MM-DD)
- `state` - State/region filter
- `person` - Specific person filter (optional)

**Response**:
```json
{
  "personStats": {
    "Binod Mishra": {
      "count": 45,
      "spend": 12.5,
      "impressions": 125000
    },
    "Maithili Thakur": {
      "count": 30,
      "spend": 8.3,
      "impressions": 95000
    },
    "Vijay Kumar Sinha": {
      "count": 60,
      "spend": 18.7,
      "impressions": 180000
    },
    "Others": {
      "count": 5000,
      "spend": 450.2,
      "impressions": 5000000
    }
  }
}
```

**Logic**:
- Queries `unified.all_ads` with JOINs
- Uses `classifyPerson()` to categorize each ad
- Aggregates by person: count, spend, impressions
- Converts spend from rupees to lakhs

### 3. **components/PersonAnalytics/index.jsx**
Main component for the Person Analytics view.

**Features**:
- Displays person cards sorted by spending
- Shows constituency, party affiliation
- Displays spend, ad count, and impressions
- Color-coded borders matching person colors
- Ranked cards (1, 2, 3...)
- "Others" section for unclassified ads
- Responsive grid layout

**Card Display**:
```
┌─────────────────────────┐
│ Binod Mishra       [1]  │
│ Various                  │
│                          │
│ Party: Jan Suraaj        │
│                          │
│ Total Spend: ₹12.50 L    │
│ Total Ads: 45            │
│ Impressions: 125.0K      │
└─────────────────────────┘
```

### 4. **components/PersonAnalytics/PersonFiltersPanel.jsx**
Custom filter panel for Person Analytics.

**Filters**:
- Date Range picker
- State/UT dropdown
- **Person/Candidate dropdown** (instead of Party dropdown)
  - All Persons
  - Binod Mishra
  - Maithili Thakur
  - Vijay Kumar Sinha

### 5. **app/page.jsx** (Updated)
Added "Person Analytics" as the 4th tab.

**Navigation Tabs**:
1. Dashboard View
2. Explorer View
3. Regional Analytics
4. **Person Analytics** ← NEW

## Classification Logic

Similar to party classification:

### Step 1: Extract Search Text
```javascript
const searchText = `${pageId} ${bylines}`.toLowerCase();
```

### Step 2: Match Keywords
```javascript
for (const [personName, keywords] of Object.entries(PERSON_KEYWORDS)) {
  for (const keyword of keywords) {
    if (searchText.includes(keyword.toLowerCase())) {
      return personName;  // Found match!
    }
  }
}
return 'Others';  // No match found
```

### Step 3: Aggregate Stats
- Count ads per person
- Sum spending per person
- Sum impressions per person

## Usage

### Access the Feature
1. Open the app at http://localhost:3001
2. Click the **"Person Analytics"** tab
3. Use filters to refine data:
   - Select date range
   - Select state
   - Select specific person or "All Persons"
4. Click "Apply Filters"

### What You'll See
- **Person Cards**: Grid of cards showing each tracked person's stats
- **Ranked Display**: Cards numbered 1, 2, 3... by spending
- **Color Coding**: Border color matches person's party affiliation
- **Detailed Stats**: Spend, ad count, impressions for each person
- **Others Section**: Aggregated stats for unclassified ads

## Adding New Persons

To track additional persons, edit `lib/personUtils.js`:

```javascript
const PERSON_KEYWORDS = {
  // ... existing persons
  'New Person Name': [
    'keyword1',
    'keyword2',
    'keyword3',
    // Add relevant keywords
  ]
};

const PERSON_DETAILS = {
  // ... existing persons
  'New Person Name': {
    name: 'New Person Name',
    constituency: 'Constituency Name',
    party: 'Party Name',
    role: 'Candidate',
    color: '#HEX_COLOR'
  }
};
```

## Benefits

### 1. **Granular Tracking**
- Track individual candidates' ad spending
- See which persons are investing most in ads
- Identify advertising strategies by candidate

### 2. **Constituency Insights**
- See spending patterns in specific constituencies
- Compare candidates in the same area

### 3. **Party Analysis**
- Analyze how different parties' candidates spend
- Compare spending across party lines

### 4. **Transparency**
- Provide voters with spending information
- Enable accountability for ad spending

## Technical Details

### Data Flow
```
User applies filters
  ↓
PersonAnalytics component
  ↓
GET /api/analytics/person-spend
  ↓
Query unified.all_ads + JOINs
  ↓
For each ad row:
  - classifyPerson(page_id, bylines)
  - Aggregate to person buckets
  ↓
Return { personStats }
  ↓
Display person cards
```

### Performance
- Uses same optimized queries as party analytics
- Benefits from database indexes on page_id
- Efficient LEFT JOINs with unified schema
- Regional filtering via ad_regions table

### Scalability
- Easy to add new persons (just add keywords)
- No database schema changes needed
- Keywords stored in application code
- Can track unlimited persons

## Future Enhancements

### 1. **Person Trends Over Time**
Add a line chart showing spending trends for each person over time.

### 2. **Person Comparison**
Side-by-side comparison of 2-3 selected persons.

### 3. **Constituency View**
Group persons by constituency for local analysis.

### 4. **Top Advertisers by Person**
Show top ad pages/accounts for each person.

### 5. **Platform Breakdown**
Show Meta vs Google ad spending per person.

### 6. **Hindi Language Support**
Add more Hindi keyword variations for better matching.

### 7. **Auto-detection**
Use ML/NLP to automatically suggest persons based on ad content.

## Testing

### Manual Testing Steps:
1. Navigate to Person Analytics tab
2. Verify all 3 persons display with correct details
3. Test filters:
   - Apply date range filter
   - Select specific state
   - Select specific person
4. Verify "Others" section appears
5. Check spending amounts are in lakhs
6. Verify card colors match party affiliations
7. Check ranking numbers (1, 2, 3...)

### Expected Results:
- Cards sorted by spending (highest first)
- Accurate counts and amounts
- Proper color coding
- Responsive layout on mobile
- Smooth tab transitions

## Keywords Reference

### Binod Mishra (Jan Suraaj)
```
binod mishra, binod, mishra ji, binod kumar mishra,
advocate binod, binod advocate, shri binod mishra,
श्री बिनोद मिश्रा, बिनोद मिश्रा, बिनोद
```

### Maithili Thakur (Independent - Alinagar)
```
maithili thakur, maithili, thakur maithili, alinagar,
maithili alinagar, singer maithili, thakur ji,
मैथिली ठाकुर, मैथिली, ठाकुर मैथिली
```

### Vijay Kumar Sinha (BJP - Lakhisarai)
```
vijay kumar sinha, vijay sinha, vijay kumar, sinha vijay,
lakhisarai, vijay lakhisarai, vk sinha,
विजय कुमार सिन्हा, विजय सिन्हा, विजय कुमार
```

## Notes

- Person classification happens at the API level (server-side)
- Keywords are case-insensitive
- Matches against both page_id and bylines/page_name fields
- Spend values are in lakhs (₹1 L = ₹1,00,000)
- Uses same unified schema as other analytics
- Compatible with existing filters and date ranges
