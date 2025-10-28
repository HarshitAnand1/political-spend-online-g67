#!/bin/bash

echo "🔍 Database Connection Diagnostic"
echo "=================================="
echo ""

# List of IPs to try
IPS=("10.23.59.50" "172.16.12.166" "192.168.29.140")

echo "Testing connectivity to known host IPs..."
echo ""

for ip in "${IPS[@]}"; do
    echo "Testing $ip..."
    
    # Test ping
    if timeout 3 ping -c 1 $ip >/dev/null 2>&1; then
        echo "  ✅ Ping: Success"
    else
        echo "  ❌ Ping: Failed"
    fi
    
    # Test SSH port
    if timeout 3 nc -zv $ip 22 >/dev/null 2>&1; then
        echo "  ✅ SSH Port (22): Open"
    else
        echo "  ❌ SSH Port (22): Closed/Timeout"
    fi
    
    echo ""
done

echo "=================================="
echo ""
echo "Checking current network..."
ip route | grep default
echo ""

echo "Your current IP addresses:"
hostname -I
echo ""

echo "=================================="
echo ""
echo "💡 Recommendations:"
echo ""
echo "1. If none of the IPs are reachable:"
echo "   - Connect to the same network/VPN as the database host"
echo "   - Ask the host owner if the server is online"
echo ""
echo "2. If an IP shows 'SSH Port: Open':"
echo "   - Use that IP in your SSH tunnel"
echo "   - Run: ./start-ssh-tunnel.sh (after updating the IP)"
echo ""
echo "3. Contact your database administrator for:"
echo "   - Correct IP address"
echo "   - Network/VPN access requirements"
echo "   - Firewall rules if needed"
