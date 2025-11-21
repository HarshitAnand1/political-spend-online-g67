import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyPerson, getAllPersons } from '@/lib/personUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const person = searchParams.get('person');

    // If date filters are present, use daily_spend_by_advertiser for accurate calculations
    if (startDate || endDate) {
      return await getPersonSpendFromDailySpend(startDate, endDate, state, person);
    }

    // Query from unified schema (no date filter)
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
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
        LEFT JOIN unified.all_ad_regions r ON a.id = r.ad_id AND LOWER(a.platform) = r.platform
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
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        WHERE 1=1
      `;
    }

    const result = await query(queryText, params);

    // Initialize person stats
    const allPersons = getAllPersons();
    const personStats = {};

    allPersons.forEach(p => {
      personStats[p] = { count: 0, spend: 0, impressions: 0 };
    });
    personStats['Others'] = { count: 0, spend: 0, impressions: 0 };

    // Classify and aggregate
    result.rows.forEach(row => {
      const personName = classifyPerson(row.page_id, row.bylines);

      // Apply person filter if specified
      if (person && person !== 'All Persons' && personName !== person) {
        return;
      }

      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      const avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      personStats[personName].count += 1;
      personStats[personName].spend += avgSpend;
      personStats[personName].impressions += avgImpressions;
    });

    // Convert spend from rupees to lakhs
    Object.keys(personStats).forEach(p => {
      personStats[p].spend = personStats[p].spend / 100000;
    });

    return NextResponse.json({ personStats });

  } catch (error) {
    console.error('Error fetching person spend analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch person spend analytics', details: error.message },
      { status: 500 }
    );
  }
}

// Helper function to get person spend from daily_spend_by_advertiser table
async function getPersonSpendFromDailySpend(startDate, endDate, state, person) {
  try {
    // Query daily spend data with date filters
    let queryText = `
      SELECT
        d.advertiser_id as page_id,
        d.advertiser_name as bylines,
        d.platform,
        SUM(d.total_daily_spend) as total_spend,
        SUM(d.total_daily_impressions) as total_impressions,
        SUM(d.active_ads) as total_ads
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
    `;

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

    // Initialize person stats
    const allPersons = getAllPersons();
    const personStats = {};

    allPersons.forEach(p => {
      personStats[p] = { count: 0, spend: 0, impressions: 0 };
    });
    personStats['Others'] = { count: 0, spend: 0, impressions: 0 };

    // Classify and aggregate
    result.rows.forEach(row => {
      // Apply state filter
      if (stateFilteredAdvertisers && !stateFilteredAdvertisers.has(row.page_id)) {
        return;
      }

      const personName = classifyPerson(row.page_id, row.bylines);

      // Apply person filter if specified
      if (person && person !== 'All Persons' && personName !== person) {
        return;
      }

      const spend = parseFloat(row.total_spend) || 0;
      const impressions = parseFloat(row.total_impressions) || 0;
      const adCount = parseInt(row.total_ads) || 0;

      personStats[personName].count += adCount;
      personStats[personName].spend += spend;
      personStats[personName].impressions += impressions;
    });

    // Convert spend from paise to lakhs
    Object.keys(personStats).forEach(p => {
      personStats[p].spend = personStats[p].spend / 100000;
    });

    return NextResponse.json({ personStats });

  } catch (error) {
    console.error('Error fetching person spend from daily data:', error);
    throw error;
  }
}
