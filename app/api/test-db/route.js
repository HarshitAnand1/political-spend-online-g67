import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    // Test basic connection - using unified schema with combined Meta + Google ads
    const result = await query('SELECT current_user, current_database(), COUNT(*) FROM unified.all_ads');

    return NextResponse.json({
      success: true,
      message: 'Database connection successful!',
      data: {
        user: result.rows[0].current_user,
        database: result.rows[0].current_database,
        totalAds: parseInt(result.rows[0].count)
      }
    });

  } catch (error) {
    console.error('Database connection error:', error);
    return NextResponse.json(
      { 
        success: false,
        error: 'Database connection failed', 
        details: error.message 
      },
      { status: 500 }
    );
  }
}
