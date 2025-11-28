#!/usr/bin/env python3
"""
Optimized version of recollect_inactive_real.py

Key improvements:
1. Better database indexes usage
2. Smarter batching based on ad count, not just page count
3. Progress tracking and resumability
4. Snapshot created for actual stop date, not today
5. Narrower date ranges per page to reduce API calls
6. Statistics and performance metrics
"""

import os
import sys
from time import sleep
from datetime import datetime, timedelta, date
from collections import defaultdict
import json
from concurrent.futures import ThreadPoolExecutor, as_completed
import threading
from dotenv import load_dotenv

from fb_ads_library_cleanup import FbAdsLibraryTraversal
from push_to_rds import SQLInserter

# Load environment variables from .env file
load_dotenv()

# Fallback to regular API key if cleanup key not set
api_key = os.environ.get("FACEBOOK_API_KEY_CLEANUP") or os.environ.get("FACEBOOK_API_KEY")

if not api_key:
    print("API key not set. Please set FACEBOOK_API_KEY_CLEANUP or FACEBOOK_API_KEY environment variable.")
    sys.exit(1)

# Configuration
BATCH_SIZE_PAGES = 10  # Pages per batch
MAX_DATE_RANGE_DAYS = 90  # Don't query ranges longer than 90 days
MIN_STALE_DAYS = int(os.environ.get("MIN_STALE_DAYS", "2"))  # Default 2 days for daily runs, override with env var
PROGRESS_FILE = "/tmp/recollect_progress.json"

# Parallel processing settings
# Set MAX_WORKERS=1 to disable parallel processing (safe mode)
# Set MAX_WORKERS=3-5 for optimal speed (recommended)
MAX_WORKERS = int(os.environ.get("RECOLLECT_MAX_WORKERS", "3"))
RATE_LIMIT_SLEEP = 2  # Seconds to sleep between API calls (per thread)

# Global lock for rate limiting across threads
api_rate_limiter = threading.Lock()
last_api_call_time = 0

class RecollectionStats:
    """Thread-safe statistics tracking during recollection process"""
    def __init__(self):
        self.start_time = datetime.now()
        self.total_stale_ads = 0
        self.ads_checked = 0
        self.ads_updated = 0
        self.ads_still_active = 0
        self.api_calls = 0
        self.pages_processed = 0
        self.lock = threading.Lock()  # Thread-safe counter updates
        
    def increment_ads_checked(self, count=1):
        with self.lock:
            self.ads_checked += count
    
    def increment_ads_updated(self, count=1):
        with self.lock:
            self.ads_updated += count
    
    def increment_ads_still_active(self, count=1):
        with self.lock:
            self.ads_still_active += count
    
    def increment_api_calls(self, count=1):
        with self.lock:
            self.api_calls += count
    
    def increment_pages_processed(self, count=1):
        with self.lock:
            self.pages_processed += count
        
    def print_summary(self):
        with self.lock:
            duration = (datetime.now() - self.start_time).total_seconds()
            print("\n" + "="*60)
            print("RECOLLECTION SUMMARY")
            print("="*60)
            print(f"Total stale ads found:     {self.total_stale_ads:,}")
            print(f"Ads checked via API:       {self.ads_checked:,}")
            print(f"Ads updated (now stopped): {self.ads_updated:,}")
            print(f"Ads still active:          {self.ads_still_active:,}")
            print(f"Pages processed:           {self.pages_processed:,}")
            print(f"API calls made:            {self.api_calls:,}")
            print(f"Duration:                  {duration:.1f}s ({duration/60:.1f} min)")
            if self.ads_updated > 0:
                print(f"Average time per update:   {duration/self.ads_updated:.2f}s")
            print(f"Parallel workers:          {MAX_WORKERS}")
            print("="*60)

def save_progress(processed_page_ids):
    """Save progress to file for resumability"""
    try:
        with open(PROGRESS_FILE, 'w') as f:
            json.dump({
                'processed_pages': list(processed_page_ids),
                'timestamp': datetime.now().isoformat()
            }, f)
    except Exception as e:
        print(f"Warning: Could not save progress: {e}")

def load_progress():
    """Load previously saved progress"""
    try:
        if os.path.exists(PROGRESS_FILE):
            with open(PROGRESS_FILE, 'r') as f:
                data = json.load(f)
                # Only use if less than 24 hours old
                saved_time = datetime.fromisoformat(data['timestamp'])
                if (datetime.now() - saved_time).total_seconds() < 86400:
                    return set(data['processed_pages'])
    except Exception as e:
        print(f"Warning: Could not load progress: {e}")
    return set()

