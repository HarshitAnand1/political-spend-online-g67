#!/bin/bash

# Test Database Connection Script
# This script tests if your database connection is working

echo "🧪 Testing Database Connection..."
echo ""

# Check if server is running
if ! curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "❌ Dev server is not running!"
    echo "Please start the server with: npm run dev"
    exit 1
fi

echo "✓ Dev server is running"
echo ""

# Test database connection
echo "Testing /api/test-db..."
response=$(curl -s http://localhost:3000/api/test-db)

if echo "$response" | grep -q '"success":true'; then
    echo "✅ Database connection successful!"
    echo ""
    echo "$response" | jq . 2>/dev/null || echo "$response"
else
    echo "❌ Database connection failed!"
    echo ""
    echo "$response" | jq . 2>/dev/null || echo "$response"
    echo ""
    echo "Troubleshooting steps:"
    echo "1. Verify .env.local has correct AWS RDS credentials"
    echo "2. Check network connectivity to AWS RDS"
    echo "3. Verify security group allows your IP address"
fi

echo ""
echo "---"
echo ""

# Test ads endpoint
echo "Testing /api/ads (fetching 3 ads)..."
ads_response=$(curl -s "http://localhost:3000/api/ads?limit=3")

if echo "$ads_response" | grep -q '"ads"'; then
    ad_count=$(echo "$ads_response" | jq '.ads | length' 2>/dev/null || echo "?")
    total=$(echo "$ads_response" | jq '.pagination.total' 2>/dev/null || echo "?")
    echo "✅ Successfully fetched $ad_count ads (Total in DB: $total)"
else
    echo "❌ Failed to fetch ads"
    echo "$ads_response" | jq . 2>/dev/null || echo "$ads_response"
fi

echo ""
echo "---"
echo ""

# Test analytics endpoint
echo "Testing /api/analytics/spend..."
analytics_response=$(curl -s "http://localhost:3000/api/analytics/spend")

if echo "$analytics_response" | grep -q '"spendData"'; then
    echo "✅ Analytics endpoint working!"
    echo "Top spending parties:"
    echo "$analytics_response" | jq '.spendData' 2>/dev/null || echo "$analytics_response"
else
    echo "❌ Analytics endpoint failed"
    echo "$analytics_response" | jq . 2>/dev/null || echo "$analytics_response"
fi

echo ""
echo "---"
echo ""
echo "✨ Test complete!"
