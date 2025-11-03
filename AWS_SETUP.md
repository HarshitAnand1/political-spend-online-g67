# AWS RDS Connection Setup

## Current Issue

Your connection is being blocked by AWS RDS security group. You're getting this error:

```
no pg_hba.conf entry for host "14.139.34.152", user "g67", database "mydb"
```

This means your IP address (14.139.34.152) is not allowed to connect.

## Fix: Add Your IP to RDS Security Group

### Option 1: AWS Console (Recommended)

1. Go to [AWS RDS Console](https://ap-south-1.console.aws.amazon.com/rds/home?region=ap-south-1)
2. Click on your database: `political-ads`
3. Go to "Connectivity & security" tab
4. Under "Security", click on the VPC security group (e.g., `sg-xxxxx`)
5. Click "Edit inbound rules"
6. Click "Add rule"
7. Configure the new rule:
   - **Type**: PostgreSQL
   - **Protocol**: TCP
   - **Port**: 5432
   - **Source**: Custom - `14.139.34.152/32`
   - **Description**: "My development machine"
8. Click "Save rules"

### Option 2: AWS CLI

```bash
# Get your security group ID
aws rds describe-db-instances \
  --db-instance-identifier political-ads \
  --query 'DBInstances[0].VpcSecurityGroups[0].VpcSecurityGroupId' \
  --region ap-south-1

# Add your IP to the security group
aws ec2 authorize-security-group-ingress \
  --group-id sg-YOUR-SECURITY-GROUP-ID \
  --protocol tcp \
  --port 5432 \
  --cidr 14.139.34.152/32 \
  --region ap-south-1
```

## After Fixing Security Group

Once you've added your IP, test the connection:

```bash
./test-direct-connection.sh
```

You should see:
```
✅ Connection successful!
```

Then start your development server:

```bash
./start-dev.sh
```

Visit http://localhost:3000 to see your dashboard with data!

## Dynamic IP Address?

If your IP address changes frequently (home internet, mobile hotspot), you have two options:

### Option 1: Allow Your Network Range
Instead of `/32` (single IP), use a broader range:
- Home network: `14.139.34.0/24` (allows 14.139.34.0 to 14.139.34.255)
- Campus network: Ask your IT admin for the IP range

### Option 2: Use a VPN with Static IP
- AWS Client VPN
- Cloud VPN service with static IP
- SSH tunnel through a server with static IP

## Security Note

**⚠️ Important**: Only add your IP or trusted IPs to the security group. Never use `0.0.0.0/0` (allows all IPs) for production databases!

## Need Help?

If you don't have access to modify AWS RDS security groups:
1. Contact your database administrator
2. Ask them to add your IP: `14.139.34.152/32`
3. If IP changes frequently, ask for a VPN or bastion host setup
