# Explorer View and Geographic Distribution Fix

## Issues Fixed

### Issue 1: Geographic Distribution Showing "No data available"
**Problem**: The "Geographic Distribution" section in the Dashboard was showing "No data available"

**Root Cause**: The geography API ([app/api/analytics/geography/route.js](app/api/analytics/geography/route.js)) was using the `unified` schema with complex LEFT JOINs, which was not returning data properly.

**Solution**: Reverted to `meta_ads` schema for direct, reliable queries.

### Issue 2: Explorer View Showing "0 ads"
**Problem**: The Explorer view was showing "Showing 0 ads" with no ad cards displayed

**Root Cause**: Two issues in [app/api/ads/route.js](app/api/ads/route.js):
1. Using `unified` schema with complex LEFT JOINs (not returning data)
2. Line 189 had a filter: `.filter(ad => ad.party !== 'Others')` which excluded all ads not classified into the 10 tracked parties

**Solution**:
1. Reverted to `meta_ads` schema
2. Removed the filter that excluded 'Others' party

## Changes Made

### 1. [app/api/analytics/geography/route.js](app/api/analytics/geography/route.js)

#### Before (Lines 14-32):
```javascript
// Use ad_regions table for accurate state data (Meta ads only for now)
let queryText = `
  SELECT
    r.region as state_name,
    a.page_id,
    COALESCE(m.bylines, p.page_name, '') as bylines,
    a.spend_lower,
    a.spend_upper,
    a.impressions_lower,
    a.impressions_upper,
    a.platform,
    r.spend_percentage,
    r.impressions_percentage
  FROM unified.all_ads a
  LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
  LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
  LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
  WHERE r.region IS NOT NULL
`;
```

#### After:
```javascript
// Use ad_regions table for accurate state data from meta_ads
let queryText = `
  SELECT
    r.region as state_name,
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
  WHERE r.region IS NOT NULL
`;
```

**Key Changes**:
- ✅ Removed `unified.all_ads` and complex JOINs
- ✅ Query directly from `meta_ads.ads`
- ✅ Use `a.bylines` directly instead of COALESCE
- ✅ Simplified JOIN with only `meta_ads.ad_regions`

### 2. [app/api/ads/route.js](app/api/ads/route.js) - Query Rewrite

#### Before (Lines 27-80):
```javascript
// Optimized state filtering using ad_regions JOIN (Meta ads only for now)
if (state && state !== 'All India') {
  queryText = `
    SELECT DISTINCT
      a.id, a.page_id, COALESCE(m.bylines, p.page_name, '') as bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
      a.ad_delivery_stop_time, a.currency, m.target_locations, m.publisher_platforms,
      a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
      m.estimated_audience_size_lower, m.estimated_audience_size_upper, a.platform,
      r.spend_percentage, r.impressions_percentage
    FROM unified.all_ads a
    LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
    LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
    LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id AND a.platform = 'Meta'
    WHERE (r.region = $${paramCount} OR a.platform != 'Meta')
  `;
  // ...
}
```

#### After:
```javascript
// Query from meta_ads schema for state filtering
if (state && state !== 'All India') {
  queryText = `
    SELECT DISTINCT
      a.id, a.page_id, a.bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
      a.ad_delivery_stop_time, a.currency, a.target_locations, a.publisher_platforms,
      a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
      a.estimated_audience_size_lower, a.estimated_audience_size_upper,
      r.spend_percentage, r.impressions_percentage
    FROM meta_ads.ads a
    LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
    WHERE r.region = $${paramCount}
  `;
  // ...
}
```

**Key Changes**:
- ✅ All three query branches (state filter, states array, default) now use `meta_ads` schema
- ✅ Removed complex LEFT JOINs with `unified.all_pages`
- ✅ Direct field access: `a.bylines`, `a.target_locations`, etc.

### 3. [app/api/ads/route.js](app/api/ads/route.js) - Search Filter Fix

#### Before (Lines 106-115):
```javascript
if (search) {
  // Search in bylines (via COALESCE of m.bylines/page_name) and page_id
  if (useStateJoin) {
    queryText += ` AND (COALESCE(m.bylines, p.page_name, '') ILIKE $${paramCount} OR CAST(a.page_id AS TEXT) ILIKE $${paramCount})`;
  } else {
    queryText += ` AND (COALESCE(m.bylines, p.page_name, '') ILIKE $${paramCount} OR CAST(a.page_id AS TEXT) ILIKE $${paramCount})`;
  }
  params.push(`%${search}%`);
  paramCount++;
}
```

