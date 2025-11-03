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

echo "Checking database tables and data..."
echo ""

# Check meta_ads schema tables
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check if meta_ads schema exists
SELECT schema_name FROM information_schema.schemata WHERE schema_name = 'meta_ads';

-- List tables in meta_ads schema
SELECT table_name FROM information_schema.tables WHERE table_schema = 'meta_ads';

-- Count rows in ads table
SELECT COUNT(*) as total_ads FROM meta_ads.ads;

-- Count distinct pages
SELECT COUNT(DISTINCT page_id) as total_pages FROM meta_ads.ads;

-- Sample of data
SELECT id, page_id, spend_lower, spend_upper FROM meta_ads.ads LIMIT 3;
EOF

unset PGPASSWORD
unset PGSSLMODE
