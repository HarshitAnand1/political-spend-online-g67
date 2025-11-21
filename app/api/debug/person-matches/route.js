import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { classifyPerson } from '@/lib/personUtils';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    // Get all ads and classify them
    const queryText = `
      SELECT
        a.page_id,
        a.bylines,
        a.spend_lower,
        a.spend_upper
      FROM meta_ads.ads a
      WHERE a.bylines IS NOT NULL
      LIMIT 1000
    `;

    const result = await query(queryText);

    // Classify and group by person
    const personMatches = {};

    result.rows.forEach(row => {
      const person = classifyPerson(row.page_id, row.bylines);

      if (!personMatches[person]) {
        personMatches[person] = {
          count: 0,
          examples: []
        };
      }

      personMatches[person].count++;

      // Store first 3 examples
      if (personMatches[person].examples.length < 3) {
        personMatches[person].examples.push({
          page_id: row.page_id,
          bylines: row.bylines,
          spend_lower: row.spend_lower,
          spend_upper: row.spend_upper
        });
      }
    });

    return NextResponse.json({
      total_ads_checked: result.rows.length,
      person_matches: personMatches
    });

  } catch (error) {
    console.error('Error in person matches debug:', error);
    return NextResponse.json(
      { error: 'Failed to debug person matches', details: error.message },
      { status: 500 }
    );
  }
}
