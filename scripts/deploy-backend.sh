#!/bin/bash
set -e

APP_DIR="/var/www/auto-shop"
BACKEND_DIR="$APP_DIR/backend"
DB_PATH="/var/www/auto-shop-data/prod.db"

echo "==> Pulling latest code..."
cd "$APP_DIR"
git pull origin main

echo "==> Installing root dependencies..."
npm install --workspaces=false

echo "==> Building shared types..."
cd "$APP_DIR/packages/types"
npm install
npm run build

echo "==> Installing backend dependencies..."
cd "$BACKEND_DIR"
npm install

echo "==> Building backend..."
npm run build

echo "==> Running Prisma migrations..."
DATABASE_URL="file:$DB_PATH" npx prisma migrate deploy

echo "==> Restarting backend with PM2..."
pm2 restart auto-shop-backend || pm2 start dist/src/index.js \
  --name auto-shop-backend \
  --cwd "$BACKEND_DIR" \
  --env production

pm2 save

echo "==> Deploy complete!"
