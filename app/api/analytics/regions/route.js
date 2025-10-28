import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyParty, formatCurrency } from '@/lib/partyUtils';
import { classifyLocations, getRegion, REGION_COLORS } from '@/lib/geoUtils';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const party = searchParams.get('party');

    let queryText = `
      SELECT 
        target_locations,
        page_id,
        bylines,
        spend_lower,
        spend_upper,
        impressions_lower,
        impressions_upper
      FROM ads
      WHERE target_locations IS NOT NULL
    `;

    const params = [];
    let paramCount = 1;

    if (startDate) {
      queryText += ` AND ad_delivery_start_time >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      queryText += ` AND ad_delivery_stop_time <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    const result = await query(queryText, params);

    // Aggregate by region
    const regionMap = {
      'North': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() },
      'South': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() },
      'East': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() },
      'West': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() },
      'Central': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() },
      'Northeast': { totalSpend: 0, totalImpressions: 0, adCount: 0, parties: { BJP: 0, INC: 0, AAP: 0, Others: 0 }, states: new Set() }
    };

    let nationalCampaigns = 0;
    let totalAds = 0;

    result.rows.forEach(row => {
      const adParty = classifyParty(row.page_id, row.bylines);
      
      // Filter by party if specified
      if (party && party !== 'All Parties' && adParty !== party) {
        return;
      }

      totalAds++;
      const classification = classifyLocations(row.target_locations);
      
      if (classification.isNational) {
        nationalCampaigns++;
      }

      const avgSpend = ((row.spend_lower || 0) + (row.spend_upper || 0)) / 2;
      const avgImpressions = ((row.impressions_lower || 0) + (row.impressions_upper || 0)) / 2;

      // Add to each region the ad targets
      classification.states.forEach(state => {
        const region = state.region;
        if (regionMap[region]) {
          regionMap[region].totalSpend += avgSpend;
          regionMap[region].totalImpressions += avgImpressions;
          regionMap[region].adCount++;
          regionMap[region].parties[adParty] += avgSpend;
          regionMap[region].states.add(state.name);
        }
      });
    });

    // Convert to array and format
    const regions = Object.entries(regionMap).map(([name, data]) => {
      const dominantParty = Object.entries(data.parties).reduce((a, b) => b[1] > a[1] ? b : a)[0];
      
      return {
        region: name,
        spend: formatCurrency(data.totalSpend),
        spendRaw: data.totalSpend,
        impressions: parseInt(data.totalImpressions),
        adCount: data.adCount,
        stateCount: data.states.size,
        states: Array.from(data.states),
        dominantParty: dominantParty,
        partyBreakdown: {
          BJP: formatCurrency(data.parties.BJP),
          INC: formatCurrency(data.parties.INC),
          AAP: formatCurrency(data.parties.AAP),
          Others: formatCurrency(data.parties.Others)
        },
        color: REGION_COLORS[name]
      };
    }).sort((a, b) => b.spendRaw - a.spendRaw);

    const totalSpend = regions.reduce((sum, r) => sum + r.spendRaw, 0);

    // Add percentages
    regions.forEach(region => {
      region.percentage = totalSpend > 0 ? ((region.spendRaw / totalSpend) * 100).toFixed(1) : '0';
    });

    return NextResponse.json({ 
      regions,
      nationalCampaigns,
      totalAds,
      summary: {
        topRegion: regions[0]?.region || 'Unknown',
        leastRegion: regions[regions.length - 1]?.region || 'Unknown',
        totalSpend: formatCurrency(totalSpend)
      }
    });

  } catch (error) {
    console.error('Error fetching regional analytics:', error);
    return NextResponse.json(
      { error: 'Failed to fetch regional analytics', details: error.message },
      { status: 500 }
    );
  }
}
