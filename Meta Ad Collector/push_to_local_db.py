# This script contains class responsible for converting Meta's ad data into SQL
# This is for the LOCAL database with daily snapshots (for fast collection).
# Use sync_to_rds.py to transfer data to AWS RDS after collection.
# It is necessary to define your environment variables in a .env file or in your current session

# By default, ssh tunneling is disabled, if you want to use it, set the use_tunnel parameter to True
# When initializing the SQLInserter class.

import os
import psycopg2
import traceback
import math
from datetime import datetime, date
from dotenv import load_dotenv
from sshtunnel import SSHTunnelForwarder
import json
import time

# Load environment variables from .env file
load_dotenv()


def load_sql_env():
    # Local PostgreSQL Configuration - Reads from environment variables, fallback to local defaults
    return {
        "pg_user": os.environ.get("LOCAL_PG_USER", "postgres"),
        "pg_password": os.environ.get("LOCAL_PG_PASSWORD", ""),
        "pg_host": os.environ.get("LOCAL_PG_HOST", "localhost"),
        "pg_database": os.environ.get("LOCAL_PG_DATABASE", "real_political_ads_db"),
        "pg_port": int(os.environ.get("LOCAL_PG_PORT", 5432)),
    }


def remove_nul_chars(value):
    if isinstance(value, str):
        return value.replace("\x00", "")
    return value


