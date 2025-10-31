import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatCurrency } from '@/lib/partyUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const limit = parseInt(searchParams.get('limit') || '10');

    // Optimized query: Use ad_regions JOIN for state filtering
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
      queryText = `
        SELECT
          a.page_id,
          a.bylines,
          p.page_name,
          COUNT(DISTINCT a.id) as ad_count,
          SUM((a.spend_lower + a.spend_upper) / 2 * r.spend_percentage) as total_spend,
          SUM((a.impressions_lower + a.impressions_upper) / 2 * r.impressions_percentage) as total_impressions
        FROM ads a
        LEFT JOIN pages p ON a.page_id = p.page_id
        JOIN ad_regions r ON a.id = r.ad_id
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - query ads directly
      queryText = `
        SELECT
          a.page_id,
          a.bylines,
          p.page_name,
          COUNT(*) as ad_count,
          SUM((a.spend_lower + a.spend_upper) / 2) as total_spend,
          SUM((a.impressions_lower + a.impressions_upper) / 2) as total_impressions
        FROM ads a
        LEFT JOIN pages p ON a.page_id = p.page_id
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

    queryText += `
      GROUP BY a.page_id, a.bylines, p.page_name
      HAVING SUM((a.spend_lower + a.spend_upper) / 2) > 0
      ORDER BY total_spend DESC
      LIMIT $${paramCount}
    `;
    params.push(limit);

    const result = await query(queryText, params);

    // Calculate total spend for percentage
    const totalSpend = result.rows.reduce((sum, row) => sum + parseFloat(row.total_spend || 0), 0);

    // Map and classify advertisers
    let advertisers = result.rows.map(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      const spend = parseFloat(row.total_spend || 0);

      return {
        page_id: row.page_id,
        name: row.page_name || row.bylines || `Page ${row.page_id}` || 'Unknown Advertiser',
        party: adParty,
        ad_count: parseInt(row.ad_count),
        spend: formatCurrency(spend),
        spendRaw: spend,
        impressions: parseInt(row.total_impressions || 0),
        percentage: totalSpend > 0 ? ((spend / totalSpend) * 100).toFixed(1) : '0'
      };
    });

    // Filter by party if specified
    if (party && party !== 'All Parties') {
      advertisers = advertisers.filter(ad => ad.party === party);
    }

    return NextResponse.json({ 
      advertisers,
      totalSpend: formatCurrency(totalSpend)
    });

  } catch (error) {
    console.error('Error fetching top advertisers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch top advertisers', details: error.message },
      { status: 500 }
    );
  }
}
