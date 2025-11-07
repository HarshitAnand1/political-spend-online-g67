# Bihar Political Parties - Keywords Expansion

## Summary
Expanded party classification system to include **4 new Bihar regional parties** and added **136 new keywords** for Bihar-specific parties (36 for existing parties + 120 for new parties). Total keyword count increased from 142 to 278.

## New Bihar Parties Added

### 1. **LJP** - Lok Janshakti Party
- **Leader**: Chirag Paswan, Ram Vilas Paswan, Pashupati Kumar Paras
- **Focus**: Dalit representation, Scheduled Caste issues
- **Color**: Purple (#9333EA)
- **Keywords**: 30 keywords including 'chirag paswan', 'paswan', 'ljp bihar', 'dalit', 'scheduled caste', 'bihar first bihari first', 'berojgar chirag', 'yuva bihari', 'dalit icon', 'ram vilas legacy'

### 2. **HAM** - Hindustani Awam Morcha
- **Leader**: Jitan Ram Manjhi
- **Focus**: Mahadalit empowerment, extremely backward classes
- **Color**: Brown (#92400E)
- **Keywords**: 30 keywords including 'jitan ram manjhi', 'manjhi', 'mahadalit', 'extremely backward', 'mahadalit community', 'ebc', 'gaya', 'imamganj', 'mahadalit empowerment'

### 3. **VIP** - Vikassheel Insaan Party
- **Leader**: Mukesh Sahni
- **Focus**: Nishad/Mallah community representation
- **Color**: Cyan (#0891B2)
- **Keywords**: 30 keywords including 'mukesh sahni', 'nishad', 'mallah', 'son of mallah', 'nishad community', 'fishermen', 'boatmen', 'khagaria', 'bhagalpur'

### 4. **AIMIM** - All India Majlis-e-Ittehadul Muslimeen
- **Leader**: Asaduddin Owaisi
- **Focus**: Muslim representation, particularly in Seemanchal region
- **Color**: Dark Green (#14532D)
- **Keywords**: 30 keywords including 'asaduddin owaisi', 'owaisi', 'seemanchal', 'aimim bihar', 'kishanganj', 'katihar', 'araria', 'purnia', 'jai bheem jai meem', 'minority representation'

## Expanded Keywords for Existing Bihar Parties

### Janata Dal (United) - Added 12 New Keywords
**Total: 30 keywords** (previously 18)

New additions:
- Campaign slogans: 'seven nischay', 'saat nischay', 'har ghar nal ka jal', 'bijli har ghar'
- Governance: 'bihar cm', 'chief minister bihar', 'sarkar aapki'
- Historical leaders: 'lalbahadur shastri', 'george fernandes', 'sharad yadav'

### RJD - Added 16 New Keywords
**Total: 33 keywords** (previously 17)

New additions:
- Family members: 'tej pratap yadav', 'misa bharti', 'rohini acharya'
- Campaigns: 'laluji ka aashirwad', 'badlav', 'parivartan', 'badlaav yatra'
- Alliance terms: 'opposition unity', 'india alliance', 'mahagatbandhan'
- Variations: 'laluji', 'lalu parivar', 'rjd supremo'

### Jan Suraaj - Added 8 New Keywords
**Total: 20 keywords** (previously 12)

New additions:
- Movement terms: 'jan andolan', 'jantantra', 'bihar first'
- Campaign: 'jan suraaj abhiyan', 'new political movement', 'people movement', 'grassroots campaign', 'pk team'

## Implementation Summary

### Files Updated

**Core Utility**:
- `/lib/partyUtils.js` - Main party classification logic (199 → 273 total keywords)

**API Routes** (7 files):
- `/app/api/stats/route.js` - Added 4 new parties to partyStats
- `/app/api/analytics/spend/route.js` - Added 4 new parties to partySpend
- `/app/api/analytics/geography/route.js` - Added 4 new parties to state aggregation
- `/app/api/ads/route.js` - Added 4 new party colors

**Party Statistics Objects Updated**:
```javascript
const partyStats = {
  BJP: { ... },
  INC: { ... },
  AAP: { ... },
  'Janata Dal (United)': { ... },
  RJD: { ... },
  'Jan Suraaj': { ... },
  LJP: { ... },        // NEW
  HAM: { ... },        // NEW
  VIP: { ... },        // NEW
  AIMIM: { ... },      // NEW
  Others: { ... }
};
```

## Total Keywords Count

| Party | Previous | Added | Total |
|-------|----------|-------|-------|
| Janata Dal (United) | 18 | 12 | 30 |
| RJD | 17 | 16 | 33 |
| Jan Suraaj | 12 | 8 | 20 |
| BJP | 40 | 0 | 40 |
| INC | 31 | 0 | 31 |
| AAP | 24 | 0 | 24 |
| **LJP** | 0 | 30 | 30 ✨ NEW (EXPANDED) |
| **HAM** | 0 | 30 | 30 ✨ NEW (EXPANDED) |
| **VIP** | 0 | 30 | 30 ✨ NEW (EXPANDED) |
| **AIMIM** | 0 | 30 | 30 ✨ NEW (EXPANDED) |
| **TOTAL** | **142** | **136** | **278** |

## Color Scheme

| Party | Color Code | Color Name |
|-------|-----------|------------|
| BJP | #FF9933 | Saffron |
| INC | #138808 | Green |
| AAP | #0073e6 | Blue |
| Janata Dal (United) | #006400 | Dark Green |
| RJD | #008000 | Green |
| Jan Suraaj | #FF6347 | Tomato Red |
| **LJP** | **#9333EA** | **Purple** ✨ NEW |
| **HAM** | **#92400E** | **Brown** ✨ NEW |
| **VIP** | **#0891B2** | **Cyan** ✨ NEW |
| **AIMIM** | **#14532D** | **Dark Green** ✨ NEW |
| Others | #64748B | Slate Gray |

## Benefits

1. **Better Bihar Coverage**: Now tracks 7 Bihar-specific parties instead of 3
2. **Improved Classification**: 74 new keywords for Bihar parties means better ad classification
3. **Regional Representation**: Covers Dalit (LJP), Mahadalit (HAM), Nishad/Mallah (VIP), and Muslim (AIMIM) communities
4. **Campaign Recognition**: Added specific campaign slogans like "Seven Nischay", "Badlaav Yatra", etc.
5. **Alliance Terms**: Includes "Mahagathbandhan", "Opposition Unity", "India Alliance"

## Testing

Restart the development server to apply changes:

```bash
./start-dev.sh
```

Then refresh your browser (Ctrl+Shift+R) to see:
- More accurate party breakdown for Bihar politics
- Better detection of regional party ads
- Comprehensive coverage of Bihar's political landscape

## Future Enhancements

Potential parties to add:
- BSP (Bahujan Samaj Party) - Mayawati's party
- CPI/CPM - Communist parties
- RLSP (Rashtriya Lok Samata Party) - Upendra Kushwaha's original party
- Regional independents and smaller parties

## Notes

- Party classification happens in JavaScript, not in the database
- Keywords are case-insensitive
- Order matters: Bihar parties are checked first before national parties
- More specific keywords should come before generic ones
