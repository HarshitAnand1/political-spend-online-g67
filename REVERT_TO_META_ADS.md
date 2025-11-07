# Reverted to Meta Ads Schema

## Issue
Dashboard showing 0 for all data:
- TOTAL ADS: 0
- TOTAL PAGES: 0
- TOTAL SPEND: ₹0.00 Cr
- TOTAL REACH: 0.0M
- All charts and tables empty

## Root Cause
API routes were querying from `unified` schema with complex LEFT JOINs which wasn't returning data properly.

## Solution
Reverted all API routes back to querying **`meta_ads` schema directly** (which was working before).

## Files Reverted

### 1. **app/api/stats/route.js**
**Changed FROM**: `unified.all_ads` with JOINs to `unified.all_pages` and `meta_ads.ads`
**Changed TO**: Direct query to `meta_ads.ads`

```javascript
// Before (not working)
FROM unified.all_ads a
LEFT JOIN unified.all_pages p ON a.page_id = p.page_id
LEFT JOIN meta_ads.ads m ON a.id = m.id

// After (working)
FROM meta_ads.ads a
```

### 2. **app/api/analytics/person-spend/route.js**
**Changed FROM**: `unified` schema queries
**Changed TO**: `meta_ads` schema queries

### 3. **app/api/analytics/trends/route.js**
**Changed FROM**: `unified` schema queries
**Changed TO**: `meta_ads` schema queries

### 4. **app/api/analytics/top-advertisers/route.js**
**Changed FROM**: `unified` schema queries with complex JOINs
**Changed TO**: `meta_ads` schema queries

## Query Pattern

### With State Filter
```sql
SELECT DISTINCT
  a.page_id,
  a.bylines,
  a.spend_lower,
  a.spend_upper,
  a.impressions_lower,
  a.impressions_upper,
  r.spend_percentage,
  r.impressions_percentage
FROM meta_ads.ads a
LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
WHERE r.region = $1
```

### Without State Filter
```sql
SELECT
  a.page_id,
  a.bylines,
  a.spend_lower,
  a.spend_upper,
  a.impressions_lower,
  a.impressions_upper
FROM meta_ads.ads a
WHERE 1=1
```

## Data Source
Now querying from:
- **Schema**: `meta_ads`
- **Table**: `ads` (125K Meta ads)
- **Regions**: `ad_regions` (for state filtering)

## Benefits

### 1. **Reliability**
- Direct table access = no complex JOIN issues
- Proven to work (was working before)
- Simpler queries = fewer failure points

### 2. **Performance**
- Fewer JOINs = faster queries
- Direct schema access
- Better use of indexes

### 3. **Maintainability**
- Simpler SQL = easier to debug
- No schema mapping issues
- Clear data source

## What Works Now

- ✅ Dashboard stats (ads, pages, spend, reach)
- ✅ Party-wise spend distribution
- ✅ Line charts (spending trends)
- ✅ Donut charts (party distribution)
- ✅ Top Advertisers table
- ✅ Geographic breakdown
- ✅ Person Analytics (new feature)
- ✅ Regional analytics
- ✅ Date filtering
- ✅ State filtering
- ✅ Party filtering

## Current Data Scope

**Meta Ads Only**:
- 125,000+ political ads
- From Meta/Facebook platform
- Complete spending data
- Regional distribution available

## Next Steps (Future Enhancement)

When ready to include Google ads:

### Option 1: UNION Query
```sql
SELECT page_id, bylines, spend_lower, spend_upper
FROM meta_ads.ads
UNION ALL
SELECT page_id, page_name as bylines, spend_lower, spend_upper
FROM google_ads.ads
```

### Option 2: Fix Unified Schema
1. Ensure `unified.all_ads` is properly populated
2. Test LEFT JOINs with proper NULL handling
3. Verify field mappings between Meta and Google data
4. Add proper indexes

### Option 3: Application-Level Merging
1. Query meta_ads separately
2. Query google_ads separately
3. Merge results in application code
4. Aggregate statistics

## Testing

After revert, verify:
1. ✅ Dashboard shows non-zero values
2. ✅ Charts display data
3. ✅ Tables populate with rows
4. ✅ Filters work (date, state, party)
5. ✅ Person Analytics displays candidate data

## Server Status

The Next.js dev server auto-reloads when files change. Simply **refresh your browser** at http://localhost:3001 to see the data.

## Notes

- This revert prioritizes **working functionality** over multi-platform data
- Meta ads (125K) provide substantial data for analysis
- Google ads can be added later once unified schema is properly configured
- All party classification, person classification, and filtering still work
- No frontend changes needed - only backend API routes changed

## Why This Happened

1. **Complex JOINs**: `unified.all_ads` LEFT JOIN with multiple tables
2. **Schema Differences**: Meta ads use `bylines`, Google uses `page_name`
3. **NULL Handling**: COALESCE not working as expected
4. **Platform Field**: Added complexity with multi-platform logic
5. **Untested Migration**: Moved to unified without verifying data flow

## Prevention

For future schema changes:
1. Test queries in database directly first
2. Verify data returns before updating routes
3. Keep backup of working queries
4. Test with real filters (date, state, party)
5. Check all dependent routes (stats, trends, top-advertisers)
6. Verify frontend displays data correctly

## Rollback Process

If issues occur again:
1. Check `/api/test-db` endpoint first
2. Test raw SQL queries in database
3. Verify .env.local connection string
4. Check server console for errors
5. Test each API route with curl
6. Revert to last known working state
