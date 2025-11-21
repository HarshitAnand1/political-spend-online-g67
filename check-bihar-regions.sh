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

echo "Checking Bihar region names..."
echo ""

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
-- Check all distinct regions
SELECT DISTINCT region FROM unified.all_ad_regions WHERE region LIKE '%Bihar%' LIMIT 10;

\echo ''
\echo 'All distinct regions (first 20):'
SELECT DISTINCT region FROM unified.all_ad_regions ORDER BY region LIMIT 20;
EOF

unset PGPASSWORD
unset PGSSLMODE
