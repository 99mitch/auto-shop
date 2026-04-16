# FloraMini 🌸

Telegram Mini App flower shop — monorepo with React TMA frontend, Express/Prisma backend, and grammy bot.

## Setup

```bash
# 1. Install all workspace dependencies
npm install

# 2. Configure backend environment
cp .env.example backend/.env
# Edit backend/.env — fill in BOT_TOKEN, JWT_SECRET, ADMIN_IDS

# 3. Create database and run migrations
cd backend
npx prisma migrate dev --name init
cd ..

# 4. Seed the database (5 categories, 12 products)
npm run seed

# 5. Start all services
npm run dev
```

- Frontend: http://localhost:5173
- Backend API: http://localhost:3001

## Bot Webhook (production)

```bash
curl "https://api.telegram.org/bot{BOT_TOKEN}/setWebhook?url={BACKEND_URL}/webhook"
```

## Structure

```
floramini/
  packages/types/   shared TypeScript interfaces + Zod schemas
  frontend/         Vite + React 18 TMA
  backend/          Express + Prisma + SQLite
  bot/              grammy commands (shared with backend process)
```

## Backend Tests

```bash
cd backend && npm test
```
