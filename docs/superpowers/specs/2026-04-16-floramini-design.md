# FloraMini — Design Spec
**Date:** 2026-04-16  
**Status:** Approved

---

## Overview

FloraMini is a Telegram Mini App (TMA) flower shop. Users browse a product catalogue, add items to a cart, check out with a delivery address and time slot, and receive order status updates via Telegram bot messages. An admin panel allows shop operators to manage products and orders.

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + @twa-dev/sdk + Zustand + React Query |
| Backend | Node.js + Express + TypeScript + Prisma + SQLite |
| Bot | grammy (webhook, shared with backend process) |
| Monorepo | npm workspaces + concurrently |
| Shared types | `packages/types` — re-exported Prisma types + Zod schemas |

---

## Monorepo Structure

```
floramini/
  packages/
    types/            ← shared TypeScript types + Zod schemas (no Prisma dep)
  frontend/           ← Vite React TMA (port 5173)
  backend/            ← Express + Prisma + SQLite (port 3001)
  bot/                ← grammy instance, no own HTTP server
  package.json        ← npm workspaces root, concurrently dev script
  .env.example
  README.md
```

`npm run dev` starts Vite and the backend+bot server concurrently.

---

## Auth

1. On app load, frontend calls `POST /api/auth/init` with `X-Telegram-Init-Data: <raw initData>` header.
2. Backend validates HMAC-SHA256 of initData against `BOT_TOKEN`.
3. On success: upserts `User` record, returns a signed JWT (15-minute expiry).
4. Frontend stores JWT in memory (authStore). All subsequent API calls send `Authorization: Bearer <token>`.
   On any `401` response, frontend automatically re-calls `/api/auth/init` to get a fresh token, then retries the original request once.
5. Admin routes additionally verify that `user.telegramId` is in the `ADMIN_IDS` env var (comma-separated list).

---

## Prisma Schema

```prisma
model User {
  id         Int       @id @default(autoincrement())
  telegramId String    @unique
  firstName  String
  lastName   String?
  username   String?
  photoUrl   String?
  createdAt  DateTime  @default(now())
  orders     Order[]
  addresses  Address[]
}

model Address {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id])
  label     String
  street    String
  city      String
  zip       String
  isDefault Boolean @default(false)
  orders    Order[]
}

model Category {
  id       Int       @id @default(autoincrement())
  slug     String    @unique
  name     String
  order    Int
  products Product[]
}

model Product {
  id          Int         @id @default(autoincrement())
  categoryId  Int
  category    Category    @relation(fields: [categoryId], references: [id])
  name        String
  description String
  price       Float
  stock       Int         @default(0)
  imageUrl    String
  images      String      @default("[]") // JSON array of extra image URLs
  isActive    Boolean     @default(true)
  orderItems  OrderItem[]
}

model Order {
  id           Int         @id @default(autoincrement())
  userId       Int
  user         User        @relation(fields: [userId], references: [id])
  addressId    Int?
  address      Address?    @relation(fields: [addressId], references: [id])
  status       OrderStatus @default(PENDING)
  note         String?
  subtotal     Float
  deliveryFee  Float
  total        Float
  deliverySlot String      // ISO datetime string of chosen slot start
  createdAt    DateTime    @default(now())
  items        OrderItem[]
}

model OrderItem {
  id        Int     @id @default(autoincrement())
  orderId   Int
  order     Order   @relation(fields: [orderId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  quantity  Int
  unitPrice Float
  options   String  @default("{}") // JSON: {size?, color?}
}

model Favorite {
  id        Int     @id @default(autoincrement())
  userId    Int
  user      User    @relation(fields: [userId], references: [id])
  productId Int
  product   Product @relation(fields: [productId], references: [id])
  @@unique([userId, productId])
}

model Setting {
  key   String @id
  value String // JSON-serialized value
}

enum OrderStatus {
  PENDING
  CONFIRMED
  PREPARING
  DELIVERING
  DELIVERED
  CANCELLED
}
```

---

## Backend API

### Auth
| Method | Path | Description |
|---|---|---|
| POST | `/api/auth/init` | Validate initData, return JWT |

### Public (JWT required)
| Method | Path | Description |
|---|---|---|
| GET | `/api/products` | List products (filter: `category`, `search`) |
| GET | `/api/products/:id` | Product detail |
| GET | `/api/categories` | List categories |
| POST | `/api/orders` | Create order |
| GET | `/api/orders` | User's orders |
| GET | `/api/orders/:id` | Order detail |
| POST | `/api/orders/:id/pay` | Mock payment — sets status to CONFIRMED, triggers bot notification |

