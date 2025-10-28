#!/bin/bash

echo "Testing PostgreSQL connection via SSH tunnel..."
echo ""

# Test with environment variable
source .env.local 2>/dev/null || true

# Extract connection details from DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    echo "DATABASE_URL found in .env.local"
    # Try to extract password
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/harshit:\([^@]*\)@.*/\1/p')
    echo "Extracted password: ${DB_PASS:0:3}***"
else
    echo "⚠️  DATABASE_URL not found in environment"
    exit 1
fi

echo ""
echo "Testing connection with psql..."
echo ""

# Set password for psql
export PGPASSWORD="$DB_PASS"

# Test connection
psql -h localhost -p 15432 -U harshit -d political_ads_db -c 'SELECT current_user, current_database(), COUNT(*) as ad_count FROM ads;' 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Connection successful!"
else
    echo ""
    echo "❌ Connection failed with exit code: $EXIT_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Is SSH tunnel running? Check: ps aux | grep '15432'"
    echo "2. Is password correct in .env.local?"
    echo "3. Try manual connection: psql -h localhost -p 15432 -U harshit -d political_ads_db"
fi

unset PGPASSWORD
