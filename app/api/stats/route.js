import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty } from '@/lib/partyUtils';
import { statsCache } from '@/lib/cache';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const state = searchParams.get('state');
    const party = searchParams.get('party');

    // Check cache first
    const cacheKey = statsCache.generateKey('stats', { startDate, endDate, state, party });
    const cached = statsCache.get(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Build query with filters
    // Use ad_regions table for state filtering
    let queryText = '';
    const params = [];
    let paramCount = 1;

    if (state && state !== 'All India') {
      // Join with ad_regions for state filtering
      queryText = `
        SELECT DISTINCT
          a.page_id,
          a.bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper,
          r.spend_percentage,
          r.impressions_percentage
        FROM meta_ads.ads a
        JOIN meta_ads.ad_regions r ON a.id = r.ad_id
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - get all ads
      queryText = `
        SELECT
          page_id,
          bylines,
          spend_lower,
          spend_upper,
          impressions_lower,
          impressions_upper
        FROM meta_ads.ads
        WHERE 1=1
      `;
    }

    if (startDate) {
      queryText += ` AND ${state && state !== 'All India' ? 'a.' : ''}ad_delivery_start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND ${state && state !== 'All India' ? 'a.' : ''}ad_delivery_stop_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    const result = await query(queryText, params);

    // Calculate stats with party classification
    let totalAds = 0;
    const uniquePages = new Set();
    let totalSpend = 0;
    let totalImpressions = 0;
    const partyStats = {
      BJP: { count: 0, spend: 0, impressions: 0 },
      INC: { count: 0, spend: 0, impressions: 0 },
      AAP: { count: 0, spend: 0, impressions: 0 },
      'JD(U)': { count: 0, spend: 0, impressions: 0 },
      RJD: { count: 0, spend: 0, impressions: 0 },
      'Jan Suraaj': { count: 0, spend: 0, impressions: 0 },
      Others: { count: 0, spend: 0, impressions: 0 }
    };

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);

      // Apply party filter
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      totalAds++;
      if (row.page_id) uniquePages.add(row.page_id);

      let avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      let avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      // Apply regional percentages if state filter is active
      if (state && state !== 'All India' && row.spend_percentage) {
        avgSpend *= row.spend_percentage;
      }
      if (state && state !== 'All India' && row.impressions_percentage) {
        avgImpressions *= row.impressions_percentage;
      }

      totalSpend += avgSpend;
      totalImpressions += avgImpressions;

      partyStats[adParty].count++;
      partyStats[adParty].spend += avgSpend;
      partyStats[adParty].impressions += avgImpressions;
    });

    const responseData = {
      totalAds,
      totalPages: uniquePages.size,
      totalSpend: parseFloat((totalSpend / 100000).toFixed(2)), // in Lakhs
      totalImpressions: parseInt(totalImpressions),
      avgImpressions: totalAds > 0 ? parseInt(totalImpressions / totalAds) : 0,
      partyBreakdown: {
        BJP: {
          spend: parseFloat((partyStats.BJP.spend / 100000).toFixed(2)),
          count: partyStats.BJP.count,
          impressions: parseInt(partyStats.BJP.impressions)
        },
        INC: {
          spend: parseFloat((partyStats.INC.spend / 100000).toFixed(2)),
          count: partyStats.INC.count,
          impressions: parseInt(partyStats.INC.impressions)
        },
        AAP: {
          spend: parseFloat((partyStats.AAP.spend / 100000).toFixed(2)),
          count: partyStats.AAP.count,
          impressions: parseInt(partyStats.AAP.impressions)
        },
        'JD(U)': {
          spend: parseFloat((partyStats['JD(U)'].spend / 100000).toFixed(2)),
          count: partyStats['JD(U)'].count,
          impressions: parseInt(partyStats['JD(U)'].impressions)
        },
        RJD: {
          spend: parseFloat((partyStats.RJD.spend / 100000).toFixed(2)),
          count: partyStats.RJD.count,
          impressions: parseInt(partyStats.RJD.impressions)
        },
        'Jan Suraaj': {
          spend: parseFloat((partyStats['Jan Suraaj'].spend / 100000).toFixed(2)),
          count: partyStats['Jan Suraaj'].count,
          impressions: parseInt(partyStats['Jan Suraaj'].impressions)
        },
        Others: {
          spend: parseFloat((partyStats.Others.spend / 100000).toFixed(2)),
          count: partyStats.Others.count,
          impressions: parseInt(partyStats.Others.impressions)
        }
      }
    };

    // Cache the response
    statsCache.set(cacheKey, responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching statistics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics', details: error.message },
      { status: 500 }
    );
  }
}
