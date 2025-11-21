import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, isThirdPartyAdvertiser } from '@/lib/partyUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    let startDate = searchParams.get('startDate');
    let endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const party = searchParams.get('party');

    // Default to last 30 days if no date range specified (prevents full table scan)
    if (!startDate && !endDate) {
      const today = new Date();
      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(today.getDate() - 30);
      
      startDate = thirtyDaysAgo.toISOString().split('T')[0];
      endDate = today.toISOString().split('T')[0];
      console.log(`✅ Dashboard API: Using default 30-day range: ${startDate} to ${endDate}`);
    } else {
      console.log(`✅ Dashboard API: Using provided date range: ${startDate || 'none'} to ${endDate || 'none'}`);
    }

    // Run all queries in parallel for maximum performance
    const [statsResult, topAdvertisersResult, geoResult] = await Promise.all([
      getStats(startDate, endDate, state, party),
      getTopAdvertisers(startDate, endDate, state, party, 10),
      getGeography(startDate, endDate, party, 10)
    ]);

    // Get trends data (optimized single query)
    const trendsResult = await getTrends(30, party, state);

    return NextResponse.json({
      stats: statsResult,
      topAdvertisers: topAdvertisersResult.advertisers || [],
      geography: geoResult.states || [],
      trends: trendsResult.lineSeries || { labels: [], BJP: [], INC: [], AAP: [], Others: [] },
      timestamp: new Date().toISOString()
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
      }
    });

  } catch (error) {
    console.error('Dashboard API error:', error.message);
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data', details: error.message },
      { status: 500 }
    );
  }
}

