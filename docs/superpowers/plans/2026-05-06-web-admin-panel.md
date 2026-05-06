# Web Admin Panel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a standalone web admin panel (outside Telegram Mini App) authenticated via Telegram Login Widget, giving super admins full control over users, admins, collaborators, and rich time-period stats.

**Architecture:** Vite multi-page app — `admin.html` is a separate entry point sharing the backend with the mini-app. Backend gets a `/api/web-admin/*` namespace with its own JWT flow (Telegram Login Widget hash verification, 7-day tokens). Super admins are hardcoded (`1396143328`, `8222875527`) and have exclusive access to admin management routes; regular admins see everything else.

**Tech Stack:** Express + Prisma (backend), React + React Router (HashRouter) + Zustand + TanStack Query + Axios (frontend), Telegram Login Widget v22, Vite multi-page, JetBrains Mono + Bebas Neue design system.

---

## File Map

### Backend — new files
| File | Responsibility |
|---|---|
| `backend/src/middleware/webAdminAuth.ts` | Verify web JWT (`web: true` claim), attach userId + telegramId |
| `backend/src/middleware/superAdmin.ts` | Reject if telegramId not in STATIC_ADMIN_IDS |
| `backend/src/routes/web-admin/auth.ts` | `POST /api/web-admin/auth/telegram` — verify Login Widget hash, return JWT |
| `backend/src/routes/web-admin/stats.ts` | `GET /api/web-admin/stats?period=day\|week\|month` — all KPIs |
| `backend/src/routes/web-admin/users.ts` | `GET/PATCH /api/web-admin/users` — list all users, edit balance/role |
| `backend/src/routes/web-admin/admins.ts` | `GET/POST/DELETE /api/web-admin/admins` — manage admin roles (super admin only) |
| `backend/src/routes/web-admin/collabs.ts` | `GET /api/web-admin/collabs` + `GET /api/web-admin/collabs/:id` — detailed collab stats |
| `backend/src/routes/web-admin/index.ts` | Aggregate all web-admin sub-routers |

### Backend — modified files
| File | Change |
|---|---|
| `backend/src/app.ts` | Register `webAdminRouter` at `/api/web-admin` |
| `backend/src/lib/jwt.ts` | Add `signWebJwt` (7d expiry, `web:true`) + `verifyWebJwt` |

### Frontend — new files
| File | Responsibility |
|---|---|
| `frontend/admin.html` | HTML entry point for web admin app |
| `frontend/src/admin.tsx` | React root for web admin (mounts `<AdminApp />`) |
| `frontend/src/web-admin/App.tsx` | HashRouter + routes |
| `frontend/src/web-admin/stores/auth.ts` | Zustand store — localStorage JWT, user, isSuperAdmin |
| `frontend/src/web-admin/lib/api.ts` | Axios instance with web-admin token injected |
| `frontend/src/web-admin/components/Layout.tsx` | Top nav + sidebar |
| `frontend/src/web-admin/components/Guard.tsx` | Redirect to /login if not authenticated |
| `frontend/src/web-admin/pages/Login.tsx` | Telegram Login Widget integration |
| `frontend/src/web-admin/pages/Dashboard.tsx` | KPI grid with period tabs (JOUR / SEMAINE / MOIS) |
| `frontend/src/web-admin/pages/Users.tsx` | Table of all users, inline balance edit, role change |
| `frontend/src/web-admin/pages/Admins.tsx` | Admin list, promote/demote (super admin only) |
| `frontend/src/web-admin/pages/Collabs.tsx` | Collab cards with sales stats |
| `frontend/src/web-admin/pages/CollabDetail.tsx` | Per-collab product breakdown |

### Frontend — modified files
| File | Change |
|---|---|
| `frontend/vite.config.ts` | Add `rollupOptions.input` for multi-page (`admin.html`) |

---

## Task 1 — Backend JWT helpers for web admin

**Files:**
- Modify: `backend/src/lib/jwt.ts`

- [ ] **Step 1: Add `signWebJwt` and `verifyWebJwt`**

```typescript
// backend/src/lib/jwt.ts  — replace full file
import jwt from 'jsonwebtoken'

interface JwtPayload {
  userId: number
  telegramId: string
}

interface WebJwtPayload extends JwtPayload {
  web: true
  isSuperAdmin: boolean
}

function getSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET environment variable is not set')
  return secret
}

export function signJwt(payload: JwtPayload): string {
  return jwt.sign(payload, getSecret(), { expiresIn: '15m' })
}

export function verifyJwt(token: string): JwtPayload {
  return jwt.verify(token, getSecret()) as JwtPayload
}

export function signWebJwt(payload: JwtPayload & { isSuperAdmin: boolean }): string {
  return jwt.sign({ ...payload, web: true }, getSecret(), { expiresIn: '7d' })
}

export function verifyWebJwt(token: string): WebJwtPayload {
  const decoded = jwt.verify(token, getSecret()) as any
  if (!decoded.web) throw new Error('Not a web token')
  return decoded as WebJwtPayload
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/lib/jwt.ts
git commit -m "feat(web-admin): add signWebJwt/verifyWebJwt (7d, web:true claim)"
```

---

## Task 2 — Backend middleware: webAdminAuth + superAdmin

**Files:**
- Create: `backend/src/middleware/webAdminAuth.ts`
- Create: `backend/src/middleware/superAdmin.ts`

- [ ] **Step 1: Create `webAdminAuth.ts`**

```typescript
// backend/src/middleware/webAdminAuth.ts
import { Request, Response, NextFunction } from 'express'
import { verifyWebJwt } from '../lib/jwt'
import { prisma } from '../prisma'

export interface WebAdminRequest extends Request {
  userId?: number
  telegramId?: string
  isSuperAdmin?: boolean
}

export async function webAdminAuth(req: WebAdminRequest, res: Response, next: NextFunction): Promise<void> {
  const auth = req.headers.authorization
  if (!auth?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized' })
    return
  }
  try {
    const payload = verifyWebJwt(auth.slice(7))
    req.userId = payload.userId
    req.telegramId = payload.telegramId
    req.isSuperAdmin = payload.isSuperAdmin

    // Verify the user still has ADMIN role in DB
    const user = await prisma.user.findUnique({ where: { id: payload.userId }, select: { role: true } })
    const STATIC_ADMIN_IDS = ['1396143328', '8222875527']
    if (!user || (user.role !== 'ADMIN' && !STATIC_ADMIN_IDS.includes(payload.telegramId))) {
      res.status(403).json({ error: 'Forbidden' })
      return
    }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}
```

