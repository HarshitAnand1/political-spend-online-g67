#!/usr/bin/env python3
"""
Calculate daily spend for a specific snapshot date and populate pre-calculated tables.

Usage:
    python calculate_daily_spend.py 2025-11-10

This should be called AFTER pushing snapshot data to the database.
If you push data on 2025-11-11, the snapshots contain data for 2025-11-10,
so you should run: python calculate_daily_spend.py 2025-11-10
"""

import os
import sys
import psycopg2
from psycopg2.extras import execute_batch
from datetime import datetime, timedelta
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def get_db_connection():
    """Get database connection"""
    return psycopg2.connect(
        host=os.getenv('PG_HOST'),
        user=os.getenv('PG_USER'),
        password=os.getenv('PG_PASSWORD'),
        database=os.getenv('PG_DATABASE')
    )

def calculate_daily_spend_for_date(snapshot_date):
    """
    Calculate daily spend for a specific snapshot_date.
    
    Logic:
    - snapshot_date contains cumulative data UP TO that date
    - daily_spend(snapshot_date) = cumulative(snapshot_date) - cumulative(snapshot_date - 1)
    - If no previous day exists, daily_spend = cumulative_spend (first day of ad)
    """
    
    conn = get_db_connection()
    cur = conn.cursor()
    
    print(f"\n{'='*60}")
    print(f"Calculating daily spend for snapshot_date: {snapshot_date}")
    print(f"{'='*60}\n")
    
    try:
        # Step 1: Calculate daily spend by ad
        print("Step 1: Calculating daily spend per ad...")
        cur.execute("""
            -- Delete existing data for this date (in case of re-run)
            DELETE FROM unified.daily_spend_by_ad_table WHERE snapshot_date = %s;
            
            -- Calculate and insert daily spend per ad
            INSERT INTO unified.daily_spend_by_ad_table (
                platform, ad_id, snapshot_date,
                cumulative_spend, cumulative_impressions,
                daily_spend, daily_impressions,
                spend_lower, spend_upper,
                impressions_lower, impressions_upper
            )
            SELECT 
                current_day.platform,
                current_day.ad_id,
                current_day.snapshot_date,
                current_day.avg_spend as cumulative_spend,
                current_day.avg_impressions as cumulative_impressions,
                -- Daily = current - previous (or current if no previous)
                COALESCE(current_day.avg_spend - prev_day.avg_spend, current_day.avg_spend) as daily_spend,
                COALESCE(current_day.avg_impressions - prev_day.avg_impressions, current_day.avg_impressions) as daily_impressions,
                current_day.spend_lower,
                current_day.spend_upper,
                current_day.impressions_lower,
                current_day.impressions_upper
            FROM (
                -- Current day data
                SELECT 
                    platform,
                    ad_id,
                    snapshot_date,
                    (spend_lower + spend_upper)::numeric / 2.0 as avg_spend,
                    (impressions_lower + impressions_upper)::numeric / 2.0 as avg_impressions,
                    spend_lower,
                    spend_upper,
                    impressions_lower,
                    impressions_upper
                FROM unified.all_daily_snapshots
                WHERE snapshot_date = %s
            ) current_day
            LEFT JOIN (
                -- Previous day data
                SELECT 
                    platform,
                    ad_id,
                    (spend_lower + spend_upper)::numeric / 2.0 as avg_spend,
                    (impressions_lower + impressions_upper)::numeric / 2.0 as avg_impressions
                FROM unified.all_daily_snapshots
                WHERE snapshot_date = (%s::date - INTERVAL '1 day')::date
            ) prev_day ON current_day.platform = prev_day.platform 
                       AND current_day.ad_id = prev_day.ad_id;
        """, (snapshot_date, snapshot_date, snapshot_date))
        
        rows_inserted = cur.rowcount
        print(f"   ✓ Inserted {rows_inserted} ad-level records")
        
        # Step 2: Calculate daily spend by advertiser
        print("\nStep 2: Calculating daily spend per advertiser...")
        cur.execute("""
            -- Delete existing data for this date
            DELETE FROM unified.daily_spend_by_advertiser_table WHERE snapshot_date = %s;
            
            -- Calculate and insert daily spend per advertiser
            INSERT INTO unified.daily_spend_by_advertiser_table (
                platform, advertiser_name, advertiser_id, snapshot_date,
                active_ads, total_daily_spend, total_daily_impressions,
                total_cumulative_spend, total_cumulative_impressions
            )
            WITH ad_advertiser_mapping AS (
                -- Get Meta advertiser info
                SELECT 
                    aa.platform,
                    aa.id as ad_id,
                    mp.page_name AS advertiser_name,
                    aa.page_id AS advertiser_id
                FROM unified.all_ads aa
                INNER JOIN meta_ads.pages mp ON aa.page_id::bigint = mp.page_id
                WHERE aa.platform = 'Meta'
                
                UNION ALL
                
                -- Get Google advertiser info
                SELECT 
                    aa.platform,
                    aa.id as ad_id,
                    ga.advertiser_name,
                    ga.advertiser_id
                FROM unified.all_ads aa
                INNER JOIN google_ads.advertisers ga ON aa.page_id = ga.advertiser_id
                WHERE aa.platform = 'Google'
            )
            SELECT 
                ds.platform,
                aam.advertiser_name,
                aam.advertiser_id,
                ds.snapshot_date,
                COUNT(DISTINCT ds.ad_id) as active_ads,
                SUM(ds.daily_spend) as total_daily_spend,
                SUM(ds.daily_impressions) as total_daily_impressions,
                SUM(ds.cumulative_spend) as total_cumulative_spend,
                SUM(ds.cumulative_impressions) as total_cumulative_impressions
            FROM unified.daily_spend_by_ad_table ds
            INNER JOIN ad_advertiser_mapping aam 
                ON ds.ad_id = aam.ad_id AND ds.platform = aam.platform
            WHERE ds.snapshot_date = %s
            GROUP BY 
                ds.platform,
                aam.advertiser_name,
                aam.advertiser_id,
                ds.snapshot_date;
        """, (snapshot_date, snapshot_date))
        
        advertiser_rows = cur.rowcount
        print(f"   ✓ Inserted {advertiser_rows} advertiser-level records")
        
        # Step 3: Calculate platform-level performance (DISABLED - table not needed)
        # print("\nStep 3: Calculating platform-level performance...")
        # cur.execute("""
        #     -- Delete existing data for this date
        #     DELETE FROM unified.daily_platform_performance_table WHERE snapshot_date = %s;
        #     
        #     -- Calculate and insert platform performance
        #     INSERT INTO unified.daily_platform_performance_table (
        #         platform, snapshot_date, active_ads,
        #         daily_impressions, daily_spend,
        #         cumulative_impressions, cumulative_spend
        #     )
        #     SELECT 
        #         platform,
        #         snapshot_date,
        #         COUNT(DISTINCT ad_id) as active_ads,
        #         SUM(daily_impressions) as daily_impressions,
        #         SUM(daily_spend) as daily_spend,
        #         SUM(cumulative_impressions) as cumulative_impressions,
        #         SUM(cumulative_spend) as cumulative_spend
        #     FROM unified.daily_spend_by_ad_table
        #     WHERE snapshot_date = %s
        #     GROUP BY platform, snapshot_date;
        # """, (snapshot_date, snapshot_date))
        # 
        # platform_rows = cur.rowcount
        # print(f"   ✓ Inserted {platform_rows} platform-level records")
        
        # Commit all changes
        conn.commit()
        
        # Display summary
        print(f"\n{'='*60}")
        print("SUMMARY:")
        print(f"{'='*60}")
        
        cur.execute("""
            SELECT 
                platform,
                COUNT(DISTINCT ad_id) as ads,
                ROUND(SUM(daily_spend)::numeric, 2) as total_daily_spend,
                SUM(daily_impressions)::bigint as total_impressions
            FROM unified.daily_spend_by_ad_table
            WHERE snapshot_date = %s
            GROUP BY platform
            ORDER BY platform;
        """, (snapshot_date,))
        
        for row in cur.fetchall():
            platform, ads, spend, impressions = row
            print(f"{platform:8} | {ads:5} ads | ₹{spend:>12} daily spend | {impressions:>12} impressions")
        
        print(f"\n✓ Daily spend calculation complete for {snapshot_date}")
        print(f"{'='*60}\n")
        
    except Exception as e:
        conn.rollback()
        print(f"\n✗ Error: {e}")
        raise
    finally:
        cur.close()
        conn.close()

