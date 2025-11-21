
import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatSpendRange } from '@/lib/partyUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    
    const filterParty = searchParams.get('party');
    const state = searchParams.get('state');
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const datePreset = searchParams.get('datePreset');
    const parties = searchParams.get('parties');
    const states = searchParams.get('states');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'date';
    const limit = parseInt(searchParams.get('limit') || 20);
    const offset = parseInt(searchParams.get('offset') || 0);

    let queryText;
    const params = [];
    let paramCount = 1;
    let whereConditions = [];
    let groupByClause = '';
    let selectClause = '';
    let fromClause = '';

    // Build SELECT and FROM clauses with region aggregation
    selectClause = `
      SELECT
        a.id, a.page_id, p.page_name as bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
        a.ad_delivery_stop_time, a.currency, a.platform,
        a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
        ARRAY_AGG(DISTINCT r.region) FILTER (WHERE r.region IS NOT NULL) as regions
    `;

    fromClause = `
      FROM unified.all_ads a
      LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
      LEFT JOIN unified.all_ad_regions r ON CAST(a.id AS TEXT) = r.ad_id AND LOWER(a.platform) = r.platform
    `;

    groupByClause = `
      GROUP BY a.id, a.page_id, p.page_name, a.ad_snapshot_url, a.ad_delivery_start_time,
               a.ad_delivery_stop_time, a.currency, a.platform,
               a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper
    `;

    // Add state filter if specified
    if (state && state !== 'All India') {
      whereConditions.push(`r.region = $${paramCount}`);
      params.push(state);
      paramCount++;
    } else if (states) {
      const stateList = states.split(',').filter(s => s.trim());
      if (stateList.length > 0) {
        whereConditions.push(`r.region = ANY($${paramCount}::text[])`);
        params.push(stateList);
        paramCount++;
      }
    }

    // Add date filters
    if (datePreset) {
      if (datePreset === 'Last 24 hours') {
        whereConditions.push(`a.ad_delivery_start_time >= NOW() - INTERVAL '24 hours'`);
      } else if (datePreset === 'Last 7 days') {
        whereConditions.push(`a.ad_delivery_start_time >= NOW() - INTERVAL '7 days'`);
      } else if (datePreset === 'Last 30 days') {
        whereConditions.push(`a.ad_delivery_start_time >= NOW() - INTERVAL '30 days'`);
      }
    }

    if (startDate) {
      whereConditions.push(`a.ad_delivery_start_time >= $${paramCount}`);
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      whereConditions.push(`a.ad_delivery_stop_time <= $${paramCount}`);
      params.push(endDate);
      paramCount++;
    }

    if (search) {
      whereConditions.push(`(p.page_name ILIKE $${paramCount} OR CAST(a.page_id AS TEXT) ILIKE $${paramCount})`);
      params.push(`%${search}%`);
      paramCount++;
    }

    // Build complete query
    const whereClause = whereConditions.length > 0
      ? `WHERE ${whereConditions.join(' AND ')}`
      : 'WHERE 1=1';

    // Add ORDER BY
    let orderByClause = '';
    if (sortBy === 'spend') {
      orderByClause = ` ORDER BY (a.spend_lower + a.spend_upper) DESC`;
    } else {
      orderByClause = ` ORDER BY a.ad_delivery_start_time DESC`;
    }

    // Combine all parts
    queryText = selectClause + fromClause + whereClause + groupByClause + orderByClause +
                ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    params.push(limit, offset);

    const result = await query(queryText, params);

    const ads = result.rows.map(row => {
      const party = classifyParty(row.page_id, row.bylines);
      const partyColors = {
        BJP: '#FF9933',
        INC: '#138808',
        AAP: '#0073e6',
        'Janata Dal (United)': '#006400',
        RJD: '#008000',
        'Jan Suraaj': '#FF6347',
        LJP: '#9333EA',
        HAM: '#92400E',
        VIP: '#0891B2',
        AIMIM: '#14532D',
        Others: '#64748B'
      };
      
      // Geographic classification - using actual regions from database
      const regions = row.regions || [];
      const regionCount = regions.length;

      const geoClassification = {
        states: regions,
        regions: {},
        primaryRegion: regionCount > 0 ? regions[0] : 'Unknown',
        isNational: regionCount > 5, // Consider national if targeting more than 5 regions
        stateCount: regionCount,
        uniqueStates: regions
      };

      const firstLocation = regionCount > 0 ? regions[0] : 'Unknown';
      const locationSummary = regionCount === 0
        ? 'Unknown'
        : regionCount === 1
          ? regions[0]
          : regionCount > 5
            ? 'National'
            : regions.slice(0, 2).join(', ') + (regionCount > 2 ? ` +${regionCount - 2}` : '');

      return {
        id: row.id,
        title: row.page_id || 'Unknown Ad',
        sponsor: row.bylines || row.page_id || 'Unknown',
        party: party,
        partyColor: partyColors[party] || '#64748B',
        spend: formatSpendRange(row.spend_lower, row.spend_upper),
        spendLower: row.spend_lower,
        spendUpper: row.spend_upper,
        impressions: `${(row.impressions_lower || 0).toLocaleString()} - ${(row.impressions_upper || 0).toLocaleString()}`,
        state: firstLocation,
        targetLocations: regions,
        // Geographic classification
        region: geoClassification.primaryRegion || 'Unknown',
        isNational: geoClassification.isNational || false,
        stateCount: geoClassification.stateCount || 0,
        locationSummary: locationSummary,
        platforms: [row.platform] || [],
        startDate: row.ad_delivery_start_time,
        endDate: row.ad_delivery_stop_time,
        snapshotUrl: row.ad_snapshot_url,
        img: row.ad_snapshot_url, // Use snapshot URL (will show placeholder with "View Ad" link)
        currency: row.currency,
        estimatedAudience: 'N/A'
      };
    }); // Show all ads including 'Others'

    let filteredAds = ads;
    if (filterParty && filterParty !== 'All Parties') {
      filteredAds = ads.filter(ad => ad.party === filterParty);
    } else if (parties) {
      const partyList = parties.split(',').filter(p => p.trim());
      if (partyList.length > 0) {
        filteredAds = ads.filter(ad => partyList.includes(ad.party));
      }
    }

    return NextResponse.json({ ads: filteredAds, total: filteredAds.length, offset, limit });

  } catch (error) {
    console.error('Error fetching ads:', error);
    return NextResponse.json({ error: 'Failed to fetch ads', details: error.message }, { status: 500 });
  }
}
