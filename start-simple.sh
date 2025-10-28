#!/usr/bin/env bash

# Simple startup script (no tmux required)
# This starts SSH tunnel in background, then dev server in foreground
# Usage: ./start-simple.sh

set -e

HOSTS=${HOSTS:-"10.23.59.50 172.16.10.159 172.16.12.166 192.168.29.140"}
SSH_USER=${SSH_USER:-sumitsihag}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519}
PORT_LOCAL=15432
PORT_REMOTE=5432

echo "🚀 Political Ad Tracker - Simple Startup"
echo "========================================"
echo ""

# Step 1: Start SSH Tunnel
echo "🔌 Step 1: Starting SSH Tunnel..."
echo ""

# Kill any existing tunnel
pkill -f "ssh.*${PORT_LOCAL}:localhost:${PORT_REMOTE}" 2>/dev/null || true
sleep 1

# Try to find reachable host
CONNECTED=false
for HOST in $HOSTS; do
    echo "Checking $HOST..."
    if timeout 3 bash -c "</dev/tcp/${HOST}/22" 2>/dev/null; then
        echo "✅ Found reachable host: $HOST"
        echo "Starting tunnel..."
        
        ssh -i $SSH_KEY -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -f -N -L ${PORT_LOCAL}:localhost:${PORT_REMOTE} ${SSH_USER}@${HOST} && {
            CONNECTED=true
            echo "✅ Tunnel established!"
            break
        }
    fi
done

if [ "$CONNECTED" = false ]; then
    echo "❌ Could not connect to any host. Please check:"
    echo "  - Host IPs in HOSTS list"
    echo "  - Network connectivity"
    echo "  - SSH key: $SSH_KEY"
    exit 1
fi

# Wait for port to be listening
echo ""
echo "⏳ Waiting for tunnel to be ready..."
sleep 2

if ss -ltn | grep -q ":${PORT_LOCAL} "; then
    echo "✅ Tunnel ready on localhost:${PORT_LOCAL}"
else
    echo "⚠️  Warning: Port ${PORT_LOCAL} not detected as listening"
fi

# Step 2: Test Database Connection
echo ""
echo "🧪 Step 2: Testing Database Connection..."
echo ""

if [ -f ./test-db-connection.sh ]; then
    ./test-db-connection.sh
else
    echo "⚠️  test-db-connection.sh not found, skipping..."
fi

# Step 3: Start Next.js Dev Server
echo ""
echo "🌐 Step 3: Starting Next.js Dev Server..."
echo ""
echo "📊 Once started, visit:"
echo "  Dashboard: http://localhost:3000"
echo "  Explorer:  http://localhost:3000/explorer"
echo ""
echo "Press Ctrl+C to stop (this will stop the dev server only, tunnel stays running)"
echo ""
echo "To stop the tunnel later, run:"
echo "  pkill -f 'ssh.*${PORT_LOCAL}:localhost:${PORT_REMOTE}'"
echo ""

npm run dev
