// Person/Candidate Classification Utility

const PERSON_KEYWORDS = {
  'Binod Mishra': [
    'binod mishra',
    'binod',
    'mishra ji',
    'binod kumar mishra',
    'advocate binod',
    'binod advocate',
    'shri binod mishra',
    'श्री बिनोद मिश्रा',
    'बिनोद मिश्रा',
    'बिनोद'
  ],
  'Maithili Thakur': [
    'maithili thakur',
    'maithili',
    'thakur maithili',
    'singer maithili',
    'maithili singer',
    'thakur ji',
    'मैथिली ठाकुर',
    'मैथिली',
    'ठाकुर मैथिली'
  ],
  'Vijay Kumar Sinha': [
    'vijay kumar sinha',
    'vijay sinha',
    'vijay kumar',
    'sinha vijay',
    'lakhisarai',
    'vijay lakhisarai',
    'vk sinha',
    'विजय कुमार सिन्हा',
    'विजय सिन्हा',
    'विजय कुमार'
  ]
};

const PERSON_DETAILS = {
  'Binod Mishra': {
    name: 'Binod Mishra',
    constituency: 'Alinagar',
    party: 'RJD',
    role: 'Candidate',
    color: '#15803d'
  },
  'Maithili Thakur': {
    name: 'Maithili Thakur',
    constituency: 'Alinagar',
    party: 'Independent',
    role: 'Candidate',
    color: '#8B4513'
  },
  'Vijay Kumar Sinha': {
    name: 'Vijay Kumar Sinha',
    constituency: 'Lakhisarai',
    party: 'BJP',
    role: 'Candidate',
    color: '#FF9933'
  }
};

/**
 * Classify a person based on page_id and bylines/page_name
 * @param {string} pageId - The page ID
 * @param {string} text - The bylines or page name text
 * @returns {string} - Person name or 'Others'
 */
export function classifyPerson(pageId, text = '') {
  const searchText = `${pageId} ${text}`.toLowerCase();

  // Check each person's keywords
  for (const [personName, keywords] of Object.entries(PERSON_KEYWORDS)) {
    for (const keyword of keywords) {
      if (searchText.includes(keyword.toLowerCase())) {
        return personName;
      }
    }
  }

  return 'Others';
}

/**
 * Get person details
 * @param {string} personName - The person name
 * @returns {object} - Person details
 */
export function getPersonDetails(personName) {
  return PERSON_DETAILS[personName] || {
    name: personName,
    constituency: 'Unknown',
    party: 'Unknown',
    role: 'Unknown',
    color: '#64748B'
  };
}

/**
 * Get person color
 * @param {string} personName - The person name
 * @returns {string} - Color hex code
 */
export function getPersonColor(personName) {
  return PERSON_DETAILS[personName]?.color || '#64748B';
}

/**
 * Get all tracked persons
 * @returns {array} - Array of person names
 */
export function getAllPersons() {
  return Object.keys(PERSON_KEYWORDS);
}

/**
 * Format currency for display
 * @param {number} amount - Amount in rupees
 * @returns {string} - Formatted currency string
 */
export function formatPersonCurrency(amount) {
  if (amount >= 10000000) {
    // >= 1 Crore
    return `₹${(amount / 10000000).toFixed(2)} Cr`;
  } else if (amount >= 100000) {
    // >= 1 Lakh
    return `₹${(amount / 100000).toFixed(2)} L`;
  } else if (amount >= 1000) {
    // >= 1 Thousand
    return `₹${(amount / 1000).toFixed(2)} K`;
  } else {
    return `₹${amount.toFixed(2)}`;
  }
}
