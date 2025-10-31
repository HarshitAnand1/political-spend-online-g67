import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatSpendRange } from '@/lib/partyUtils';
import { classifyLocations, formatLocationSummary } from '@/lib/geoUtils';

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

    // Optimized state filtering using ad_regions JOIN
    if (state && state !== 'All India') {
      queryText = `
        SELECT DISTINCT
          a.id, a.page_id, a.bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
          a.ad_delivery_stop_time, a.currency, a.target_locations, a.publisher_platforms,
          a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
          a.estimated_audience_size_lower, a.estimated_audience_size_upper,
          r.spend_percentage, r.impressions_percentage
        FROM ads a
        JOIN ad_regions r ON a.id = r.ad_id
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
            a.id, a.page_id, a.bylines, a.ad_snapshot_url, a.ad_delivery_start_time,
            a.ad_delivery_stop_time, a.currency, a.target_locations, a.publisher_platforms,
            a.spend_lower, a.spend_upper, a.impressions_lower, a.impressions_upper,
            a.estimated_audience_size_lower, a.estimated_audience_size_upper,
            r.spend_percentage, r.impressions_percentage
          FROM ads a
          JOIN ad_regions r ON a.id = r.ad_id
          WHERE r.region = ANY($${paramCount}::text[])
        `;
        params.push(stateList);
        paramCount++;
        useStateJoin = true;
      }
    }

    // Default query if no state filtering
    if (!queryText) {
      queryText = `
        SELECT
          id, ad_snapshot_url, ad_delivery_start_time, ad_delivery_stop_time,
          page_id, spend_lower, spend_upper, impressions_lower, impressions_upper,
          target_locations, publisher_platforms, bylines, currency,
          estimated_audience_size_lower, estimated_audience_size_upper
        FROM ads WHERE 1=1
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
      queryText += ` AND (${tablePrefix}bylines ILIKE $${paramCount} OR ${tablePrefix}page_id ILIKE $${paramCount})`;
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
        'JD(U)': '#006400',
        RJD: '#008000',
        'Jan Suraaj': '#FF6347',
        Others: '#64748B'
      };
      
      // Classify geographic locations with error handling
      let geoClassification;
      try {
        geoClassification = classifyLocations(row.target_locations);
      } catch (e) {
        console.error('Error classifying locations:', e);
        geoClassification = {
          states: [],
          regions: {},
          primaryRegion: 'Unknown',
          isNational: false,
          stateCount: 0,
          uniqueStates: []
        };
      }
      
      // Parse target_locations if it's a string, otherwise use as-is
      let locations = row.target_locations;
      if (typeof locations === 'string') {
        try {
          locations = JSON.parse(locations);
        } catch (e) {
          locations = null;
        }
      }
      
      const firstLocation = Array.isArray(locations) && locations.length > 0 
        ? locations[0]?.name || 'Unknown' 
        : 'Unknown';
      
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
        targetLocations: row.target_locations,
        // Geographic classification
        region: geoClassification.primaryRegion || 'Unknown',
        isNational: geoClassification.isNational || false,
        stateCount: geoClassification.stateCount || 0,
        locationSummary: formatLocationSummary(geoClassification),
        platforms: row.publisher_platforms,
        startDate: row.ad_delivery_start_time,
        endDate: row.ad_delivery_stop_time,
        snapshotUrl: row.ad_snapshot_url,
        img: row.ad_snapshot_url, // Add for AdCard
        currency: row.currency,
        estimatedAudience: `${(row.estimated_audience_size_lower || 0).toLocaleString()} - ${(row.estimated_audience_size_upper || 0).toLocaleString()}`
      };
    }).filter(ad => ad.party !== 'Others'); // Only show classified ads (BJP, INC, AAP)

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