def backfill_all_dates():
    """Backfill calculations for all existing snapshot dates"""
    conn = get_db_connection()
    cur = conn.cursor()
    
    print("\n" + "="*60)
    print("BACKFILLING ALL HISTORICAL DATES")
    print("="*60 + "\n")
    
    # Get all distinct snapshot dates
    cur.execute("""
        SELECT DISTINCT snapshot_date 
        FROM unified.all_daily_snapshots 
        ORDER BY snapshot_date;
    """)
    
    dates = [row[0] for row in cur.fetchall()]
    cur.close()
    conn.close()
    
    print(f"Found {len(dates)} dates to process: {dates[0]} to {dates[-1]}\n")
    
    for i, date in enumerate(dates, 1):
        print(f"\n[{i}/{len(dates)}] Processing {date}...")
        calculate_daily_spend_for_date(date)
    
    print("\n" + "="*60)
    print("✓ BACKFILL COMPLETE!")
    print("="*60 + "\n")

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  1. Calculate for specific date:  python calculate_daily_spend.py 2025-11-10")
        print("  2. Backfill all historical dates: python calculate_daily_spend.py --backfill")
        sys.exit(1)
    
    if sys.argv[1] == '--backfill':
        backfill_all_dates()
    else:
        snapshot_date = sys.argv[1]
        # Validate date format
        try:
            datetime.strptime(snapshot_date, '%Y-%m-%d')
        except ValueError:
            print(f"Error: Invalid date format '{snapshot_date}'. Use YYYY-MM-DD format.")
            sys.exit(1)
        
        calculate_daily_spend_for_date(snapshot_date)
