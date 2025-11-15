import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, isThirdPartyAdvertiser } from '@/lib/partyUtils';
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
          p.page_name as bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper,
          r.spend_percentage
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN unified.all_ad_regions r ON a.id = r.ad_id AND LOWER(a.platform) = r.platform
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - get all ads from unified
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
      BJP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      INC: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      AAP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'Janata Dal (United)': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      RJD: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'Jan Suraaj': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      LJP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      HAM: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      VIP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      AIMIM: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      DMK: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      AITC: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      NCP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      TDP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      AIADMK: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      Others: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 }
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
        avgImpressions *= row.spend_percentage; // Use same percentage for impressions
      }

      totalSpend += avgSpend;
      totalImpressions += avgImpressions;

      partyStats[adParty].count++;
      partyStats[adParty].spend += avgSpend;
      partyStats[adParty].impressions += avgImpressions;

      // Track ALL spending from third-party advertisers (will filter by 20L threshold later)
      if (isThirdPartyAdvertiser(row.bylines)) {
        partyStats[adParty].unofficialSpend += avgSpend;
      }
    });

    // Only show unofficial spend if total is > 20 lakhs (2000000 paise)
    Object.keys(partyStats).forEach(party => {
      if (partyStats[party].unofficialSpend < 2000000) {
        partyStats[party].unofficialSpend = 0;
      }
    });

    const responseData = {
      totalAds,
      totalPages: uniquePages.size,
      totalSpend: parseFloat((totalSpend / 100000).toFixed(2)), // in Lakhs
      totalImpressions: parseInt(totalImpressions),
      avgImpressions: totalAds > 0 ? parseInt(totalImpressions / totalAds) : 0,
      partyBreakdown: Object.fromEntries(
        Object.entries(partyStats).map(([party, stats]) => [
          party,
          {
            spend: parseFloat((stats.spend / 100000).toFixed(2)),
            count: stats.count,
            impressions: parseInt(stats.impressions),
            unofficialSpend: parseFloat((stats.unofficialSpend / 100000).toFixed(2))
          }
        ])
      )
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
