import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, isThirdPartyAdvertiser } from '@/lib/partyUtils';
import { statsCache } from '@/lib/cache';

export const dynamic = 'force-dynamic';

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

    // If date filters are present, use daily_spend_by_advertiser for accurate calculations
    if (startDate || endDate) {
      return await getStatsFromDailySpend(startDate, endDate, state, party);
    }

    // Build query with filters (no date filter - use all_ads)
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
        LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
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
      SP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BSP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'Shiv Sena': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BJD: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      YSRCP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BRS: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'CPI(M)': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'JD(S)': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
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

// Helper function to get stats from daily_spend_by_advertiser table
async function getStatsFromDailySpend(startDate, endDate, state, party) {
  try {
    // Query daily spend data with date and state filters
    let queryText = `
      SELECT
        d.advertiser_id as page_id,
        d.advertiser_name as bylines,
        d.platform,
        d.snapshot_date,
        d.total_daily_spend,
        d.total_daily_impressions,
        d.active_ads
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

    const result = await query(queryText, params);

    // Aggregate by advertiser across dates
    const advertiserMap = {};
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
      SP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BSP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'Shiv Sena': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BJD: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      YSRCP: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      BRS: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'CPI(M)': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      'JD(S)': { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 },
      Others: { count: 0, spend: 0, impressions: 0, unofficialSpend: 0 }
    };

    // For state filtering, we need to also check if ads from this advertiser target the state
    let stateFilteredAdvertisers = null;
    if (state && state !== 'All India') {
      // Get advertisers who have ads targeting this state
      const stateQuery = `
        SELECT DISTINCT a.page_id
        FROM unified.all_ads a
        JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
        WHERE r.region = $1
      `;
      const stateResult = await query(stateQuery, [state]);
      stateFilteredAdvertisers = new Set(stateResult.rows.map(row => row.page_id));
    }

    // Aggregate daily spend by advertiser
    result.rows.forEach(row => {
      const advertiserId = row.page_id;
      const adParty = classifyParty(advertiserId, row.bylines);

      // Apply party filter
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      // Apply state filter
      if (stateFilteredAdvertisers && !stateFilteredAdvertisers.has(advertiserId)) {
        return;
      }

      const dailySpend = parseFloat(row.total_daily_spend) || 0;
      const dailyImpressions = parseFloat(row.total_daily_impressions) || 0;

      if (!advertiserMap[advertiserId]) {
        advertiserMap[advertiserId] = {
          bylines: row.bylines,
          party: adParty,
          totalSpend: 0,
          totalImpressions: 0,
          activeAds: row.active_ads || 0
        };
        uniquePages.add(advertiserId);
      }

      advertiserMap[advertiserId].totalSpend += dailySpend;
      advertiserMap[advertiserId].totalImpressions += dailyImpressions;
    });

    // Calculate party stats from aggregated advertiser data
    let totalAds = 0;
    Object.values(advertiserMap).forEach(advertiser => {
      const adParty = advertiser.party;
      const spend = advertiser.totalSpend;
      const impressions = advertiser.totalImpressions;

      totalSpend += spend;
      totalImpressions += impressions;
      totalAds += advertiser.activeAds;

      partyStats[adParty].count += advertiser.activeAds;
      partyStats[adParty].spend += spend;
      partyStats[adParty].impressions += impressions;

      // Track unofficial spend (third-party advertisers)
      if (isThirdPartyAdvertiser(advertiser.bylines)) {
        partyStats[adParty].unofficialSpend += spend;
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
    const cacheKey = statsCache.generateKey('stats', { startDate, endDate, state, party });
    statsCache.set(cacheKey, responseData);

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching daily spend statistics:', error);
    throw error;
  }
}
