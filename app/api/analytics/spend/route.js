import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty } from '@/lib/partyUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const party = searchParams.get('party');

    // Optimized query: Use ad_regions JOIN for state filtering
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
      queryText = `
        SELECT DISTINCT
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper,
          r.spend_percentage
        FROM ads a
        JOIN ad_regions r ON a.id = r.ad_id
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - query ads directly
      queryText = `
        SELECT
          page_id,
          bylines,
          spend_lower,
          spend_upper
        FROM ads
        WHERE 1=1
      `;
    }

    if (startDate) {
      queryText += ` AND ad_delivery_start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND ad_delivery_stop_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    const result = await query(queryText, params);

    // Classify ads by party and aggregate spending
    const partySpend = {
      BJP: 0,
      INC: 0,
      AAP: 0,
      'JD(U)': 0,
      RJD: 0,
      'Jan Suraaj': 0,
      Others: 0
    };

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      let avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;

      // Apply regional percentage if state filter is active
      if (state && state !== 'All India' && row.spend_percentage) {
        avgSpend *= row.spend_percentage;
      }

      partySpend[adParty] += avgSpend;
    });

    // Filter by party if specified
    let spendData = {};
    if (party && party !== 'All Parties') {
      spendData[party] = parseFloat((partySpend[party] / 100000).toFixed(2));
    } else {
      // Return all parties, convert to Lakhs
      Object.keys(partySpend).forEach(p => {
        spendData[p] = parseFloat((partySpend[p] / 100000).toFixed(2));
      });
    }

    return NextResponse.json({ spendData });

  } catch (error) {
    console.error('Error fetching spend analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch spend analytics', details: error.message },
      { status: 500 }
    );
  }
}
