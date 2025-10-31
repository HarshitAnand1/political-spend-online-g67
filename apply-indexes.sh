#!/bin/bash

# Apply performance indexes to the database
# This script connects through the SSH tunnel

echo "Applying performance indexes to database..."

# Try common IPs
HOSTS="172.16.10.127 172.16.12.223 10.23.59.50"

for HOST in $HOSTS; do
    echo "Trying $HOST..."
    if ssh -o ConnectTimeout=5 postgres@$HOST "psql -d facebook_ad_library" < migrations/add_performance_indexes.sql 2>/dev/null; then
        echo "✓ Indexes applied successfully via $HOST"
        exit 0
    fi
done

echo "✗ Could not connect to database"
echo "Please run the SQL manually from migrations/add_performance_indexes.sql"
exit 1