// Party classification utility
// Maps page_id and bylines to known political parties

// Order matters: Check most specific Bihar parties first, then national parties
const PARTY_KEYWORDS = {
  'Janata Dal (United)': [
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
    'janata dal u',
    'nitishkumar',
    'cm nitish',
    'sushasan',
    'sushashan',
    'vikas yatra',
    'nda bihar',
    'samata party',
    'upendra kushwaha',
    'jdu president',
    'bihar cm',
    'chief minister bihar',
    'sarkar aapki',
    'seven nischay',
    'saat nischay',
    'har ghar nal ka jal',
    'bijli har ghar',
    'lalbahadur shastri',
    'george fernandes',
    'sharad yadav',
    'rkjdu'
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
    'lalu',
    'tejaswi',
    'rabri devi',
    'social justice',
    'mandal commission',
    'backward classes',
    'yadav',
    'mahagathbandhan',
    'maha gathbandhan',
    'grand alliance',
    'laluji',
    'laluji ka aashirwad',
    'jungle raj',
    'badlav',
    'parivartan',
    'badlaav yatra',
    'opposition unity',
    'india alliance',
    'samajwadi',
    'tej pratap',
    'tej pratap yadav',
    'misa bharti',
    'rohini acharya',
    'mahagatbandhan',
    'rjd supremo',
    'lalu parivar'
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
    'jan suraj party',
    'pk',
    'baat bihar ki',
    'political strategist',
    'jan andolan',
    'jantantra',
    'bihar first',
    'jan suraaj abhiyan',
    'new political movement',
    'people movement',
    'grassroots campaign',
    'pk team'
  ],
  'LJP': [
    'lok janshakti party',
    'ljp',
    'ram vilas paswan',
    'paswan',
    'chirag paswan',
    'chirag',
    'pashupati kumar paras',
    'paras',
    'ljp ram vilas',
    'dalit',
    'scheduled caste',
    'chirag ljp',
    'paswan parivar',
    'lok janshakti',
    'ljp bihar',
    'chirag paswan ljp',
    'bihar first bihari first',
    'berojgar chirag',
    'yuva bihari',
    'dalit icon',
    'dalit leader',
    'sc community',
    'ram vilas legacy',
    'ljp national president',
    'pashupati paras',
    'ljp faction',
    'uncle chirag',
    'jitan ram',
    'paswan ji',
    'chirag ki sena',
    'jamui',
    'hajipur'
  ],
  'HAM': [
    'hindustani awam morcha',
    'ham',
    'jitan ram manjhi',
    'manjhi',
    'ham secular',
    'ham(s)',
    'mahadalit',
    'extremely backward',
    'jitan manjhi',
    'manjhi cm',
    'hindustani awam',
    'jitan ram',
    'chief minister manjhi',
    'ex cm manjhi',
    'former cm manjhi',
    'mahadalit community',
    'extremely backward class',
    'ebc',
    'mahadalit vikas',
    'inclusive development',
    'gaya',
    'imamganj',
    'manjhi ji',
    'ham party',
    'ham bihar',
    'mahadalit empowerment',
    'mahadalit rights',
    'ebc welfare',
    'manjhi sarkar',
    'ham secular party'
  ],
  'VIP': [
    'vikassheel insaan party',
    'vip',
    'mukesh sahni',
    'sahni',
    'nishad',
    'mallah',
    'vip bihar',
    'mukesh sahni vip',
    'son of mallah',
    'vikassheel',
    'mukesh sahani',
    'sahni ji',
    'nishad community',
    'nishad raj',
    'fishermen',
    'boatmen',
    'vikas for all',
    'nishad empowerment',
    'khagaria',
    'bhagalpur',
    'vip party',
    'mallah community',
    'nishad representation',
    'fishermen rights',
    'nishad vikas',
    'nishad welfare',
    'sahni sahab',
    'vip leader',
    'bollywood sahni',
    'vikassheel bihar'
  ],
  'AIMIM': [
    'all india majlis',
    'aimim',
    'asaduddin owaisi',
    'owaisi',
    'aimim bihar',
    'majlis',
    'seemanchal',
    'muslim representation',
    'owaisi brothers',
    'akbaruddin owaisi',
    'owaisi sahab',
    'akbar owaisi',
    'kishanganj',
    'katihar',
    'araria',
    'purnia',
    'muslim rights',
    'minority representation',
    'jai bheem jai meem',
    'mim bihar',
    'majlis party',
    'asad owaisi',
    'aimim president',
    'hyderabad mp',
    'minority welfare',
    'muslim empowerment',
    'aimim leader',
    'majlis ittehadul',
    'owaisi party',
    'seemanchal region'
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
    'hindutva',
    'modigovt',
    'modi govt',
    'pmmodiyojana',
    'pm modi',
    'bjp4india',
    'bjp4bihar',
    'nda',
    'national democratic alliance',
    'abki baar',
    'modi sarkar',
    'double engine',
    'sabka saath',
    'sabka vikas',
    'sabka vishwas',
    'viksit bharat',
    'atmanirbhar bharat',
    'new india',
    'jp nadda',
    'rajnath singh',
    'nitin gadkari',
    'sushil modi',
    'ravi shankar prasad',
    'giriraj singh',
    'hindu rashtra',
    'ram mandir',
    'ayodhya',
    'kamal',
    'bjym',
    'yuva morcha'
  ],
  INC: [
    'indian national congress',
    'congress',
    'inc',
    'rahul gandhi',
    'sonia gandhi',
    'priyanka gandhi',
    'hand', // Congress symbol
    'aicc',
    'congress party',
    'cpcc',
    'indira gandhi',
    'rajiv gandhi',
    'manmohan singh',
    'mallikarjun kharge',
    'kharge',
    'bharat jodo',
    'nyay',
    'garibi hatao',
    'jai jawan',
    'secular',
    'secularism',
    'gandhi parivar',
    'gandhi family',
    'youth congress',
    'nsui',
    'sevadal',
    'pcc',
    'dpcc'
  ],
  AAP: [
    'aam aadmi party',
    'aap',
    'arvind kejriwal',
    'kejriwal',
    'broom', // AAP symbol
    'aam aadmi',
    'common man',
    'aap delhi',
    'aap punjab',
    'delhi model',
    'mohalla clinic',
    'free electricity',
    'education revolution',
    'manish sisodia',
    'sisodia',
    'atishi',
    'sanjay singh',
    'raghav chadha',
    'jhadu',
    'anti corruption',
    'lokpal'
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
 * @param {string} partyCode - Party code
 * @returns {string} - Full party name
 */
export function getPartyName(partyCode) {
  const names = {
    BJP: 'Bharatiya Janata Party',
    INC: 'Indian National Congress',
    AAP: 'Aam Aadmi Party',
    'Janata Dal (United)': 'Janata Dal (United)',
    RJD: 'Rashtriya Janata Dal',
    'Jan Suraaj': 'Jan Suraaj Party',
    LJP: 'Lok Janshakti Party',
    HAM: 'Hindustani Awam Morcha',
    VIP: 'Vikassheel Insaan Party',
    AIMIM: 'All India Majlis-e-Ittehadul Muslimeen',
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
    BJP: '#FF9933',                    // Saffron
    INC: '#138808',                    // Green
    AAP: '#0073e6',                    // Blue
    'Janata Dal (United)': '#006400',  // Dark Green
    RJD: '#008000',                    // Green
    'Jan Suraaj': '#FF6347',           // Tomato Red
    LJP: '#9333EA',                    // Purple
    HAM: '#92400E',                    // Brown
    VIP: '#0891B2',                    // Cyan
    AIMIM: '#14532D',                  // Dark Green
    Others: '#64748B'                  // Slate Gray
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
