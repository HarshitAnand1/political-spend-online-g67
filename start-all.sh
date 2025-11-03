#!/usr/bin/env bash

# Unified startup script for Political Ad Tracker (AWS RDS Version)
# This script starts everything you need in one command using tmux
# Usage: ./start-all.sh

set -e

SESSION_NAME="political-ads"

echo "🚀 Starting Political Ad Tracker - All-in-One (AWS RDS)"
echo "========================================================"
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

# Pane 0: Dev Server
tmux send-keys -t $SESSION_NAME:main.0 "echo '🌐 Starting Next.js Dev Server'" C-m
tmux send-keys -t $SESSION_NAME:main.0 "echo 'Using AWS RDS: political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com'" C-m
tmux send-keys -t $SESSION_NAME:main.0 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.0 "npm run dev" C-m

# Split horizontally for Tests/Commands
tmux split-window -v -t $SESSION_NAME:main

# Pane 1: Tests and Status
tmux send-keys -t $SESSION_NAME:main.1 "echo '🧪 Tests & Status'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "sleep 3" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo 'Running database connection test...'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "./test-db-connection.sh" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo '✅ All systems started!'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo 'Dashboard: http://localhost:3000'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo 'Explorer: http://localhost:3000/?tab=explorer'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo 'Analytics: http://localhost:3000/?tab=analytics'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo ''" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo 'Commands you can run here:'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo '  ./test-direct-connection.sh'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo '  curl http://localhost:3000/api/stats'" C-m
tmux send-keys -t $SESSION_NAME:main.1 "echo ''" C-m

# Adjust pane sizes
tmux select-layout -t $SESSION_NAME:main even-vertical

echo "✅ tmux session created successfully!"
echo ""
echo "📺 Layout:"
echo "  - Top: Next.js Dev Server"
echo "  - Bottom: Tests & Commands"
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
