# 🔧 Database Connection Troubleshooting Guide

## Current Status

**Database Host:** 192.168.29.140  
**SSH User:** sumitsihag  
**Database Port (via tunnel):** 15432  
**Database Name:** political_ads_db  
**Database User:** harshit  

---

## ⚠️ Current Issue

The host IP `192.168.29.140` is **not reachable** from your machine.

**Ping test shows:**
- 100% packet loss
- Host is either:
  1. Turned off
  2. On a different network
  3. Behind a firewall blocking your IP
  4. Changed to a different IP address

---

## ✅ How to Fix

### Step 1: Verify the Correct IP Address

Run these commands to find the correct IP:

```bash
# Option 1: If you can access the host physically
# Log into the host machine and run:
hostname -I

# Option 2: If it's on your local network
# Scan your network (if you know the subnet)
nmap -sn 192.168.29.0/24 | grep -B 2 "192.168.29"

# Option 3: Check your SSH config
cat ~/.ssh/config | grep -A 5 "sumitsihag"
```

### Step 2: Test Network Connectivity

```bash
# Test ping
ping -c 3 <CORRECT_IP>

# Test SSH port
nc -zv <CORRECT_IP> 22

# Test SSH connection
ssh -i ~/.ssh/id_ed25519 sumitsihag@<CORRECT_IP> "echo 'SSH works'"
```

### Step 3: Start the SSH Tunnel

Once you have the correct IP, update and run:

```bash
# Edit the script if IP changes again
nano start-ssh-tunnel.sh

# Or run directly with correct IP:
ssh -i ~/.ssh/id_ed25519 -L 15432:localhost:5432 sumitsihag@<CORRECT_IP> -N
```

**Keep this terminal open!**

### Step 4: Verify Tunnel is Working

In a **different terminal**:

```bash
# Check if port is listening
lsof -i :15432

# Test PostgreSQL connection
psql -h localhost -p 15432 -U harshit -d political_ads_db -W

# Test API connection
./test-db-connection.sh
```

---

## 🎯 Quick Commands Reference

### Start Everything (when host is reachable):

```bash
# Terminal 1: SSH Tunnel
./start-ssh-tunnel.sh

# Terminal 2: Dev Server
npm run dev

# Terminal 3: Test Connection
./test-db-connection.sh
```

### Check Status:

```bash
# Is SSH tunnel running?
ps aux | grep "ssh.*15432" | grep -v grep

# Is port listening?
lsof -i :15432

# Is Next.js running?
lsof -i :3000

# Test database
psql -h localhost -p 15432 -U harshit -d political_ads_db -c "SELECT COUNT(*) FROM ads;"
```

### Restart Everything:

```bash
# Kill SSH tunnel
pkill -f "ssh.*15432"

# Kill Next.js
pkill -f "next dev"

# Start SSH tunnel (in new terminal)
./start-ssh-tunnel.sh

# Start Next.js (in another terminal)
npm run dev
```

---

## 🔍 Common Issues

### Issue 1: "Connection refused" on port 15432
**Cause:** SSH tunnel not running  
**Fix:** Run `./start-ssh-tunnel.sh` in a separate terminal

### Issue 2: "Connection timeout"
**Cause:** Wrong IP or host is down  
**Fix:** Verify IP with ping, check if host is on

### Issue 3: "Authentication failed"
**Cause:** Wrong password in .env.local  
**Fix:** Update DATABASE_URL in `.env.local`

### Issue 4: SSH tunnel keeps disconnecting
**Cause:** Network issues or host goes to sleep  
**Fix:** Use keepalive options (already in script)

### Issue 5: Host IP keeps changing
**Cause:** DHCP assigning different IPs  
**Fix:** 
- Ask network admin to set static IP for the host
- Or use hostname instead of IP (if DNS is configured)
- Update `start-ssh-tunnel.sh` with new IP each time

---

## 📝 What to Do Right Now

1. **Find the correct IP address of the database host**
   - Ask the host owner
   - Check if host is on the same network
   - Try the old IP: 172.16.12.166

2. **Update the IP in `start-ssh-tunnel.sh`** if different

3. **Ensure the host is:**
   - Powered on
   - Connected to network
   - Accessible via SSH

4. **Once connected, everything will work automatically!**
   - Your Next.js app is already configured
   - The API routes are ready
   - Your frontend will show real data

---

## 🆘 Need Help?

Contact the database host administrator and ask:
1. What is the current IP address?
2. Is the host online and accessible?
3. Is SSH access enabled?
4. Is PostgreSQL running on the host?

Once you get the correct IP and can `ping` it successfully, run:
```bash
./start-ssh-tunnel.sh
```

And everything will work! 🎉
