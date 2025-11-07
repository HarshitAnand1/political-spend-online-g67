import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyPerson, getAllPersons } from '@/lib/personUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const person = searchParams.get('person');

    // Query from unified schema
    let queryText;
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Use ad_regions table for efficient state filtering
      queryText = `
        SELECT
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper
        FROM meta_ads.ads a
        LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - query all ads from meta_ads
      queryText = `
        SELECT
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper
        FROM meta_ads.ads a
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
