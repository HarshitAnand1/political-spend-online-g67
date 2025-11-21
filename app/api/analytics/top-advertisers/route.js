import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatCurrency, isNonPoliticalAdvertiser } from '@/lib/partyUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const party = searchParams.get('party');
    const limit = parseInt(searchParams.get('limit') || '10');

    // If date filters are present, use daily_spend_by_advertiser for accurate calculations
    if (startDate || endDate) {
      return await getTopAdvertisersFromDailySpend(startDate, endDate, state, party, limit);
    }

    // Query from unified schema with JOINs (no date filter)
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
      queryText = `
        SELECT
          a.page_id,
          p.page_name as bylines,
          COUNT(DISTINCT a.id) as ad_count,
          SUM((a.spend_lower + a.spend_upper) / 2 * COALESCE(r.spend_percentage, 1)) as total_spend
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - query all ads from unified
      queryText = `
        SELECT
          a.page_id,
          p.page_name as bylines,
          COUNT(*) as ad_count,
          SUM((a.spend_lower + a.spend_upper) / 2) as total_spend,
          SUM((a.impressions_lower + a.impressions_upper) / 2) as total_impressions
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        WHERE 1=1
      `;
    }

    queryText += `
      GROUP BY a.page_id, p.page_name
      HAVING SUM((a.spend_lower + a.spend_upper) / 2) > 0
      ORDER BY total_spend DESC
      LIMIT $${paramCount}
    `;
    params.push(limit * 5); // Fetch more to account for filtering out non-political and "Others"

    const result = await query(queryText, params);

    // Calculate total spend for percentage
    const totalSpend = result.rows.reduce((sum, row) => sum + parseFloat(row.total_spend || 0), 0);

    // Map and classify advertisers, filtering out non-political advertisers and "Others"
    let advertisers = result.rows
      .filter(row => !isNonPoliticalAdvertiser(row.bylines)) // Exclude non-political advertisers
      .map(row => {
        const adParty = classifyParty(row.page_id, row.bylines);
        const spend = parseFloat(row.total_spend || 0);

        return {
          page_id: row.page_id,
          name: row.bylines || `Page ${row.page_id}`,
          party: adParty,
          ad_count: parseInt(row.ad_count),
          spend: formatCurrency(spend),
          spendRaw: spend,
          impressions: parseInt(row.total_impressions || 0),
          percentage: totalSpend > 0 ? ((spend / totalSpend) * 100).toFixed(1) : '0'
        };
      })
      .filter(ad => ad.party !== 'Others'); // Exclude "Others" party

    // Filter by party if specified
    if (party && party !== 'All Parties') {
      advertisers = advertisers.filter(ad => ad.party === party);
    }

    // Limit to top 10
    advertisers = advertisers.slice(0, 10);

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

// Helper function to get top advertisers from daily_spend_by_advertiser table
async function getTopAdvertisersFromDailySpend(startDate, endDate, state, party, limit) {
  try {
    // Query daily spend data with date filters
    let queryText = `
      SELECT
        d.advertiser_id as page_id,
        d.advertiser_name as bylines,
        d.platform,
        SUM(d.total_daily_spend) as total_spend,
        SUM(d.total_daily_impressions) as total_impressions,
        MAX(d.active_ads) as max_active_ads
      FROM unified.daily_spend_by_advertiser d
      WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      queryText += ` AND d.snapshot_date >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND d.snapshot_date <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    queryText += `
      GROUP BY d.advertiser_id, d.advertiser_name, d.platform
      HAVING SUM(d.total_daily_spend) > 0
      ORDER BY total_spend DESC
      LIMIT $${paramCount}
    `;
    params.push(limit * 5); // Get more to account for filtering out non-political and "Others"

    const result = await query(queryText, params);

    // For state filtering, we need to check if advertisers have ads targeting the state
    let stateFilteredAdvertisers = null;
    if (state && state !== 'All India') {
      const stateQuery = `
        SELECT DISTINCT a.page_id
        FROM unified.all_ads a
        JOIN unified.all_ad_regions r ON a.id = r.ad_id AND LOWER(a.platform) = r.platform
        WHERE r.region = $1
      `;
      const stateResult = await query(stateQuery, [state]);
      stateFilteredAdvertisers = new Set(stateResult.rows.map(row => row.page_id));
    }

    // Calculate total spend for percentage
    let totalSpend = 0;
    let advertisers = result.rows
      .filter(row => {
        // Apply state filter
        if (stateFilteredAdvertisers && !stateFilteredAdvertisers.has(row.page_id)) {
          return false;
        }
        // Filter out non-political advertisers
        if (isNonPoliticalAdvertiser(row.bylines)) {
          return false;
        }
        return true;
      })
      .map(row => {
        const adParty = classifyParty(row.page_id, row.bylines);
        const spend = parseFloat(row.total_spend || 0);
        totalSpend += spend;

        return {
          page_id: row.page_id,
          name: row.bylines || `Page ${row.page_id}`,
          party: adParty,
          ad_count: parseInt(row.max_active_ads || 0),
          spend: formatCurrency(spend),
          spendRaw: spend,
          impressions: parseInt(row.total_impressions || 0),
          percentage: '0' // Will be calculated after total is known
        };
      })
      .filter(ad => ad.party !== 'Others'); // Exclude "Others" party

    // Filter by party if specified
    if (party && party !== 'All Parties') {
      advertisers = advertisers.filter(ad => ad.party === party);
    }

    // Limit to top 10
    advertisers = advertisers.slice(0, 10);

    // Calculate percentages
    advertisers.forEach(ad => {
      ad.percentage = totalSpend > 0 ? ((ad.spendRaw / totalSpend) * 100).toFixed(1) : '0';
    });

    return NextResponse.json({
      advertisers,
      totalSpend: formatCurrency(totalSpend)
    });

  } catch (error) {
    console.error('Error fetching top advertisers from daily spend:', error);
    throw error;
  }
}
