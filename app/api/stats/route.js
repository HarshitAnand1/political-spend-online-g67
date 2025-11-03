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
      // Join with ad_regions for state filtering (only available for Meta ads)
      queryText = `
        SELECT DISTINCT
          a.page_id,
          COALESCE(m.bylines, p.page_name, '') as bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper,
          a.platform,
          r.spend_percentage,
          r.impressions_percentage
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
        LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id AND a.platform = 'Meta'
        WHERE (r.region = $${paramCount} OR a.platform != 'Meta')
      `;
      params.push(state);
      paramCount++;
    } else {
      // No state filter - get all ads from unified schema (Meta + Google)
      queryText = `
        SELECT
          a.page_id,
          COALESCE(m.bylines, p.page_name, '') as bylines,
          a.spend_lower,
          a.spend_upper,
          a.impressions_lower,
          a.impressions_upper,
          a.platform
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN meta_ads.ads m ON a.id = m.id AND a.platform = 'Meta'
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
      'Janata Dal (United)': { count: 0, spend: 0, impressions: 0 },
      RJD: { count: 0, spend: 0, impressions: 0 },
      'Jan Suraaj': { count: 0, spend: 0, impressions: 0 },
      LJP: { count: 0, spend: 0, impressions: 0 },
      HAM: { count: 0, spend: 0, impressions: 0 },
      VIP: { count: 0, spend: 0, impressions: 0 },
      AIMIM: { count: 0, spend: 0, impressions: 0 },
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
        'Janata Dal (United)': {
          spend: parseFloat((partyStats['Janata Dal (United)'].spend / 100000).toFixed(2)),
          count: partyStats['Janata Dal (United)'].count,
          impressions: parseInt(partyStats['Janata Dal (United)'].impressions)
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
        LJP: {
          spend: parseFloat((partyStats.LJP.spend / 100000).toFixed(2)),
          count: partyStats.LJP.count,
          impressions: parseInt(partyStats.LJP.impressions)
        },
        HAM: {
          spend: parseFloat((partyStats.HAM.spend / 100000).toFixed(2)),
          count: partyStats.HAM.count,
          impressions: parseInt(partyStats.HAM.impressions)
        },
        VIP: {
          spend: parseFloat((partyStats.VIP.spend / 100000).toFixed(2)),
          count: partyStats.VIP.count,
          impressions: parseInt(partyStats.VIP.impressions)
        },
        AIMIM: {
          spend: parseFloat((partyStats.AIMIM.spend / 100000).toFixed(2)),
          count: partyStats.AIMIM.count,
          impressions: parseInt(partyStats.AIMIM.impressions)
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
