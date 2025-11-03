#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${GREEN}=== Political Ad Tracker - Database Setup Check ===${NC}\n"

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo -e "${RED}❌ .env.local file not found!${NC}"
    echo -e "Please create .env.local with your database credentials."
    exit 1
fi

# Check if DATABASE_URL is set
if grep -q "YOUR_PASSWORD" .env.local; then
    echo -e "${RED}❌ Please update .env.local with your actual database password!${NC}"
    echo -e "Replace YOUR_PASSWORD in .env.local with your actual password."
    exit 1
fi

echo -e "${GREEN}✓ Environment file configured${NC}"
echo -e "${GREEN}✓ Using AWS RDS direct connection${NC}"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}⚠ Dependencies not installed. Installing...${NC}"
    npm install
fi

echo -e "\n${GREEN}=== Starting Development Server ===${NC}\n"
npm run dev
