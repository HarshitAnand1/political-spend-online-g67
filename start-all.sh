#!/usr/bin/env bash

# Unified startup script for Political Ad Tracker
# This script starts everything you need in one command using tmux
# Usage: ./start-all.sh

set -e

SESSION_NAME="political-ads"
HOSTS=${HOSTS:-"172.16.10.127 172.16.12.223 10.23.59.50 172.16.10.159 172.16.12.166 192.168.29.140"}
SSH_USER=${SSH_USER:-sumitsihag}
SSH_KEY=${SSH_KEY:-$HOME/.ssh/id_ed25519}
PORT_LOCAL=15432
PORT_REMOTE=5432

echo "🚀 Starting Political Ad Tracker - All-in-One"
echo "=============================================="
echo ""

# Check if tmux is installed
if ! command -v tmux &> /dev/null; then
    echo "❌ tmux is not installed. Installing..."
    echo "Run: sudo apt-get install tmux"
    exit 1
fi

# Kill existing session if it exists
tmux kill-session -t $SESSION_NAME 2>/dev/null || true

echo "📦 Creating tmux session: $SESSION_NAME"
echo ""

# Create new tmux session (detached)
tmux new-session -d -s $SESSION_NAME -n main

# Pane 0: SSH Tunnel
tmux send-keys -t $SESSION_NAME:main.0 "echo '🔌 SSH Tunnel'" C-m
tmux send-keys -t $SESSION_NAME:main.0 "echo 'Attempting to connect to hosts: $HOSTS'" C-m
tmux send-keys -t $SESSION_NAME:main.0 "echo ''" C-m

# Find reachable host and start tunnel
TUNNEL_CMD=""
for HOST in $HOSTS; do
    if timeout 3 bash -c "</dev/tcp/${HOST}/22" 2>/dev/null; then
        TUNNEL_CMD="ssh -i $SSH_KEY -o ServerAliveInterval=60 -o ServerAliveCountMax=3 -L ${PORT_LOCAL}:localhost:${PORT_REMOTE} ${SSH_USER}@${HOST} -N"
        tmux send-keys -t $SESSION_NAME:main.0 "echo 'Found reachable host: $HOST'" C-m
        break
    fi
done

if [ -z "$TUNNEL_CMD" ]; then
    tmux send-keys -t $SESSION_NAME:main.0 "echo '❌ No reachable hosts found!'" C-m
    tmux send-keys -t $SESSION_NAME:main.0 "echo 'Update HOSTS list or check network'" C-m
else
    tmux send-keys -t $SESSION_NAME:main.0 "$TUNNEL_CMD" C-m
fi

# Split horizontally for Dev Server (bottom half)
tmux split-window -v -t $SESSION_NAME:main

# Pane 1: Dev Server (will wait for tunnel)
tmux send-keys -t $SESSION_NAME:main.1 "echo '⏳ Waiting for SSH tunnel...'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "sleep 3" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo '🌐 Starting Next.js Dev Server'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "npm run dev" C-m

# Split the bottom pane vertically for Tests/Commands
tmux split-window -h -t $SESSION_NAME:main.1

# Pane 2: Tests and Status
tmux send-keys -t $SESSION_NAME:main.2 "echo '🧪 Tests & Status'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "sleep 5" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo 'Running database connection test...'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "./test-db-connection.sh" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo '✅ All systems started!'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo 'Dashboard: http://localhost:3000'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo 'Explorer: http://localhost:3000/explorer'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo 'Commands you can run here:'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo '  ./check-status.sh'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo '  curl http://localhost:3000/api/stats'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo '  psql -h localhost -p 15432 -U harshit -d political_ads_db'" C-m
tmux send-keys -t $SESSION_NAME:main.2 "echo ''" C-m

# Adjust pane sizes (SSH tunnel gets 30%, dev server 45%, tests 25%)
tmux select-layout -t $SESSION_NAME:main tiled

echo "✅ tmux session created successfully!"
echo ""
echo "📺 Layout:"
echo "  - Top: SSH Tunnel"
echo "  - Bottom-left: Next.js Dev Server"
echo "  - Bottom-right: Tests & Commands"
echo ""
echo "To attach to the session:"
echo "  tmux attach -t $SESSION_NAME"
echo ""
echo "To detach from the session (inside tmux):"
echo "  Press: Ctrl+B, then D"
echo ""
echo "To kill everything:"
echo "  tmux kill-session -t $SESSION_NAME"
echo ""

# Attach to the session
tmux attach -t $SESSION_NAME