// Helper: Get stats (optimized)
async function getStats(startDate, endDate, state, party) {
  let queryText = '';
  const params = [];
  let paramCount = 1;

  if (state && state !== 'All India') {
    queryText = `
      SELECT DISTINCT
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
      WHERE r.region = $${paramCount}
    `;
    params.push(state);
    paramCount++;
  } else {
    queryText = `
      SELECT
        a.page_id,
        p.page_name as bylines,
        a.spend_lower,
        a.spend_upper,
        a.impressions_lower,
        a.impressions_upper
      FROM unified.all_ads a
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      WHERE 1=1
    `;
  }

  // Filter for ads active during the date range (started before end date, ended after start date)
  if (startDate && endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (startDate) {
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  const result = await query(queryText, params);

  let totalAds = 0;
  const uniquePages = new Set();
  let totalSpend = 0;
  let totalImpressions = 0;
  const partyStats = {
    BJP: { count: 0, spend: 0, impressions: 0 },
    INC: { count: 0, spend: 0, impressions: 0 },
    AAP: { count: 0, spend: 0, impressions: 0 },
    'Janata Dal (United)': { count: 0, spend: 0, impressions: 0 },
    RJD: { count: 0, spend: 0, impressions: 0 },
    Others: { count: 0, spend: 0, impressions: 0 }
  };

  result.rows.forEach(row => {
    const adParty = classifyParty(row.page_id, row.bylines);
    if (party && party !== 'All Parties' && adParty !== party) return;

    totalAds++;
    if (row.page_id) uniquePages.add(row.page_id);

    let avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
    let avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

    if (state && state !== 'All India' && row.spend_percentage) {
      avgSpend *= row.spend_percentage;
      avgImpressions *= row.spend_percentage;
    }

    totalSpend += avgSpend;
    totalImpressions += avgImpressions;

    if (!partyStats[adParty]) partyStats[adParty] = { count: 0, spend: 0, impressions: 0 };
    partyStats[adParty].count++;
    partyStats[adParty].spend += avgSpend;
    partyStats[adParty].impressions += avgImpressions;
  });

  return {
    totalAds,
    totalPages: uniquePages.size,
    totalSpend: parseFloat((totalSpend / 100000).toFixed(2)),
    totalImpressions: parseInt(totalImpressions),
    avgImpressions: totalAds > 0 ? parseInt(totalImpressions / totalAds) : 0,
    partyBreakdown: Object.fromEntries(
      Object.entries(partyStats).map(([party, stats]) => [
        party,
        {
          spend: parseFloat((stats.spend / 100000).toFixed(2)),
          count: stats.count,
          impressions: parseInt(stats.impressions)
        }
      ])
    )
  };
}

// Helper: Get top advertisers (optimized)
async function getTopAdvertisers(startDate, endDate, state, party, limit) {
  let queryText;
  const params = [];
  let paramCount = 1;

  if (state && state !== 'All India') {
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
    queryText = `
      SELECT
        a.page_id,
        p.page_name as bylines,
        COUNT(*) as ad_count,
        SUM((a.spend_lower + a.spend_upper) / 2) as total_spend
      FROM unified.all_ads a
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      WHERE 1=1
    `;
  }

  // Filter for ads active during the date range
  if (startDate && endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (startDate) {
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  queryText += `
    GROUP BY a.page_id, p.page_name
    HAVING SUM((a.spend_lower + a.spend_upper) / 2) > 0
    ORDER BY total_spend DESC
    LIMIT $${paramCount}
  `;
  params.push(limit * 2);

  const result = await query(queryText, params);

  const advertisers = result.rows
    .map(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      const spend = parseFloat(row.total_spend || 0);
      return {
        page_id: row.page_id,
        name: row.bylines || `Page ${row.page_id}`,
        party: adParty,
        ad_count: parseInt(row.ad_count),
        spendRaw: spend
      };
    })
    .filter(ad => party && party !== 'All Parties' ? ad.party === party : true)
    .slice(0, limit);

  return { advertisers };
}

// Helper: Get geography data (optimized with SQL filtering)
async function getGeography(startDate, endDate, party, limit) {
  const validStates = ['Delhi', 'Maharashtra', 'Karnataka', 'Tamil Nadu', 'West Bengal', 
    'Gujarat', 'Rajasthan', 'Uttar Pradesh', 'Madhya Pradesh', 'Bihar', 'Andhra Pradesh',
    'Telangana', 'Kerala', 'Odisha', 'Punjab', 'Haryana', 'Assam', 'Jharkhand', 'Chhattisgarh'];

  let queryText = `
    SELECT
      r.region as state_name,
      a.page_id,
      p.page_name as bylines,
      a.spend_lower,
      a.spend_upper,
      r.spend_percentage
    FROM unified.all_ads a
    LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
    LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
    WHERE r.region = ANY($1::text[])
  `;

  const params = [validStates];
  let paramCount = 2;

  // Filter for ads active during the date range
  if (startDate && endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (startDate) {
    queryText += ` AND a.ad_delivery_stop_time >= $${paramCount}`;
    params.push(startDate);
    paramCount++;
  } else if (endDate) {
    queryText += ` AND a.ad_delivery_start_time <= $${paramCount}`;
    params.push(endDate);
    paramCount++;
  }

  const result = await query(queryText, params);

  const stateMap = {};

  result.rows.forEach(row => {
    const adParty = classifyParty(row.page_id, row.bylines);
    if (party && party !== 'All Parties' && adParty !== party) return;

    const stateName = row.state_name;
    const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
    const regionalSpend = avgSpend * (row.spend_percentage || 1);

    if (!stateMap[stateName]) {
      stateMap[stateName] = { state: stateName, totalSpend: 0, adCount: 0 };
    }

    stateMap[stateName].totalSpend += regionalSpend;
    stateMap[stateName].adCount++;
  });

  const states = Object.values(stateMap)
    .sort((a, b) => b.totalSpend - a.totalSpend)
    .slice(0, limit);

  return { states };
}

// Helper: Get trends (OPTIMIZED - single query with JOIN)
async function getTrends(days, filterParty, state) {
  // Single optimized query with all JOINs
  let queryText = `
    SELECT
      d.snapshot_date::date as date,
      d.daily_spend,
      a.page_id,
      p.page_name as bylines,
      d.platform
    FROM unified.daily_spend_by_ad d
    JOIN unified.all_ads a ON d.ad_id = CAST(a.id AS TEXT) AND d.platform = a.platform
    LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
    WHERE d.snapshot_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
      AND d.daily_spend > 0
  `;

  const params = [];
  let paramCount = 1;

  // Add state filter via JOIN if specified
  if (state && state !== 'All India') {
    queryText = `
      SELECT
        d.snapshot_date::date as date,
        d.daily_spend,
        a.page_id,
        p.page_name as bylines,
        d.platform
      FROM unified.daily_spend_by_ad d
      JOIN unified.all_ads a ON d.ad_id = CAST(a.id AS TEXT) AND d.platform = a.platform
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      JOIN unified.all_ad_regions r ON d.ad_id = r.ad_id AND d.platform = r.platform
      WHERE d.snapshot_date >= CURRENT_DATE - INTERVAL '${parseInt(days)} days'
        AND d.daily_spend > 0
        AND r.region = $${paramCount}
    `;
    params.push(state);
    paramCount++;
  }

  queryText += ' ORDER BY d.snapshot_date ASC';

  const result = await query(queryText, params);

  const datePartyMap = {};
  const allDates = new Set();

  result.rows.forEach(row => {
    const adParty = classifyParty(row.page_id, row.bylines);

    if (filterParty && filterParty !== 'All Parties' && adParty !== filterParty) return;

    const dateStr = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    allDates.add(dateStr);

    if (!datePartyMap[dateStr]) {
      datePartyMap[dateStr] = { BJP: 0, INC: 0, AAP: 0, 'Janata Dal (United)': 0, RJD: 0, Others: 0 };
    }

    datePartyMap[dateStr][adParty] += parseFloat(row.daily_spend) || 0;
  });

  const sortedDates = Array.from(allDates).sort((a, b) => {
    return new Date(a + ', 2024') - new Date(b + ', 2024');
  });

  const lineSeries = {
    labels: sortedDates,
    BJP: sortedDates.map(date => parseFloat((datePartyMap[date]?.BJP || 0) / 100000).toFixed(2)),
    INC: sortedDates.map(date => parseFloat((datePartyMap[date]?.INC || 0) / 100000).toFixed(2)),
    AAP: sortedDates.map(date => parseFloat((datePartyMap[date]?.AAP || 0) / 100000).toFixed(2)),
    'Janata Dal (United)': sortedDates.map(date => parseFloat((datePartyMap[date]?.['Janata Dal (United)'] || 0) / 100000).toFixed(2)),
    RJD: sortedDates.map(date => parseFloat((datePartyMap[date]?.RJD || 0) / 100000).toFixed(2)),
    Others: sortedDates.map(date => parseFloat((datePartyMap[date]?.Others || 0) / 100000).toFixed(2))
  };

  return { lineSeries };
}
