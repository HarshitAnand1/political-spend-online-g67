"""
The primary collection script to collect ads from the Facebook Ads Library.
This is for the NEW "real" database with daily snapshots, now configured for AWS RDS by default.
This script collects ads from the past 2 days and inserts them into the RDS SQL database.

To use with AWS RDS:
    - Ensure your environment variables are set for PG_USER, PG_PASSWORD, PG_HOST, PG_DATABASE, PG_PORT.
    - Or edit the defaults in push_to_real_db.py if needed.
    - The script will connect to RDS by default; no local DB config is needed.

This script should be run via cron job or other scheduling tool daily for each country collected.
If you want data for a period longer than 2 days, adjust the arguments accordingly.

More explanation of the script can be found in the README.md file.
"""

import os
import sys
import json
import requests
import argparse

from time import sleep
from datetime import date, datetime, timedelta

from fb_ads_library_api import FbAdsLibraryTraversal
from push_to_rds import SQLInserter  # Using the RDS database module

script_dir = os.path.dirname(os.path.abspath(__file__))
try:
    # Auto-load environment variables from a local .env in the collector folder if present.
    # This is optional and requires `python-dotenv` (install with `pip install python-dotenv`).
    from dotenv import load_dotenv
    load_dotenv(os.path.join(script_dir, '.env'))
except Exception:
    # If python-dotenv is not available or .env is missing, continue —
    # the scripts will still read env vars from the process environment.
    pass

api_key = os.environ.get("FACEBOOK_API_KEY")

if not api_key:
    print("API key not set. Please set the FACEBOOK_API_KEY environment variable.")
    sys.exit(1)

def parse_duration(duration_str):
    """Parses a duration string like '12h', '1d', '30m' into a timedelta."""
    unit = duration_str[-1].lower()
    value = int(duration_str[:-1])
    if unit == 'h':
        return timedelta(hours=value)
    elif unit == 'd':
        return timedelta(days=value)
    elif unit == 'm':
        return timedelta(minutes=value)
    else:
        raise ValueError("Invalid duration unit. Use 'h' for hours, 'd' for days, or 'm' for minutes.")

