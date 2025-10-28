import { NextResponse } from 'next/server'
import { query } from '@/lib/db'

export async function GET() {
  try {
    // Fetch spending data by party
    const spendQuery = `
      SELECT 
        page_id as party,
        SUM((spend_lower + spend_upper) / 2) as total_spend
      FROM ads
      GROUP BY page_id
      ORDER BY total_spend DESC
      LIMIT 10
    `;
    const spendResult = await query(spendQuery);
    
    const spendData = {};
    spendResult.rows.forEach(row => {
      spendData[row.party] = parseFloat((row.total_spend / 100000).toFixed(2)); // Convert to Lakhs
    });

    // Fetch trend data for the last 7 days
    const trendQuery = `
      SELECT 
        DATE(ad_delivery_start_time) as date,
        page_id as party,
        SUM((spend_lower + spend_upper) / 2) as daily_spend
      FROM ads
      WHERE ad_delivery_start_time >= NOW() - INTERVAL '7 days'
      GROUP BY DATE(ad_delivery_start_time), page_id
      ORDER BY date ASC
    `;
    const trendResult = await query(trendQuery);

    const dateMap = {};
    const parties = new Set();

    trendResult.rows.forEach(row => {
      const dateStr = new Date(row.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dateMap[dateStr]) {
        dateMap[dateStr] = {};
      }
      dateMap[dateStr][row.party] = parseFloat((row.daily_spend / 100000).toFixed(2));
      parties.add(row.party);
    });

    const labels = Object.keys(dateMap);
    const lineSeries = { labels };

    parties.forEach(party => {
      lineSeries[party] = labels.map(label => dateMap[label][party] || 0);
    });

    // Fetch recent ads
    const adsQuery = `
      SELECT 
        id,
        ad_snapshot_url,
        page_id,
        bylines,
        spend_lower,
        spend_upper,
        ad_delivery_start_time,
        target_locations,
        publisher_platforms
      FROM ads
      ORDER BY ad_delivery_start_time DESC
      LIMIT 20
    `;
    const adsResult = await query(adsQuery);

    const ads = adsResult.rows.map(ad => ({
      id: ad.id.toString(),
      img: ad.ad_snapshot_url || `https://placehold.co/600x320/ccc/333?text=${encodeURIComponent(ad.page_id || 'Ad')}`,
      party: ad.page_id || 'Unknown',
      partyColor: '#6B7280',
      sponsor: ad.bylines || ad.page_id || 'Unknown',
      spend: `₹${(ad.spend_lower / 100000).toFixed(1)}L - ₹${(ad.spend_upper / 100000).toFixed(1)}L`,
      spendValue: (ad.spend_lower + ad.spend_upper) / 200000, // Average in Lakhs
      state: Object.keys(ad.target_locations || {})[0] || 'Unknown',
      createdAt: ad.ad_delivery_start_time,
    }));

    return NextResponse.json({ spendData, lineSeries, ads });

  } catch (error) {
    console.error('Error fetching data:', error);
    // Fallback to mock data on error
    const { spendData, lineSeries, ads } = await import('@/data/spendData');
    return NextResponse.json({ spendData, lineSeries, ads });
  }
}
