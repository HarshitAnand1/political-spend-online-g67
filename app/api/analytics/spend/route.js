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
      // Use ad_regions table for efficient state filtering (Meta ads only)
      queryText = `
        SELECT DISTINCT
          a.page_id,
          COALESCE(m.bylines, p.page_name, '') as bylines,
          a.spend_lower,
          a.spend_upper,
          a.platform,
          r.spend_percentage
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
        LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id::text AND a.platform = 'Meta'
        WHERE (r.region = $${paramCount} OR a.platform != 'Meta')
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - query all ads from unified schema (Meta + Google)
      queryText = `
        SELECT
          a.page_id,
          COALESCE(m.bylines, p.page_name, '') as bylines,
          a.spend_lower,
          a.spend_upper,
          a.platform
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
        WHERE 1=1
      `;
    }

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

    // Classify ads by party and aggregate spending
    const partySpend = {
      BJP: 0,
      INC: 0,
      AAP: 0,
      'Janata Dal (United)': 0,
      RJD: 0,
      'Jan Suraaj': 0,
      LJP: 0,
      HAM: 0,
      VIP: 0,
      AIMIM: 0,
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