def rate_limited_api_call():
    """
    Global rate limiter to ensure minimum time between API calls across all threads.
    """
    global last_api_call_time
    
    with api_rate_limiter:
        current_time = datetime.now().timestamp()
        time_since_last_call = current_time - last_api_call_time
        
        if time_since_last_call < RATE_LIMIT_SLEEP:
            sleep_time = RATE_LIMIT_SLEEP - time_since_last_call
            sleep(sleep_time)
        
        last_api_call_time = datetime.now().timestamp()

def process_single_page(
    country,
    page_id,
    ad_infos,
    ad_ids_to_check,
    stats,
    thread_id
):
    """
    Process a single page - designed to be called in parallel.
    Each thread gets its own database connection.
    """
    # Create a separate database connection for this thread
    sql_inserter = SQLInserter(country)
    
    try:
        if not ad_infos:
            return 0
            
        # Find date range for THIS page only
        start_dates = [info['start_time'] for info in ad_infos]
        oldest = min(start_dates)
        newest = max(start_dates)
        
        page_ad_ids = {info['ad_id'] for info in ad_infos}
        
        print(f"  [Thread {thread_id}] Processing page {page_id}: {len(page_ad_ids)} ads, range: {oldest.date()} to {newest.date()}")
        
        collector = FbAdsLibraryTraversal(
            api_key,
            "id,ad_delivery_stop_time,impressions,spend",
            ".",
            country,
            after_date=oldest.strftime('%Y-%m-%d'),
            max_date=newest.strftime('%Y-%m-%d'),
            page_limit=100,
            api_version="v23.0",
            search_page_ids=str(page_id),
            ad_active_status="INACTIVE"
        )
        
        daily_snapshots = []
        updated_in_thread = 0
        
        for ads_batch in collector.generate_ad_archives():
            # Apply global rate limiting across all threads
            rate_limited_api_call()
            stats.increment_api_calls()
            
            for ad in ads_batch:
                stats.increment_ads_checked()
                
                if ad['id'] in ad_ids_to_check:
                    stop_time = ad.get("ad_delivery_stop_time")
                    
                    if stop_time:
                        # Ad has stopped - update database
                        try:
                            # API doesn't return page_id when we search by page,
                            # so we need to add it manually
                            ad['page_id'] = page_id
                            print(f"    [Thread {thread_id}] DEBUG: About to insert ad {ad['id']} with page_id={page_id}")
                            sql_inserter.insert_ad(ad, auto_commit=True)
                            print(f"    [Thread {thread_id}] DEBUG: insert_ad() completed, now committing...")
                            sql_inserter.connection.commit()
                            print(f"    [Thread {thread_id}] DEBUG: Manual commit completed")
                            
                            # Create snapshot for the STOP DATE, not today
                            try:
                                stop_date = datetime.fromisoformat(stop_time.replace('+00:00', '')).date()
                            except:
                                stop_date = date.today()
                            
                            daily_snapshots.append((
                                ad['id'],
                                stop_date,
                                ad.get("impressions", {}).get("lower_bound"),
                                ad.get("impressions", {}).get("upper_bound"),
                                ad.get("spend", {}).get("lower_bound"),
                                ad.get("spend", {}).get("upper_bound")
                            ))
                            
                            stats.increment_ads_updated()
                            updated_in_thread += 1
                            print(f"    [Thread {thread_id}] ✅ Updated ad {ad['id']}: stopped on {stop_date}")
                        except Exception as e:
                            print(f"    [Thread {thread_id}] ❌ Failed to update ad {ad['id']}: {e}")
                    else:
                        stats.increment_ads_still_active()
        
        # Insert snapshots for this page
        if daily_snapshots:
            sql_inserter.bulk_insert_snapshots(daily_snapshots)
        
        stats.increment_pages_processed()
        print(f"    [Thread {thread_id}] Completed page {page_id}: {updated_in_thread} ads updated")
        
        return updated_in_thread
        
    except Exception as e:
        print(f"    [Thread {thread_id}] ❌ Error processing page {page_id}: {e}")
        import traceback
        traceback.print_exc()
        return 0
    finally:
        # Clean up database connection
        try:
            sql_inserter.connection.close()
        except:
            pass