- [ ] **Step 2: Create `superAdmin.ts`**

```typescript
// backend/src/middleware/superAdmin.ts
import { Response, NextFunction } from 'express'
import { WebAdminRequest } from './webAdminAuth'

const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

export function superAdminOnly(req: WebAdminRequest, res: Response, next: NextFunction): void {
  if (!req.telegramId || !STATIC_ADMIN_IDS.includes(req.telegramId)) {
    res.status(403).json({ error: 'Super admin only' })
    return
  }
  next()
}
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/middleware/webAdminAuth.ts backend/src/middleware/superAdmin.ts
git commit -m "feat(web-admin): webAdminAuth + superAdminOnly middleware"
```

---

## Task 3 — Backend auth route (Telegram Login Widget)

**Files:**
- Create: `backend/src/routes/web-admin/auth.ts`

The Telegram Login Widget sends: `{ id, first_name, last_name?, username?, photo_url?, auth_date, hash }`.  
Verification: `sha256(bot_token)` as HMAC key, `HMAC-SHA256(key, sorted_data_check_string)` must equal `hash`.

- [ ] **Step 1: Create `auth.ts`**

```typescript
// backend/src/routes/web-admin/auth.ts
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../../prisma'
import { signWebJwt } from '../../lib/jwt'

const router = Router()
const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

function verifyTelegramWidget(data: Record<string, string>, botToken: string): boolean {
  const { hash, ...rest } = data
  const checkString = Object.keys(rest)
    .sort()
    .map((k) => `${k}=${rest[k]}`)
    .join('\n')
  const secretKey = crypto.createHash('sha256').update(botToken).digest()
  const hmac = crypto.createHmac('sha256', secretKey).update(checkString).digest('hex')
  return hmac === hash
}

router.post('/telegram', async (req: Request, res: Response) => {
  const data = req.body as Record<string, string>

  if (!data.hash || !data.id || !data.auth_date) {
    res.status(400).json({ error: 'Missing Telegram auth data' })
    return
  }

  // Reject stale auth (older than 24h)
  if (Date.now() / 1000 - parseInt(data.auth_date) > 86400) {
    res.status(401).json({ error: 'Auth data expired' })
    return
  }

  if (!verifyTelegramWidget(data, process.env.BOT_TOKEN!)) {
    res.status(401).json({ error: 'Invalid Telegram signature' })
    return
  }

  const telegramId = String(data.id)

  // Only admins can use web panel
  const user = await prisma.user.findUnique({ where: { telegramId }, select: { id: true, role: true, firstName: true, username: true } })
  const isSuperAdmin = STATIC_ADMIN_IDS.includes(telegramId)

  if (!user) {
    res.status(403).json({ error: "Compte introuvable — ouvre d'abord la mini app" })
    return
  }

  if (user.role !== 'ADMIN' && !isSuperAdmin) {
    res.status(403).json({ error: 'Accès réservé aux administrateurs' })
    return
  }

  const token = signWebJwt({ userId: user.id, telegramId, isSuperAdmin })
  res.json({ token, user: { ...user, telegramId, isSuperAdmin } })
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/web-admin/auth.ts
git commit -m "feat(web-admin): Telegram Login Widget auth endpoint"
```

---

## Task 4 — Backend stats endpoint (period-based KPIs)

**Files:**
- Create: `backend/src/routes/web-admin/stats.ts`

Stats returned: revenue, orders, cards sold (orderItem qty), active cards, deposits (completed top-ups), total users — all broken by period.

- [ ] **Step 1: Create `stats.ts`**

```typescript
// backend/src/routes/web-admin/stats.ts
import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

function periodStart(period: string): Date {
  const now = new Date()
  if (period === 'week') {
    const d = new Date(now)
    d.setDate(d.getDate() - 6)
    d.setHours(0, 0, 0, 0)
    return d
  }
  if (period === 'month') {
    const d = new Date(now)
    d.setDate(d.getDate() - 29)
    d.setHours(0, 0, 0, 0)
    return d
  }
  // day (default)
  const d = new Date(now)
  d.setHours(0, 0, 0, 0)
  return d
}

router.get('/', async (req, res) => {
  const period = (['day', 'week', 'month'] as const).includes(req.query.period as any)
    ? (req.query.period as 'day' | 'week' | 'month')
    : 'day'

  const since = periodStart(period)
  const activeWhere = { NOT: { status: 'CANCELLED' } } as const
  const periodWhere = { createdAt: { gte: since }, NOT: { status: 'CANCELLED' } } as const

  const [
    totalRevenue, totalOrders, totalUsers,
    periodRevenue, periodOrders, periodCardsSold,
    activeCards, totalDeposits, periodDeposits,
  ] = await Promise.all([
    prisma.order.aggregate({ where: activeWhere, _sum: { total: true } }),
    prisma.order.count({ where: activeWhere }),
    prisma.user.count(),
    prisma.order.aggregate({ where: periodWhere, _sum: { total: true } }),
    prisma.order.count({ where: periodWhere }),
    prisma.orderItem.aggregate({
      where: { order: { createdAt: { gte: since }, NOT: { status: 'CANCELLED' } } },
      _sum: { quantity: true },
    }),
    prisma.product.count({ where: { isActive: true } }),
    prisma.balanceTopUp.aggregate({ where: { status: 'COMPLETED' }, _sum: { amount: true } }),
    prisma.balanceTopUp.aggregate({ where: { status: 'COMPLETED', createdAt: { gte: since } }, _sum: { amount: true } }),
  ])

  res.json({
    period,
    allTime: {
      revenue: totalRevenue._sum.total ?? 0,
      orders: totalOrders,
      users: totalUsers,
      deposits: totalDeposits._sum.amount ?? 0,
    },
    currentPeriod: {
      revenue: periodRevenue._sum.total ?? 0,
      orders: periodOrders,
      cardsSold: periodCardsSold._sum.quantity ?? 0,
      deposits: periodDeposits._sum.amount ?? 0,
    },
    activeCards,
  })
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/web-admin/stats.ts
git commit -m "feat(web-admin): period-based stats endpoint (day/week/month)"
```

---

## Task 5 — Backend users endpoint

**Files:**
- Create: `backend/src/routes/web-admin/users.ts`

