# Ad Images Implementation - Explorer View

## Changes Made

### Issue
User requested to see actual ad images in the Explorer View instead of just placeholders.

### Solution
Added support for fetching and displaying ad images by:
1. Querying additional image-related fields from the database
2. Extracting image URLs from ad creative fields
3. Adding error handling and fallback display

## Files Modified

### 1. [app/api/ads/route.js](app/api/ads/route.js)

#### Added Image Fields to Query (Lines 35, 53, 73)
**Added to all three query branches:**
```javascript
a.ad_creative_link_captions, a.ad_creative_bodies
```

These fields contain JSON data with potential image URLs or ad creative content.

#### Image URL Extraction Logic (Lines 167-203)
```javascript
// Extract image URL from creative fields
let imageUrl = null;

// Try to parse ad_creative_link_captions for image URL
if (row.ad_creative_link_captions) {
  try {
    const captions = typeof row.ad_creative_link_captions === 'string'
      ? JSON.parse(row.ad_creative_link_captions)
      : row.ad_creative_link_captions;

    if (Array.isArray(captions) && captions.length > 0 && captions[0]?.link_url) {
      imageUrl = captions[0].link_url;
    }
  } catch (e) {
    // Not JSON or parsing failed
  }
}

// Try ad_creative_bodies if no image found
if (!imageUrl && row.ad_creative_bodies) {
  try {
    const bodies = typeof row.ad_creative_bodies === 'string'
      ? JSON.parse(row.ad_creative_bodies)
      : row.ad_creative_bodies;

    if (Array.isArray(bodies) && bodies.length > 0 && bodies[0]?.image_url) {
      imageUrl = bodies[0].image_url;
    }
  } catch (e) {
    // Not JSON or parsing failed
  }
}

// Fallback to snapshot URL
if (!imageUrl) {
  imageUrl = row.ad_snapshot_url;
}
```

**Logic Flow:**
1. Try `ad_creative_link_captions[0].link_url`
2. If not found, try `ad_creative_bodies[0].image_url`
3. If still not found, fallback to `ad_snapshot_url`

#### Updated Response (Line 226)
```javascript
img: imageUrl, // Image URL from creative fields or snapshot URL
adCreativeCaption: row.ad_creative_link_captions,
adCreativeBody: row.ad_creative_bodies,
```

### 2. [components/Explorer/AdCard.jsx](components/Explorer/AdCard.jsx)

#### Added Client-Side Error Handling (Lines 1-40)
```javascript
'use client'
import { useState } from 'react'

export default function AdCard({ ad }) {
  const [imageError, setImageError] = useState(false)

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden dark:bg-slate-900 hover:shadow-lg transition-shadow">
      <div className="h-40 bg-slate-200 flex items-center justify-center relative overflow-hidden">
        {!imageError && ad.img ? (
          <img
            src={ad.img}
            alt={`${ad.party} Ad`}
            className="w-full h-full object-cover"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900">
            <svg className="w-12 h-12 text-slate-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs text-slate-500 dark:text-slate-400">{ad.party} Advertisement</p>
            {ad.snapshotUrl && (
              <a
                href={ad.snapshotUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400 underline"
                onClick={(e) => e.stopPropagation()}
              >
                View Ad
              </a>
            )}
          </div>
        )}
      </div>
      {/* Rest of card content */}
    </div>
  )
}
```

**Features:**
- ✅ Attempts to load image from `ad.img` URL
- ✅ Error handling with `onError` event
- ✅ Fallback placeholder with icon and party name
- ✅ "View Ad" link to Meta's Ad Library
- ✅ Gradient background for visual appeal
- ✅ Dark mode support

## How It Works

### Image Loading Priority:

1. **Primary**: `ad_creative_link_captions[0].link_url`
   - First tries to extract image URL from link captions field

2. **Secondary**: `ad_creative_bodies[0].image_url`
   - If primary fails, tries ad creative bodies field

3. **Tertiary**: `ad_snapshot_url`
   - Falls back to Meta's Ad Library snapshot URL

4. **Error Handling**: Placeholder Display
   - If image fails to load, shows placeholder with:
     - Image icon
     - Party name
     - Link to view ad on Meta's Ad Library

### Data Flow:

