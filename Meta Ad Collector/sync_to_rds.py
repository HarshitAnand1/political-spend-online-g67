#!/usr/bin/env python3
"""
Sync local PostgreSQL data to AWS RDS using COPY streaming.
Fast bulk transfer of collected ads data from local DB to RDS.

Usage:
    python3 sync_to_rds.py --date 2025-11-02
    python3 sync_to_rds.py --date 2025-11-02 --dry-run
    python3 sync_to_rds.py --all  # sync all data
"""

import argparse
import psycopg2
import sys
from datetime import datetime
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()


class DBConfig:
    """Database configuration for local and RDS"""
    
    # Local database (where you collect data)
    LOCAL = {
        'host': os.environ.get('LOCAL_PG_HOST', 'localhost'),
        'port': int(os.environ.get('LOCAL_PG_PORT', 5432)),
        'user': os.environ.get('LOCAL_PG_USER', 'postgres'),
        'password': os.environ.get('LOCAL_PG_PASSWORD', ''),
        'database': os.environ.get('LOCAL_PG_DATABASE', 'real_political_ads_db')
    }
    
    # RDS database (target)
    RDS = {
        'host': os.environ.get('PG_HOST', 'political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com'),
        'port': int(os.environ.get('PG_PORT', 5432)),
        'user': os.environ.get('PG_USER', 'g67'),
        'password': os.environ.get('PG_PASSWORD', 'Mandi!05,'),
        'database': os.environ.get('PG_DATABASE', 'mydb')
    }


