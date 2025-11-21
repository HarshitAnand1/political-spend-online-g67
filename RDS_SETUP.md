# AWS RDS Connection Setup Guide

## Your Current Configuration (from error log)
- **RDS Endpoint:** `political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com`
- **Database:** `mydb`
- **User:** `g67`
- **Region:** `ap-south-1` (Mumbai)
- **Port:** `5432`

## The Problem: ETIMEDOUT Error

The `ETIMEDOUT` error means your EC2 instance **cannot reach** the RDS database. This is almost always a **Security Group** configuration issue.

---

## ✅ CRITICAL FIX: Security Groups

### Step 1: Find Your EC2 Security Group
```bash
# On your EC2 instance, find the security group ID:
ec2-metadata --security-groups
# OR from AWS Console: EC2 > Instances > Select your instance > Security tab
```

### Step 2: Update RDS Security Group

**In AWS Console:**

1. Go to **RDS Console** → **Databases** → Click `political-ads`
2. Click on the **VPC security group** (e.g., `sg-xxxxx`)
3. Click **Edit inbound rules**
4. Add a new rule:
   ```
   Type: PostgreSQL
   Protocol: TCP
   Port: 5432
   Source: [Your EC2 Security Group ID]  (e.g., sg-0123456789abcdef)
   Description: Allow EC2 to access RDS
   ```
5. Click **Save rules**

**OR via AWS CLI:**
```bash
# Replace with your actual security group IDs
RDS_SG_ID="sg-xxxxx"  # Your RDS security group
EC2_SG_ID="sg-yyyyy"  # Your EC2 security group

aws ec2 authorize-security-group-ingress \
  --group-id $RDS_SG_ID \
  --protocol tcp \
  --port 5432 \
  --source-group $EC2_SG_ID \
  --region ap-south-1
```

---

## ✅ Verify Connection from EC2

### Test 1: Check Network Connectivity
```bash
# Test if EC2 can reach RDS
telnet political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com 5432

# If telnet isn't installed:
nc -zv political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com 5432

# Expected output if working:
# Connection to political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com 5432 port [tcp/postgresql] succeeded!
```

### Test 2: Test PostgreSQL Connection
```bash
# Install psql if not already installed
sudo yum install -y postgresql15  # Amazon Linux 2023
# OR
sudo yum install -y postgresql    # Amazon Linux 2

# Test connection
psql "postgresql://g67:YOUR_PASSWORD@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb?sslmode=require"

# If successful, you'll see:
# psql (15.x)
# SSL connection (protocol: TLSv1.3, ...)
# Type "help" for help.
# mydb=>
```

---

## ✅ Update Your .env.production

Make sure your connection string includes SSL:

```bash
# Edit on EC2
nano /home/ec2-user/political-ad-tracker/.env.production
```

Add/update:
```
DATABASE_URL=postgresql://g67:YOUR_PASSWORD@political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com:5432/mydb?sslmode=require
NODE_ENV=production
PORT=3000
```

**Important:** Replace `YOUR_PASSWORD` with your actual RDS password!

---

## ✅ Common Issues & Solutions

### Issue 1: "Connection refused"
**Cause:** RDS security group doesn't allow EC2
**Fix:** Add EC2 security group to RDS inbound rules (see Step 2 above)

### Issue 2: "Connection timeout"
**Cause:** Network ACL or routing issue
**Fix:** 
1. Ensure EC2 and RDS are in the same VPC
2. Check VPC route tables
3. Check Network ACLs allow port 5432

### Issue 3: "Authentication failed"
**Cause:** Wrong password or user doesn't exist
**Fix:** 
```bash
# Reset RDS password in AWS Console
# OR check user exists in database
```

### Issue 4: RDS is publicly accessible but still can't connect
**Cause:** EC2 is trying to use private IP
**Fix:** If RDS is public, ensure security group allows your EC2's **public IP**:
```bash
# Get EC2 public IP
curl http://169.254.169.254/latest/meta-data/public-ipv4

# Add this IP to RDS security group:
# Source: [EC2-PUBLIC-IP]/32
```

---

## ✅ Best Practices for Production

### 1. Use Private Subnet (Recommended)
- Place both EC2 and RDS in **private subnets** within the same VPC
- Use security groups instead of IP addresses
- This is more secure and avoids public internet traffic

### 2. Connection String with SSL
```
postgresql://user:pass@host:5432/db?sslmode=require&connect_timeout=10
```

### 3. Monitor Connections
```bash
# On RDS, check active connections:
SELECT count(*) FROM pg_stat_activity WHERE datname = 'mydb';

# Check for idle connections:
SELECT count(*) FROM pg_stat_activity WHERE state = 'idle';
```

### 4. Set Connection Limits
In RDS Parameter Group, configure:
- `max_connections` = 100 (or appropriate for your instance type)
- `idle_in_transaction_session_timeout` = 60000 (60 seconds)

---

## ✅ After Security Group Fix

### 1. Restart Your App on EC2
```bash
cd /home/ec2-user/political-ad-tracker
pm2 restart political-ad-tracker
pm2 logs political-ad-tracker --lines 50
```

### 2. Check for Successful Connection
Look for logs like:
```
Database connection established
Query executed: SELECT ...
```

### 3. Test Your Application
```bash
# From EC2
curl http://localhost:3000/api/test-db

# From browser
http://your-ec2-ip/api/test-db
```

---

## ✅ Monitoring & Alerts

Set up CloudWatch alarms for:
1. RDS: `DatabaseConnections` > 80% of max
2. RDS: `CPUUtilization` > 80%
3. RDS: `FreeableMemory` < 1GB
4. EC2: Application logs for "ETIMEDOUT"

---

## Need Help?

If you're still getting errors:

1. **Check security groups:**
   ```bash
   aws ec2 describe-security-groups --group-ids sg-xxxxx --region ap-south-1
   ```

2. **Check RDS status:**
   ```bash
   aws rds describe-db-instances --db-instance-identifier political-ads --region ap-south-1
   ```

3. **Check EC2 can resolve DNS:**
   ```bash
   nslookup political-ads.cb62o0qg8ddd.ap-south-1.rds.amazonaws.com
   ```

4. **Check VPC routing:**
   ```bash
   # Ensure EC2 and RDS are in same VPC
   aws ec2 describe-instances --instance-ids i-xxxxx --region ap-south-1 --query 'Reservations[0].Instances[0].VpcId'
   aws rds describe-db-instances --db-instance-identifier political-ads --region ap-south-1 --query 'DBInstances[0].DBSubnetGroup.VpcId'
   ```
