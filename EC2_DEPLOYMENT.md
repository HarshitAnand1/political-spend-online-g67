# EC2 Deployment Guide for Political Ad Tracker

## Prerequisites
- AWS EC2 instance (t2.medium or larger recommended)
- Ubuntu 22.04 LTS
- Security group allowing inbound traffic on ports 80, 443, and 22
- AWS RDS PostgreSQL database (or accessible PostgreSQL instance)

## Step-by-Step Deployment

### 1. Connect to Your EC2 Instance
```bash
ssh -i your-key.pem ubuntu@your-ec2-public-ip
```

### 2. Install System Dependencies
```bash
# Update system
sudo apt-get update && sudo apt-get upgrade -y

# Install Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2 globally
sudo npm install -g pm2

# Install Nginx
sudo apt-get install -y nginx

# Install Git
sudo apt-get install -y git
```

### 3. Clone Your Repository
```bash
cd /home/ubuntu
git clone https://github.com/HarshitAnand1/political-spend-online-g67.git political-ad-tracker
cd political-ad-tracker

# Checkout your branch
git checkout feature/individual
```

### 4. Configure Environment Variables
```bash
# Copy example env file
cp .env.production.example .env.production

# Edit with your actual values
nano .env.production
```

Add your actual database credentials:
```
DATABASE_URL=postgresql://username:password@your-rds-endpoint.region.rds.amazonaws.com:5432/political_ads_db
NODE_ENV=production
PORT=3000
```

### 5. Run the Deployment Script
```bash
chmod +x deploy-ec2.sh
./deploy-ec2.sh
```

This script will:
- Install dependencies
- Build the Next.js application
- Start the app with PM2 in cluster mode
- Configure PM2 to restart on system reboot

### 6. Configure Nginx (Optional but Recommended)
```bash
# Copy nginx configuration
sudo cp nginx.conf /etc/nginx/sites-available/political-ad-tracker

# Update the server_name in the config
sudo nano /etc/nginx/sites-available/political-ad-tracker
# Change: server_name your-domain.com www.your-domain.com;
# To your actual domain or EC2 public IP

# Enable the site
sudo ln -s /etc/nginx/sites-available/political-ad-tracker /etc/nginx/sites-enabled/

# Remove default nginx site
sudo rm /etc/nginx/sites-enabled/default

# Test nginx configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### 7. Configure Security Group
In AWS Console > EC2 > Security Groups:
- Allow inbound HTTP (port 80) from 0.0.0.0/0
- Allow inbound HTTPS (port 443) from 0.0.0.0/0
- Allow inbound SSH (port 22) from your IP only

### 8. Verify Deployment
```bash
# Check PM2 status
pm2 status

# View logs
pm2 logs political-ad-tracker

# Test the application
curl http://localhost:3000
```

Access your application:
- If using Nginx: `http://your-ec2-public-ip`
- Direct access: `http://your-ec2-public-ip:3000`

## Optional: Setup SSL with Let's Encrypt

```bash
# Install certbot
sudo apt-get install -y certbot python3-certbot-nginx

# Get SSL certificate (replace with your domain)
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal is configured automatically
# Test renewal:
sudo certbot renew --dry-run
```

## PM2 Commands

```bash
# View status
pm2 status

# View logs
pm2 logs political-ad-tracker

# Restart app
pm2 restart political-ad-tracker

# Stop app
pm2 stop political-ad-tracker

# Monitor resources
pm2 monit

# View detailed info
pm2 show political-ad-tracker
```

## Updating Your Application

When you push changes to GitHub:

```bash
# SSH into EC2
ssh -i your-key.pem ubuntu@your-ec2-public-ip

# Navigate to app directory
cd /home/ubuntu/political-ad-tracker

# Pull latest changes
git pull origin feature/individual

# Install new dependencies (if any)
npm ci

# Rebuild
npm run build

# Restart with PM2
pm2 restart political-ad-tracker

# Or use the deploy script
./deploy-ec2.sh
```

## Troubleshooting

### App won't start
```bash
# Check PM2 logs
pm2 logs political-ad-tracker --lines 100

# Check if port 3000 is in use
sudo lsof -i :3000

# Check environment variables
pm2 env 0
```

### Database connection issues
```bash
# Test DB connection from EC2
psql "postgresql://user:pass@rds-endpoint:5432/dbname"

# Check security groups (RDS must allow inbound from EC2)
# Verify DATABASE_URL in .env.production
```

### Nginx issues
```bash
# Check nginx status
sudo systemctl status nginx

# Check nginx error logs
sudo tail -f /var/log/nginx/error.log

# Test configuration
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx
```

### Out of memory
```bash
# Check memory usage
free -h

# Increase EC2 instance size or add swap:
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

## Database Connection Best Practices

If using RDS in the same VPC as EC2:
- Use the private endpoint (not public)
- Configure security groups to allow EC2 → RDS on port 5432
- Use connection pooling (already configured in lib/db.js)

## Performance Optimization

For better performance:
1. Use an Application Load Balancer (ALB) if scaling to multiple EC2 instances
2. Enable CloudFront CDN for static assets
3. Use RDS read replicas for read-heavy workloads
4. Add ElastiCache Redis for API response caching

## Monitoring

Set up CloudWatch:
```bash
# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
sudo dpkg -i -E ./amazon-cloudwatch-agent.deb
```

Configure it to monitor:
- CPU usage
- Memory usage
- Disk usage
- Application logs

## Cost Optimization

- Use t3.medium or t3a.medium for cost savings
- Stop EC2 during non-business hours (if applicable)
- Use RDS reserved instances for 1-3 year commitments
- Set up billing alerts in AWS
