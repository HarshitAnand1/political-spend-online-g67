# Quick Start Guide - AWS RDS Version

## One-Command Startup 🚀

You now have **two options** to start the dashboard:

### Option 1: tmux (Recommended - Multiple Panes)
```bash
./start-all.sh
```

**What it does:**
- Opens a tmux session with 2 panes:
  - **Top pane**: Next.js dev server (connects to AWS RDS)
  - **Bottom pane**: Tests and status
- Runs initial database connection test
- Shows all URLs and commands

**tmux Controls:**
- Detach (keep running): `Ctrl+B`, then `D`
- Re-attach later: `tmux attach -t political-ads`
- Switch panes: `Ctrl+B`, then arrow keys
- Kill everything: `tmux kill-session -t political-ads`

**First time?** Install tmux:
```bash
sudo apt-get install tmux
```

### Option 2: Simple (Just Dev Server)
```bash
./start-dev.sh
```

**What it does:**
- Checks environment configuration
- Verifies AWS RDS connection details
- Starts Next.js dev server
- Opens on http://localhost:3000

**Or use npm directly:**
```bash
npm run dev
```

---

## What Gets Started

1. **SSH Tunnel** → `localhost:15432` ➜ `remote:5432`
2. **Database Test** → Verifies connection to PostgreSQL
3. **Next.js Dev** → `http://localhost:3000`

---

## URLs Once Running

- 📊 **Dashboard**: http://localhost:3000
- 🔍 **Explorer**: http://localhost:3000/explorer
- 🧪 **Test API**: http://localhost:3000/api/test-db

---

## Troubleshooting

### "No reachable hosts found"
Update the host list in the script or set via environment:
```bash
HOSTS="172.16.10.159 NEW_IP_HERE" ./start-all.sh
```

### "SSH passphrase required"
Load your key into ssh-agent once per session:
```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Then run the startup script again.

### "Port 15432 already in use"
Kill existing tunnel:
```bash
pkill -f "ssh.*15432"
```

### Check current status
```bash
./check-status.sh
```

---

## Manual Commands (if you prefer)

If you want to run things manually:

```bash
# Terminal 1: SSH Tunnel
ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@172.16.10.159 -N

# Terminal 2: Test DB
./test-db-connection.sh

# Terminal 3: Dev Server
npm run dev

# Terminal 4: Run commands
curl http://localhost:3000/api/stats
```

---

## Recommended Workflow

**Daily startup:**
```bash
./start-all.sh
```

**Present to someone:**
1. Run `./start-all.sh`
2. Press `Ctrl+B`, then `D` to detach
3. Open browser to http://localhost:3000
4. Show the dashboard!

**End of day:**
```bash
tmux kill-session -t political-ads
```

---

## Pro Tips

✨ **Use tmux option** for presentations - everything stays organized in one window

✨ **Use simple option** if tmux feels overwhelming - good for quick testing

✨ **Add new IPs** by editing the HOSTS line in either script or using:
```bash
HOSTS="172.16.10.159 172.16.12.166 NEW_IP" ./start-all.sh
```

✨ **ssh-agent is your friend** - load your key once and never type passphrase again (that session)