- [ ] **Step 1: Create `users.ts`**

```typescript
// backend/src/routes/web-admin/users.ts
import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

// List all users with balance, order count, total spent
router.get('/', async (req, res) => {
  const search = (req.query.search as string) ?? ''
  const page = Math.max(1, parseInt(req.query.page as string) || 1)
  const limit = 50
  const skip = (page - 1) * limit

  const where = search
    ? {
        OR: [
          { firstName: { contains: search } },
          { username: { contains: search } },
          { telegramId: { contains: search } },
        ],
      }
    : {}

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        telegramId: true,
        firstName: true,
        lastName: true,
        username: true,
        role: true,
        balance: true,
        createdAt: true,
        _count: { select: { orders: true } },
        orders: {
          where: { NOT: { status: 'CANCELLED' } },
          select: { total: true },
        },
      },
    }),
    prisma.user.count({ where }),
  ])

  const result = users.map((u) => ({
    id: u.id,
    telegramId: u.telegramId,
    firstName: u.firstName,
    lastName: u.lastName,
    username: u.username,
    role: u.role,
    balance: u.balance,
    createdAt: u.createdAt,
    orderCount: u._count.orders,
    totalSpent: u.orders.reduce((s, o) => s + o.total, 0),
  }))

  res.json({ users: result, total, page, pages: Math.ceil(total / limit) })
})

// Update user balance or role
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const { balance, role } = req.body as { balance?: number; role?: string }

  const data: Record<string, unknown> = {}
  if (typeof balance === 'number') data.balance = Math.max(0, balance)
  if (role && ['CUSTOMER', 'COLLABORATOR', 'ADMIN'].includes(role)) data.role = role

  if (Object.keys(data).length === 0) {
    res.status(400).json({ error: 'Nothing to update' })
    return
  }

  const user = await prisma.user.update({ where: { id }, data, select: { id: true, balance: true, role: true } })
  res.json(user)
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/web-admin/users.ts
git commit -m "feat(web-admin): users list + balance/role update endpoints"
```

---

## Task 6 — Backend admins endpoint (super admin only)

**Files:**
- Create: `backend/src/routes/web-admin/admins.ts`

- [ ] **Step 1: Create `admins.ts`**

```typescript
// backend/src/routes/web-admin/admins.ts
import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()
const STATIC_ADMIN_IDS = ['1396143328', '8222875527']

router.get('/', async (_req, res) => {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      createdAt: true,
      _count: { select: { orders: true } },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json(
    admins.map((a) => ({
      ...a,
      isSuperAdmin: STATIC_ADMIN_IDS.includes(a.telegramId),
    }))
  )
})

// Promote a user to ADMIN by telegramId
router.post('/', async (req, res) => {
  const { telegramId } = req.body as { telegramId: string }
  if (!telegramId?.trim()) {
    res.status(400).json({ error: 'telegramId required' })
    return
  }

  const user = await prisma.user.findUnique({ where: { telegramId: telegramId.trim() } })
  if (!user) {
    res.status(404).json({ error: "Utilisateur introuvable — il doit d'abord ouvrir la mini app" })
    return
  }

  const updated = await prisma.user.update({ where: { id: user.id }, data: { role: 'ADMIN' }, select: { id: true, telegramId: true, firstName: true, role: true } })
  res.json(updated)
})

// Demote an admin back to CUSTOMER (cannot demote super admins)
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const user = await prisma.user.findUnique({ where: { id }, select: { telegramId: true } })

  if (!user) {
    res.status(404).json({ error: 'User not found' })
    return
  }
  if (STATIC_ADMIN_IDS.includes(user.telegramId)) {
    res.status(403).json({ error: 'Cannot demote a super admin' })
    return
  }

  await prisma.user.update({ where: { id }, data: { role: 'CUSTOMER' } })
  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/web-admin/admins.ts
git commit -m "feat(web-admin): admin management endpoints (super admin only)"
```

---

## Task 7 — Backend collabs endpoint (detailed stats)

**Files:**
- Create: `backend/src/routes/web-admin/collabs.ts`

- [ ] **Step 1: Create `collabs.ts`**

```typescript
// backend/src/routes/web-admin/collabs.ts
import { Router } from 'express'
import { prisma } from '../../prisma'

const router = Router()

router.get('/', async (_req, res) => {
  const collabs = await prisma.user.findMany({
    where: { role: 'COLLABORATOR' },
    select: {
      id: true,
      telegramId: true,
      firstName: true,
      lastName: true,
      username: true,
      createdAt: true,
      _count: { select: { products: true } },
      earnings: { select: { amount: true, platformFee: true, createdAt: true } },
      products: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          _count: { select: { orderItems: true } },
        },
      },
    },
    orderBy: { createdAt: 'asc' },
  })

  res.json(
    collabs.map((c) => ({
      id: c.id,
      telegramId: c.telegramId,
      firstName: c.firstName,
      lastName: c.lastName,
      username: c.username,
      createdAt: c.createdAt,
      cardCount: c._count.products,
      cardsSold: c.products.reduce((s, p) => s + p._count.orderItems, 0),
      totalEarnings: c.earnings.reduce((s, e) => s + e.amount, 0),
      totalPlatformFee: c.earnings.reduce((s, e) => s + e.platformFee, 0),
      products: c.products.map((p) => ({ ...p, salesCount: p._count.orderItems })),
    }))
  )
})

router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  const collab = await prisma.user.findFirst({
    where: { id, role: 'COLLABORATOR' },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      username: true,
      telegramId: true,
      products: {
        select: {
          id: true,
          name: true,
          price: true,
          stock: true,
          isActive: true,
          createdAt: true,
          _count: { select: { orderItems: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
      earnings: {
        select: { amount: true, platformFee: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 50,
      },
    },
  })

  if (!collab) {
    res.status(404).json({ error: 'Collaborateur introuvable' })
    return
  }

  res.json({
    ...collab,
    products: collab.products.map((p) => ({ ...p, salesCount: p._count.orderItems })),
    totalEarnings: collab.earnings.reduce((s, e) => s + e.amount, 0),
    totalPlatformFee: collab.earnings.reduce((s, e) => s + e.platformFee, 0),
  })
})

export default router
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/routes/web-admin/collabs.ts
git commit -m "feat(web-admin): detailed collaborator stats endpoints"
```

---

## Task 8 — Backend router assembly + app registration

