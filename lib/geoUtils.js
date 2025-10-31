/**
 * Geographic classification utilities for Indian states and UTs
 */

// Complete list of Indian states and UTs with metadata
export const INDIAN_STATES = {
  // North India
  'Delhi': { region: 'North', capital: true, type: 'UT' },
  'Haryana': { region: 'North', capital: false, type: 'State' },
  'Himachal Pradesh': { region: 'North', capital: false, type: 'State' },
  'Jammu and Kashmir': { region: 'North', capital: false, type: 'UT' },
  'Ladakh': { region: 'North', capital: false, type: 'UT' },
  'Punjab': { region: 'North', capital: false, type: 'State' },
  'Rajasthan': { region: 'North', capital: false, type: 'State' },
  'Chandigarh': { region: 'North', capital: true, type: 'UT' },
  'Uttarakhand': { region: 'North', capital: false, type: 'State' },

  // South India
  'Andhra Pradesh': { region: 'South', capital: false, type: 'State' },
  'Karnataka': { region: 'South', capital: false, type: 'State' },
  'Kerala': { region: 'South', capital: false, type: 'State' },
  'Tamil Nadu': { region: 'South', capital: false, type: 'State' },
  'Telangana': { region: 'South', capital: false, type: 'State' },
  'Puducherry': { region: 'South', capital: false, type: 'UT' },
  'Lakshadweep': { region: 'South', capital: false, type: 'UT' },
  'Andaman and Nicobar Islands': { region: 'South', capital: false, type: 'UT' },

  // East India
  'Bihar': { region: 'East', capital: false, type: 'State' },
  'Jharkhand': { region: 'East', capital: false, type: 'State' },
  'Odisha': { region: 'East', capital: false, type: 'State' },
  'West Bengal': { region: 'East', capital: false, type: 'State' },

  // West India
  'Goa': { region: 'West', capital: false, type: 'State' },
  'Gujarat': { region: 'West', capital: false, type: 'State' },
  'Maharashtra': { region: 'West', capital: false, type: 'State' },
  'Dadra and Nagar Haveli and Daman and Diu': { region: 'West', capital: false, type: 'UT' },

  // Central India
  'Chhattisgarh': { region: 'Central', capital: false, type: 'State' },
  'Madhya Pradesh': { region: 'Central', capital: false, type: 'State' },
  'Uttar Pradesh': { region: 'Central', capital: false, type: 'State' },

  // Northeast India
  'Arunachal Pradesh': { region: 'Northeast', capital: false, type: 'State' },
  'Assam': { region: 'Northeast', capital: false, type: 'State' },
  'Manipur': { region: 'Northeast', capital: false, type: 'State' },
  'Meghalaya': { region: 'Northeast', capital: false, type: 'State' },
  'Mizoram': { region: 'Northeast', capital: false, type: 'State' },
  'Nagaland': { region: 'Northeast', capital: false, type: 'State' },
  'Sikkim': { region: 'Northeast', capital: false, type: 'State' },
  'Tripura': { region: 'Northeast', capital: false, type: 'State' }
};

// Alternative names and common variations
const STATE_ALIASES = {
  'NCT of Delhi': 'Delhi',
  'National Capital Territory of Delhi': 'Delhi',
  'New Delhi': 'Delhi',
  'J&K': 'Jammu and Kashmir',
  'Jammu & Kashmir': 'Jammu and Kashmir',
  'HP': 'Himachal Pradesh',
  'AP': 'Andhra Pradesh',
  'TN': 'Tamil Nadu',
  'KA': 'Karnataka',
  'KL': 'Kerala',
  'TS': 'Telangana',
  'WB': 'West Bengal',
  'MH': 'Maharashtra',
  'MP': 'Madhya Pradesh',
  'UP': 'Uttar Pradesh',
  'CG': 'Chhattisgarh',
  'OR': 'Odisha',
  'RJ': 'Rajasthan',
  'GJ': 'Gujarat',
  'PB': 'Punjab',
  'HR': 'Haryana',
  'UK': 'Uttarakhand',
  'A&N Islands': 'Andaman and Nicobar Islands',
  'DNH & DD': 'Dadra and Nagar Haveli and Daman and Diu'
};

// Region colors for visualization
export const REGION_COLORS = {
  'North': '#FF9933',      // Saffron
  'South': '#138808',      // Green
  'East': '#0073e6',       // Blue
  'West': '#FF6B6B',       // Red
  'Central': '#9333EA',    // Purple
  'Northeast': '#F59E0B'   // Amber
};

/**
 * Normalize state name to match our standard format
 */