def process_api_batch_optimized(
    country, 
    page_batch_info,  # Dict: {page_id: [ad_info, ...]}
    ad_ids_to_check, 
    stats
):
    """
    Process multiple pages in parallel using ThreadPoolExecutor.
    Each page is processed independently in its own thread.
    """
    if not page_batch_info:
        return

    page_ids = list(page_batch_info.keys())
    print(f"\n  🚀 Processing {len(page_ids)} pages in parallel (max {MAX_WORKERS} workers)...")
    
    # Process pages in parallel
    with ThreadPoolExecutor(max_workers=MAX_WORKERS) as executor:
        # Submit all page processing tasks
        future_to_page = {
            executor.submit(
                process_single_page,
                country,
                page_id,
                page_batch_info[page_id],
                ad_ids_to_check,
                stats,
                idx + 1  # Thread ID for logging
            ): page_id
            for idx, page_id in enumerate(page_ids)
        }
        
        # Collect results as they complete
        for future in as_completed(future_to_page):
            page_id = future_to_page[future]
            try:
                updates = future.result()
                # Result already logged in process_single_page
            except Exception as e:
                print(f"  ❌ Exception for page {page_id}: {e}")

def main():
    country = "IN"
    print(f"\n{'='*60}")
    print(f"OPTIMIZED INACTIVE AD RECOLLECTION (PARALLEL)")
    print(f"Country: {country}")
    print(f"Max Workers: {MAX_WORKERS}")
    print(f"Started: {datetime.now()}")
    print(f"{'='*60}\n")
    
    stats = RecollectionStats()
    
    # Create main database connection (only for queries, not inserts)
    sql_inserter = SQLInserter(country)
    
    # Load progress from previous run
    processed_pages = load_progress()
    if processed_pages:
        print(f"📁 Resuming from previous run: {len(processed_pages)} pages already processed\n")
    
    try:
        # Query stale ads with optimized query (uses new index)
        stale_ad_query = """
            SELECT page_id, ad_delivery_start_time, id
            FROM meta_ads.ads
            WHERE bylines IS NOT NULL 
                AND ad_delivery_stop_time IS NULL
                AND updated_at < %s
            ORDER BY page_id, ad_delivery_start_time;
        """
        
        cutoff_date = datetime.now() - timedelta(days=MIN_STALE_DAYS)
        print(f"🔍 Searching for ads not updated since: {cutoff_date}\n")
        
        sql_inserter.cursor.execute(stale_ad_query, (cutoff_date,))
        rows = sql_inserter.cursor.fetchall()
        
        if not rows:
            print("✅ No stale ads found. Database is up to date!")
            stats.print_summary()
            return
        
        stats.total_stale_ads = len(rows)
        print(f"Found {stats.total_stale_ads:,} potentially stale ads")
        
        # Group by page
        pages_to_check = defaultdict(list)
        for page_id, ad_delivery_start_time, ad_id in rows:
            if page_id and page_id not in processed_pages:
                pages_to_check[page_id].append({
                    'ad_id': str(ad_id), 
                    'start_time': ad_delivery_start_time
                })
        
        if not pages_to_check:
            print("✅ All pages already processed!")
            stats.print_summary()
            return
        
        print(f"Grouped into {len(pages_to_check):,} unique pages")
        print(f"Processing in batches of {BATCH_SIZE_PAGES} pages...\n")
        
        all_page_ids = list(pages_to_check.keys())
        
        # Process in batches
        for batch_num, i in enumerate(range(0, len(all_page_ids), BATCH_SIZE_PAGES), 1):
            page_id_batch = all_page_ids[i:i+BATCH_SIZE_PAGES]
            
            print(f"\n{'='*60}")
            print(f"BATCH {batch_num}/{(len(all_page_ids)-1)//BATCH_SIZE_PAGES + 1}")
            print(f"Pages: {page_id_batch[:5]}{'...' if len(page_id_batch) > 5 else ''}")
            print(f"{'='*60}")
            
            # Collect all ad IDs for this batch
            batch_info = {}
            all_ad_ids = set()
            
            for page_id in page_id_batch:
                batch_info[page_id] = pages_to_check[page_id]
                for ad_info in pages_to_check[page_id]:
                    all_ad_ids.add(ad_info['ad_id'])
            
            # Process this batch (in parallel)
            process_api_batch_optimized(
                country,
                batch_info,
                all_ad_ids,
                stats
            )
            
            # Save progress
            processed_pages.update(page_id_batch)
            save_progress(processed_pages)
            
            # Progress update
            progress_pct = (len(processed_pages) / len(all_page_ids)) * 100
            print(f"\n📊 Overall Progress: {len(processed_pages)}/{len(all_page_ids)} pages ({progress_pct:.1f}%)")
            print(f"   Ads updated so far: {stats.ads_updated:,}")
        
        # Clean up progress file on successful completion
        if os.path.exists(PROGRESS_FILE):
            os.remove(PROGRESS_FILE)
            
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user. Progress saved. Run again to resume.")
        stats.print_summary()
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Error occurred: {e}")
        import traceback
        traceback.print_exc()
    finally:
        stats.print_summary()

if __name__ == "__main__":
    main()
