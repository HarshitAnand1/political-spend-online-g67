import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty } from '@/lib/partyUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const days = searchParams.get('days') || 30;
    const filterParty = searchParams.get('party');
    const state = searchParams.get('state');

    // Optimized query: Use ad_regions JOIN for state filtering
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
      queryText = `
        SELECT DISTINCT
          DATE(a.ad_delivery_start_time) as date,
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper,
          r.spend_percentage
        FROM meta_ads.ads a
        LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
        WHERE a.ad_delivery_start_time >= NOW() - INTERVAL '${parseInt(days)} days'
          AND a.ad_delivery_start_time IS NOT NULL
          AND r.region = $${paramCount}
        ORDER BY date ASC
      `;
      params.push(state);
    } else {
      // No state filter - query all ads from meta_ads
      queryText = `
        SELECT
          DATE(a.ad_delivery_start_time) as date,
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper
        FROM meta_ads.ads a
        WHERE a.ad_delivery_start_time >= NOW() - INTERVAL '${parseInt(days)} days'
          AND a.ad_delivery_start_time IS NOT NULL
        ORDER BY date ASC
      `;
    }

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
        datePartyMap[dateStr] = { BJP: 0, INC: 0, AAP: 0, 'Janata Dal (United)': 0, RJD: 0, 'Jan Suraaj': 0, LJP: 0, HAM: 0, VIP: 0, AIMIM: 0, Others: 0 };
      }

      let avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;

      // Apply regional percentage if state filter is active
      if (state && state !== 'All India' && row.spend_percentage) {
        avgSpend *= row.spend_percentage;
      }

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
      'Janata Dal (United)': labels.map(d => parseFloat(((datePartyMap[d]?.['Janata Dal (United)'] || 0) / 100000).toFixed(2))),
      RJD: labels.map(d => parseFloat(((datePartyMap[d]?.RJD || 0) / 100000).toFixed(2))),
      'Jan Suraaj': labels.map(d => parseFloat(((datePartyMap[d]?.['Jan Suraaj'] || 0) / 100000).toFixed(2))),
      LJP: labels.map(d => parseFloat(((datePartyMap[d]?.LJP || 0) / 100000).toFixed(2))),
      HAM: labels.map(d => parseFloat(((datePartyMap[d]?.HAM || 0) / 100000).toFixed(2))),
      VIP: labels.map(d => parseFloat(((datePartyMap[d]?.VIP || 0) / 100000).toFixed(2))),
      AIMIM: labels.map(d => parseFloat(((datePartyMap[d]?.AIMIM || 0) / 100000).toFixed(2))),
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
