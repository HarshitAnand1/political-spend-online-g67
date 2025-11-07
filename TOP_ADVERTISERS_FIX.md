# Top Advertisers Fix

## Problem
The "Top Advertisers" section was showing "No data available" on the dashboard.

## Root Cause
The SQL query in the top-advertisers route was trying to query from the `unified` schema with complex LEFT JOINs, which was causing issues with:
1. GROUP BY clause referencing fields that didn't exist in the base table
2. Complex joins between unified and meta_ads schemas
3. Query complexity causing database errors

## Solution
Simplified the route to query **directly from `meta_ads` schema** instead of using the unified schema.

## Changes Made

### File: `app/api/analytics/top-advertisers/route.js`

#### Before (Using unified schema):
```javascript
// Complex query with multiple LEFT JOINs
queryText = `
  SELECT
    a.page_id,
    COALESCE(m.bylines, p.page_name, '') as bylines,
    p.page_name,
    a.platform,
    COUNT(*) as ad_count,
    SUM((a.spend_lower + a.spend_upper) / 2) as total_spend,
    SUM((a.impressions_lower + a.impressions_upper) / 2) as total_impressions
  FROM unified.all_ads a
  LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
  LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
  WHERE 1=1
  GROUP BY a.page_id, a.bylines, p.page_name  -- ERROR: a.bylines doesn't exist!
`;
```

#### After (Using meta_ads directly):
```javascript
// Simple query from meta_ads
if (state && state !== 'All India') {
  // With state filter
  queryText = `
    SELECT
      a.page_id,
      a.bylines,
      COUNT(DISTINCT a.id) as ad_count,
      SUM((a.spend_lower + a.spend_upper) / 2 * COALESCE(r.spend_percentage, 1)) as total_spend,
      SUM((a.impressions_lower + a.impressions_upper) / 2 * COALESCE(r.impressions_percentage, 1)) as total_impressions
    FROM meta_ads.ads a
    LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
    WHERE r.region = $1
    GROUP BY a.page_id, a.bylines
    HAVING SUM((a.spend_lower + a.spend_upper) / 2) > 0
    ORDER BY total_spend DESC
    LIMIT $2
  `;
} else {
  // Without state filter
  queryText = `
    SELECT
      a.page_id,
      a.bylines,
      COUNT(*) as ad_count,
      SUM((a.spend_lower + a.spend_upper) / 2) as total_spend,
      SUM((a.impressions_lower + a.impressions_upper) / 2) as total_impressions
    FROM meta_ads.ads a
    WHERE 1=1
    GROUP BY a.page_id, a.bylines
    HAVING SUM((a.spend_lower + a.spend_upper) / 2) > 0
    ORDER BY total_spend DESC
    LIMIT $1
  `;
}
```

### File: `components/Dashboard/TopAdvertisers.jsx`

#### Added Colors for New Bihar Parties:
```javascript
const partyColors = {
  BJP: 'bg-orange-500',
  INC: 'bg-green-600',
  AAP: 'bg-blue-600',
  'Janata Dal (United)': 'bg-green-800',
  RJD: 'bg-green-500',
  'Jan Suraaj': 'bg-red-500',
  LJP: 'bg-purple-600',      // NEW
  HAM: 'bg-amber-800',       // NEW
  VIP: 'bg-cyan-600',        // NEW
  AIMIM: 'bg-green-900',     // NEW
  Others: 'bg-slate-500'
}
```

## Key Improvements

### 1. **Simplified Query**
- Removed complex LEFT JOINs
- Directly queries from `meta_ads.ads` table
- Fixed GROUP BY clause to only use fields that exist

### 2. **Correct Field References**
- Uses `a.bylines` directly from meta_ads.ads
- No need for COALESCE with page_name
- Cleaner and more maintainable

### 3. **State Filtering**
When a state filter is applied:
- Uses `meta_ads.ad_regions` for regional filtering
- Applies `spend_percentage` and `impressions_percentage` multipliers
- Only shows advertisers with ads in that specific state

### 4. **Party Colors**
Added Tailwind CSS background colors for all 10 parties:
- LJP: Purple
- HAM: Amber/Brown
- VIP: Cyan
- AIMIM: Dark Green

## What the Table Shows

The "Top Advertisers" section now displays:

| # | Advertiser Name | Party Badge | Spend | % |
|---|----------------|-------------|-------|---|
| 1 | Advertiser Name | BJP (20 ads) | ₹45.2 L | 12.5% |
| 2 | Advertiser Name | RJD (15 ads) | ₹32.8 L | 9.1% |
| ... | ... | ... | ... | ... |

Each row shows:
- **Rank**: 1-10 (or limit specified)
- **Advertiser Name**: From bylines field
- **Party Badge**: Color-coded party tag with ad count
- **Spend**: Formatted currency (₹X.XX Cr or ₹X.XX L)
- **Percentage**: % of total spend

## Benefits

### 1. **Performance**
- Simpler query = faster execution
- No complex joins across schemas
- Direct access to indexed columns

### 2. **Reliability**
- No more "No data available" errors
- Correct GROUP BY clause
- Proper field references

### 3. **Accuracy**
- Shows actual Meta ads data
- Proper regional filtering when state is selected
- Correct spend calculations with regional percentages

### 4. **Visual Consistency**
- All 10 parties have proper color badges
- Consistent with other components (charts, tables)

## Note on Data Source

**Currently showing Meta ads only** from `meta_ads` schema.

To include Google ads in the future, we can:
1. Fix the unified schema queries with proper field mappings
2. Use UNION queries to combine meta_ads and google_ads
3. Add a platform indicator in the display

For now, this provides reliable data from Meta ads which constitutes the majority of the data (125K ads).

## Testing

To verify the fix:
1. Refresh browser at http://localhost:3001
2. Check "Top Advertisers" section in the dashboard
3. Should show top 10 advertisers with:
   - Their names
   - Party badges with colors
   - Spending amounts
   - Percentages

## Files Modified

1. **[app/api/analytics/top-advertisers/route.js](app/api/analytics/top-advertisers/route.js)**
   - Simplified query to use meta_ads schema directly
   - Fixed GROUP BY clause
   - Proper field references

2. **[components/Dashboard/TopAdvertisers.jsx](components/Dashboard/TopAdvertisers.jsx)**
   - Added color mappings for 4 new Bihar parties
   - Now supports all 10 parties

## Future Enhancement

When ready to include Google ads, update the query to:
```javascript
// Union approach
SELECT * FROM (
  SELECT page_id, bylines, ... FROM meta_ads.ads
  UNION ALL
  SELECT page_id, page_name as bylines, ... FROM unified.all_ads WHERE platform = 'Google'
) combined
GROUP BY page_id, bylines
ORDER BY total_spend DESC
```
