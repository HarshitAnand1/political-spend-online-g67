import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatCurrency } from '@/lib/partyUtils';
import { INDIAN_STATES, normalizeStateName } from '@/lib/geoUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const party = searchParams.get('party');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Use aggregated query for better performance
    let queryText = `
      SELECT
        r.region as state_name,
        COUNT(DISTINCT a.id) as ad_count,
        SUM(((a.spend_lower + a.spend_upper) / 2) * COALESCE(r.spend_percentage, 1)) as total_spend,
        SUM(((a.impressions_lower + a.impressions_upper) / 2) * COALESCE(r.spend_percentage, 1)) as total_impressions
      FROM unified.all_ads a
      LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
      WHERE r.region IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    // Handle date filtering properly with NULL stop times (running ads)
    if (startDate && endDate) {
      queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
      queryText += ` AND (a.ad_delivery_stop_time >= $${paramCount} OR a.ad_delivery_stop_time IS NULL)`;
      params.push(startDate);
      paramCount++;
    } else if (startDate) {
      queryText += ` AND (a.ad_delivery_stop_time >= $${paramCount} OR a.ad_delivery_stop_time IS NULL)`;
      params.push(startDate);
      paramCount++;
    } else if (endDate) {
      queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += `
      GROUP BY r.region
      ORDER BY total_spend DESC
      LIMIT ${limit * 2}
    `;

    const result = await query(queryText, params);

    // Build state map with aggregated data
    const stateMap = {};

    result.rows.forEach(row => {
      const stateName = row.state_name || 'Unknown';

      // Filter out non-Indian states/UTs
      const normalizedState = normalizeStateName(stateName);
      if (!normalizedState || !INDIAN_STATES[normalizedState]) {
        return;
      }

      stateMap[stateName] = {
        state: stateName,
        totalSpend: parseFloat(row.total_spend || 0),
        totalImpressions: parseFloat(row.total_impressions || 0),
        adCount: parseInt(row.ad_count || 0),
        parties: { BJP: 0, INC: 0, AAP: 0, 'Janata Dal (United)': 0, RJD: 0, 'Jan Suraaj': 0, LJP: 0, HAM: 0, VIP: 0, AIMIM: 0, Others: 0 }
      };
    });

    // Get party breakdown for these states - only if no party filter applied
    // Optimized with LIMIT to prevent timeout
    if (Object.keys(stateMap).length > 0) {
      const stateNames = Object.keys(stateMap).slice(0, 10); // Only get party breakdown for top 10 states
      const partyQueryText = `
        WITH regional_ads AS (
          SELECT
            r.region as state_name,
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
          ra.state_name,
          ra.page_id,
          p.page_name as bylines,
          SUM(ra.ad_spend) as total_spend
        FROM regional_ads ra
        LEFT JOIN unified.all_pages p ON ra.page_id = p.page_id AND ra.platform = p.platform
        GROUP BY ra.state_name, ra.page_id, p.page_name
        ORDER BY total_spend DESC
        LIMIT 5000
      `;

      const partyParams = [stateNames];
      if (startDate && endDate) {
        partyParams.push(endDate, startDate);
      } else if (startDate) {
        partyParams.push(startDate);
      } else if (endDate) {
        partyParams.push(endDate);
      }

      const partyResult = await query(partyQueryText, partyParams);

      partyResult.rows.forEach(row => {
        const stateName = row.state_name;
        if (stateMap[stateName]) {
          const adParty = classifyParty(row.page_id, row.bylines);

          // Filter by party if specified
          if (party && party !== 'All Parties' && adParty !== party) {
            return;
          }

          const spend = parseFloat(row.total_spend || 0);
          stateMap[stateName].parties[adParty] = (stateMap[stateName].parties[adParty] || 0) + spend;
        }
      });
    }

    // Convert to array and sort
    const states = Object.values(stateMap)
      .map(state => ({
        ...state,
        spend: formatCurrency(state.totalSpend),
        spendRaw: state.totalSpend,
        impressions: parseInt(state.totalImpressions),
        dominantParty: Object.entries(state.parties).reduce((a, b) => b[1] > a[1] ? b : a)[0]
      }))
      .sort((a, b) => b.spendRaw - a.spendRaw)
      .slice(0, limit);

    const totalSpend = states.reduce((sum, s) => sum + s.spendRaw, 0);

    // Add percentage
    states.forEach(state => {
      state.percentage = totalSpend > 0 ? ((state.spendRaw / totalSpend) * 100).toFixed(1) : '0';
    });

    return NextResponse.json({ 
      states,
      totalStates: Object.keys(stateMap).length
    });

  } catch (error) {
    console.error('Error fetching geographic breakdown:', error);
    return NextResponse.json(
      { error: 'Failed to fetch geographic breakdown', details: error.message },
      { status: 500 }
    );
  }
}
