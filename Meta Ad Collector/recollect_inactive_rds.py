# The Meta Ad Library API can omit ads in follow-up queries, so our daily collector sometimes
# 'misses' ads that later become inactive. Those ads then remain marked "active" in PoliDashboard
# because they fall outside the collector's 2-day window.
#
# recollect_inactive_real.py fixes this by:
# 1. Finding ads with no stop date (ad_delivery_stop_time) and last collected over 3 days ago.
# 2. Grouping them by page ID and their original date range.
# 3. Re-querying each page ID for the missing ads using a custom traversal.
#
# This is for the NEW "real" database with daily snapshots.
# Because this is slow, run it for each country via cron (e.g. every two weeks).

import os
import sys
from time import sleep
from datetime import datetime, timedelta, date
from collections import defaultdict
from dotenv import load_dotenv

from fb_ads_library_cleanup import FbAdsLibraryTraversal
from push_to_rds import SQLInserter  # Using the RDS database module

# Load environment variables from .env file
load_dotenv()

# Use a separate, dedicated API key for this slow cleanup process to avoid quota conflicts.
# If FACEBOOK_API_KEY_CLEANUP is not set, fall back to the regular API key
api_key = os.environ.get("FACEBOOK_API_KEY_CLEANUP") or os.environ.get("FACEBOOK_API_KEY")

if not api_key:
    print("API key not set. Please set FACEBOOK_API_KEY_CLEANUP or FACEBOOK_API_KEY environment variable.")
    sys.exit(1)

def process_api_batch(country, sql_inserter, page_ids, oldest_ad_time, newest_ad_time, ad_ids_to_check):
    """
    Takes a batch of page_ids and a date range, and re-fetches inactive ads from the API.
    """
    if not page_ids:
        return

    page_ids_str = ",".join([str(x) for x in page_ids])
    print(f"\nProcessing batch of {len(page_ids)} pages. Date range: {oldest_ad_time} to {newest_ad_time}")

    collector = FbAdsLibraryTraversal(
        api_key,
        # Only fetch the fields needed to check status and update the record.
        "id,ad_delivery_stop_time,impressions,spend",  # Added impressions and spend for snapshots
        ".",
        country,
        after_date=oldest_ad_time,
        page_limit=100,
        api_version="v23.0",
        search_page_ids=page_ids_str,
        max_date=newest_ad_time
    )

    updated_count = 0
    daily_snapshots = []  # Collect snapshots for batch insert
    
    for ads_batch in collector.generate_ad_archives():
        for ad in ads_batch:
            # If the API returns an ad we were looking for, it means we have new info.
            # The `insert_ad` function will handle the update via "ON CONFLICT".
            if ad['id'] in ad_ids_to_check:
                # We only need to update if a stop time is now present.
                stop_time = ad.get("ad_delivery_stop_time")
                if stop_time:
                    sql_inserter.insert_ad(ad)
                    
                    # Create snapshot for the STOP DATE, not today
                    try:
                        stop_date = datetime.fromisoformat(stop_time.replace('+00:00', '')).date()
                    except:
                        stop_date = date.today()
                    
                    # Also collect snapshot data
                    daily_snapshots.append((
                        ad['id'],
                        stop_date,
                        ad.get("impressions", {}).get("lower_bound"),
                        ad.get("impressions", {}).get("upper_bound"),
                        ad.get("spend", {}).get("lower_bound"),
                        ad.get("spend", {}).get("upper_bound")
                    ))
                    
                    updated_count += 1
    
    # Insert all snapshots for this batch
    if daily_snapshots:
        sql_inserter.bulk_insert_snapshots(daily_snapshots)
    
    print(f"Found and updated {updated_count} ads in this batch.")


if __name__=="__main__":
    # This script is now hardcoded for India ('IN') as the database only supports one country.
    country = "IN"
    print(f"--- Starting Inactive Ad Cleanup for country: {country} ---")
    
    sql_inserter = SQLInserter(country)

    # The pipeline criteria for the ads are:
    # 1. The ad must have a funding entity (bylines IS NOT NULL).
    # 2. The last time we collected the ad (updated_at) must be more than 2 days ago.
    # 3. The ad_delivery_stop_time is NULL, this indicates that when we last collected it, the ad was ACTIVE.
    
    try:
        # 1. Find all "stale" ads that are still marked as active.
        stale_ad_query = """
            SELECT page_id, ad_delivery_start_time, id
            FROM meta_ads.ads
            WHERE bylines IS NOT NULL 
                AND ad_delivery_stop_time IS NULL
                AND updated_at < %s
            ORDER BY page_id, ad_delivery_start_time;
        """
        
        sql_inserter.cursor.execute(stale_ad_query, (datetime.now() - timedelta(days=2),))
        rows = sql_inserter.cursor.fetchall()

        if not rows:
            print("No ads matching the cleanup criteria. Database is up to date.")
            sys.exit(0)

        print(f"Found {len(rows)} potentially stale ads to check. Grouping them by page for batching.")

        # 2. Group stale ads by the page that published them.
        # defaultdict simplifies the grouping logic.
        pages_to_check = defaultdict(list)
        for page_id, ad_delivery_start_time, ad_id in rows:
            if page_id:
                pages_to_check[page_id].append({'ad_id': str(ad_id), 'start_time': ad_delivery_start_time})

        # 3. Process the pages in batches of 10 for efficient API calls.
        all_page_ids = list(pages_to_check.keys())
        
        for i in range(0, len(all_page_ids), 10):
            page_id_batch = all_page_ids[i:i+10]
            
            # For this batch of pages, find the overall date range and collect all ad IDs.
            ad_ids_in_batch = set()
            oldest_ad_time = None
            newest_ad_time = None

            for page_id in page_id_batch:
                for ad_info in pages_to_check[page_id]:
                    ad_ids_in_batch.add(ad_info['ad_id'])
                    start_time = ad_info['start_time']
                    if oldest_ad_time is None or start_time < oldest_ad_time:
                        oldest_ad_time = start_time
                    if newest_ad_time is None or start_time > newest_ad_time:
                        newest_ad_time = start_time
            
            if not ad_ids_in_batch:
                continue

            # 4. Call the API for the constructed batch.
            process_api_batch(
                country,
                sql_inserter,
                page_id_batch,
                oldest_ad_time.strftime('%Y-%m-%d'),
                newest_ad_time.strftime('%Y-%m-%d'),
                ad_ids_in_batch
            )
        
    except Exception as e:
        print(f"An error occurred during the cleanup process: {e}")
        import traceback
        traceback.print_exc()
    finally:
        print("\n--- Cleanup process finished. ---")
