// Party classification utility
// Maps page_id and bylines to known political parties

// Order matters: Check more specific parties first (JD(U), RJD) before generic ones (BJP)
const PARTY_KEYWORDS = {
  'JD(U)': [
    'janata dal united',
    'janata dal (united)',
    'jd(u)',
    'jdu',
    'jd (u)',
    'nitish kumar',
    'nitish',
    'janata dal',
    'jd united',
    'jdu bihar',
    'janata dal u'
  ],
  RJD: [
    'rashtriya janata dal',
    'rjd',
    'lalu prasad',
    'lalu yadav',
    'tejashwi yadav',
    'tejashwi',
    'rashtriya janata',
    'rjd bihar',
    'lalu'
  ],
  'Jan Suraaj': [
    'jan suraaj',
    'jan suraj',
    'jansuraaj',
    'jansuraj',
    'prashant kishor',
    'prashant',
    'kishor',
    'jan suraaj party',
    'jan suraj party'
  ],
  BJP: [
    'bharatiya janata party',
    'bjp',
    'narendra modi',
    'modi',
    'amit shah',
    'yogi adityanath',
    'namo',
    'lotus', // BJP symbol
    'saffron',
    'hindutva'
  ],
  INC: [
    'indian national congress',
    'congress',
    'inc',
    'rahul gandhi',
    'sonia gandhi',
    'priyanka gandhi',
    'hand', // Congress symbol
    'aicc'
  ],
  AAP: [
    'aam aadmi party',
    'aap',
    'arvind kejriwal',
    'kejriwal',
    'broom', // AAP symbol
    'aam aadmi',
    'common man'
  ]
};

/**
 * Classify an ad to a political party based on page_id and bylines
 * @param {string} pageId - The page_id from the database
 * @param {string} bylines - The bylines text from the database
 * @returns {string} - Party code: 'BJP', 'INC', 'AAP', or 'Others'
 */
export function classifyParty(pageId, bylines) {
  if (!pageId && !bylines) return 'Others';
  
  const searchText = `${pageId || ''} ${bylines || ''}`.toLowerCase();
  
  // Check each party's keywords
  for (const [party, keywords] of Object.entries(PARTY_KEYWORDS)) {
    if (keywords.some(keyword => searchText.includes(keyword))) {
      return party;
    }
  }
  
  return 'Others';
}

/**
 * Get party display name
 * @param {string} partyCode - Party code (BJP, INC, AAP, JD(U), RJD, Jan Suraj, Others)
 * @returns {string} - Full party name
 */
export function getPartyName(partyCode) {
  const names = {
    BJP: 'Bharatiya Janata Party',
    INC: 'Indian National Congress',
    AAP: 'Aam Aadmi Party',
    'JD(U)': 'Janata Dal (United)',
    RJD: 'Rashtriya Janata Dal',
    'Jan Suraaj': 'Jan Suraaj Party',
    Others: 'Others'
  };
  return names[partyCode] || partyCode;
}

/**
 * Get party color for UI display
 * @param {string} partyCode - Party code
 * @returns {string} - Hex color code
 */
export function getPartyColor(partyCode) {
  const colors = {
    BJP: '#FF9933',      // Saffron
    INC: '#138808',      // Green
    AAP: '#0073e6',      // Blue
    'JD(U)': '#006400',  // Dark Green
    RJD: '#008000',      // Green
    'Jan Suraaj': '#FF6347', // Tomato Red
    Others: '#64748B'    // Slate Gray
  };
  return colors[partyCode] || '#64748B';
}

/**
 * Format currency with appropriate unit (₹, L, Cr)
 * @param {number} amount - Amount in rupees
 * @returns {string} - Formatted string like "₹500", "₹2.5 L", "₹15.6 Cr"
 */
export function formatCurrency(amount) {
  if (!amount || amount === 0) return '₹0';
  
  const absAmount = Math.abs(amount);
  
  // Less than 1 lakh - show in rupees
  if (absAmount < 100000) {
    return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  }
  
  // Less than 1 crore - show in lakhs
  if (absAmount < 10000000) {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)} L`;
  }
  
  // 1 crore or more - show in crores
  const crores = amount / 10000000;
  return `₹${crores.toFixed(2)} Cr`;
}

/**
 * Get spend range text with smart formatting
 * @param {number} lower - Lower bound
 * @param {number} upper - Upper bound
 * @returns {string} - Formatted range like "₹0L - ₹0L" or "₹2.5 L - ₹5 L"
 */
export function formatSpendRange(lower, upper) {
  if (!lower && !upper) return '₹0L - ₹0L';
  
  const lowerVal = lower || 0;
  const upperVal = upper || 0;
  
  return `${formatCurrency(lowerVal)} - ${formatCurrency(upperVal)}`;
}

/**
 * Extract state/region from target_locations JSON
 * @param {string} targetLocations - JSON string of target locations
 * @returns {string[]} - Array of state names
 */
export function extractStates(targetLocations) {
  if (!targetLocations) return [];
  
  try {
    const locations = JSON.parse(targetLocations);
    const states = new Set();
    
    if (Array.isArray(locations)) {
      locations.forEach(loc => {
        if (loc.name) {
          // Extract state name (assuming format like "State, Country" or just "State")
          const parts = loc.name.split(',');
          if (parts.length > 0) {
            states.add(parts[0].trim());
          }
        }
      });
    }
    
    return Array.from(states);
  } catch (e) {
    return [];
  }
}
