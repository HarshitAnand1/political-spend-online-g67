import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty } from '@/lib/partyUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || 30;
    const filterParty = searchParams.get('party');
    const state = searchParams.get('state');

    // Query to get all ads within date range
    let queryText = `
      SELECT 
        DATE(ad_delivery_start_time) as date,
        page_id,
        bylines,
        target_locations,
        spend_lower,
        spend_upper
      FROM ads
      WHERE ad_delivery_start_time >= NOW() - INTERVAL '${parseInt(days)} days'
        AND ad_delivery_start_time IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    // State filtering
    if (state && state !== 'All India') {
      queryText += ` AND target_locations::text ILIKE $${paramCount}`;
      params.push(`%${state}%`);
      paramCount++;
    }

    queryText += ` ORDER BY date ASC`;

    const result = await query(queryText, params);

    // Build date-party spend map
    const datePartyMap = {};
    const allDates = new Set();

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      
      // Apply party filter if specified
      if (filterParty && filterParty !== 'All Parties' && adParty !== filterParty) {
        return;
      }

      const dateStr = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      allDates.add(dateStr);

      if (!datePartyMap[dateStr]) {
        datePartyMap[dateStr] = { BJP: 0, INC: 0, AAP: 0, Others: 0 };
      }

      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      datePartyMap[dateStr][adParty] += avgSpend;
    });

    // Create sorted labels and series
    const labels = Array.from(allDates).sort((a, b) => {
      return new Date(a + ' 2024') - new Date(b + ' 2024');
    });

    const lineSeries = {
      labels,
      BJP: labels.map(d => parseFloat(((datePartyMap[d]?.BJP || 0) / 100000).toFixed(2))),
      INC: labels.map(d => parseFloat(((datePartyMap[d]?.INC || 0) / 100000).toFixed(2))),
      AAP: labels.map(d => parseFloat(((datePartyMap[d]?.AAP || 0) / 100000).toFixed(2))),
      Others: labels.map(d => parseFloat(((datePartyMap[d]?.Others || 0) / 100000).toFixed(2)))
    };

    return NextResponse.json({ lineSeries });

  } catch (error) {
    console.error('Error fetching trend analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch trend analytics', details: error.message },
      { status: 500 }
    );
  }
}