**Files:**
- Create: `backend/src/routes/web-admin/index.ts`
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Create `index.ts`**

```typescript
// backend/src/routes/web-admin/index.ts
import { Router } from 'express'
import { webAdminAuth } from '../../middleware/webAdminAuth'
import { superAdminOnly } from '../../middleware/superAdmin'
import authRouter from './auth'
import statsRouter from './stats'
import usersRouter from './users'
import adminsRouter from './admins'
import collabsRouter from './collabs'

const router = Router()

// Auth is public (no webAdminAuth)
router.use('/auth', authRouter)

// All other routes require a valid web-admin JWT
router.use(webAdminAuth)
router.use('/stats', statsRouter)
router.use('/users', usersRouter)
router.use('/collabs', collabsRouter)

// Admin management requires super admin
router.use('/admins', superAdminOnly, adminsRouter)

export default router
```

- [ ] **Step 2: Register in `app.ts`**

Add after the existing imports and router registrations in `backend/src/app.ts`:

```typescript
// Add import at top with other imports:
import webAdminRouter from './routes/web-admin/index'

// Add after existing app.use() calls:
app.use('/api/web-admin', webAdminRouter)
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/web-admin/index.ts backend/src/app.ts
git commit -m "feat(web-admin): assemble and register web-admin router"
```

---

## Task 9 — Frontend Vite multi-page + HTML entry

**Files:**
- Modify: `frontend/vite.config.ts`
- Create: `frontend/admin.html`
- Create: `frontend/src/admin.tsx`