class DataSyncer:
    """Syncs data from local PostgreSQL to AWS RDS using COPY streams"""
    
    # Tables to sync in dependency order (pages first, then ads, then related tables)
    TABLES = [
        'meta_ads.pages',
        'meta_ads.ads',
        'meta_ads.ad_creative_content',
        'meta_ads.ad_regions',
        'meta_ads.ad_demographics',
        'meta_ads.ad_daily_snapshots'
    ]
    
    def __init__(self, local_config, rds_config, dry_run=False):
        self.local_config = local_config
        self.rds_config = rds_config
        self.dry_run = dry_run
        self.local_conn = None
        self.rds_conn = None
        
    def connect(self):
        """Connect to both local and RDS databases"""
        print("Connecting to local database...")
        self.local_conn = psycopg2.connect(**self.local_config)
        print(f"✓ Connected to local: {self.local_config['database']}")
        
        if not self.dry_run:
            print("Connecting to RDS database...")
            self.rds_conn = psycopg2.connect(**self.rds_config)
            print(f"✓ Connected to RDS: {self.rds_config['database']}")
    
    def close(self):
        """Close database connections"""
        if self.local_conn:
            self.local_conn.close()
        if self.rds_conn:
            self.rds_conn.close()
    
    def get_columns(self, table_name):
        """Get column names for a table"""
        cursor = self.local_conn.cursor()
        schema, table = table_name.split('.')
        cursor.execute("""
            SELECT column_name 
            FROM information_schema.columns 
            WHERE table_schema = %s AND table_name = %s 
            ORDER BY ordinal_position
        """, (schema, table))
        columns = [row[0] for row in cursor.fetchall()]
        cursor.close()
        return columns
    
    def count_rows(self, conn, table_name, where_clause=""):
        """Count rows in a table"""
        cursor = conn.cursor()
        query = f"SELECT COUNT(*) FROM {table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        cursor.execute(query)
        count = cursor.fetchone()[0]
        cursor.close()
        return count
    
    def sync_table(self, table_name, where_clause="", date_filter=None):
        """
        Sync a single table using COPY streaming.
        Uses ON CONFLICT to handle existing rows (upsert behavior).
        """
        print(f"\n{'='*60}")
        print(f"Syncing table: {table_name}")
        print(f"{'='*60}")
        
        # Build WHERE clause for date filtering
        if date_filter and table_name == 'meta_ads.ads':
            where_clause = f"created_at::date = '{date_filter}'"
        elif date_filter and table_name == 'meta_ads.ad_daily_snapshots':
            where_clause = f"created_at::date = '{date_filter}'"
        elif date_filter and table_name in ['meta_ads.ad_creative_content', 'meta_ads.ad_regions', 'meta_ads.ad_demographics']:
            # For related tables, filter by ads that were created on the target date
            where_clause = f"ad_id IN (SELECT id FROM meta_ads.ads WHERE created_at::date = '{date_filter}')"
        elif date_filter and table_name == 'meta_ads.pages':
            # For pages, sync pages related to ads created on target date
            where_clause = f"page_id IN (SELECT DISTINCT page_id FROM meta_ads.ads WHERE created_at::date = '{date_filter}')"
        
        # Count rows to sync
        local_count = self.count_rows(self.local_conn, table_name, where_clause)
        print(f"📊 Rows to sync from local: {local_count:,}")
        
        if local_count == 0:
            print("⚠️  No rows to sync, skipping...")
            return 0
        
        if self.dry_run:
            print(f"🔍 [DRY RUN] Would sync {local_count:,} rows")
            return local_count
        
        # Get columns
        columns = self.get_columns(table_name)
        columns_str = ', '.join(columns)
        
        # Export from local using COPY TO STDOUT
        local_cursor = self.local_conn.cursor()
        query = f"COPY (SELECT {columns_str} FROM {table_name}"
        if where_clause:
            query += f" WHERE {where_clause}"
        query += f") TO STDOUT WITH (FORMAT CSV, HEADER FALSE, QUOTE '\"', ESCAPE '\"', FORCE_QUOTE *)"
        
        print(f"📤 Exporting from local database...")
        
        # Create a temporary table on RDS to load data, then merge
        rds_cursor = self.rds_conn.cursor()
        schema, table = table_name.split('.')
        temp_table = f"temp_{table}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        start_time = datetime.now()
        
        try:
            # Create temp table with same structure
            print(f"🔧 Creating temporary table on RDS...")
            rds_cursor.execute(f"""
                CREATE TEMP TABLE {temp_table} 
                (LIKE {table_name} INCLUDING ALL)
            """)
            
            # Stream copy from local to RDS temp table with progress tracking
            print(f"📡 Streaming data to RDS...")
            
            # Use StringIO to capture COPY output from local DB
            from io import BytesIO
            copy_buffer = BytesIO()
            local_cursor.copy_expert(query, copy_buffer)
            copy_buffer.seek(0)
            
            # Simply copy without progress tracking to avoid CSV parsing complexity
            # (Progress tracking was breaking CSV with embedded newlines in quoted fields)
            rds_cursor.copy_expert(
                f"COPY {temp_table} FROM STDIN WITH (FORMAT CSV, QUOTE '\"', ESCAPE '\"')",
                copy_buffer
            )
            rows_copied = local_count  # We know we copied all rows if no error
            
            copy_elapsed = (datetime.now() - start_time).total_seconds()
            print(f"   ✅ Copied {rows_copied:,} rows in {copy_elapsed:.1f}s ({rows_copied/copy_elapsed:.0f} rows/sec)")
            
            # Determine conflict columns based on table
            conflict_columns = self._get_conflict_columns(table_name)
            update_columns = [col for col in columns if col not in conflict_columns and col not in ['created_at', 'updated_at']]
            
            # For tables with auto-increment IDs and composite unique keys, exclude id from INSERT
            auto_increment_tables = ['meta_ads.ad_regions', 'meta_ads.ad_demographics']
            if table_name in auto_increment_tables:
                # Don't copy the 'id' column - let RDS auto-generate it
                insert_columns = [col for col in columns if col != 'id']
                select_columns = ', '.join(insert_columns)
                insert_cols_str = ', '.join(insert_columns)
                select_clause = f"SELECT {select_columns} FROM {temp_table}"
                insert_target = f"{table_name} ({insert_cols_str})"
                # Also exclude 'id' from update_columns
                update_columns = [col for col in update_columns if col != 'id']
            else:
                select_clause = f"SELECT * FROM {temp_table}"
                insert_target = table_name
            
            # Merge temp table into actual table
            print(f"🔄 Merging data (ON CONFLICT UPDATE)...")
            merge_start = datetime.now()
            
            if update_columns:
                update_set = ', '.join([f"{col} = EXCLUDED.{col}" for col in update_columns])
                # Only add updated_at if the table has that column
                if 'updated_at' in columns:
                    merge_query = f"""
                        INSERT INTO {insert_target} 
                        {select_clause}
                        ON CONFLICT ({', '.join(conflict_columns)}) 
                        DO UPDATE SET {update_set}, updated_at = now()
                    """
                else:
                    merge_query = f"""
                        INSERT INTO {insert_target} 
                        {select_clause}
                        ON CONFLICT ({', '.join(conflict_columns)}) 
                        DO UPDATE SET {update_set}
                    """
            else:
                # For tables with no updateable columns (like junction tables), just ignore conflicts
                merge_query = f"""
                    INSERT INTO {insert_target} 
                    {select_clause}
                    ON CONFLICT ({', '.join(conflict_columns)}) 
                    DO NOTHING
                """
            
            rds_cursor.execute(merge_query)
            rows_affected = rds_cursor.rowcount
            
            self.rds_conn.commit()
            
            merge_elapsed = (datetime.now() - merge_start).total_seconds()
            total_elapsed = (datetime.now() - start_time).total_seconds()
            
            print(f"   ✅ Merged in {merge_elapsed:.1f}s")
            print(f"✨ Successfully synced {rows_affected:,} rows to RDS in {total_elapsed:.1f}s")
            
            return rows_affected
            
        except Exception as e:
            print(f"❌ Error syncing table: {e}")
            self.rds_conn.rollback()
            raise
        finally:
            local_cursor.close()
            rds_cursor.close()
    
    def _get_conflict_columns(self, table_name):
        """Get columns to use in ON CONFLICT clause"""
        conflict_map = {
            'meta_ads.pages': ['page_id'],
            'meta_ads.ads': ['id'],
            'meta_ads.ad_creative_content': ['ad_id'],
            'meta_ads.ad_regions': ['ad_id', 'region'],
            'meta_ads.ad_demographics': ['ad_id', 'age_group', 'gender'],
            'meta_ads.ad_daily_snapshots': ['ad_id', 'snapshot_date']
        }
        return conflict_map.get(table_name, ['id'])
    
    def sync_all(self, date_filter=None):
        """Sync all tables"""
        total_rows = 0
        start_time = datetime.now()
        
        if date_filter:
            print(f"\n{'='*60}")
            print(f"🚀 Syncing data for date: {date_filter}")
            print(f"{'='*60}\n")
        else:
            print(f"\n{'='*60}")
            print(f"🚀 Syncing ALL data")
            print(f"{'='*60}\n")
        
        for i, table in enumerate(self.TABLES, 1):
            try:
                print(f"[{i}/{len(self.TABLES)}] Processing {table}...")
                rows = self.sync_table(table, date_filter=date_filter)
                total_rows += rows
            except Exception as e:
                print(f"\n❌ Failed to sync {table}: {e}")
                if not self.dry_run:
                    print("🛑 Stopping sync due to error.")
                    return False
        
        elapsed = (datetime.now() - start_time).total_seconds()
        
        print(f"\n{'='*60}")
        print(f"🎉 Sync completed!")
        print(f"{'='*60}")
        print(f"📊 Total rows synced: {total_rows:,}")
        print(f"⏱️  Time taken: {elapsed:.1f} seconds ({elapsed/60:.1f} minutes)")
        if total_rows > 0:
            print(f"⚡ Average speed: {total_rows/elapsed:.0f} rows/second")
        print(f"{'='*60}")
        
        return True


