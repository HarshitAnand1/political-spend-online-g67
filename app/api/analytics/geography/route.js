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

    // Use ad_regions table for accurate state data from unified
    let queryText = `
      SELECT
        r.region as state_name,
        a.page_id,
        p.page_name as bylines,
        a.spend_lower,
        a.spend_upper,
        a.impressions_lower,
        a.impressions_upper,
        r.spend_percentage
      FROM unified.all_ads a
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
      WHERE r.region IS NOT NULL
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

    // Aggregate by state
    const stateMap = {};

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);

      // Filter by party if specified
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      const stateName = row.state_name || 'Unknown';

      // Filter out non-Indian states/UTs
      const normalizedState = normalizeStateName(stateName);
      if (!normalizedState || !INDIAN_STATES[normalizedState]) {
        // Skip this entry if it's not a valid Indian state/UT
        return;
      }

      // Calculate spend and impressions based on percentages
      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      const avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      const regionalSpend = avgSpend * (row.spend_percentage || 1);
      const regionalImpressions = avgImpressions * (row.spend_percentage || 1);

      if (!stateMap[stateName]) {
        stateMap[stateName] = {
          state: stateName,
          totalSpend: 0,
          totalImpressions: 0,
          adCount: 0,
          parties: { BJP: 0, INC: 0, AAP: 0, 'Janata Dal (United)': 0, RJD: 0, 'Jan Suraaj': 0, LJP: 0, HAM: 0, VIP: 0, AIMIM: 0, Others: 0 }
        };
      }

      stateMap[stateName].totalSpend += regionalSpend;
      stateMap[stateName].totalImpressions += regionalImpressions;
      stateMap[stateName].adCount++;
      stateMap[stateName].parties[adParty] += regionalSpend;
    });

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