- [ ] **Step 1: Update `vite.config.ts`**

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        admin: resolve(__dirname, 'admin.html'),
      },
    },
  },
  server: {
    host: true,
    port: 5173,
    allowedHosts: 'all',
    proxy: {
      '/api': 'http://localhost:3001',
      '/webhook': 'http://localhost:3001',
    },
  },
})
```

- [ ] **Step 2: Create `admin.html`**

```html
<!DOCTYPE html>
<html lang="fr">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Panel Admin</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { background: #050505; color: #fff; font-family: system-ui, sans-serif; }
    </style>
  </head>
  <body>
    <div id="admin-root"></div>
    <script type="module" src="/src/admin.tsx"></script>
  </body>
</html>
```

- [ ] **Step 3: Create `src/admin.tsx`**

```typescript
import React from 'react'
import ReactDOM from 'react-dom/client'
import AdminApp from './web-admin/App'

ReactDOM.createRoot(document.getElementById('admin-root')!).render(
  <React.StrictMode>
    <AdminApp />
  </React.StrictMode>
)
```

- [ ] **Step 4: Commit**

```bash
git add frontend/vite.config.ts frontend/admin.html frontend/src/admin.tsx
git commit -m "feat(web-admin): Vite multi-page entry + admin.html"
```

---

## Task 10 — Frontend auth store + API client

**Files:**
- Create: `frontend/src/web-admin/stores/auth.ts`
- Create: `frontend/src/web-admin/lib/api.ts`

- [ ] **Step 1: Create `stores/auth.ts`**

```typescript
// frontend/src/web-admin/stores/auth.ts
import { create } from 'zustand'
import axios from 'axios'

interface AdminUser {
  id: number
  telegramId: string
  firstName: string
  username?: string
  role: string
  isSuperAdmin: boolean
}

interface AuthState {
  token: string | null
  user: AdminUser | null
  isSuperAdmin: boolean
  login: (telegramData: Record<string, string>) => Promise<void>
  logout: () => void
  restore: () => void
}

const BASE = import.meta.env.VITE_API_URL || ''

export const useAdminAuth = create<AuthState>((set) => ({
  token: null,
  user: null,
  isSuperAdmin: false,
  restore: () => {
    const token = localStorage.getItem('admin_token')
    const raw = localStorage.getItem('admin_user')
    if (token && raw) {
      try {
        const user = JSON.parse(raw) as AdminUser
        set({ token, user, isSuperAdmin: user.isSuperAdmin })
      } catch { /* ignore */ }
    }
  },
  login: async (telegramData) => {
    const res = await axios.post(`${BASE}/api/web-admin/auth/telegram`, telegramData)
    const { token, user } = res.data
    localStorage.setItem('admin_token', token)
    localStorage.setItem('admin_user', JSON.stringify(user))
    set({ token, user, isSuperAdmin: user.isSuperAdmin })
  },
  logout: () => {
    localStorage.removeItem('admin_token')
    localStorage.removeItem('admin_user')
    set({ token: null, user: null, isSuperAdmin: false })
  },
}))
```

- [ ] **Step 2: Create `lib/api.ts`**

```typescript
// frontend/src/web-admin/lib/api.ts
import axios from 'axios'

const BASE = import.meta.env.VITE_API_URL || ''

export const adminApi = axios.create({ baseURL: BASE })

adminApi.interceptors.request.use((config) => {
  const token = localStorage.getItem('admin_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/web-admin/stores/auth.ts frontend/src/web-admin/lib/api.ts
git commit -m "feat(web-admin): auth store (localStorage JWT) + adminApi axios client"
```

---

## Task 11 — Frontend App router + Guard + Layout

**Files:**
- Create: `frontend/src/web-admin/App.tsx`
- Create: `frontend/src/web-admin/components/Guard.tsx`
- Create: `frontend/src/web-admin/components/Layout.tsx`

- [ ] **Step 1: Create `App.tsx`**

```typescript
// frontend/src/web-admin/App.tsx
import { useEffect } from 'react'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAdminAuth } from './stores/auth'
import Guard from './components/Guard'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Users from './pages/Users'
import Admins from './pages/Admins'
import Collabs from './pages/Collabs'
import CollabDetail from './pages/CollabDetail'

const qc = new QueryClient()

const router = createHashRouter([
  { path: '/login', element: <Login /> },
  {
    path: '/',
    element: <Guard><Layout /></Guard>,
    children: [
      { index: true, element: <Dashboard /> },
      { path: 'users', element: <Users /> },
      { path: 'admins', element: <Admins /> },
      { path: 'collabs', element: <Collabs /> },
      { path: 'collabs/:id', element: <CollabDetail /> },
    ],
  },
])

export default function AdminApp() {
  const restore = useAdminAuth((s) => s.restore)
  useEffect(() => { restore() }, [])
  return (
    <QueryClientProvider client={qc}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
```

- [ ] **Step 2: Create `Guard.tsx`**

```typescript
// frontend/src/web-admin/components/Guard.tsx
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

export default function Guard({ children }: { children: React.ReactNode }) {
  const token = useAdminAuth((s) => s.token)
  const navigate = useNavigate()
  useEffect(() => { if (!token) navigate('/login', { replace: true }) }, [token])
  if (!token) return null
  return <>{children}</>
}
```

- [ ] **Step 3: Create `Layout.tsx`**

```typescript
// frontend/src/web-admin/components/Layout.tsx
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`

const navItems = [
  { path: '/', label: 'DASHBOARD', icon: '◈' },
  { path: '/users', label: 'UTILISATEURS', icon: '👤' },
  { path: '/admins', label: 'ADMINS', icon: '🛡' },
  { path: '/collabs', label: 'COLLABS', icon: '◉' },
]

export default function Layout() {
  const { user, logout, isSuperAdmin } = useAdminAuth()
  const navigate = useNavigate()
  const { hash } = useLocation()
  const currentPath = hash.replace('#', '') || '/'

  const visibleNav = isSuperAdmin ? navItems : navItems.filter((n) => n.path !== '/admins')

  return (
    <div style={{ display: 'flex', height: '100vh', background: '#050505', fontFamily: '"JetBrains Mono",monospace' }}>
      <style>{FONTS}</style>

      {/* Sidebar */}
      <aside style={{ width: 200, borderRight: '1px solid rgba(251,191,36,0.12)', display: 'flex', flexDirection: 'column', padding: '20px 0' }}>
        <div style={{ padding: '0 16px 20px', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 20, letterSpacing: '0.1em', color: '#fbbf24' }}>PANEL ADMIN</div>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>{user?.firstName ?? '—'}</div>
        </div>
        <nav style={{ flex: 1, padding: '12px 8px' }}>
          {visibleNav.map((item) => {
            const active = currentPath === item.path || (item.path !== '/' && currentPath.startsWith(item.path))
            return (
              <button key={item.path} onClick={() => navigate(item.path)} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px',
                borderRadius: 8, border: 'none', cursor: 'pointer', marginBottom: 2, textAlign: 'left',
                background: active ? 'rgba(251,191,36,0.1)' : 'transparent',
                color: active ? '#fbbf24' : 'rgba(255,255,255,0.4)',
                fontSize: 11, fontWeight: 700, letterSpacing: '0.08em', fontFamily: '"JetBrains Mono",monospace',
                borderLeft: active ? '2px solid #fbbf24' : '2px solid transparent',
              }}>
                <span style={{ fontSize: 14 }}>{item.icon}</span>
                {item.label}
              </button>
            )
          })}
        </nav>
        <div style={{ padding: '12px 16px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
          <button onClick={logout} style={{
            width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)',
            background: 'rgba(255,100,100,0.06)', color: 'rgba(255,100,100,0.7)', cursor: 'pointer',
            fontSize: 10, letterSpacing: '0.1em', fontFamily: '"JetBrains Mono",monospace',
          }}>
            DÉCONNEXION
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
        <Outlet />
      </main>
    </div>
  )
}
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/web-admin/App.tsx frontend/src/web-admin/components/
git commit -m "feat(web-admin): App router, Guard, Layout with sidebar navigation"
```

---

## Task 12 — Frontend Login page (Telegram Login Widget)

**Files:**
- Create: `frontend/src/web-admin/pages/Login.tsx`

The Telegram Login Widget requires `VITE_BOT_USERNAME` env var and the bot's domain whitelisted in BotFather (`/setdomain`).

- [ ] **Step 1: Create `Login.tsx`**

```typescript
// frontend/src/web-admin/pages/Login.tsx
import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdminAuth } from '../stores/auth'

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap');`
const BOT_USERNAME = import.meta.env.VITE_BOT_USERNAME as string

export default function Login() {
  const { login, token } = useAdminAuth()
  const navigate = useNavigate()
  const widgetRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (token) { navigate('/', { replace: true }); return }
  }, [token])

  useEffect(() => {
    if (!widgetRef.current) return

    // Expose global callback for Telegram widget
    ;(window as any).onTelegramAuth = async (user: Record<string, string>) => {
      try {
        await login(user)
        navigate('/', { replace: true })
      } catch (err: any) {
        const msg = err?.response?.data?.error ?? 'Accès refusé'
        alert(msg)
      }
    }

    const script = document.createElement('script')
    script.src = 'https://telegram.org/js/telegram-widget.js?22'
    script.setAttribute('data-telegram-login', BOT_USERNAME)
    script.setAttribute('data-size', 'large')
    script.setAttribute('data-onauth', 'onTelegramAuth(user)')
    script.setAttribute('data-request-access', 'write')
    script.async = true
    widgetRef.current.appendChild(script)

    return () => { delete (window as any).onTelegramAuth }
  }, [])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: '#050505', gap: 32 }}>
      <style>{FONTS}</style>

      <div style={{ textAlign: 'center' }}>
        <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 42, letterSpacing: '0.12em', color: '#fbbf24', lineHeight: 1 }}>PANEL ADMIN</div>
        <div style={{ fontSize: 10, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.2em', marginTop: 6 }}>ACCÈS RÉSERVÉ AUX ADMINISTRATEURS</div>
      </div>

      <div style={{
        background: '#111', border: '1px solid rgba(251,191,36,0.15)', borderRadius: 16,
        padding: '32px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, minWidth: 280,
      }}>
        <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', letterSpacing: '0.15em', fontFamily: '"JetBrains Mono",monospace' }}>
          CONNECTEZ-VOUS VIA TELEGRAM
        </div>
        <div ref={widgetRef} />
        <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', textAlign: 'center' }}>
          Seuls les administrateurs enregistrés ont accès
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add `VITE_BOT_USERNAME` to `.env` (frontend)**

In `frontend/.env` (or `.env.local`), add:
```
VITE_BOT_USERNAME=your_bot_username_without_@
```

⚠️ Also run `/setdomain` in BotFather and set the domain where this admin panel is hosted. Telegram Login Widget requires the domain to be whitelisted.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/web-admin/pages/Login.tsx
git commit -m "feat(web-admin): Telegram Login Widget page"
```

---

## Task 13 — Frontend Dashboard page

**Files:**
- Create: `frontend/src/web-admin/pages/Dashboard.tsx`

Three-tab KPI grid (JOUR / SEMAINE / MOIS). Big numbers, dark cards, gold accents — matching the mini-app DA.

- [ ] **Step 1: Create `Dashboard.tsx`**

```typescript
// frontend/src/web-admin/pages/Dashboard.tsx
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

type Period = 'day' | 'week' | 'month'
const PERIOD_LABELS: Record<Period, string> = { day: 'AUJOURD\'HUI', week: 'SEMAINE', month: 'MOIS' }

export default function Dashboard() {
  const [period, setPeriod] = useState<Period>('day')

  const { data } = useQuery({
    queryKey: ['web-admin-stats', period],
    queryFn: () => adminApi.get(`/api/web-admin/stats?period=${period}`).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  const periodCards = [
    { label: 'REVENUS', value: `€${(data?.currentPeriod?.revenue ?? 0).toFixed(2)}`, sub: `${data?.currentPeriod?.orders ?? 0} commandes` },
    { label: 'CARTES VENDUES', value: String(data?.currentPeriod?.cardsSold ?? '—'), sub: 'unités écoulées' },
    { label: 'DÉPÔTS', value: `€${(data?.currentPeriod?.deposits ?? 0).toFixed(2)}`, sub: 'rechargements validés' },
  ]

  const globalCards = [
    { label: 'CA TOTAL', value: `€${(data?.allTime?.revenue ?? 0).toFixed(2)}`, sub: `${data?.allTime?.orders ?? 0} commandes`, accent: true },
    { label: 'CARTES EN VENTE', value: String(data?.activeCards ?? '—'), sub: 'dans le catalogue' },
    { label: 'UTILISATEURS', value: String(data?.allTime?.users ?? '—'), sub: 'sur le bot' },
    { label: 'DÉPÔTS TOTAUX', value: `€${(data?.allTime?.deposits ?? 0).toFixed(2)}`, sub: 'all time' },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff', lineHeight: 1 }}>TABLEAU DE BORD</h1>
        <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4, letterSpacing: '0.1em' }}>STATISTIQUES GÉNÉRALES</p>
      </div>

      {/* Global KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        {globalCards.map((c, i) => (
          <div key={i} style={{
            background: '#111', borderRadius: 14, padding: '16px 18px',
            border: c.accent ? '1px solid rgba(251,191,36,0.25)' : '1px solid rgba(255,255,255,0.07)',
            borderLeft: c.accent ? '3px solid rgba(251,191,36,0.7)' : undefined,
          }}>
            <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{c.label}</div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: c.accent ? 30 : 24, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>{c.value}</div>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4 }}>{c.sub}</div>
          </div>
        ))}
      </div>

      {/* Period selector */}
      <div>
        <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
          {(['day', 'week', 'month'] as Period[]).map((p) => (
            <button key={p} onClick={() => setPeriod(p)} style={{
              padding: '6px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
              background: period === p ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              color: period === p ? '#fbbf24' : 'rgba(255,255,255,0.35)',
              fontSize: 10, fontWeight: 700, letterSpacing: '0.12em', fontFamily: '"JetBrains Mono",monospace',
              outline: period === p ? '1px solid rgba(251,191,36,0.4)' : 'none',
            }}>
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {periodCards.map((c, i) => (
            <div key={i} style={{ background: '#111', borderRadius: 14, padding: '16px 18px', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 6 }}>{c.label}</div>
              <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 26, color: '#fbbf24', letterSpacing: '0.04em', lineHeight: 1 }}>{c.value}</div>
              <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 4 }}>{c.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/web-admin/pages/Dashboard.tsx
git commit -m "feat(web-admin): dashboard with global KPIs + period tabs"
```

---

## Task 14 — Frontend Users page

**Files:**
- Create: `frontend/src/web-admin/pages/Users.tsx`

Paginated table with search, inline balance edit, role badge.

- [ ] **Step 1: Create `Users.tsx`**

```typescript
// frontend/src/web-admin/pages/Users.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

const ROLE_COLORS: Record<string, string> = {
  ADMIN: '#fbbf24',
  COLLABORATOR: '#4ade80',
  CUSTOMER: 'rgba(255,255,255,0.25)',
}

export default function Users() {
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editBalance, setEditBalance] = useState('')
  const qc = useQueryClient()

  const { data } = useQuery({
    queryKey: ['web-admin-users', search, page],
    queryFn: () => adminApi.get(`/api/web-admin/users?search=${encodeURIComponent(search)}&page=${page}`).then((r) => r.data),
    staleTime: 15_000,
  })

  const patchUser = useMutation({
    mutationFn: ({ id, body }: { id: number; body: object }) => adminApi.patch(`/api/web-admin/users/${id}`, body),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['web-admin-users'] }); setEditingId(null) },
  })

  const users: any[] = data?.users ?? []

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>UTILISATEURS</h1>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>{data?.total ?? 0} membres enregistrés</p>
        </div>
        <input
          placeholder="Recherche…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          style={{ background: '#111', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '8px 12px', color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, outline: 'none', width: 220 }}
        />
      </div>

      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {/* Header */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', padding: '10px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          {['UTILISATEUR', 'RÔLE', 'SOLDE', 'COMMANDES', 'DÉPENSÉ', 'ACTIONS'].map((h) => (
            <div key={h} style={{ fontSize: 7, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.22)', fontFamily: '"JetBrains Mono",monospace' }}>{h}</div>
          ))}
        </div>

        {users.map((u, i) => (
          <div key={u.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 100px', padding: '12px 16px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
            {/* Name */}
            <div>
              <div style={{ fontSize: 12, color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontWeight: 700 }}>{u.firstName} {u.lastName ?? ''}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>@{u.username ?? u.telegramId}</div>
            </div>
            {/* Role */}
            <div style={{ fontSize: 9, fontWeight: 700, color: ROLE_COLORS[u.role] ?? '#fff', letterSpacing: '0.1em', fontFamily: '"JetBrains Mono",monospace' }}>{u.role}</div>
            {/* Balance */}
            <div>
              {editingId === u.id ? (
                <div style={{ display: 'flex', gap: 4 }}>
                  <input
                    type="number"
                    value={editBalance}
                    onChange={(e) => setEditBalance(e.target.value)}
                    style={{ width: 70, background: '#1a1a1a', border: '1px solid rgba(251,191,36,0.4)', borderRadius: 6, padding: '4px 6px', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', fontSize: 11, outline: 'none' }}
                  />
                  <button onClick={() => patchUser.mutate({ id: u.id, body: { balance: parseFloat(editBalance) } })}
                    style={{ padding: '4px 6px', borderRadius: 6, border: 'none', background: 'rgba(251,191,36,0.2)', color: '#fbbf24', cursor: 'pointer', fontSize: 10 }}>✓</button>
                </div>
              ) : (
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: '#fbbf24' }}>€{u.balance.toFixed(2)}</span>
              )}
            </div>
            {/* Orders */}
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{u.orderCount}</div>
            {/* Total spent */}
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>€{u.totalSpent.toFixed(2)}</div>
            {/* Actions */}
            <div style={{ display: 'flex', gap: 4 }}>
              <button onClick={() => { setEditingId(editingId === u.id ? null : u.id); setEditBalance(String(u.balance)) }}
                style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.06)', color: 'rgba(251,191,36,0.8)', cursor: 'pointer', fontSize: 9, fontFamily: '"JetBrains Mono",monospace' }}>
                €
              </button>
            </div>
          </div>
        ))}

        {users.length === 0 && (
          <div style={{ padding: '24px 16px', textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucun utilisateur trouvé
          </div>
        )}
      </div>

      {/* Pagination */}
      {(data?.pages ?? 0) > 1 && (
        <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
          {Array.from({ length: data.pages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} style={{
              width: 32, height: 32, borderRadius: 8, border: 'none', cursor: 'pointer',
              background: page === p ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.05)',
              color: page === p ? '#fbbf24' : 'rgba(255,255,255,0.4)',
              fontFamily: '"JetBrains Mono",monospace', fontSize: 11,
            }}>{p}</button>
          ))}
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/web-admin/pages/Users.tsx
git commit -m "feat(web-admin): users table with search, pagination, inline balance edit"
```

---

## Task 15 — Frontend Admins page (super admin only)

**Files:**
- Create: `frontend/src/web-admin/pages/Admins.tsx`

- [ ] **Step 1: Create `Admins.tsx`**

```typescript
// frontend/src/web-admin/pages/Admins.tsx
import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { adminApi } from '../lib/api'
import { useAdminAuth } from '../stores/auth'
import { useNavigate } from 'react-router-dom'
import { useEffect } from 'react'

export default function Admins() {
  const { isSuperAdmin } = useAdminAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [newTelegramId, setNewTelegramId] = useState('')
  const [error, setError] = useState('')

  useEffect(() => { if (!isSuperAdmin) navigate('/', { replace: true }) }, [isSuperAdmin])

  const { data: admins = [] } = useQuery<any[]>({
    queryKey: ['web-admin-admins'],
    queryFn: () => adminApi.get('/api/web-admin/admins').then((r) => r.data),
    staleTime: 30_000,
  })

  const promote = useMutation({
    mutationFn: (telegramId: string) => adminApi.post('/api/web-admin/admins', { telegramId }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['web-admin-admins'] }); setNewTelegramId(''); setError('') },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  const demote = useMutation({
    mutationFn: (id: number) => adminApi.delete(`/api/web-admin/admins/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['web-admin-admins'] }),
    onError: (err: any) => alert(err?.response?.data?.error ?? 'Erreur'),
  })

  if (!isSuperAdmin) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>GESTION DES ADMINS</h1>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>SUPER ADMIN UNIQUEMENT</p>
      </div>

      {/* Add admin */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.15)', padding: '16px 20px' }}>
        <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginBottom: 12 }}>PROMOUVOIR UN ADMIN</div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            placeholder="Telegram ID (ex: 123456789)"
            value={newTelegramId}
            onChange={(e) => setNewTelegramId(e.target.value)}
            style={{ flex: 1, background: '#1a1a1a', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, padding: '10px 12px', color: '#fff', fontFamily: '"JetBrains Mono",monospace', fontSize: 12, outline: 'none' }}
          />
          <button onClick={() => promote.mutate(newTelegramId.trim())} disabled={!newTelegramId.trim()} style={{
            padding: '10px 18px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(251,191,36,0.15)', color: '#fbbf24', fontFamily: '"JetBrains Mono",monospace', fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
          }}>
            PROMOUVOIR
          </button>
        </div>
        {error && <div style={{ fontSize: 9, color: '#f87171', marginTop: 8, fontFamily: '"JetBrains Mono",monospace' }}>{error}</div>}
      </div>

      {/* Admin list */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        {admins.map((a, i) => (
          <div key={a.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 16px', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.05)' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 13, color: '#fff', fontWeight: 700 }}>{a.firstName}</span>
                {a.isSuperAdmin && <span style={{ fontSize: 8, color: '#fbbf24', border: '1px solid rgba(251,191,36,0.3)', borderRadius: 4, padding: '1px 5px', letterSpacing: '0.15em', fontFamily: '"JetBrains Mono",monospace' }}>SUPER ADMIN</span>}
              </div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', marginTop: 2 }}>@{a.username ?? a.telegramId}</div>
            </div>
            {!a.isSuperAdmin && (
              <button onClick={() => { if (confirm('Rétrograder cet admin ?')) demote.mutate(a.id) }} style={{
                padding: '6px 12px', borderRadius: 8, border: '1px solid rgba(255,100,100,0.2)', background: 'rgba(255,100,100,0.06)',
                color: 'rgba(255,100,100,0.7)', cursor: 'pointer', fontSize: 9, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em',
              }}>
                RÉTROGRADER
              </button>
            )}
          </div>
        ))}
        {admins.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>Aucun admin</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/web-admin/pages/Admins.tsx
git commit -m "feat(web-admin): admin management page (promote/demote, super admin only)"
```

---

## Task 16 — Frontend Collabs page + CollabDetail

**Files:**
- Create: `frontend/src/web-admin/pages/Collabs.tsx`
- Create: `frontend/src/web-admin/pages/CollabDetail.tsx`

- [ ] **Step 1: Create `Collabs.tsx`**

```typescript
// frontend/src/web-admin/pages/Collabs.tsx
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { adminApi } from '../lib/api'

export default function Collabs() {
  const navigate = useNavigate()
  const { data: collabs = [] } = useQuery<any[]>({
    queryKey: ['web-admin-collabs'],
    queryFn: () => adminApi.get('/api/web-admin/collabs').then((r) => r.data),
    staleTime: 30_000,
  })

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div>
        <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 28, letterSpacing: '0.1em', color: '#fff' }}>COLLABORATEURS</h1>
        <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>{collabs.length} partenaires actifs</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
        {collabs.map((c) => (
          <div key={c.id} onClick={() => navigate(`/collabs/${c.id}`)} style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '18px 20px', cursor: 'pointer', transition: 'border-color 0.15s' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(251,191,36,0.25)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)')}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <div>
                <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 13, color: '#fff', fontWeight: 700 }}>{c.firstName} {c.lastName ?? ''}</div>
                <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 2 }}>@{c.username ?? c.telegramId}</div>
              </div>
              <span style={{ color: 'rgba(251,191,36,0.5)', fontSize: 16 }}>›</span>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
              {[
                { label: 'CARTES LISTÉES', value: c.cardCount },
                { label: 'CARTES VENDUES', value: c.cardsSold },
                { label: 'GAINS', value: `€${c.totalEarnings.toFixed(2)}` },
                { label: 'COMMISSIONS', value: `€${c.totalPlatformFee.toFixed(2)}` },
              ].map((s) => (
                <div key={s.label}>
                  <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.18em', fontFamily: '"JetBrains Mono",monospace', marginBottom: 2 }}>{s.label}</div>
                  <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 18, color: '#fbbf24', letterSpacing: '0.04em' }}>{s.value}</div>
                </div>
              ))}
            </div>
          </div>
        ))}

        {collabs.length === 0 && (
          <div style={{ gridColumn: '1/-1', padding: 32, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>
            Aucun collaborateur
          </div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Create `CollabDetail.tsx`**

```typescript
// frontend/src/web-admin/pages/CollabDetail.tsx
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { adminApi } from '../lib/api'

export default function CollabDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()

  const { data: c } = useQuery<any>({
    queryKey: ['web-admin-collab', id],
    queryFn: () => adminApi.get(`/api/web-admin/collabs/${id}`).then((r) => r.data),
    enabled: !!id,
  })

  if (!c) return <div style={{ padding: 32, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace', fontSize: 11 }}>Chargement…</div>

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => navigate('/collabs')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: 'rgba(255,255,255,0.5)', cursor: 'pointer', fontSize: 16, padding: '6px 10px' }}>←</button>
        <div>
          <h1 style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 26, letterSpacing: '0.1em', color: '#fff' }}>{c.firstName} {c.lastName ?? ''}</h1>
          <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>@{c.username ?? c.telegramId}</p>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
        {[
          { label: 'GAINS TOTAUX', value: `€${c.totalEarnings.toFixed(2)}` },
          { label: 'COMMISSIONS', value: `€${c.totalPlatformFee.toFixed(2)}` },
          { label: 'CARTES LISTÉES', value: c.products.length },
          { label: 'CARTES VENDUES', value: c.products.reduce((s: number, p: any) => s + p.salesCount, 0) },
        ].map((s) => (
          <div key={s.label} style={{ background: '#111', borderRadius: 12, padding: '14px 16px', border: '1px solid rgba(255,255,255,0.07)' }}>
            <div style={{ fontSize: 7, color: 'rgba(255,255,255,0.22)', letterSpacing: '0.2em', fontFamily: '"JetBrains Mono",monospace', marginBottom: 4 }}>{s.label}</div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 22, color: '#fbbf24' }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Products table */}
      <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', overflow: 'hidden' }}>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
          <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', fontFamily: '"JetBrains Mono",monospace' }}>CARTES</div>
        </div>
        {c.products.map((p: any, i: number) => (
          <div key={p.id} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr', padding: '12px 16px', alignItems: 'center', borderTop: i === 0 ? 'none' : '1px solid rgba(255,255,255,0.04)' }}>
            <div>
              <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 12, color: '#fff' }}>{p.name}</div>
              <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', marginTop: 1 }}>Stock: {p.stock}</div>
            </div>
            <div style={{ fontFamily: '"Bebas Neue",Impact,sans-serif', fontSize: 16, color: '#fbbf24' }}>€{p.price.toFixed(2)}</div>
            <div style={{ fontFamily: '"JetBrains Mono",monospace', fontSize: 11, color: 'rgba(255,255,255,0.5)' }}>{p.salesCount} vendues</div>
            <div style={{ fontSize: 9, color: p.isActive ? '#4ade80' : 'rgba(255,255,255,0.2)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.1em' }}>{p.isActive ? 'ACTIF' : 'INACTIF'}</div>
          </div>
        ))}
        {c.products.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: 'rgba(255,255,255,0.2)', fontSize: 10, fontFamily: '"JetBrains Mono",monospace' }}>Aucune carte listée</div>
        )}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/web-admin/pages/Collabs.tsx frontend/src/web-admin/pages/CollabDetail.tsx
git commit -m "feat(web-admin): collabs overview + collab detail page"
```

---

## Self-Review

### Spec coverage
| Requirement | Task |
|---|---|
| Super admin = 2 existing admins | Tasks 2, 6 (STATIC_ADMIN_IDS) |
| Add admins | Tasks 6, 15 |
| Add collaborators | Existing `/api/admin/collaborators` POST still works via mini-app |
| Sales count by day | Tasks 4, 13 (period=day) |
| Revenue by day/week/month | Tasks 4, 13 |
| Deposits by day/week/month | Tasks 4, 13 |
| Cards currently for sale | Tasks 4, 13 |
| Cards sold by day/week/month | Tasks 4, 13 |
| Collab stats (cards added, sales) | Tasks 7, 16 |
| All users + their credit/balance | Tasks 5, 14 |
| Web site, not mini app | Tasks 9, 11 (admin.html, admin.tsx) |
| Telegram Login | Task 12 |
| Only admins access | Tasks 2, 3 (webAdminAuth) |
| Same design DA | All frontend tasks |

### Placeholder scan ✓ — no TBDs, all code blocks complete.

### Type consistency ✓ — `WebAdminRequest` used in Tasks 2+3, `adminApi` from Task 10 used in Tasks 11-16, `useAdminAuth` from Task 10 used in Tasks 11+15.

### Note on BalanceTopUp status
The balance deposits query uses `status: 'COMPLETED'`. Verify this matches the actual status value set by your crypto webhook handler in `backend/src/routes/cryptoWebhook.ts`. If it uses a different value (e.g. `'PAID'`), update the `where` clause in `backend/src/routes/web-admin/stats.ts`.