def main():
    parser = argparse.ArgumentParser(
        description='Sync local PostgreSQL data to AWS RDS',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Sync data collected on Nov 2, 2025
  python3 sync_to_rds.py --date 2025-11-02
  
  # Dry run to see what would be synced
  python3 sync_to_rds.py --date 2025-11-02 --dry-run
  
  # Sync all data (use with caution on large databases)
  python3 sync_to_rds.py --all
        """
    )
    
    parser.add_argument('--date', type=str, help='Sync data for specific date (YYYY-MM-DD)')
    parser.add_argument('--all', action='store_true', help='Sync all data (no date filter)')
    parser.add_argument('--dry-run', action='store_true', help='Show what would be synced without actually syncing')
    
    args = parser.parse_args()
    
    # Validate arguments
    if not args.date and not args.all:
        parser.error("Must specify either --date or --all")
    
    if args.date and args.all:
        parser.error("Cannot specify both --date and --all")
    
    # Validate date format
    date_filter = None
    if args.date:
        try:
            datetime.strptime(args.date, '%Y-%m-%d')
            date_filter = args.date
        except ValueError:
            print(f"Error: Invalid date format '{args.date}'. Use YYYY-MM-DD")
            sys.exit(1)
    
    # Create syncer and run
    syncer = DataSyncer(DBConfig.LOCAL, DBConfig.RDS, dry_run=args.dry_run)
    
    try:
        syncer.connect()
        success = syncer.sync_all(date_filter=date_filter)
        sys.exit(0 if success else 1)
    except psycopg2.Error as e:
        print(f"\n✗ Database error: {e}")
        sys.exit(1)
    except KeyboardInterrupt:
        print("\n\nSync interrupted by user")
        sys.exit(1)
    finally:
        syncer.close()


if __name__ == '__main__':
    main()