if __name__=="__main__":
    parser = argparse.ArgumentParser(description="Collect ads from the Facebook Ads Library.")
    parser.add_argument("country", help="The 2-letter country code to collect ads for (e.g., 'IN', 'US').")
    parser.add_argument("--start-date", help="Start date for collection in YYYY-MM-DD format.")
    parser.add_argument("--end-date", help="End date for collection in YYYY-MM-DD format.")
    parser.add_argument("--last", help="Collect ads from the last specified duration (e.g., '12h', '1d', '30m').")
    parser.add_argument("--ad-id", help="Fetch and print data for a single ad ID, then exit.")
    
    args = parser.parse_args()

        # If --ad-id is used, fetch and update data for a single ad ID, then exit.
    if args.ad_id:
        print(f"Attempting to fetch and update data for single ad ID: {args.ad_id}")
        fields = "id,ad_creation_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,currency,delivery_by_region,demographic_distribution,bylines,impressions,languages,page_id,page_name,publisher_platforms,spend,target_locations,target_gender,target_ages,estimated_audience_size"
        api_version = "v23.0"

        # Using the search_terms parameter for a direct ID lookup.
        url = (
            f"https://graph.facebook.com/{api_version}/ads_archive?"
            f"search_terms={args.ad_id}&"
            f"ad_type=POLITICAL_AND_ISSUE_ADS&"
            f"ad_reached_countries=['{args.country}']&"
            f"fields={fields}&"
            f"access_token={api_key}"
        )
        
        try:
            response = requests.get(url)
            response.raise_for_status()
            data = response.json()

            if data and data.get('data'):
                ad_data = data['data'][0]
                print("Successfully fetched new data for the ad.")
                
                # Use the existing SQLInserter to update the database
                sql_inserter = SQLInserter(args.country)
                sql_inserter.insert_ad(ad_data)
                
                # Also insert a daily snapshot for this ad
                # Use yesterday's date since we run this at 1-2AM and collect previous day's data
                snapshot_date = date.today() - timedelta(days=1)
                snapshot = [(
                    ad_data['id'],
                    snapshot_date,
                    ad_data.get("impressions", {}).get("lower_bound"),
                    ad_data.get("impressions", {}).get("upper_bound"),
                    ad_data.get("spend", {}).get("lower_bound"),
                    ad_data.get("spend", {}).get("upper_bound")
                )]
                sql_inserter.bulk_insert_snapshots(snapshot)
                
                print(f"Successfully updated ad {args.ad_id} in the database.")

            else:
                print("API returned no data for this ad ID. Database was not updated.")
                print("Full API response:", json.dumps(data, indent=2))
            
        except requests.exceptions.RequestException as e:
            print(f"Error fetching ad data: {e}")
            if 'response' in locals():
                print(f"Response content: {response.text}")
        except Exception as e:
            print(f"An unexpected error occurred: {e}")
            
        sys.exit(0)
    
    country = args.country
    after_date = None
    before_date = None
    
    country = args.country
    after_date = None
    before_date = None
    filter_start_time = None

    if args.last:
        # Relative time mode
        duration = parse_duration(args.last)
        filter_start_time = datetime.now() - duration
        after_date = filter_start_time.strftime('%Y-%m-%d')
        before_date = date.today().strftime('%Y-%m-%d')
        print(f"Collecting ads for country '{country}' from the last {args.last} (since {filter_start_time.strftime('%Y-%m-%d %H:%M:%S')})")
    elif args.start_date:
        # Date range mode
        after_date = args.start_date
        before_date = args.end_date if args.end_date else date.today().strftime('%Y-%m-%d')
        print(f"Collecting ads for country '{country}' from {after_date} to {before_date}")
    else:
        # Default mode: last 24 hours
        filter_start_time = datetime.now() - timedelta(days=1)
        after_date = filter_start_time.strftime('%Y-%m-%d')
        before_date = date.today().strftime('%Y-%m-%d')
        print(f"No date range specified. Defaulting to the last 24 hours for country '{country}'.")

    print(f"Beginning ad collection at: {datetime.now()}")

    page_limit = 100
    n = 0

    # --- TESTING TOGGLE ---
    # Set TESTING to True to limit the number of ads collected.
    # Set it to False for a normal, full collection run.
    TESTING = False
    TEST_LIMIT = 1
    
    # Batch size for daily snapshot inserts
    BATCH_SIZE = 100  # Insert snapshots every 100 ads during testing
    AD_COMMIT_BATCH = 50  # Commit ads every 50 instead of 100 for better balance
    # --------------------
            
    try:
        collector = FbAdsLibraryTraversal(
            api_key,
            "id,ad_creation_time,ad_creative_bodies,ad_creative_link_captions,ad_creative_link_descriptions,ad_creative_link_titles,ad_delivery_start_time,ad_delivery_stop_time,ad_snapshot_url,currency,delivery_by_region,demographic_distribution,bylines,impressions,languages,page_id,page_name,publisher_platforms,spend,target_locations,target_gender,target_ages,estimated_audience_size",
            ".",
            country,
            after_date=after_date,
            before_date=before_date,
            page_limit=page_limit,
            api_version="v23.0", # Current version as of Sep 2025
        )

        sql_inserter = SQLInserter(country)
        
        n = 0
        daily_snapshots = []  # Collect snapshots for batch insert
        
        collection_complete = False
        for ads in collector.generate_ad_archives():
            if ads:
                batch_size = len(ads)
                ads_in_batch_processed = 0
                for ad in ads:
                    # If in relative time mode, filter by active delivery time
                    if filter_start_time:
                        start_time_str = ad.get("ad_delivery_start_time")
                        stop_time_str = ad.get("ad_delivery_stop_time")
                        
                        # An ad is considered active in the window if its delivery period
                        # overlaps with the user's requested time window.
                        # [ad_start, ad_stop] overlaps with [filter_start, now]
                        
                        is_active_in_window = False
                        if start_time_str:
                            # Parse start time, ignoring timezone for direct comparison
                            ad_start_time = datetime.fromisoformat(start_time_str.split('+')[0])
                            
                            # If the ad has a stop time
                            if stop_time_str:
                                ad_stop_time = datetime.fromisoformat(stop_time_str.split('+')[0])
                                # Overlap condition: (StartA <= EndB) and (EndA >= StartB)
                                if ad_start_time <= datetime.now() and ad_stop_time >= filter_start_time:
                                    is_active_in_window = True
                            # If the ad is still running (no stop time)
                            else:
                                # Check if it started before the window ended
                                if ad_start_time <= datetime.now():
                                    is_active_in_window = True
                        
                        if not is_active_in_window:
                            continue # Skip ad if it was not active in the window
                    
                    # Insert/Update ad in main tables (no auto-commit, batch commit later)
                    sql_inserter.insert_ad(ad, auto_commit=False)
                    
                    # Collect daily snapshot data (don't insert yet)
                    # Use yesterday's date since we run this at 1-2AM and collect previous day's data
                    snapshot_date = date.today() - timedelta(days=1)
                    daily_snapshots.append((
                        ad['id'],
                        snapshot_date,
                        ad.get("impressions", {}).get("lower_bound"),
                        ad.get("impressions", {}).get("upper_bound"),
                        ad.get("spend", {}).get("lower_bound"),
                        ad.get("spend", {}).get("upper_bound")
                    ))
                    
                    n += 1
                    ads_in_batch_processed += 1
                    
                    # Progress indicator
                    if n % 10 == 0:
                        print(f"  → Processed {n} ads so far...")
                    
                    # Commit every AD_COMMIT_BATCH ads for better balance
                    if ads_in_batch_processed % AD_COMMIT_BATCH == 0:
                        sql_inserter.connection.commit()
                    
                    # When we reach batch size, insert snapshots
                    if len(daily_snapshots) >= BATCH_SIZE:
                        sql_inserter.bulk_insert_snapshots(daily_snapshots)
                        daily_snapshots = []  # Clear for next batch
                    
                    # Check if the testing limit has been reached
                    if TESTING and n >= TEST_LIMIT:
                        print(f"\n--- Testing limit of {TEST_LIMIT} ads reached. Stopping collection. ---")
                        collection_complete = True
                        break
                
                # Commit all ads in this batch at once
                sql_inserter.connection.commit()
                
                print(f"Fetched a batch of {batch_size} ads. Processed {ads_in_batch_processed} ads within the time window. Total collected so far: {n}")

                # If we are in relative time mode and a full batch was fetched but nothing was processed,
                # it means we have reached ads older than our time window.
                if filter_start_time and batch_size == page_limit and ads_in_batch_processed == 0:
                    print("Found a full page of ads older than the specified time window. Stopping collection.")
                    collection_complete = True

            if collection_complete:
                break

            if not ads:
                print("[DIAGNOSTIC] Received an empty batch of ads. There may be no ads matching the criteria.")
                break # Exit if there are no more ads to fetch

        # Insert any remaining snapshots after the loop
        if daily_snapshots:
            sql_inserter.bulk_insert_snapshots(daily_snapshots)
            print(f"Inserted final batch of {len(daily_snapshots)} snapshots")

    except Exception as e:
        print("Encountered Error!")
        print(e)
    finally:
        print(f'Got {n} ads | on {str(datetime.now())}')
        print('Finished ad collection for country: ', country, "\nAt: ", datetime.now())