export function normalizeStateName(name) {
  if (!name || typeof name !== 'string') return null;
  
  const trimmed = name.trim();
  
  // Check if it's an alias
  if (STATE_ALIASES[trimmed]) {
    return STATE_ALIASES[trimmed];
  }
  
  // Check exact match
  if (INDIAN_STATES[trimmed]) {
    return trimmed;
  }
  
  // Case-insensitive match
  const lowerName = trimmed.toLowerCase();
  for (const [state, alias] of Object.entries(STATE_ALIASES)) {
    if (state.toLowerCase() === lowerName || alias.toLowerCase() === lowerName) {
      return alias;
    }
  }
  
  for (const state of Object.keys(INDIAN_STATES)) {
    if (state.toLowerCase() === lowerName) {
      return state;
    }
  }
  
  return null;
}

/**
 * Get region for a state
 */
export function getRegion(stateName) {
  const normalized = normalizeStateName(stateName);
  if (!normalized) return 'Unknown';
  
  return INDIAN_STATES[normalized]?.region || 'Unknown';
}

/**
 * Get state type (State/UT)
 */
export function getStateType(stateName) {
  const normalized = normalizeStateName(stateName);
  if (!normalized) return 'Unknown';
  
  return INDIAN_STATES[normalized]?.type || 'Unknown';
}

/**
 * Check if location is a capital
 */
export function isCapital(stateName) {
  const normalized = normalizeStateName(stateName);
  if (!normalized) return false;
  
  return INDIAN_STATES[normalized]?.capital || false;
}

/**
 * Classify an array of target locations
 * Returns aggregated regional data
 */
export function classifyLocations(targetLocations) {
  if (!targetLocations) {
    return {
      states: [],
      regions: {},
      primaryRegion: 'Unknown',
      isNational: false,
      stateCount: 0
    };
  }

  // Parse if string
  let locations = targetLocations;
  if (typeof locations === 'string') {
    try {
      locations = JSON.parse(locations);
    } catch (e) {
      return {
        states: [],
        regions: {},
        primaryRegion: 'Unknown',
        isNational: false,
        stateCount: 0
      };
    }
  }

  if (!Array.isArray(locations)) {
    return {
      states: [],
      regions: {},
      primaryRegion: 'Unknown',
      isNational: false,
      stateCount: 0
    };
  }

  // Extract and classify states
  const states = [];
  const regions = {};
  const stateSet = new Set();

  locations.forEach(loc => {
    const stateName = normalizeStateName(loc.name);
    if (stateName) {
      stateSet.add(stateName);
      const region = getRegion(stateName);
      
      states.push({
        name: stateName,
        region: region,
        type: getStateType(stateName),
        isCapital: isCapital(stateName)
      });

      if (!regions[region]) {
        regions[region] = 0;
      }
      regions[region]++;
    }
  });

  // Determine primary region (most targeted)
  let primaryRegion = 'Unknown';
  let maxCount = 0;
  for (const [region, count] of Object.entries(regions)) {
    if (count > maxCount) {
      maxCount = count;
      primaryRegion = region;
    }
  }

  // Check if campaign is national (targets 4+ regions or 10+ states)
  const isNational = Object.keys(regions).length >= 4 || stateSet.size >= 10;

  return {
    states: states,
    regions: regions,
    primaryRegion: primaryRegion,
    isNational: isNational,
    stateCount: stateSet.size,
    uniqueStates: Array.from(stateSet)
  };
}

/**
 * Get all states in a region
 */
export function getStatesInRegion(region) {
  return Object.entries(INDIAN_STATES)
    .filter(([_, data]) => data.region === region)
    .map(([state, _]) => state);
}

/**
 * Get region statistics
 */
export function getRegionStats() {
  const stats = {
    North: { states: 0, uts: 0, total: 0 },
    South: { states: 0, uts: 0, total: 0 },
    East: { states: 0, uts: 0, total: 0 },
    West: { states: 0, uts: 0, total: 0 },
    Central: { states: 0, uts: 0, total: 0 },
    Northeast: { states: 0, uts: 0, total: 0 }
  };

  Object.values(INDIAN_STATES).forEach(data => {
    if (stats[data.region]) {
      stats[data.region].total++;
      if (data.type === 'State') {
        stats[data.region].states++;
      } else {
        stats[data.region].uts++;
      }
    }
  });

  return stats;
}

/**
 * Format location summary for display
 */
export function formatLocationSummary(classification) {
  if (!classification || classification.stateCount === 0) {
    return 'Unknown';
  }
  
  if (classification.isNational) {
    return `National Campaign (${classification.stateCount} states)`;
  }
  
  if (classification.stateCount === 1) {
    return classification.states[0]?.name || 'Unknown';
  }
  
  if (classification.stateCount <= 3 && classification.uniqueStates) {
    return classification.uniqueStates.join(', ');
  }
  
  return `${classification.primaryRegion} Region (${classification.stateCount} states)`;
}
