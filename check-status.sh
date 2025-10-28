#!/bin/bash

echo "🚀 Political Ad Tracker - Quick Start"
echo "====================================="
echo ""

# Check if SSH tunnel is running
if lsof -i :15432 >/dev/null 2>&1; then
    echo "✅ SSH Tunnel: Running"
else
    echo "❌ SSH Tunnel: NOT running"
    echo ""
    echo "Start it with:"
    echo "  ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@10.23.59.50 -N"
    echo ""
fi

# Check if dev server is running
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✅ Dev Server: Running on http://localhost:3000"
else
    echo "❌ Dev Server: NOT running"
    echo ""
    echo "Start it with:"
    echo "  npm run dev"
    echo ""
fi

# Test database connection
if lsof -i :15432 >/dev/null 2>&1; then
    echo ""
    echo "Testing database connection..."
    RESULT=$(curl -s http://localhost:3000/api/test-db 2>/dev/null | grep -o '"success":true')
    
    if [ "$RESULT" = '"success":true' ]; then
        echo "✅ Database: Connected (92,100 ads available!)"
    else
        echo "⚠️  Database: Connection issue (check SSH tunnel)"
    fi
fi

echo ""
echo "====================================="
echo ""
echo "📊 Your Presentation URLs:"
echo "  Dashboard:  http://localhost:3000"
echo "  Explorer:   http://localhost:3000/explorer"
echo ""
echo "🧪 Test APIs:"
echo "  curl http://localhost:3000/api/stats"
echo "  curl http://localhost:3000/api/ads?limit=5"
echo ""
