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

echo "Checking daily spend table structures..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check columns in daily_spend_by_advertiser
\echo 'Columns in unified.daily_spend_by_advertiser:'
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'unified' AND table_name = 'daily_spend_by_advertiser'
ORDER BY ordinal_position;

\echo ''
\echo 'Sample data from unified.daily_spend_by_advertiser:'
SELECT * FROM unified.daily_spend_by_advertiser LIMIT 3;

\echo ''
\echo 'Columns in unified.daily_spend_by_ad:'
SELECT column_name, data_type FROM information_schema.columns
WHERE table_schema = 'unified' AND table_name = 'daily_spend_by_ad'
ORDER BY ordinal_position;

\echo ''
\echo 'Sample data from unified.daily_spend_by_ad:'
SELECT * FROM unified.daily_spend_by_ad LIMIT 3;
EOF

unset PGPASSWORD
unset PGSSLMODE