class SQLInserter:
    def __init__(self, country, use_tunnel=False):
        self.country = country
        self.env = load_sql_env()
        self.connection = None
        self.cursor = None
        # SSH Tunneling is not needed for a local database connection.
        # If you need it later for a remote DB, this logic can be restored.
        self.tunnel = None
        # Buffer for snapshots that couldn't be inserted because their ad rows
        # were not present yet (e.g. due to transient DB disconnect during ad insert).
        # These will be retried on subsequent bulk_insert_snapshots calls.
        self.pending_snapshots = []
        # In-memory cache of ad IDs we've successfully inserted in this run
        # to avoid querying the DB every time we insert snapshots
        self.known_ad_ids = set()
        self.connect_db()

    def connect_db(self):
        try:
            # Close old connection/cursor if they exist
            if self.cursor:
                try:
                    self.cursor.close()
                except Exception:
                    pass
            if self.connection:
                try:
                    self.connection.close()
                except Exception:
                    pass
            
            # Use connect_timeout and TCP keepalive parameters to make the
            # connection more resilient to transient network issues.
            self.connection = psycopg2.connect(
                host=self.env["pg_host"],
                port=self.env["pg_port"],
                user=self.env["pg_user"],
                password=self.env["pg_password"],
                dbname=self.env["pg_database"],
                connect_timeout=10,
                keepalives=1,
                keepalives_idle=60,
                keepalives_interval=10,
                keepalives_count=5,
            )
            self.cursor = self.connection.cursor()
            # Performance optimizations for RDS
            self.cursor.execute("SET client_encoding TO 'utf8'")
            self.cursor.execute("SET synchronous_commit TO OFF")  # Faster commits for bulk inserts
            self.cursor.execute("SET work_mem TO '256MB'")  # More memory for sorting/indexing
            self.connection.commit()
            print(f"Postgres database '{self.env['pg_database']}' connection established!")
        except Exception as e:
            print("Database connection error:", e)
            traceback.print_exc()
            raise  # Re-raise so caller can handle retry logic

    def ensure_connection(self):
        """Ensure connection is alive; reconnect if closed."""
        try:
            if not self.connection or getattr(self.connection, 'closed', 1) != 0:
                print("DB connection closed or missing, reconnecting...")
                try:
                    self.connect_db()
                except Exception:
                    # give caller a chance to retry
                    raise
        except Exception:
            # In some rare cases connection attributes may be missing
            print("Problem checking DB connection, reconnecting...")
            self.connect_db()

    def get_ids(self):
        try:
            # The 'country' column is no longer in the main ads table.
            # This query now just gets all ad IDs.
            self.cursor.execute("SELECT id FROM meta_ads.ads")
            ids = [str(row[0]) for row in self.cursor.fetchall()]
            print(f"Total ids in database: {len(ids)}")
            return ids
        except Exception as e:
            print("Error fetching ids for sql:", e)
            traceback.print_exc()
            return []

    def get_counts(self, region=False, demographic=False):
        try:
            table_name = "meta_ads.ads"
            if region:
                table_name = "meta_ads.ad_regions"
            elif demographic:
                table_name = "meta_ads.ad_demographics"

            # Using f-string here is safe because table_name is controlled internally.
            self.cursor.execute(f"SELECT COUNT(DISTINCT id) FROM {table_name}")
            count = self.cursor.fetchone()[0]
            print(f"Total distinct ads in {table_name}: {count}")
            return count
        except Exception as e:
            print("Error fetching counts for sql:", e)
            traceback.print_exc()
            return 0

    def insert_ad(self, fb_ad, check_latest=False, auto_commit=True):
        """Insert or update a single ad with simple retry on connection failures.

        This method will attempt to reconnect and retry up to a few times if the
        DB connection is dropped mid-run (common with long-running remote
        processes against RDS).
        """
        ad_id = fb_ad.get("id")
        page_id = fb_ad.get("page_id")
        page_name = fb_ad.get("page_name")

        if not ad_id or not page_id:
            print(f"Skipping ad due to missing ad_id or page_id.")
            return

        retries = 3
        # Use longer delays for network issues (5min, 10min, 15min)
        # This gives time for WiFi to reconnect after laptop sleep/wake or network disruptions
        backoff = 300  # 5 minutes
        for attempt in range(1, retries + 1):
            try:
                # Ensure connection is alive before operations
                self.ensure_connection()

                # 1. Smart Page Update (only if name changed)
                if page_name:
                    try:
                        # Check if page exists and if name is different
                        self.cursor.execute(
                            "SELECT page_name FROM meta_ads.pages WHERE page_id = %s",
                            (page_id,)
                        )
                        result = self.cursor.fetchone()

                        if result is None:
                            insert_page_query = """
                                INSERT INTO meta_ads.pages (page_id, page_name)
                                VALUES (%s, %s);
                            """
                            self.cursor.execute(insert_page_query, (page_id, page_name))

                        elif result[0] != page_name:
                            update_page_query = """
                                UPDATE meta_ads.pages SET page_name = %s, updated_at = now()
                                WHERE page_id = %s;
                            """
                            self.cursor.execute(update_page_query, (page_name, page_id))

                    except Exception as e:
                        print(f"Error handling page {page_id}: {e}")
                        try:
                            self.connection.rollback()
                        except Exception:
                            pass

                def to_pg_array(val):
                    if val is None:
                        return None
                    return list(val)

                def to_jsonb(val):
                    if val is None:
                        return None
                    return json.dumps(val)

                # 2. Check if ad already exists in the database
                self.cursor.execute("SELECT 1 FROM meta_ads.ads WHERE id = %s", (ad_id,))
                ad_exists = self.cursor.fetchone() is not None

                if ad_exists:
                    try:
                        update_ad_query = """
                            UPDATE meta_ads.ads SET
                                impressions_lower = %s,
                                impressions_upper = %s,
                                spend_lower = %s,
                                spend_upper = %s,
                                ad_delivery_stop_time = %s,
                                updated_at = now()
                            WHERE id = %s;
                        """
                        self.cursor.execute(update_ad_query, (
                            fb_ad.get("impressions", {}).get("lower_bound"),
                            fb_ad.get("impressions", {}).get("upper_bound"),
                            fb_ad.get("spend", {}).get("lower_bound"),
                            fb_ad.get("spend", {}).get("upper_bound"),
                            fb_ad.get("ad_delivery_stop_time"),
                            ad_id
                        ))
                    except Exception as e:
                        print(f"Error updating existing ad {ad_id}: {e}")
                        try:
                            self.connection.rollback()
                        except Exception:
                            pass
                        return

                else:
                    # NEW AD: Insert everything into all tables
                    try:
                        upsert_ad_query = """
                            INSERT INTO meta_ads.ads (
                                id, ad_creation_time, ad_delivery_start_time, ad_delivery_stop_time,
                                ad_snapshot_url, bylines, currency, estimated_audience_size_lower,
                                estimated_audience_size_upper, impressions_lower, impressions_upper,
                                languages, page_id, publisher_platforms, spend_lower, spend_upper,
                                target_ages, target_gender, target_locations
                            ) VALUES (
                                %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
                            )
                            ON CONFLICT (id) DO UPDATE SET
                                ad_creation_time = EXCLUDED.ad_creation_time,
                                ad_delivery_start_time = EXCLUDED.ad_delivery_start_time,
                                ad_delivery_stop_time = EXCLUDED.ad_delivery_stop_time,
                                ad_snapshot_url = EXCLUDED.ad_snapshot_url,
                                bylines = EXCLUDED.bylines,
                                currency = EXCLUDED.currency,
                                estimated_audience_size_lower = EXCLUDED.estimated_audience_size_lower,
                                estimated_audience_size_upper = EXCLUDED.estimated_audience_size_upper,
                                impressions_lower = EXCLUDED.impressions_lower,
                                impressions_upper = EXCLUDED.impressions_upper,
                                languages = EXCLUDED.languages,
                                page_id = EXCLUDED.page_id,
                                publisher_platforms = EXCLUDED.publisher_platforms,
                                spend_lower = EXCLUDED.spend_lower,
                                spend_upper = EXCLUDED.spend_upper,
                                target_ages = EXCLUDED.target_ages,
                                target_gender = EXCLUDED.target_gender,
                                target_locations = EXCLUDED.target_locations,
                                updated_at = now();
                        """
                        self.cursor.execute(upsert_ad_query, (
                            ad_id,
                            fb_ad.get("ad_creation_time"),
                            fb_ad.get("ad_delivery_start_time"),
                            fb_ad.get("ad_delivery_stop_time"),
                            fb_ad.get("ad_snapshot_url"),
                            fb_ad.get("bylines"),
                            fb_ad.get("currency"),
                            fb_ad.get("estimated_audience_size", {}).get("lower_bound"),
                            fb_ad.get("estimated_audience_size", {}).get("upper_bound"),
                            fb_ad.get("impressions", {}).get("lower_bound"),
                            fb_ad.get("impressions", {}).get("upper_bound"),
                            to_pg_array(fb_ad.get("languages")),
                            page_id,
                            to_pg_array(fb_ad.get("publisher_platforms")),
                            fb_ad.get("spend", {}).get("lower_bound"),
                            fb_ad.get("spend", {}).get("upper_bound"),
                            fb_ad.get("target_ages"),
                            fb_ad.get("target_gender"),
                            to_jsonb(fb_ad.get("target_locations"))
                        ))
                    except Exception as e:
                        print(f"Error inserting new ad {ad_id}: {e}")
                        try:
                            self.connection.rollback()
                        except Exception:
                            pass
                        return

                    try:
                        upsert_creative_query = """
                            INSERT INTO meta_ads.ad_creative_content (
                                ad_id, ad_creative_bodies, ad_creative_link_captions,
                                ad_creative_link_descriptions, ad_creative_link_titles
                            ) VALUES (%s, %s, %s, %s, %s)
                            ON CONFLICT (ad_id) DO NOTHING;
                        """
                        self.cursor.execute(upsert_creative_query, (
                            ad_id,
                            to_pg_array(fb_ad.get("ad_creative_bodies")),
                            to_pg_array(fb_ad.get("ad_creative_link_captions")),
                            to_pg_array(fb_ad.get("ad_creative_link_descriptions")),
                            to_pg_array(fb_ad.get("ad_creative_link_titles"))
                        ))
                    except Exception as e:
                        print(f"Error inserting creative content for ad {ad_id}: {e}")
                        try:
                            self.connection.rollback()
                        except Exception:
                            pass

                    delivery_by_region = fb_ad.get("delivery_by_region", [])
                    if delivery_by_region:
                        for region_data in delivery_by_region:
                            try:
                                region = region_data.get("region")
                                spend_percentage = self.safe_numeric(region_data.get("percentage"))
                                impressions_percentage = None

                                insert_region_query = """
                                    INSERT INTO meta_ads.ad_regions (ad_id, region, spend_percentage, impressions_percentage)
                                    VALUES (%s, %s, %s, %s)
                                    ON CONFLICT (ad_id, region) DO NOTHING;
                                """
                                self.cursor.execute(insert_region_query, (ad_id, region, spend_percentage, impressions_percentage))
                            except (psycopg2.OperationalError, psycopg2.InterfaceError) as db_err:
                                # Re-raise connection errors to trigger outer retry logic
                                print(f"Connection error inserting region data for ad {ad_id}: {db_err}")
                                raise
                            except Exception as e:
                                print(f"Error inserting region data for ad {ad_id}: {e}")
                                try:
                                    self.connection.rollback()
                                except Exception:
                                    pass

                    demographic_distribution = fb_ad.get("demographic_distribution", [])
                    if demographic_distribution:
                        for demo_data in demographic_distribution:
                            try:
                                age_group = demo_data.get("age")
                                gender = demo_data.get("gender")
                                spend_percentage = self.safe_numeric(demo_data.get("percentage"))
                                impressions_percentage = None

                                insert_demo_query = """
                                    INSERT INTO meta_ads.ad_demographics (ad_id, age_group, gender, spend_percentage, impressions_percentage)
                                    VALUES (%s, %s, %s, %s, %s)
                                    ON CONFLICT (ad_id, age_group, gender) DO NOTHING;
                                """
                                self.cursor.execute(insert_demo_query, (ad_id, age_group, gender, spend_percentage, impressions_percentage))
                            except (psycopg2.OperationalError, psycopg2.InterfaceError) as db_err:
                                # Re-raise connection errors to trigger outer retry logic
                                print(f"Connection error inserting demographic data for ad {ad_id}: {db_err}")
                                raise
                            except Exception as e:
                                print(f"Error inserting demographic data for ad {ad_id}: {e}")
                                try:
                                    self.connection.rollback()
                                except Exception:
                                    pass

                if auto_commit:
                    self.connection.commit()

                # success
                return

            except (psycopg2.OperationalError, psycopg2.InterfaceError) as db_err:
                error_msg = str(db_err).lower()
                is_network_error = any(keyword in error_msg for keyword in 
                    ['could not translate', 'nodename', 'network', 'timeout', 'connection refused'])
                
                if is_network_error:
                    print(f"Network error on attempt {attempt}/{retries}: {db_err}")
                    print(f"Waiting {backoff}s ({backoff//60} minutes) for network to stabilize...")
                else:
                    print(f"DB connection error on attempt {attempt}/{retries}: {db_err}")
                
                try:
                    # Close stale connection and cursor
                    if self.cursor:
                        try:
                            self.cursor.close()
                        except Exception:
                            pass
                    if self.connection:
                        try:
                            self.connection.close()
                        except Exception:
                            pass
                    
                    # Wait before reconnecting
                    time.sleep(backoff)
                    
                    # Try to reconnect
                    self.connect_db()
                    
                    # Longer backoff: 5min → 10min → 15min
                    backoff += 300  # Add 5 minutes each time
                    continue
                    
                except Exception as ex:
                    print(f"Reconnect failed: {ex}")
                    if attempt == retries:
                        print(f"Failed to insert ad {ad_id} after {retries} attempts")
                        raise
                    else:
                        # If reconnect fails, wait even longer before next attempt
                        extra_wait = backoff
                        print(f"Waiting additional {extra_wait}s ({extra_wait//60} minutes) before retry...")
                        time.sleep(extra_wait)
                        backoff += 300
                        continue

            except Exception as e:
                print(f"An unexpected error occurred processing ad {ad_id}: {e}")
                try:
                    self.connection.rollback()
                except Exception:
                    pass
                traceback.print_exc()
                return

    def safe_numeric(self, value):
        """Convert value to a numeric type, or None if conversion fails."""
        if value is None:
            return None
        try:
            # Attempt to convert to float, then to int if that fails
            return int(value)
        except (ValueError, TypeError):
            try:
                return float(value)
            except ValueError:
                return None

    def bulk_insert_snapshots(self, snapshots):
        """
        Insert multiple daily snapshots in one batch transaction.
        
        Args:
            snapshots: List of tuples (ad_id, snapshot_date, impressions_lower, 
                       impressions_upper, spend_lower, spend_upper)
        
        Note: created_at is automatically set by database DEFAULT (now())
        """
        if not snapshots:
            return
            
        retries = 3
        # Use longer delays for network issues (5min, 10min, 15min)
        backoff = 300  # 5 minutes
        for attempt in range(1, retries + 1):
            try:
                self.ensure_connection()
                insert_query = """
                    INSERT INTO meta_ads.ad_daily_snapshots 
                    (ad_id, snapshot_date, impressions_lower, impressions_upper, spend_lower, spend_upper)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON CONFLICT (ad_id, snapshot_date) DO UPDATE SET
                        impressions_lower = EXCLUDED.impressions_lower,
                        impressions_upper = EXCLUDED.impressions_upper,
                        spend_lower = EXCLUDED.spend_lower,
                        spend_upper = EXCLUDED.spend_upper,
                        created_at = now();
                """

                # Prepend any previously pending snapshots that failed due to missing ad rows
                if getattr(self, 'pending_snapshots', None):
                    if self.pending_snapshots:
                        snapshots = self.pending_snapshots + list(snapshots)
                        self.pending_snapshots = []

                # Ensure we only insert snapshots for ads that already exist to avoid FK violations.
                ad_ids = list({s[0] for s in snapshots})
                existing_ids = set()
                if ad_ids:
                    # Cast ad_ids to bigint to match the id column type
                    ad_ids_as_bigint = [int(aid) for aid in ad_ids]
                    self.cursor.execute("SELECT id FROM meta_ads.ads WHERE id = ANY(%s)", (ad_ids_as_bigint,))
                    existing_ids = {str(row[0]) for row in self.cursor.fetchall()}

                snapshots_existing = [s for s in snapshots if s[0] in existing_ids]
                snapshots_missing = [s for s in snapshots if s[0] not in existing_ids]

                if snapshots_existing:
                    self.cursor.executemany(insert_query, snapshots_existing)
                    self.connection.commit()
                    print(f"Successfully inserted/updated {len(snapshots_existing)} daily snapshots")
                else:
                    print("No snapshots to insert now (waiting for corresponding ad rows)")

                if snapshots_missing:
                    # Buffer missing snapshots to retry later when their ad rows exist
                    self.pending_snapshots.extend(snapshots_missing)
                    print(f"Buffered {len(snapshots_missing)} snapshots because their ad rows were not present yet")

                return
                
            except (psycopg2.OperationalError, psycopg2.InterfaceError) as db_err:
                error_msg = str(db_err).lower()
                is_network_error = any(keyword in error_msg for keyword in 
                    ['could not translate', 'nodename', 'network', 'timeout', 'connection refused'])
                
                if is_network_error:
                    print(f"Network error during bulk snapshots on attempt {attempt}/{retries}: {db_err}")
                    print(f"Waiting {backoff}s ({backoff//60} minutes) for network to stabilize...")
                else:
                    print(f"DB connection error during bulk snapshots on attempt {attempt}/{retries}: {db_err}")
                
                try:
                    # Close stale connection and cursor
                    if self.cursor:
                        try:
                            self.cursor.close()
                        except Exception:
                            pass
                    if self.connection:
                        try:
                            self.connection.close()
                        except Exception:
                            pass
                    
                    # Wait before reconnecting
                    time.sleep(backoff)
                    
                    # Try to reconnect
                    self.connect_db()
                    
                    # Longer backoff: 5min → 10min → 15min
                    backoff += 300  # Add 5 minutes each time
                    continue
                    
                except Exception as ex:
                    print(f"Reconnect failed during bulk snapshots: {ex}")
                    if attempt == retries:
                        print(f"Failed to insert {len(snapshots)} snapshots after {retries} attempts")
                        raise
                    else:
                        # If reconnect fails, wait even longer before next attempt
                        extra_wait = backoff
                        print(f"Waiting additional {extra_wait}s ({extra_wait//60} minutes) before retry...")
                        time.sleep(extra_wait)
                        backoff += 300
                        continue
                        
            except Exception as e:
                print(f"Error bulk inserting snapshots: {e}")
                try:
                    self.connection.rollback()
                except Exception:
                    pass
                traceback.print_exc()
                return

    def close_db(self):
        if self.cursor:
            self.cursor.close()
        if self.connection:
            self.connection.close()
        if self.tunnel:
            try:
                self.tunnel.stop()
            except:
                pass

    def __del__(self):
        self.close_db()