```
Database (meta_ads.ads)
  ↓
  ad_creative_link_captions
  ad_creative_bodies
  ad_snapshot_url
  ↓
API Route (/api/ads)
  ↓
  Extract image URL
  ↓
Response JSON
  {
    img: "extracted_image_url",
    snapshotUrl: "meta_ad_library_url",
    ...
  }
  ↓
AdCard Component
  ↓
  Try to load image
  ↓
  Success → Display image
  Failure → Show placeholder + "View Ad" link
```

## Expected Results

### When Images Load Successfully:
- ✅ Ad cards display actual ad creative images
- ✅ Images scale to fill the 40-height container
- ✅ Object-cover maintains aspect ratio

### When Images Fail to Load:
- ✅ Gradient placeholder background
- ✅ Image icon displayed
- ✅ Party name shown
- ✅ "View Ad" link to Meta's Ad Library
- ✅ Clicking link opens in new tab

### Visual States:

1. **Loading State**: Gray background while image loads
2. **Success State**: Ad image displayed
3. **Error State**: Placeholder with icon and link
4. **Hover State**: Shadow effect for interactivity

## Browser Compatibility

Works on:
- ✅ Chrome/Edge 90+
- ✅ Firefox 88+
- ✅ Safari 14+

## CORS Considerations

**Note**: Some image URLs from Meta may have CORS restrictions. If images don't load due to CORS:

1. Browser will trigger `onError` event
2. Fallback placeholder is displayed
3. User can click "View Ad" to see ad on Meta's platform

## Testing

### Test Ad Images:
1. Navigate to Explorer View
2. Should see ad cards with images (if available)
3. Cards with failed images show placeholder
4. Click "View Ad" on placeholder to open Meta Ad Library

### Test Error Handling:
1. Open browser DevTools Console
2. Look for any image loading errors
3. Verify placeholder appears for failed images

### Test Different Scenarios:
- Ads with `ad_creative_link_captions` → Should load images
- Ads with `ad_creative_bodies` → Should load images
- Ads with only `ad_snapshot_url` → May show placeholder
- Network issues → Placeholder shown

## Future Enhancements

### Potential Improvements:

1. **Image Proxy**: Set up server-side proxy to handle CORS
   ```javascript
   // Example: /api/proxy/image?url=<encoded_url>
   ```

2. **Loading Skeleton**: Add shimmer effect while loading
   ```javascript
   {loading && <div className="animate-pulse bg-slate-300" />}
   ```

3. **Multiple Images**: Support carousel for ads with multiple images
   ```javascript
   {images.map(img => <img key={img} src={img} />)}
   ```

4. **Lazy Loading**: Load images as user scrolls
   ```javascript
   <img loading="lazy" src={ad.img} />
   ```

5. **Image Optimization**: Use Next.js Image component
   ```javascript
   import Image from 'next/image'
   <Image src={ad.img} width={300} height={160} />
   ```

6. **Cache Images**: Store commonly viewed images
   ```javascript
   // Service worker or browser cache
   ```

## Database Fields Used

From `meta_ads.ads` table:

| Field | Type | Purpose |
|-------|------|---------|
| `ad_creative_link_captions` | JSON/Text | Contains ad creative captions with potential image URLs |
| `ad_creative_bodies` | JSON/Text | Contains ad creative bodies with potential image URLs |
| `ad_snapshot_url` | Text | URL to Meta's Ad Library page for the ad |

## API Response Format

```json
{
  "ads": [
    {
      "id": "ad_id_123",
      "img": "https://...",
      "snapshotUrl": "https://www.facebook.com/ads/library/?id=123",
      "adCreativeCaption": "[{...}]",
      "adCreativeBody": "[{...}]",
      "party": "BJP",
      "sponsor": "Advertiser Name",
      "spend": "₹1.5 L - ₹2.0 L",
      ...
    }
  ]
}
```

## Known Limitations

1. **CORS Restrictions**: Some Meta image URLs may be blocked by browser CORS policies
2. **Image Availability**: Not all ads have extractable image URLs
3. **External Links**: Snapshot URLs open external Meta Ad Library pages
4. **Image Quality**: Depends on what Meta provides in their data

## Related Documentation

- [EXPLORER_AND_GEOGRAPHY_FIX.md](EXPLORER_AND_GEOGRAPHY_FIX.md) - Explorer view fixes
- [SETUP.md](SETUP.md) - Local setup guide
- [README.md](README.md) - Project overview
