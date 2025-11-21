#!/bin/bash
# EC2 RDS Connection Diagnostic Script
# Run this on your EC2 instance to diagnose connection issues

echo "======================================"
echo "EC2 to RDS Connection Diagnostic"
echo "======================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

RDS_HOST="political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com"
RDS_PORT="5432"

echo "1. Checking EC2 Instance Metadata..."
echo "   Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4 || echo 'N/A')"
echo "   Private IP: $(curl -s http://169.254.169.254/latest/meta-data/local-ipv4 || echo 'N/A')"
echo "   Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id || echo 'N/A')"
echo "   Security Groups: $(curl -s http://169.254.169.254/latest/meta-data/security-groups || echo 'N/A')"
echo ""

echo "2. DNS Resolution Test..."
if nslookup $RDS_HOST > /dev/null 2>&1; then
    echo -e "   ${GREEN}✓${NC} DNS resolution successful"
    echo "   RDS IP: $(nslookup $RDS_HOST | grep -A 1 "Name:" | grep "Address:" | awk '{print $2}' | tail -1)"
else
    echo -e "   ${RED}✗${NC} DNS resolution failed"
fi
echo ""

echo "3. Network Connectivity Test (Port $RDS_PORT)..."
if timeout 5 bash -c "echo > /dev/tcp/$RDS_HOST/$RDS_PORT" 2>/dev/null; then
    echo -e "   ${GREEN}✓${NC} Port $RDS_PORT is reachable"
else
    echo -e "   ${RED}✗${NC} Cannot reach port $RDS_PORT"
    echo "   This usually means:"
    echo "   - RDS security group doesn't allow EC2 security group"
    echo "   - Network ACL is blocking traffic"
    echo "   - RDS is in different VPC"
fi
echo ""

echo "4. PostgreSQL Client Test..."
if command -v psql &> /dev/null; then
    echo -e "   ${GREEN}✓${NC} psql is installed"
    
    # Check if .env.production exists and has DATABASE_URL
    if [ -f "/home/ec2-user/political-ad-tracker/.env.production" ]; then
        echo "   Found .env.production file"
        
        # Try to extract DATABASE_URL (without showing password)
        if grep -q "DATABASE_URL" /home/ec2-user/political-ad-tracker/.env.production; then
            echo -e "   ${GREEN}✓${NC} DATABASE_URL is configured"
            
            # Extract connection details (mask password)
            DB_URL=$(grep "DATABASE_URL" /home/ec2-user/political-ad-tracker/.env.production | cut -d'=' -f2)
            echo "   Connection string found (password masked)"
        else
            echo -e "   ${YELLOW}!${NC} DATABASE_URL not found in .env.production"
        fi
    else
        echo -e "   ${YELLOW}!${NC} .env.production file not found"
    fi
else
    echo -e "   ${YELLOW}!${NC} psql not installed"
    echo "   Install with: sudo yum install -y postgresql15"
fi
echo ""

echo "5. Application Status..."
if command -v pm2 &> /dev/null; then
    echo -e "   ${GREEN}✓${NC} PM2 is installed"
    
    if pm2 list | grep -q "political-ad-tracker"; then
        echo "   PM2 Status:"
        pm2 list | grep "political-ad-tracker"
        echo ""
        echo "   Recent Errors (last 10 lines):"
        pm2 logs political-ad-tracker --nostream --lines 10 --err 2>/dev/null | tail -10 || echo "   No recent errors"
    else
        echo -e "   ${YELLOW}!${NC} Application not running in PM2"
    fi
else
    echo -e "   ${RED}✗${NC} PM2 not installed"
fi
echo ""

echo "6. Security Group Recommendations..."
echo "   Your RDS security group should have an inbound rule like:"
echo "   ┌─────────────────────────────────────────────────┐"
echo "   │ Type:        PostgreSQL                        │"
echo "   │ Protocol:    TCP                               │"
echo "   │ Port:        5432                              │"
echo "   │ Source:      [Your EC2 Security Group ID]     │"
echo "   └─────────────────────────────────────────────────┘"
echo ""

echo "7. Quick Fix Commands..."
echo ""
echo "   If DNS works but connection fails, fix Security Group:"
echo "   ${YELLOW}▶${NC} AWS Console: RDS → political-ads → VPC security group → Edit inbound rules"
echo ""
echo "   Test connection manually:"
echo "   ${YELLOW}▶${NC} psql 'postgresql://g67:PASSWORD@$RDS_HOST:5432/mydb?sslmode=require'"
echo ""
echo "   After fixing, pull latest code and restart:"
echo "   ${YELLOW}▶${NC} cd /home/ec2-user/political-ad-tracker"
echo "   ${YELLOW}▶${NC} git pull origin feature/individual"
echo "   ${YELLOW}▶${NC} npm ci"
echo "   ${YELLOW}▶${NC} npm run build"
echo "   ${YELLOW}▶${NC} pm2 restart political-ad-tracker"
echo ""

echo "======================================"
echo "Diagnostic Complete"
echo "======================================"
