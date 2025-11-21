import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test 1: Check total ads in unified schema
    const totalAds = await query('SELECT COUNT(*) as count FROM unified.all_ads');

    // Test 2: Check date ranges
    const dateRanges = await query(`
      SELECT
        MIN(ad_delivery_start_time) as earliest_start,
        MAX(ad_delivery_start_time) as latest_start,
        MIN(ad_delivery_stop_time) as earliest_stop,
        MAX(ad_delivery_stop_time) as latest_stop,
        COUNT(*) as total_ads,
        COUNT(CASE WHEN ad_delivery_stop_time IS NULL THEN 1 END) as running_ads
      FROM unified.all_ads
    `);

    // Test 3: Check ads in last 30 days
    const last30Days = await query(`
      SELECT COUNT(*) as count
      FROM unified.all_ads
      WHERE ad_delivery_start_time >= CURRENT_DATE - INTERVAL '30 days'
    `);

    // Test 4: Check ads that are currently running or ran recently
    const recentAds = await query(`
      SELECT COUNT(*) as count
      FROM unified.all_ads
      WHERE ad_delivery_start_time <= CURRENT_DATE
        AND (ad_delivery_stop_time >= CURRENT_DATE - INTERVAL '30 days' OR ad_delivery_stop_time IS NULL)
    `);

    // Test 5: Check spend data
    const spendData = await query(`
      SELECT
        COUNT(*) as ads_with_spend,
        SUM((spend_lower + spend_upper) / 2) as total_spend
      FROM unified.all_ads
      WHERE spend_lower > 0 OR spend_upper > 0
    `);

    // Test 6: Sample of recent ads
    const sampleAds = await query(`
      SELECT
        id,
        page_id,
        ad_delivery_start_time,
        ad_delivery_stop_time,
        spend_lower,
        spend_upper,
        platform
      FROM unified.all_ads
      ORDER BY ad_delivery_start_time DESC
      LIMIT 5
    `);

    return NextResponse.json({
      success: true,
      tests: {
        totalAds: parseInt(totalAds.rows[0].count),
        dateRanges: dateRanges.rows[0],
        adsInLast30Days: parseInt(last30Days.rows[0].count),
        recentRunningAds: parseInt(recentAds.rows[0].count),
        spendStats: {
          adsWithSpend: parseInt(spendData.rows[0].ads_with_spend),
          totalSpend: parseFloat(spendData.rows[0].total_spend || 0)
        },
        sampleAds: sampleAds.rows
      }
    });

  } catch (error) {
    console.error('Test data error:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Test failed',
        details: error.message
      },
      { status: 500 }
    );
  }
}