### Admin (JWT + admin check)
| Method | Path | Description |
|---|---|---|
| GET | `/api/admin/orders` | All orders (filter by status, sort by date) |
| PATCH | `/api/admin/orders/:id` | Update order status |
| GET | `/api/admin/products` | All products (including inactive) |
| POST | `/api/admin/products` | Create product |
| PUT | `/api/admin/products/:id` | Update product |
| DELETE | `/api/admin/products/:id` | Soft-delete (sets isActive = false) |
| GET | `/api/admin/stats` | Orders today, revenue today, low-stock products |
| GET | `/api/admin/me` | Returns current user + isAdmin flag |
| GET | `/api/admin/settings` | Get delivery fee + time slots |
| PUT | `/api/admin/settings` | Update delivery fee + time slots |

Settings are stored in a `Setting` key-value model in Prisma (see schema below).

---

## Frontend Routes

```
/                   Catalogue — product grid, category tabs, text search
/product/:id        Product detail — image gallery, description, size/color options, add-to-cart (MainButton)
/cart               Cart drawer/page — item list, qty +/-, remove, note input, proceed CTA (MainButton)
/checkout           Address form/picker, delivery slot picker, order summary, place order (MainButton)
/order/:id          Order confirmation
/orders             Order history list with status badges
/orders/:id         Order detail — item list, 5-step status progress bar, delivery info
/profile            Telegram user info, saved addresses CRUD, favorites, link to orders
/admin              Dashboard — orders today, revenue, low-stock alerts
/admin/orders       Orders table — sortable by date, filterable by status, click to update status
/admin/products     Product list — add/edit/delete, image URL, price, stock, category
/admin/settings     Delivery fee + available time slots config
```

### Telegram Integration
- `@twa-dev/sdk` wraps `window.Telegram.WebApp`
- On mount: apply `themeParams` CSS variables to `:root` (`--tg-theme-bg-color`, etc.)
- `useTelegramBackButton(onBack)` hook — shows/hides BackButton per route
- `useTelegramMainButton(label, onClick, enabled)` hook — controls MainButton per page
- Admin guard: compare `initDataUnsafe.user.id` against response from `/api/admin/me`; redirect to `/` if not admin

### State
- `authStore` (Zustand) — JWT, user info, isAdmin flag
- `cartStore` (Zustand + localStorage) — items (`{productId, quantity, options}`), note
- Server state — React Query with sensible stale times (products: 5min, orders: 30s)

---

## Bot

grammy instance exported from `bot/index.ts`, imported by backend. Backend mounts `POST /webhook` → `bot.handleUpdate(req.body)`.

**Commands:**
- `/start` → Welcome + "🌸 Ouvrir la boutique" WebApp button → `MINI_APP_URL`
- `/orders` → "📦 Mes commandes" WebApp button → `MINI_APP_URL/orders`
- `/help` → FAQ (delivery times, returns, contact)

**Order notifications** (fire-and-forget, non-blocking):

| Status | Message |
|---|---|
| CONFIRMED | ✅ Commande #XXX confirmée ! Total: €XX |
| PREPARING | 👨‍🍳 Votre commande est en préparation |
| DELIVERING | 🚚 En livraison ! |
| DELIVERED | ✅ Livrée ! Merci pour votre confiance 🌸 |
| CANCELLED | ❌ Commande #XXX annulée |

---

## Payment (Mock)

`POST /api/orders/:id/pay` immediately transitions order status to `CONFIRMED` and sends the bot notification. No external payment provider is called. A `// TODO: integrate crypto payment API` comment marks the integration point.

---

## Seed Data

5 categories: Bouquets, Roses, Plantes, Séchées, Compositions (slug-based)

12 products with `picsum.photos` placeholder image URLs (deterministic by product ID):

| Name | Category | Price | Stock |
|---|---|---|---|
| Bouquet Romantique Rose | Bouquets | €45 | 10 |
| Composition Printanière | Bouquets | €38 | 8 |
| Bouquet Sauvage | Bouquets | €35 | 12 |
| Bouquet Luxe Pivoine | Bouquets | €65 | 6 |
| Rose Rouge Classique | Roses | €28 | 20 |
| Rose Blanche Élégance | Roses | €32 | 15 |
| Rose Arc-en-Ciel | Roses | €55 | 7 |
| Plante Monstera | Plantes | €29 | 15 |
| Plante Pothos Doré | Plantes | €18 | 25 |
| Rose Éternelle Séchée | Séchées | €22 | 20 |
| Couronne Séchée Bohème | Séchées | €48 | 9 |
| Composition Tropicale | Compositions | €72 | 5 |

---

## Environment Variables

**Backend `.env`:**
```
BOT_TOKEN=
DATABASE_URL=file:./dev.db
ADMIN_IDS=123456789,987654321
MINI_APP_URL=https://your-mini-app.vercel.app
JWT_SECRET=
PORT=3001
```

**Frontend `.env`:**
```
VITE_API_URL=http://localhost:3001
```

---

## Dev Setup

```bash
npm install          # installs all workspaces
npm run dev          # starts frontend (5173) + backend+bot (3001) concurrently
npm run seed         # seeds the database
```
