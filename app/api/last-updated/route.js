import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET() {
  try {
    // Get the latest updated_at timestamp from unified.all_ads
    const result = await query(`
      SELECT MAX(updated_at) as last_updated
      FROM unified.all_ads
    `);

    const lastUpdated = result.rows[0]?.last_updated;

    if (!lastUpdated) {
      return NextResponse.json({
        lastUpdated: null,
        formatted: 'N/A'
      });
    }

    // Format the date (IST timezone)
    const date = new Date(lastUpdated);

    // Format as "11 Nov 2025, 8:30 AM"
    const formatted = date.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });

    return NextResponse.json({
      lastUpdated: lastUpdated,
      formatted: formatted
    });

  } catch (error) {
    console.error('Error fetching last updated date:', error);
    return NextResponse.json(
      { error: 'Failed to fetch last updated date', details: error.message },
      { status: 500 }
    );
  }
}
