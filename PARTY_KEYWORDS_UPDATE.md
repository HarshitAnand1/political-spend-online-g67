# Party Keywords Update

## Summary
Updated party classification system with comprehensive keywords including campaign slogans, leader names, and party-specific terms.

## Changes Made

### 1. Party Name Update
- **Old**: `JD(U)`
- **New**: `Janata Dal (United)`
- Updated across all API routes and components

### 2. Enhanced Keywords Added

#### BJP (94 total keywords)
- **Leaders**: Modi, Amit Shah, Yogi Adityanath, JP Nadda, Rajnath Singh, Nitin Gadkari, Sushil Modi, Ravi Shankar Prasad, Giriraj Singh
- **Campaigns**: "Sabka Saath Sabka Vikas", "Viksit Bharat", "Atmanirbhar Bharat", "Abki Baar Modi Sarkar", "Double Engine"
- **Symbols/Terms**: Lotus (Kamal), Saffron, Hindutva, Ram Mandir, Ayodhya
- **Organizations**: BJP, NDA, BJYM, Yuva Morcha

#### Congress/INC (33 total keywords)
- **Leaders**: Rahul Gandhi, Sonia Gandhi, Priyanka Gandhi, Mallikarjun Kharge, Indira Gandhi, Rajiv Gandhi, Manmohan Singh
- **Campaigns**: "Bharat Jodo", "Nyay", "Garibi Hatao"
- **Symbols/Terms**: Hand symbol, Secular/Secularism
- **Organizations**: AICC, Youth Congress, NSUI, Sevadal, PCC, DPCC

#### AAP (24 total keywords)
- **Leaders**: Arvind Kejriwal, Manish Sisodia, Atishi, Sanjay Singh, Raghav Chadha
- **Campaigns**: "Delhi Model", "Free Electricity", "Education Revolution", "Mohalla Clinic"
- **Symbols/Terms**: Broom (Jhadu), Aam Aadmi (Common Man)
- **Terms**: Anti-corruption, Lokpal

#### Janata Dal (United) - 19 total keywords
- **Leaders**: Nitish Kumar, Upendra Kushwaha
- **Campaigns**: "Sushasan", "Vikas Yatra"
- **Terms**: CM Nitish, Samata Party, NDA Bihar
- **Variations**: JDU, JD(U), JD (U), Janata Dal United

#### RJD (17 total keywords)
- **Leaders**: Lalu Prasad Yadav, Tejashwi Yadav, Rabri Devi
- **Terms**: Social Justice, Mandal Commission, Backward Classes, Mahagathbandhan (Grand Alliance)

#### Jan Suraaj (12 total keywords)
- **Leaders**: Prashant Kishor (PK)
- **Campaigns**: "Baat Bihar Ki"
- **Terms**: Political Strategist

## Files Updated

### Backend (API Routes)
- `/app/api/stats/route.js`
- `/app/api/ads/route.js`
- `/app/api/analytics/spend/route.js`
- `/app/api/analytics/geography/route.js`
- `/app/api/analytics/trends/route.js`
- `/app/api/analytics/top-advertisers/route.js`
- `/app/api/analytics/regions/route.js`

### Frontend (Components)
- `/components/Dashboard/index.jsx`
- `/components/Dashboard/Charts.jsx`
- `/components/Dashboard/FiltersPanel.jsx`
- `/components/Dashboard/RegionalAnalytics.jsx`
- `/components/Dashboard/GeographicBreakdown.jsx`
- `/components/Dashboard/TopAdvertisers.jsx`

### Core Utility
- `/lib/partyUtils.js` - Main party classification logic

## Impact
- **Better Classification**: More accurate party detection with expanded keyword matching
- **Campaign Recognition**: Ads with campaign slogans now correctly classified
- **Leader Recognition**: Mentions of party leaders now trigger correct classification
- **Consistent Naming**: "Janata Dal (United)" used uniformly across entire application

## Testing
Restart the development server to see the improved party classification in action:

```bash
./start-dev.sh
```

The dashboard should now show more accurate party breakdowns with improved keyword matching.
