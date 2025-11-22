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

    // First query: Get aggregated regional data (OPTIMIZED)
    let aggregateQuery = `
      SELECT
        r.region,
        COUNT(DISTINCT a.id) as ad_count,
        SUM(((a.spend_lower + a.spend_upper) / 2) * COALESCE(r.spend_percentage, 1)) as total_spend,
        SUM(((a.impressions_lower + a.impressions_upper) / 2) * COALESCE(r.spend_percentage, 1)) as total_impressions
      FROM unified.all_ad_regions r
      JOIN unified.all_ads a ON r.ad_id = CAST(a.id AS TEXT) AND r.platform = LOWER(a.platform)
      WHERE r.region IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    // Handle date filtering with NULL stop times (running ads)
    if (startDate && endDate) {
      aggregateQuery += ` AND a.ad_delivery_start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
      aggregateQuery += ` AND (a.ad_delivery_stop_time >= $${paramCount} OR a.ad_delivery_stop_time IS NULL)`;
      params.push(startDate);
      paramCount++;
    } else if (startDate) {
      aggregateQuery += ` AND (a.ad_delivery_stop_time >= $${paramCount} OR a.ad_delivery_stop_time IS NULL)`;
      params.push(startDate);
      paramCount++;
    } else if (endDate) {
      aggregateQuery += ` AND a.ad_delivery_start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    aggregateQuery += `
      GROUP BY r.region
      ORDER BY total_spend DESC
      LIMIT 50
    `;

    const aggregateResult = await query(aggregateQuery, params);

    // Build region map with aggregated data
    const regionMap = {};
    let totalAds = 0;

    aggregateResult.rows.forEach(row => {
      const regionName = row.region || 'Unknown';

      // Filter out non-Indian states/UTs
      const normalizedRegion = normalizeStateName(regionName);
      if (!normalizedRegion || !INDIAN_STATES[normalizedRegion]) {
        return;
      }

      regionMap[regionName] = {
        totalSpend: parseFloat(row.total_spend || 0),
        totalImpressions: parseFloat(row.total_impressions || 0),
        adCount: parseInt(row.ad_count || 0),
        parties: {}
      };

      totalAds += parseInt(row.ad_count || 0);
    });

    // Second query: Get party breakdown for these regions
    // Optimized with LIMIT to prevent timeout
    if (Object.keys(regionMap).length > 0) {
      const regionNames = Object.keys(regionMap).slice(0, 15); // Only get party breakdown for top 15 regions
      const partyQueryText = `
        WITH regional_ads AS (
          SELECT
            r.region,
            a.page_id,
            a.platform,
            ((a.spend_lower + a.spend_upper) / 2) * COALESCE(r.spend_percentage, 1) as ad_spend
          FROM unified.all_ad_regions r
          JOIN unified.all_ads a ON r.ad_id = CAST(a.id AS TEXT) AND r.platform = LOWER(a.platform)
          WHERE r.region = ANY($${paramCount}::text[])
          ${startDate && endDate ? `AND a.ad_delivery_start_time <= $${paramCount + 1} AND (a.ad_delivery_stop_time >= $${paramCount + 2} OR a.ad_delivery_stop_time IS NULL)` : ''}
          ${startDate && !endDate ? `AND (a.ad_delivery_stop_time >= $${paramCount + 1} OR a.ad_delivery_stop_time IS NULL)` : ''}
          ${endDate && !startDate ? `AND a.ad_delivery_start_time <= $${paramCount + 1}` : ''}
          LIMIT 50000
        )
        SELECT
          ra.region,
          ra.page_id,
          p.page_name as bylines,
          SUM(ra.ad_spend) as total_spend
        FROM regional_ads ra
        LEFT JOIN unified.all_pages p ON ra.page_id = p.page_id AND ra.platform = p.platform
        GROUP BY ra.region, ra.page_id, p.page_name
        ORDER BY total_spend DESC
        LIMIT 5000
      `;

      const partyParams = [regionNames];
      if (startDate && endDate) {
        partyParams.push(endDate, startDate);
      } else if (startDate) {
        partyParams.push(startDate);
      } else if (endDate) {
        partyParams.push(endDate);
      }

      const partyResult = await query(partyQueryText, partyParams);

      partyResult.rows.forEach(row => {
        const regionName = row.region;
        if (regionMap[regionName]) {
          const adParty = classifyParty(row.page_id, row.bylines);

          // Filter by party if specified
          if (party && party !== 'All Parties' && adParty !== party) {
            return;
          }

          const spend = parseFloat(row.total_spend || 0);
          if (!regionMap[regionName].parties[adParty]) {
            regionMap[regionName].parties[adParty] = 0;
          }
          regionMap[regionName].parties[adParty] += spend;
        }
      });
    }

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
    // Query to find ads that target 3 or more regions
    const nationalCampaignsQuery = `
      SELECT COUNT(DISTINCT a.id) as national_count
      FROM unified.all_ads a
      WHERE a.id IN (
        SELECT r.ad_id
        FROM unified.all_ad_regions r
        GROUP BY r.ad_id
        HAVING COUNT(DISTINCT r.region) >= 3
      )
    `;
    const nationalResult = await query(nationalCampaignsQuery);
    const nationalCampaigns = parseInt(nationalResult.rows[0]?.national_count || 0);

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
