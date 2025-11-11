import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatSpendRange } from '@/lib/partyUtils';

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
    let useStateJoin = false;

    // Query from unified schema for state filtering
    if (state && state !== 'All India') {
      queryText = `
        SELECT DISTINCT
          a.id, a.page_id, p.page_name as bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
          a.ad_delivery_stop_time, a.currency, a.platform,
          a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
          r.spend_percentage, r.impressions_percentage
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id::text
        WHERE r.region = $${paramCount}
      `;
      params.push(state);
      paramCount++;
      useStateJoin = true;
    } else if (states) {
      const stateList = states.split(',').filter(s => s.trim());
      if (stateList.length > 0) {
        queryText = `
          SELECT DISTINCT
            a.id, a.page_id, p.page_name as bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
            a.ad_delivery_stop_time, a.currency, a.platform,
            a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
            r.spend_percentage, r.impressions_percentage
          FROM unified.all_ads a
          LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
          LEFT JOIN meta_ads.ad_regions r ON a.id = r.ad_id::text
          WHERE r.region = ANY($${paramCount}::text[])
        `;
        params.push(stateList);
        paramCount++;
        useStateJoin = true;
      }
    }

    // Default query if no state filtering - unified schema
    if (!queryText) {
      queryText = `
        SELECT
          a.id, a.ad_snapshot_url, a.ad_delivery_start_time, a.ad_delivery_stop_time,
          a.page_id, a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
          p.page_name as bylines, a.currency, a.platform
        FROM unified.all_ads a
        LEFT JOIN unified.all_pages p ON a.page_id = p.page_id AND a.platform = p.platform
        WHERE 1=1
      `;
    }

    // Add date filters
    const tablePrefix = useStateJoin ? 'a.' : '';
    if (datePreset) {
      if (datePreset === 'Last 24 hours') {
        queryText += ` AND ${tablePrefix}ad_delivery_start_time >= NOW() - INTERVAL '24 hours'`;
      } else if (datePreset === 'Last 7 days') {
        queryText += ` AND ${tablePrefix}ad_delivery_start_time >= NOW() - INTERVAL '7 days'`;
      } else if (datePreset === 'Last 30 days') {
        queryText += ` AND ${tablePrefix}ad_delivery_start_time >= NOW() - INTERVAL '30 days'`;
      }
    }

    if (startDate) {
      queryText += ` AND ${tablePrefix}ad_delivery_start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND ${tablePrefix}ad_delivery_stop_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    if (search) {
      // Search in bylines and page_id
      queryText += ` AND (a.bylines ILIKE $${paramCount} OR CAST(a.page_id AS TEXT) ILIKE $${paramCount})`;
      params.push(`%${search}%`);
      paramCount++;
    }

    if (sortBy === 'spend') {
      queryText += ` ORDER BY (${tablePrefix}spend_lower + ${tablePrefix}spend_upper) DESC`;
    } else {
      queryText += ` ORDER BY ${tablePrefix}ad_delivery_start_time DESC`;
    }

    queryText += ` LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
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
      
      // Geographic classification - simplified for unified schema
      const geoClassification = {
        states: [],
        regions: {},
        primaryRegion: row.platform || 'Unknown',
        isNational: false,
        stateCount: 0,
        uniqueStates: []
      };

      const firstLocation = row.platform || 'Unknown';

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
        targetLocations: null,
        // Geographic classification
        region: geoClassification.primaryRegion || 'Unknown',
        isNational: geoClassification.isNational || false,
        stateCount: geoClassification.stateCount || 0,
        locationSummary: row.platform || 'Unknown',
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
