#!/bin/bash

# Load environment
source .env.local 2>/dev/null || true

# Extract connection details
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

# Set password and SSL
export PGPASSWORD="$DB_PASS"
export PGSSLMODE="require"

echo "Checking unified schema structure..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check all unified tables
\echo 'All tables in unified schema:'
SELECT table_name FROM information_schema.tables WHERE table_schema = 'unified' ORDER BY table_name;

-- Check columns in all_ads
\echo ''
\echo 'Columns in unified.all_ads:'
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'unified' AND table_name = 'all_ads'
ORDER BY ordinal_position;

-- Check if there's a regions column or separate table
\echo ''
\echo 'Sample data from unified.all_ads:'
SELECT id, page_id, platform, spend_lower, spend_upper FROM unified.all_ads LIMIT 5;

-- Check meta_ads.ad_regions structure for comparison
\echo ''
\echo 'Structure of meta_ads.ad_regions:'
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'meta_ads' AND table_name = 'ad_regions'
ORDER BY ordinal_position;
EOF

unset PGPASSWORD
unset PGSSLMODE
