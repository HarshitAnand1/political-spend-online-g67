import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatCurrency } from '@/lib/partyUtils';
import { INDIAN_STATES, normalizeStateName } from '@/lib/geoUtils';

export const dynamic = 'force-dynamic';

// Regional color scheme
const REGION_COLORS = {
  'Delhi': '#FF9933',
  'Maharashtra': '#138808',
  'Karnataka': '#0073e6',
  'Uttar Pradesh': '#9333EA',
  'Tamil Nadu': '#F59E0B',
  'West Bengal': '#FF6B6B',
  'Gujarat': '#06B6D4',
  'Rajasthan': '#EC4899',
  'Kerala': '#10B981',
  'Telangana': '#8B5CF6'
};

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const party = searchParams.get('party');

    // Query to get regional data from unified with ad_regions table
    let queryText = `
      SELECT
        r.region,
        a.page_id,
        p.page_name as bylines,
        a.spend_lower,
        a.spend_upper,
        a.impressions_lower,
        a.impressions_upper,
        r.spend_percentage
      FROM unified.all_ad_regions r
      JOIN unified.all_ads a ON r.ad_id = CAST(a.id AS TEXT) AND r.platform = LOWER(a.platform)
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      queryText += ` AND a.ad_delivery_start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND a.ad_delivery_stop_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    const result = await query(queryText, params);

    // Aggregate by region
    const regionMap = {};
    let totalAds = 0;
    const seenAds = new Set();

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);

      // Filter by party if specified
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      const regionName = row.region || 'Unknown';

      // Filter out non-Indian states/UTs
      // Check if the region name (after normalization) is a valid Indian state/UT
      const normalizedRegion = normalizeStateName(regionName);
      if (!normalizedRegion || !INDIAN_STATES[normalizedRegion]) {
        // Skip this entry if it's not a valid Indian state/UT
        return;
      }

      if (!regionMap[regionName]) {
        regionMap[regionName] = {
          totalSpend: 0,
          totalImpressions: 0,
          adCount: 0,
          parties: {}  // Dynamic party tracking
        };
      }

      // Calculate spend and impressions based on percentages
      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      const avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      const regionalSpend = avgSpend * (row.spend_percentage || 1);
      const regionalImpressions = avgImpressions * (row.spend_percentage || 1);

      regionMap[regionName].totalSpend += regionalSpend;
      regionMap[regionName].totalImpressions += regionalImpressions;
      regionMap[regionName].adCount++;

      // Track party spend dynamically
      if (!regionMap[regionName].parties[adParty]) {
        regionMap[regionName].parties[adParty] = 0;
      }
      regionMap[regionName].parties[adParty] += regionalSpend;

      seenAds.add(`${row.page_id}`);
    });

    totalAds = seenAds.size;

    // Convert to array and format
    const regions = Object.entries(regionMap).map(([name, data]) => {
      // Sort all parties by spend, then filter out "Others" and get top 5
      // We take more than 5 initially to ensure we have 5 after filtering
      const sortedParties = Object.entries(data.parties)
        .sort((a, b) => b[1] - a[1])
        .filter(([party]) => party !== 'Others')
        .slice(0, 5);

      const dominantParty = sortedParties.length > 0 ? sortedParties[0][0] : 'Others';

      // Create partyBreakdown with top 5 parties (excluding Others)
      const partyBreakdown = {};
      sortedParties.forEach(([party, spend]) => {
        partyBreakdown[party] = formatCurrency(spend);
      });

      return {
        region: name,
        spend: formatCurrency(data.totalSpend),
        spendRaw: data.totalSpend,
        impressions: parseInt(data.totalImpressions),
        adCount: data.adCount,
        stateCount: 1, // Each region is essentially a state/location
        states: [name],
        dominantParty: dominantParty,
        partyBreakdown: partyBreakdown,
        color: REGION_COLORS[name] || '#64748B'
      };
    }).sort((a, b) => b.spendRaw - a.spendRaw);

    const totalSpend = regions.reduce((sum, r) => sum + r.spendRaw, 0);

    // Add percentages
    regions.forEach(region => {
      region.percentage = totalSpend > 0 ? ((region.spendRaw / totalSpend) * 100).toFixed(1) : '0';
    });

    // Determine national campaigns (ads targeting multiple regions)
    const adsPerRegionCount = {};
    result.rows.forEach(row => {
      const adId = `${row.page_id}`;
      adsPerRegionCount[adId] = (adsPerRegionCount[adId] || 0) + 1;
    });
    const nationalCampaigns = Object.values(adsPerRegionCount).filter(count => count >= 3).length;

    return NextResponse.json({
      regions,
      nationalCampaigns,
      totalAds,
      summary: {
        topRegion: regions[0]?.region || 'Unknown',
        leastRegion: regions[regions.length - 1]?.region || 'Unknown',
        totalSpend: formatCurrency(totalSpend)
      }
    });

  } catch (error) {
    console.error('Error fetching regional analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional analytics', details: error.message },
      { status: 500 }
    );
  }
}
