#!/bin/bash
# EC2 Deployment Script
# Run this script on your EC2 instance

set -e

echo "🚀 Starting deployment..."

# Update system packages
echo "📦 Updating system packages..."
sudo apt-get update -y

# Install Node.js 18.x if not installed
if ! command -v node &> /dev/null; then
    echo "📥 Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Install PM2 globally if not installed
if ! command -v pm2 &> /dev/null; then
    echo "📥 Installing PM2..."
    sudo npm install -g pm2
fi

# Navigate to app directory
cd /home/ubuntu/political-ad-tracker || cd /home/ec2-user/political-ad-tracker

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --production=false

# Build Next.js app
echo "🔨 Building application..."
npm run build

# Create logs directory
mkdir -p logs

# Load environment variables
if [ -f .env.production ]; then
    echo "✅ Loading environment variables..."
    export $(cat .env.production | xargs)
fi

# Stop existing PM2 process
echo "🛑 Stopping existing process..."
pm2 stop political-ad-tracker || true

# Start application with PM2
echo "▶️  Starting application..."
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 to start on system boot
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp /home/$USER
pm2 save

echo "✅ Deployment complete!"
echo "📊 Check status: pm2 status"
echo "📋 View logs: pm2 logs political-ad-tracker"
echo "🔄 Restart: pm2 restart political-ad-tracker"