#### After:
```javascript
if (search) {
  // Search in bylines and page_id
  queryText += ` AND (a.bylines ILIKE $${paramCount} OR CAST(a.page_id AS TEXT) ILIKE $${paramCount})`;
  params.push(`%${search}%`);
  paramCount++;
}
```

**Key Changes**:
- ✅ Simplified search to use `a.bylines` directly
- ✅ Removed COALESCE and page_name reference
- ✅ Removed unnecessary conditional branches

### 4. [app/api/ads/route.js](app/api/ads/route.js) - Remove 'Others' Filter

#### Before (Line 189):
```javascript
  };
}).filter(ad => ad.party !== 'Others'); // Only show classified ads (BJP, INC, AAP)
```

#### After:
```javascript
  };
}); // Show all ads including 'Others'
```

**Key Changes**:
- ✅ Removed filter that excluded 'Others' party
- ✅ Now shows all ads regardless of party classification

## Expected Results

### Geographic Distribution
The "Geographic Distribution" section should now display:
- ✅ Top 10 states/UTs by spending
- ✅ State names (Bihar, Delhi, Maharashtra, etc.)
- ✅ Spending amounts per state
- ✅ Dominant party per state
- ✅ Percentage of total spend

### Explorer View
The Explorer view should now show:
- ✅ Ads from all 10 parties (BJP, INC, AAP, JD(U), RJD, Jan Suraaj, LJP, HAM, VIP, AIMIM)
- ✅ Ads classified as "Others"
- ✅ Total count: Should show 50 ads (default limit)
- ✅ Ad cards with party badges, spend, impressions
- ✅ Working filters (date, party, state)
- ✅ Working search functionality
- ✅ Sort by date or spend

## Testing

### Test Geographic Distribution:
1. Refresh browser at http://localhost:3001
2. Navigate to Dashboard View
3. Scroll to "Geographic Distribution" section
4. Should show top 10 states with spending data

### Test Explorer View:
1. Click on "Explorer View" tab
2. Should see "Showing 50 ads" (or actual count)
3. Should see ad cards displayed in a grid
4. Try filters:
   - Date: Last 24 hours, Last 7 days, Last 30 days
   - Party: Check specific party checkboxes
   - State: Select a state
5. Try search: Type in party name or candidate name
6. Try sorting: Toggle between "Most Recent" and "Highest Spend"

## Data Source

Both APIs now query from:
- **Schema**: `meta_ads`
- **Main Table**: `ads` (125,000+ ads)
- **Regions Table**: `ad_regions` (for state/geographic filtering)

## Consistency with Other APIs

These changes align with the schema revert done previously for:
- ✅ [app/api/stats/route.js](app/api/stats/route.js) - Dashboard statistics
- ✅ [app/api/analytics/trends/route.js](app/api/analytics/trends/route.js) - Spending trends
- ✅ [app/api/analytics/top-advertisers/route.js](app/api/analytics/top-advertisers/route.js) - Top advertisers
- ✅ [app/api/analytics/person-spend/route.js](app/api/analytics/person-spend/route.js) - Person analytics

**All API routes now consistently use the `meta_ads` schema** for reliable data access.

## Files Modified

1. **[app/api/analytics/geography/route.js](app/api/analytics/geography/route.js)**
   - Lines 14-32: Simplified query to use `meta_ads` schema

2. **[app/api/ads/route.js](app/api/ads/route.js)**
   - Lines 27-74: Rewrote all three query branches to use `meta_ads`
   - Lines 100-105: Simplified search filter
   - Line 189: Removed filter that excluded 'Others' party

## Performance Impact

**Positive impacts**:
- ✅ Faster queries (simpler, fewer JOINs)
- ✅ More reliable (direct access to source data)
- ✅ Reduced query complexity
- ✅ Better database query plan optimization

**Trade-offs**:
- ⚠️ Currently showing only Meta ads (not Google ads)
- ⚠️ Future enhancement: Add Google ads from unified schema once schema issues are resolved

## Future Enhancements

1. **Multi-platform support**: Once unified schema is properly configured, add Google ads
2. **Caching**: Add caching for geography data (like stats API)
3. **Pagination**: Implement proper pagination in Explorer view
4. **Advanced filters**: Add more filter options (spend range, impressions range)

## Related Documentation

- [REVERT_TO_META_ADS.md](REVERT_TO_META_ADS.md) - Previous schema migration
- [TOP_ADVERTISERS_FIX.md](TOP_ADVERTISERS_FIX.md) - Top advertisers fix
- [SETUP.md](SETUP.md) - Local setup guide
