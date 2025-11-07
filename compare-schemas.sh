#!/bin/bash

source .env.local 2>/dev/null || true
DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

export PGPASSWORD="$DB_PASS"
export PGSSLMODE="require"

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" << 'EOF'
\echo 'Columns in meta_ads.ads:'
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'meta_ads' AND table_name = 'ads'
ORDER BY ordinal_position;

\echo ''
\echo 'Columns in unified.all_ads:'
SELECT column_name FROM information_schema.columns
WHERE table_schema = 'unified' AND table_name = 'all_ads'
ORDER BY ordinal_position;

\echo ''
\echo 'Sample with bylines from meta_ads.ads:'
SELECT id, page_id, bylines FROM meta_ads.ads LIMIT 3;
EOF

unset PGPASSWORD
unset PGSSLMODE
