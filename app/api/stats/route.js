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

    // Build query with filters
    let queryText = `
      SELECT 
        page_id,
        bylines,
        target_locations,
        spend_lower,
        spend_upper,
        impressions_lower,
        impressions_upper
      FROM ads
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

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

    if (state && state !== 'All India') {
      queryText += ` AND target_locations::text ILIKE $${paramCount}`;
      params.push(`%${state}%`);
      paramCount++;
    }

    const result = await query(queryText, params);

    // Calculate stats with party classification
    let totalAds = 0;
    const uniquePages = new Set();
    let totalSpend = 0;
    let totalImpressions = 0;
    const partyStats = {
      BJP: { count: 0, spend: 0 },
      INC: { count: 0, spend: 0 },
      AAP: { count: 0, spend: 0 },
      Others: { count: 0, spend: 0 }
    };

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      
      // Apply party filter
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      totalAds++;
      if (row.page_id) uniquePages.add(row.page_id);

      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      const avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      totalSpend += avgSpend;
      totalImpressions += avgImpressions;

      partyStats[adParty].count++;
      partyStats[adParty].spend += avgSpend;
    });

    return NextResponse.json({
      totalAds,
      totalPages: uniquePages.size,
      totalSpend: parseFloat((totalSpend / 100000).toFixed(2)), // in Lakhs
      avgImpressions: totalAds > 0 ? parseInt(totalImpressions / totalAds) : 0,
      partyBreakdown: {
        BJP: parseFloat((partyStats.BJP.spend / 100000).toFixed(2)),
        INC: parseFloat((partyStats.INC.spend / 100000).toFixed(2)),
        AAP: parseFloat((partyStats.AAP.spend / 100000).toFixed(2)),
        Others: parseFloat((partyStats.Others.spend / 100000).toFixed(2))
      }
    });

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error.message },
      { status: 500 }
    );
  }
}
