#!/bin/bash
# Run this ONCE on the VPS to set up the environment.
# Usage: bash setup-vps.sh
set -e

APP_DIR="/var/www/auto-shop"
DATA_DIR="/var/www/auto-shop-data"

echo "==> Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git

echo "==> Installing PM2..."
sudo npm install -g pm2

echo "==> Creating data directory for SQLite database..."
sudo mkdir -p "$DATA_DIR"
sudo chown "$USER:$USER" "$DATA_DIR"

echo "==> Cloning repository..."
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
git clone https://github.com/99mitch/auto-shop.git "$APP_DIR"

echo "==> Creating .env file..."
cat > "$APP_DIR/backend/.env" << 'EOF'
# Fill in your production values:
BOT_TOKEN=
DATABASE_URL=file:/var/www/auto-shop-data/prod.db
ADMIN_IDS=1396143328
MINI_APP_URL=https://auto-shop-rho.vercel.app
JWT_SECRET=
PORT=3001
DEV_MODE=false
EOF

echo ""
echo "==> Setup complete!"
echo "    Edit $APP_DIR/backend/.env with your production values, then run:"
echo "    bash $APP_DIR/scripts/deploy-backend.sh"
echo ""
echo "==> PM2 startup (run this to auto-restart on reboot):"
echo "    pm2 startup"
echo "    (follow the printed command)"
