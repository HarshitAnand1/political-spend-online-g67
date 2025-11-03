#!/bin/bash

echo "Testing PostgreSQL connection to AWS RDS..."
echo ""

# Test with environment variable
source .env.local 2>/dev/null || true

# Extract connection details from DATABASE_URL
if [ -n "$DATABASE_URL" ]; then
    echo "DATABASE_URL found in .env.local"

    # Extract user, password, host, port, and database
    DB_USER=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/\([^:]*\):.*/\1/p')
    DB_PASS=$(echo "$DATABASE_URL" | sed -n 's/.*:\/\/[^:]*:\([^@]*\)@.*/\1/p')
    DB_HOST=$(echo "$DATABASE_URL" | sed -n 's/.*@\([^:]*\):.*/\1/p')
    DB_PORT=$(echo "$DATABASE_URL" | sed -n 's/.*:\([0-9]*\)\/.*/\1/p')
    DB_NAME=$(echo "$DATABASE_URL" | sed -n 's/.*\/\([^?]*\).*/\1/p')

    echo "Host: $DB_HOST"
    echo "Port: $DB_PORT"
    echo "User: $DB_USER"
    echo "Database: $DB_NAME"
    echo "Password: ${DB_PASS:0:3}***"
    echo "SSL: Required"
else
    echo "⚠️  DATABASE_URL not found in environment"
    exit 1
fi

echo ""
echo "Testing connection with psql..."
echo ""

# Set password and SSL mode for psql
export PGPASSWORD="$DB_PASS"
export PGSSLMODE="require"

# Test connection
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c 'SELECT current_user, current_database(), version();' 2>&1

EXIT_CODE=$?

if [ $EXIT_CODE -eq 0 ]; then
    echo ""
    echo "✅ Connection successful!"
else
    echo ""
    echo "❌ Connection failed with exit code: $EXIT_CODE"
    echo ""
    echo "Troubleshooting:"
    echo "1. Is DATABASE_URL correct in .env.local?"
    echo "2. Check network connectivity to AWS RDS"
    echo "3. Verify security group allows your IP address"
    echo "4. Try manual connection: PGSSLMODE=require psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
fi

unset PGPASSWORD
unset PGSSLMODE
