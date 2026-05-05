# Précommandes CC + Paiement Dual — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ajouter un système de solde crypto (USDT TRC-20) + précommandes CC avec matching automatique, les deux avec choix de paiement (solde pré-chargé ou crypto direct à la commande).

**Architecture:** Le backend expose des routes balance, webhook crypto, et précommandes. L'API crypto tourne sur `deploy-crypto-api-1:3000` et envoie des webhooks HMAC-SHA256 signés. La livraison automatique des précommandes se déclenche à chaque bulk upload collab. La logique de confirmation de commande CC est extraite dans un lib partagé.

**Tech Stack:** TypeScript, Prisma (SQLite), Express, Grammy (bot Telegram), React + TanStack Query, Zod, axios (client crypto-api), JetBrains Mono + Bebas Neue (design system)

---

## Structure des fichiers

### Backend — Créer
- `backend/src/lib/cryptoApi.ts` — client HTTP vers crypto-api
- `backend/src/lib/fulfillment.ts` — logique partagée de livraison CC + data orders
- `backend/src/lib/preorderMatcher.ts` — matching auto précommandes
- `backend/src/routes/balance.ts` — GET /api/balance, POST /api/balance/topup
- `backend/src/routes/cryptoWebhook.ts` — POST /api/crypto/webhook
- `backend/src/routes/preorders.ts` — routes précommandes user
- `backend/src/routes/admin/preorders.ts` — routes admin précommandes

### Backend — Modifier
- `backend/prisma/schema.prisma` — ajout balance, BalanceTopUp, PreOrder, champs Order+DataOrder
- `backend/src/app.ts` — montage des nouvelles routes
- `backend/src/routes/admin/index.ts` — montage admin preorders
- `backend/src/routes/orders.ts` — refacto /:id/pay vers fulfillment lib + BALANCE check
- `backend/src/routes/dataOrders.ts` — ajout paymentMethod à POST /extract
- `backend/src/routes/collab/products.ts` — trigger matcher après bulk upload

### Types — Modifier
- `packages/types/src/models.ts` — types PreOrder, BalanceTopUp, update User
- `packages/types/src/schemas.ts` — CreatePreOrderSchema, mise à jour CreateOrderSchema

### Frontend — Créer
- `frontend/src/pages/Balance.tsx`
- `frontend/src/pages/PreOrderPage.tsx`
- `frontend/src/pages/MesPreCommandes.tsx`
- `frontend/src/pages/admin/AdminPreOrders.tsx`

### Frontend — Modifier
- `frontend/src/App.tsx` — nouvelles routes
- `frontend/src/pages/Checkout.tsx` — sélecteur paiement + QR flow
- `frontend/src/pages/ExtractionPage.tsx` — sélecteur paiement + QR flow
- `frontend/src/pages/Profile.tsx` — nav Balance + PreCommandes

---

## Task 1: DB Schema — Balance, BalanceTopUp, PreOrder

**Files:**
- Modify: `backend/prisma/schema.prisma`

- [ ] **Step 1: Ajouter les champs et modèles au schéma**

Dans `backend/prisma/schema.prisma`, ajouter sur le modèle `User` (après `role`):
```prisma
balance       Float          @default(0)
balanceTopUps BalanceTopUp[]
preOrders     PreOrder[]
```

Sur le modèle `Order` (après `createdAt`):
```prisma
paymentMethod   String?
cryptoPaymentId String?
```

Sur le modèle `DataOrder` (après `createdAt`):
```prisma
cryptoPaymentId String?
```

Ajouter en fin de fichier les nouveaux modèles:
```prisma
model BalanceTopUp {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  paymentId String   @unique
  amount    Float
  status    String   @default("PENDING")
  createdAt DateTime @default(now())
}

model PreOrder {
  id              Int      @id @default(autoincrement())
  userId          Int
  user            User     @relation(fields: [userId], references: [id])
  status          String   @default("PENDING")
  bank            String?
  department      String?
  ageRange        String?
  bin             String?
  level           String?
  cardType        String?
  network         String?
  paymentMethod   String
  quantity        Int
  pricePerCard    Float
  total           Float
  fulfilled       Int      @default(0)
  cryptoPaymentId String?
  cryptoPaid      Boolean  @default(false)
  createdAt       DateTime @default(now())
}
```

- [ ] **Step 2: Migrer la base de données**

```bash
cd backend && npx prisma migrate dev --name add-balance-preorders
```

Expected: `The following migration(s) have been created and applied from new schema changes: db/migrations/..._add_balance_preorders`

- [ ] **Step 3: Vérifier que le client Prisma est régénéré**

```bash
cd backend && npx prisma generate
```

Expected: `✔ Generated Prisma Client`

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add balance, BalanceTopUp, PreOrder to schema"
```

---

## Task 2: Types package — PreOrder, BalanceTopUp, schemas

**Files:**
- Modify: `packages/types/src/models.ts`
- Modify: `packages/types/src/schemas.ts`

- [ ] **Step 1: Ajouter les types dans models.ts**

Dans `packages/types/src/models.ts`, ajouter `balance` sur l'interface `User`:
```typescript
export interface User {
  id: number
  telegramId: string
  firstName: string
  lastName: string | null
  username: string | null
  photoUrl: string | null
  createdAt: string
  role: UserRole
  balance: number
}
```

Ajouter en fin de fichier:
```typescript
export type PreOrderStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FULFILLED'
export type PaymentMethod = 'BALANCE' | 'CRYPTO'

export interface BalanceTopUp {
  id: number
  userId: number
  paymentId: string
  amount: number
  status: 'PENDING' | 'CONFIRMED'
  createdAt: string
}

export interface PreOrder {
  id: number
  userId: number
  user?: User
  status: PreOrderStatus
  bank: string | null
  department: string | null
  ageRange: string | null
  bin: string | null
  level: string | null
  cardType: string | null
  network: string | null
  paymentMethod: PaymentMethod
  quantity: number
  pricePerCard: number
  total: number
  fulfilled: number
  cryptoPaymentId: string | null
  cryptoPaid: boolean
  createdAt: string
}

export interface CryptoPaymentInfo {
  paymentId: string
  walletAddress: string
  qrCode: string
  expiresAt: string
}
```

- [ ] **Step 2: Ajouter les schemas dans schemas.ts**

Dans `packages/types/src/schemas.ts`, mettre à jour `CreateOrderSchema` (rendre `deliverySlot` optionnel):
```typescript
export const CreateOrderSchema = z.object({
  addressId: z.number().int().positive().optional(),
  newAddress: z
    .object({
      label: z.string().min(1),
      street: z.string().min(1),
      city: z.string().min(1),
      zip: z.string().min(1),
    })
    .optional(),
  deliverySlot: z.string().optional().default(''),
  note: z.string().optional(),
  paymentMethod: z.enum(['BALANCE', 'CRYPTO']).optional().default('BALANCE'),
  items: z
    .array(
      z.object({
        productId: z.number().int().positive(),
        quantity: z.number().int().positive(),
        options: z.record(z.string()).optional().default({}),
      })
    )
    .min(1),
})
```

Ajouter à la fin:
```typescript
export const CreatePreOrderSchema = z.object({
  paymentMethod: z.enum(['BALANCE', 'CRYPTO']),
  quantity: z.number().int().min(1).max(100),
  pricePerCard: z.number().positive(),
  bank: z.string().optional(),
  department: z.string().max(3).optional(),
  ageRange: z.enum(['18-30', '31-45', '46-60', '61+']).optional(),
  bin: z.string().max(6).regex(/^\d{1,6}$/).optional(),
  level: z.enum(['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']).optional(),
  cardType: z.enum(['DEBIT', 'CREDIT']).optional(),
  network: z.enum(['VISA', 'MASTERCARD', 'AMEX', 'OTHER']).optional(),
})
export type CreatePreOrderInput = z.infer<typeof CreatePreOrderSchema>
```

- [ ] **Step 3: Builder le package types**

```bash
cd packages/types && npm run build
```

Expected: output sans erreurs dans `packages/types/dist/`

- [ ] **Step 4: Commit**

```bash
git add packages/types/src/
git commit -m "feat: add PreOrder, BalanceTopUp types and schemas"
```

---

## Task 3: Crypto API client

**Files:**
- Create: `backend/src/lib/cryptoApi.ts`

- [ ] **Step 1: Créer le client HTTP**

```typescript
// backend/src/lib/cryptoApi.ts
import axios from 'axios'

const client = axios.create({
  baseURL: process.env.CRYPTO_API_URL || 'http://deploy-crypto-api-1:3000',
  headers: { 'X-Admin-Key': process.env.CRYPTO_API_ADMIN_KEY || '' },
  timeout: 10_000,
})

export interface CryptoPaymentResult {
  paymentId: string
  walletAddress: string
  qrCode: string
  expiresAt: string
  status: string
}

export async function createCryptoPayment(
  amount: number,
  description: string,
  metadata: Record<string, unknown>
): Promise<CryptoPaymentResult> {
  const { data } = await client.post('/api/payments', { amount, description, metadata })
  return data.payment
}

export async function getCryptoPaymentStatus(paymentId: string): Promise<{ status: string; receivedAmount: number; expiresAt: string }> {
  const { data } = await client.get(`/api/payments/${paymentId}/status`)
  return data
}
```

- [ ] **Step 2: Vérifier que le fichier compile**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/cryptoApi.ts
git commit -m "feat: add crypto-api HTTP client"
```

---

## Task 4: Fulfillment lib — extraction de la logique de livraison

**Files:**
- Create: `backend/src/lib/fulfillment.ts`
- Modify: `backend/src/routes/orders.ts`

- [ ] **Step 1: Créer le lib fulfillment.ts**

Ce fichier extrait la logique du handler `/:id/pay` pour qu'elle soit réutilisable par le webhook.

```typescript
// backend/src/lib/fulfillment.ts
import { prisma } from '../prisma'
import { deliverCards, notify, notifyOrderStatus } from './notify'
import { InputFile } from 'grammy'
import { bot } from '../bot'

export async function fulfillCCOrder(orderId: number): Promise<void> {
  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      user: true,
      items: { include: { product: { select: { collaboratorId: true, name: true } } } },
    },
  })
  if (!order || order.status === 'CONFIRMED') return

  await prisma.order.update({ where: { id: orderId }, data: { status: 'CONFIRMED' } })

  // Commissions collaborateurs (80% collab, 20% plateforme)
  const earningsToCreate = order.items
    .filter((item) => item.product.collaboratorId !== null)
    .map((item) => {
      const gross = item.unitPrice * item.quantity
      return {
        orderId: order.id,
        orderItemId: item.id,
        collaboratorId: item.product.collaboratorId!,
        amount: parseFloat((gross * 0.8).toFixed(2)),
        platformFee: parseFloat((gross * 0.2).toFixed(2)),
      }
    })
  if (earningsToCreate.length > 0) {
    await prisma.collaboratorEarning.createMany({ data: earningsToCreate })
  }

  // Livraison inventaire CC
  const deliveryCards: Array<{ productName: string; data: string }> = []
  for (const item of order.items) {
    const invItems = await prisma.cardInventory.findMany({
      where: { productId: item.productId, sold: false },
      take: item.quantity,
      orderBy: { id: 'asc' },
    })
    if (invItems.length > 0) {
      await prisma.cardInventory.updateMany({
        where: { id: { in: invItems.map((i) => i.id) } },
        data: { sold: true, orderId: order.id },
      })
      const remaining = await prisma.cardInventory.count({ where: { productId: item.productId, sold: false } })
      await prisma.product.update({ where: { id: item.productId }, data: { stock: remaining } })
      invItems.forEach((inv) => deliveryCards.push({ productName: item.product.name, data: inv.fullData }))
    }
  }

  if (order.user.telegramId) {
    await deliverCards(order.user.telegramId, order.id, deliveryCards)
    notifyOrderStatus(order.user.telegramId, order.id, 'CONFIRMED', order.total)
  }
}

export async function fulfillDataOrder(orderId: number): Promise<void> {
  const order = await prisma.dataOrder.findUnique({
    where: { id: orderId },
    include: { user: true, files: { orderBy: [{ fileType: 'asc' }, { partNumber: 'asc' }] } },
  })
  if (!order || order.status === 'READY') return

  await prisma.dataOrder.update({ where: { id: orderId }, data: { status: 'READY' } })

  if (!order.user.telegramId) return

  for (const f of order.files) {
    const buf =
      f.fileType === 'SPECIAL_XLSX'
        ? Buffer.from(f.content, 'base64')
        : Buffer.from(f.content, 'utf-8')
    await bot.api.sendDocument(order.user.telegramId, new InputFile(buf, f.filename))
  }

  await notify(
    order.user.telegramId,
    `✅ Extraction prête — ${order.lineCount} lignes ${order.type}\nRécupère-la dans Mes Extractions`,
  )
}
```

- [ ] **Step 2: Refactoriser orders.ts pour utiliser fulfillment**

Dans `backend/src/routes/orders.ts`, remplacer le handler `POST /:id/pay` complet par:

```typescript
import { fulfillCCOrder } from '../lib/fulfillment'
import { createCryptoPayment } from '../lib/cryptoApi'

router.post('/:id/pay', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) {
    res.status(400).json({ error: 'Invalid order id' })
    return
  }

  const order = await prisma.order.findFirst({
    where: { id, userId: req.userId!, status: 'PENDING' },
    include: { user: true },
  })
  if (!order) {
    res.status(404).json({ error: 'Order not found or already processed' })
    return
  }

  const paymentMethod = (req.body?.paymentMethod as string) || 'BALANCE'

  if (paymentMethod === 'BALANCE') {
    // Vérifier et débiter le solde
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user || user.balance < order.total) {
      res.status(400).json({ error: 'Solde insuffisant' })
      return
    }
    await prisma.$transaction([
      prisma.user.update({ where: { id: req.userId! }, data: { balance: { decrement: order.total } } }),
      prisma.order.update({ where: { id }, data: { paymentMethod: 'BALANCE' } }),
    ])
    await fulfillCCOrder(id)
    const updated = await prisma.order.findUnique({
      where: { id },
      include: { items: { include: { product: true } }, address: true },
    })
    res.json({ ...updated, items: updated!.items.map((i: any) => ({ ...i, options: JSON.parse(i.options) })) })
    return
  }

  // CRYPTO — créer le paiement
  try {
    const payment = await createCryptoPayment(order.total, `Commande #${id}`, {
      type: 'order',
      refId: id,
      userId: req.userId!,
    })
    await prisma.order.update({ where: { id }, data: { paymentMethod: 'CRYPTO', cryptoPaymentId: payment.paymentId } })
    res.json({ cryptoPayment: payment })
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur création paiement crypto' })
  }
})
```

Supprimer également les imports de `notifyOrderStatus` et `deliverCards` qui ne sont plus utilisés directement.

- [ ] **Step 3: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add backend/src/lib/fulfillment.ts backend/src/routes/orders.ts
git commit -m "feat: extract CC fulfillment logic into shared lib, add BALANCE/CRYPTO pay modes"
```

---

## Task 5: Routes balance

**Files:**
- Create: `backend/src/routes/balance.ts`

- [ ] **Step 1: Créer le router balance**

```typescript
// backend/src/routes/balance.ts
import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { createCryptoPayment, getCryptoPaymentStatus } from '../lib/cryptoApi'

const router = Router()
router.use(authMiddleware)

// GET /api/balance — solde + historique top-ups
router.get('/', async (req: AuthRequest, res) => {
  const user = await prisma.user.findUnique({
    where: { id: req.userId! },
    include: { balanceTopUps: { orderBy: { createdAt: 'desc' }, take: 20 } },
  })
  res.json({ balance: user?.balance ?? 0, topUps: user?.balanceTopUps ?? [] })
})

// POST /api/balance/topup — créer un paiement crypto pour recharger
router.post('/topup', async (req: AuthRequest, res) => {
  const amount = parseFloat(req.body.amount)
  if (!amount || amount < 1) {
    res.status(400).json({ error: 'Montant minimum : 1 USDT' })
    return
  }

  try {
    const payment = await createCryptoPayment(amount, `Recharge solde utilisateur #${req.userId}`, {
      type: 'topup',
      userId: req.userId!,
    })

    const topUp = await prisma.balanceTopUp.create({
      data: { userId: req.userId!, paymentId: payment.paymentId, amount, status: 'PENDING' },
    })

    res.json({ topUp, payment })
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur création paiement crypto' })
  }
})

// GET /api/balance/topup/:paymentId/status — polling statut
router.get('/topup/:paymentId/status', async (req: AuthRequest, res) => {
  const { paymentId } = req.params
  const topUp = await prisma.balanceTopUp.findFirst({ where: { paymentId, userId: req.userId! } })
  if (!topUp) {
    res.status(404).json({ error: 'Not found' })
    return
  }
  try {
    const status = await getCryptoPaymentStatus(paymentId)
    res.json({ ...status, localStatus: topUp.status })
  } catch {
    res.status(500).json({ error: 'Erreur récupération statut' })
  }
})

export default router
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/balance.ts
git commit -m "feat: add balance routes (GET /, POST /topup, GET /topup/:id/status)"
```

---

## Task 6: Crypto webhook

**Files:**
- Create: `backend/src/routes/cryptoWebhook.ts`

- [ ] **Step 1: Créer le webhook handler**

```typescript
// backend/src/routes/cryptoWebhook.ts
import { Router, Request, Response } from 'express'
import crypto from 'crypto'
import { prisma } from '../prisma'
import { notify } from '../lib/notify'
import { fulfillCCOrder, fulfillDataOrder } from '../lib/fulfillment'
import { getAdminIds } from '../middleware/admin'

const router = Router()

function verifySignature(body: object, signature: string): boolean {
  const secret = process.env.WEBHOOK_SECRET || ''
  if (!secret) return true // dev mode sans secret
  const expected = crypto
    .createHmac('sha256', secret)
    .update(JSON.stringify(body))
    .digest('hex')
  try {
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))
  } catch {
    return false
  }
}

async function notifyAdminsPreOrder(preOrderId: number): Promise<void> {
  const preOrder = await prisma.preOrder.findUnique({ where: { id: preOrderId }, include: { user: true } })
  if (!preOrder) return

  const adminIds = getAdminIds()
  const msg =
    `🆕 Nouvelle précommande CC #${preOrderId}\n` +
    `👤 ${preOrder.user.firstName} (@${preOrder.user.username ?? '—'})\n` +
    `💳 Qty: ${preOrder.quantity} × €${preOrder.pricePerCard} = €${preOrder.total}\n` +
    `💰 Paiement: ${preOrder.paymentMethod}\n` +
    (preOrder.bank ? `🏦 Banque: ${preOrder.bank}\n` : '') +
    (preOrder.network ? `🔗 Réseau: ${preOrder.network}\n` : '') +
    (preOrder.level ? `⭐ Level: ${preOrder.level}\n` : '') +
    (preOrder.cardType ? `🃏 Type: ${preOrder.cardType}\n` : '') +
    (preOrder.department ? `📍 Dept: ${preOrder.department}\n` : '') +
    (preOrder.ageRange ? `👤 Âge: ${preOrder.ageRange}\n` : '') +
    (preOrder.bin ? `🔢 BIN: ${preOrder.bin}\n` : '') +
    `\nRépondre dans le panel admin /admin`

  for (const adminTelegramId of adminIds) {
    await notify(adminTelegramId, msg).catch(() => {})
  }
}

router.post('/', async (req: Request, res: Response) => {
  const signature = req.headers['x-webhook-signature'] as string
  if (signature && !verifySignature(req.body, signature)) {
    res.status(401).json({ error: 'Invalid signature' })
    return
  }

  const { event, paymentId, amount, metadata } = req.body

  if (event !== 'payment.confirmed') {
    res.json({ ok: true })
    return
  }

  const { type, refId, userId } = metadata ?? {}

  try {
    if (type === 'topup' && userId) {
      await prisma.$transaction([
        prisma.user.update({ where: { id: userId }, data: { balance: { increment: amount } } }),
        prisma.balanceTopUp.updateMany({ where: { paymentId }, data: { status: 'CONFIRMED' } }),
      ])
      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (user?.telegramId) {
        await notify(user.telegramId, `✅ Solde crédité de €${Number(amount).toFixed(2)} USDT`)
      }
    } else if (type === 'order' && refId) {
      await fulfillCCOrder(refId)
    } else if (type === 'data-order' && refId) {
      await fulfillDataOrder(refId)
    } else if (type === 'preorder' && refId) {
      await prisma.preOrder.update({ where: { id: refId }, data: { cryptoPaid: true } })
      await notifyAdminsPreOrder(refId)
    }
  } catch (err) {
    console.error('[webhook] Error processing event:', err)
  }

  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/cryptoWebhook.ts
git commit -m "feat: add crypto webhook handler (topup, order, data-order, preorder)"
```

---

## Task 7: Monter les nouvelles routes dans app.ts

**Files:**
- Modify: `backend/src/app.ts`

- [ ] **Step 1: Ajouter les imports et montages**

Dans `backend/src/app.ts`, ajouter les imports:
```typescript
import balanceRouter from './routes/balance'
import cryptoWebhookRouter from './routes/cryptoWebhook'
import preordersRouter from './routes/preorders'
```

Ajouter les montages après `app.use('/api/data-orders', dataOrdersRouter)`:
```typescript
app.use('/api/balance', balanceRouter)
app.use('/api/crypto/webhook', cryptoWebhookRouter)
app.use('/api/preorders', preordersRouter)
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: une erreur sur `preordersRouter` car le fichier n'existe pas encore — c'est normal, on créera la route dans la Task 11.

Pour éviter l'erreur maintenant, créer un stub vide:
```bash
echo "import { Router } from 'express'; const router = Router(); export default router;" > backend/src/routes/preorders.ts
```

Relancer:
```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.ts backend/src/routes/preorders.ts
git commit -m "feat: mount balance, crypto webhook, preorders routes in app"
```

---

## Task 8: DataOrders — paiement dual

**Files:**
- Modify: `backend/src/routes/dataOrders.ts`

- [ ] **Step 1: Modifier POST /extract pour accepter paymentMethod**

Dans `backend/src/routes/dataOrders.ts`, ajouter l'import:
```typescript
import { createCryptoPayment } from '../lib/cryptoApi'
```

Dans le handler `router.post('/extract', ...)`, ajouter `paymentMethod` dans la déstructuration du body:
```typescript
const { fileIds, type, dobFrom, dobTo, departments, banks, gender, withNames, formats, splits, paymentMethod } = req.body as {
  // ... champs existants ...
  paymentMethod?: 'BALANCE' | 'CRYPTO'
}
```

Juste avant `res.json({ orderId: order.id, lineCount: records.length })`, remplacer la logique de notification par:

```typescript
    if (paymentMethod === 'CRYPTO') {
      // Créer le paiement crypto — les fichiers sont déjà en DB, livraison par webhook
      try {
        const payment = await createCryptoPayment(
          records.length * 0.1, // prix fixe : 0.10€ par ligne (à ajuster)
          `Extraction ${typeUp} #${order.id}`,
          { type: 'data-order', refId: order.id, userId: req.userId! }
        )
        await prisma.dataOrder.update({
          where: { id: order.id },
          data: { status: 'PENDING_PAYMENT', cryptoPaymentId: payment.paymentId },
        })
        return res.json({ orderId: order.id, lineCount: records.length, cryptoPayment: payment })
      } catch {
        // Si crypto échoue, livrer quand même (fallback)
      }
    }

    // Paiement BALANCE ou fallback : notifier immédiatement
    if (user?.telegramId) {
      notify(
        user.telegramId,
        `✅ Extraction prête — ${records.length} lignes ${typeUp}\nRécupère-la dans Mes Extractions`,
      ).catch(() => {})
    }
    res.json({ orderId: order.id, lineCount: records.length })
```

> **Note:** Le prix de l'extraction en CRYPTO (`records.length * 0.1`) est à ajuster selon la politique tarifaire. Le paiement BALANCE pour les fiches n'est pas encore intégré car le prix des extractions n'est pas stocké en DB — c'est un ticket à part entière.

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/dataOrders.ts
git commit -m "feat: add CRYPTO payment method to data-orders extract"
```

---

## Task 9: PreOrder matcher lib

**Files:**
- Create: `backend/src/lib/preorderMatcher.ts`

- [ ] **Step 1: Créer le matcher**

```typescript
// backend/src/lib/preorderMatcher.ts
import { prisma } from '../prisma'
import { deliverCards } from './notify'

interface ProductMeta {
  bank?: string
  network?: string
  level?: string
  type?: string
  bin?: string
  cp?: string
  age?: string
}

function parseProductMeta(description: string): ProductMeta {
  try { return JSON.parse(description) } catch { return {} }
}

function ageInRange(ageStr: string | undefined, range: string): boolean {
  if (!ageStr) return false
  const age = parseInt(ageStr)
  if (isNaN(age)) return false
  if (range === '61+') return age >= 61
  const [min, max] = range.split('-').map(Number)
  return age >= min && age <= max
}

function matches(meta: ProductMeta, preorder: {
  bank: string | null; network: string | null; level: string | null;
  cardType: string | null; bin: string | null; department: string | null; ageRange: string | null
}): boolean {
  if (preorder.bank && meta.bank?.toLowerCase() !== preorder.bank.toLowerCase()) return false
  if (preorder.network && meta.network !== preorder.network) return false
  if (preorder.level && meta.level !== preorder.level) return false
  if (preorder.cardType && meta.type !== preorder.cardType) return false
  if (preorder.bin && !meta.bin?.startsWith(preorder.bin)) return false
  if (preorder.department && !meta.cp?.startsWith(preorder.department)) return false
  if (preorder.ageRange && !ageInRange(meta.age, preorder.ageRange)) return false
  return true
}

export async function matchAndDeliver(productId: number): Promise<void> {
  const product = await prisma.product.findUnique({ where: { id: productId }, include: { category: true } })
  if (!product) return

  const meta = parseProductMeta(product.description)

  // Précommandes APPROVED avec places restantes, triées FIFO
  const preorders = await prisma.preOrder.findMany({
    where: { status: 'APPROVED' },
    include: { user: true },
    orderBy: { createdAt: 'asc' },
  })

  for (const preorder of preorders) {
    if (preorder.fulfilled >= preorder.quantity) continue
    if (!matches(meta, preorder)) continue

    // Prendre une carte non vendue
    const card = await prisma.cardInventory.findFirst({
      where: { productId, sold: false },
      orderBy: { id: 'asc' },
    })
    if (!card) break // plus de stock

    // Marquer vendue + incrémenter fulfilled
    await prisma.$transaction([
      prisma.cardInventory.update({ where: { id: card.id }, data: { sold: true } }),
      prisma.preOrder.update({
        where: { id: preorder.id },
        data: {
          fulfilled: { increment: 1 },
          ...(preorder.fulfilled + 1 >= preorder.quantity ? { status: 'FULFILLED' } : {}),
        },
      }),
    ])

    // Sync stock
    const remaining = await prisma.cardInventory.count({ where: { productId, sold: false } })
    await prisma.product.update({ where: { id: productId }, data: { stock: remaining } })

    // Livrer via Telegram
    if (preorder.user.telegramId) {
      await deliverCards(preorder.user.telegramId, preorder.id, [
        { productName: product.name, data: card.fullData },
      ])
    }
  }
}
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/lib/preorderMatcher.ts
git commit -m "feat: add preorder auto-matching lib (FIFO delivery on inventory add)"
```

---

## Task 10: Collab bulk upload — déclencher le matcher

**Files:**
- Modify: `backend/src/routes/collab/products.ts`

- [ ] **Step 1: Appeler matchAndDeliver après le bulk insert**

Dans `backend/src/routes/collab/products.ts`, ajouter l'import en haut:
```typescript
import { matchAndDeliver } from '../../lib/preorderMatcher'
```

Dans le handler `POST /:id/inventory/bulk`, après la mise à jour du stock (`await prisma.product.update(...)`), ajouter:
```typescript
  // Déclencher le matching des précommandes (fire-and-forget)
  matchAndDeliver(productId).catch((err) => console.warn('[matcher] Error:', err))
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/collab/products.ts
git commit -m "feat: trigger preorder matcher after bulk inventory upload"
```

---

## Task 11: Routes précommandes utilisateur

**Files:**
- Modify: `backend/src/routes/preorders.ts` (remplace le stub de la Task 7)

- [ ] **Step 1: Écrire le router complet**

```typescript
// backend/src/routes/preorders.ts
import { Router } from 'express'
import { authMiddleware, AuthRequest } from '../middleware/auth'
import { prisma } from '../prisma'
import { CreatePreOrderSchema } from 'floramini-types'
import { createCryptoPayment } from '../lib/cryptoApi'
import { getAdminIds } from '../middleware/admin'
import { notify } from '../lib/notify'

const router = Router()
router.use(authMiddleware)

async function notifyAdminsPreOrder(preOrderId: number): Promise<void> {
  const preOrder = await prisma.preOrder.findUnique({ where: { id: preOrderId }, include: { user: true } })
  if (!preOrder) return

  const adminIds = getAdminIds()
  const msg =
    `🆕 Précommande CC #${preOrderId} — VALIDATION REQUISE\n` +
    `👤 ${preOrder.user.firstName} (@${preOrder.user.username ?? '—'})\n` +
    `💳 ${preOrder.quantity} carte(s) × €${preOrder.pricePerCard} = €${preOrder.total}\n` +
    `💰 ${preOrder.paymentMethod === 'BALANCE' ? '✅ Solde réservé' : '✅ Crypto payé'}\n` +
    (preOrder.bank ? `🏦 Banque: ${preOrder.bank}\n` : '') +
    (preOrder.network ? `🔗 ${preOrder.network}\n` : '') +
    (preOrder.level ? `⭐ ${preOrder.level}\n` : '') +
    (preOrder.cardType ? `🃏 ${preOrder.cardType}\n` : '') +
    (preOrder.department ? `📍 Dept ${preOrder.department}\n` : '') +
    (preOrder.ageRange ? `👤 ${preOrder.ageRange} ans\n` : '') +
    (preOrder.bin ? `🔢 BIN ${preOrder.bin}\n` : '') +
    `\n→ Panel admin pour approuver/rejeter`

  for (const adminTelegramId of adminIds) {
    await notify(adminTelegramId, msg).catch(() => {})
  }
}

// POST /api/preorders — créer une précommande
router.post('/', async (req: AuthRequest, res) => {
  const parsed = CreatePreOrderSchema.safeParse(req.body)
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.flatten() })
    return
  }

  const { paymentMethod, quantity, pricePerCard, ...filters } = parsed.data
  const total = quantity * pricePerCard

  if (paymentMethod === 'BALANCE') {
    const user = await prisma.user.findUnique({ where: { id: req.userId! } })
    if (!user || user.balance < total) {
      res.status(400).json({ error: `Solde insuffisant (€${user?.balance.toFixed(2) ?? 0} dispo, €${total.toFixed(2)} requis)` })
      return
    }

    const preorder = await prisma.$transaction(async (tx) => {
      await tx.user.update({ where: { id: req.userId! }, data: { balance: { decrement: total } } })
      return tx.preOrder.create({ data: { userId: req.userId!, paymentMethod, quantity, pricePerCard, total, ...filters } })
    })

    await notifyAdminsPreOrder(preorder.id)
    res.status(201).json(preorder)
    return
  }

  // CRYPTO — créer le paiement d'abord
  try {
    const preorder = await prisma.preOrder.create({
      data: { userId: req.userId!, paymentMethod, quantity, pricePerCard, total, ...filters },
    })
    const payment = await createCryptoPayment(total, `Précommande CC #${preorder.id}`, {
      type: 'preorder',
      refId: preorder.id,
      userId: req.userId!,
    })
    await prisma.preOrder.update({ where: { id: preorder.id }, data: { cryptoPaymentId: payment.paymentId } })
    res.status(201).json({ preorder, cryptoPayment: payment })
  } catch (err: any) {
    res.status(500).json({ error: 'Erreur création paiement crypto' })
  }
})

// GET /api/preorders — liste des précommandes de l'utilisateur
router.get('/', async (req: AuthRequest, res) => {
  const preorders = await prisma.preOrder.findMany({
    where: { userId: req.userId! },
    orderBy: { createdAt: 'desc' },
  })
  res.json(preorders)
})

// DELETE /api/preorders/:id — annuler si PENDING
router.delete('/:id', async (req: AuthRequest, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const preorder = await prisma.preOrder.findFirst({ where: { id, userId: req.userId! } })
  if (!preorder) { res.status(404).json({ error: 'Not found' }); return }
  if (preorder.status !== 'PENDING') {
    res.status(400).json({ error: 'Seules les précommandes PENDING peuvent être annulées' })
    return
  }

  await prisma.preOrder.update({ where: { id }, data: { status: 'REJECTED' } })

  // Rembourser le solde si BALANCE et si pas crypto
  if (preorder.paymentMethod === 'BALANCE') {
    await prisma.user.update({ where: { id: req.userId! }, data: { balance: { increment: preorder.total } } })
  }

  res.json({ ok: true })
})

export default router
```

- [ ] **Step 2: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 3: Commit**

```bash
git add backend/src/routes/preorders.ts
git commit -m "feat: add preorders user routes (POST /, GET /, DELETE /:id)"
```

---

## Task 12: Routes admin précommandes

**Files:**
- Create: `backend/src/routes/admin/preorders.ts`
- Modify: `backend/src/routes/admin/index.ts`

- [ ] **Step 1: Créer le router admin preorders**

```typescript
// backend/src/routes/admin/preorders.ts
import { Router } from 'express'
import { prisma } from '../../prisma'
import { notify } from '../../lib/notify'

const router = Router()

// GET /api/admin/preorders
router.get('/', async (req, res) => {
  const { status } = req.query
  const preorders = await prisma.preOrder.findMany({
    where: status ? { status: status as string } : undefined,
    include: { user: { select: { id: true, firstName: true, username: true, telegramId: true } } },
    orderBy: { createdAt: 'desc' },
  })
  res.json(preorders)
})

// PATCH /api/admin/preorders/:id — approuver ou rejeter
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id)
  if (isNaN(id)) { res.status(400).json({ error: 'Invalid id' }); return }

  const { action } = req.body as { action: 'APPROVE' | 'REJECT' }
  if (!['APPROVE', 'REJECT'].includes(action)) {
    res.status(400).json({ error: 'action doit être APPROVE ou REJECT' })
    return
  }

  const preorder = await prisma.preOrder.findUnique({ where: { id }, include: { user: true } })
  if (!preorder) { res.status(404).json({ error: 'Not found' }); return }
  if (!['PENDING'].includes(preorder.status)) {
    res.status(400).json({ error: 'Seules les précommandes PENDING peuvent être traitées' })
    return
  }

  if (action === 'APPROVE') {
    const updated = await prisma.preOrder.update({ where: { id }, data: { status: 'APPROVED' } })
    if (preorder.user.telegramId) {
      await notify(
        preorder.user.telegramId,
        `✅ Précommande #${id} approuvée !\nTu recevras les cartes automatiquement dès qu'elles correspondent à tes filtres.`,
      ).catch(() => {})
    }
    res.json(updated)
  } else {
    // REJECT — rembourser le solde si BALANCE
    const updated = await prisma.preOrder.update({ where: { id }, data: { status: 'REJECTED' } })
    if (preorder.paymentMethod === 'BALANCE') {
      await prisma.user.update({ where: { id: preorder.userId }, data: { balance: { increment: preorder.total } } })
    }
    if (preorder.user.telegramId) {
      const msg = preorder.paymentMethod === 'BALANCE'
        ? `❌ Précommande #${id} refusée. €${preorder.total.toFixed(2)} remboursés sur ton solde.`
        : `❌ Précommande #${id} refusée. Contacte le support pour le remboursement crypto.`
      await notify(preorder.user.telegramId, msg).catch(() => {})
    }
    res.json(updated)
  }
})

export default router
```

- [ ] **Step 2: Monter dans admin/index.ts**

Dans `backend/src/routes/admin/index.ts`, ajouter:
```typescript
import preordersRouter from './preorders'
// ...
router.use('/preorders', preordersRouter)
```

- [ ] **Step 3: Vérifier compilation**

```bash
cd backend && npx tsc --noEmit
```

Expected: aucune erreur

- [ ] **Step 4: Commit**

```bash
git add backend/src/routes/admin/preorders.ts backend/src/routes/admin/index.ts
git commit -m "feat: add admin preorders routes (GET /, PATCH /:id approve/reject)"
```

---

## Task 13: Frontend — Page Balance

**Files:**
- Create: `frontend/src/pages/Balance.tsx`

- [ ] **Step 1: Créer la page**

```tsx
// frontend/src/pages/Balance.tsx
import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { BalanceTopUp, CryptoPaymentInfo } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)',
  borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 14, ...MONO, outline: 'none',
  boxSizing: 'border-box' as const,
}

interface BalanceData { balance: number; topUps: BalanceTopUp[] }
interface TopupResult { topUp: BalanceTopUp; payment: CryptoPaymentInfo }

function QRFlow({ payment, onConfirmed }: { payment: CryptoPaymentInfo; onConfirmed: () => void }) {
  const [status, setStatus] = useState<string>('pending')

  useEffect(() => {
    if (status === 'confirmed' || status === 'swept') { onConfirmed(); return }
    const interval = setInterval(async () => {
      try {
        const { data } = await api.get(`/api/balance/topup/${payment.paymentId}/status`)
        setStatus(data.status)
      } catch {}
    }, 5000)
    return () => clearInterval(interval)
  }, [status, payment.paymentId, onConfirmed])

  const expiresIn = Math.max(0, Math.floor((new Date(payment.expiresAt).getTime() - Date.now()) / 1000 / 60))

  return (
    <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', padding: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
      <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>
        ENVOIE USDT TRC-20 À CETTE ADRESSE
      </div>
      {payment.qrCode && (
        <img src={payment.qrCode} alt="QR" style={{ width: 160, height: 160, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)' }} />
      )}
      <div style={{ ...MONO, fontSize: 9, color: '#fff', wordBreak: 'break-all', textAlign: 'center', background: 'rgba(255,255,255,0.04)', borderRadius: 8, padding: '8px 10px', width: '100%' }}>
        {payment.walletAddress}
      </div>
      <div style={{ display: 'flex', gap: 12, fontSize: 9, ...MONO, color: 'rgba(255,255,255,0.3)' }}>
        <span>Expire dans {expiresIn} min</span>
        <span>·</span>
        <span style={{ color: status === 'pending' ? '#fbbf24' : '#4ade80' }}>
          {status === 'pending' ? '⏳ En attente...' : status === 'confirmed' ? '✅ Confirmé !' : status}
        </span>
      </div>
    </div>
  )
}

export default function Balance() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [amount, setAmount] = useState('')
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

  const { data, isLoading } = useQuery<BalanceData>({
    queryKey: ['balance'],
    queryFn: () => api.get('/api/balance').then((r) => r.data),
  })

  const topupMutation = useMutation({
    mutationFn: (amt: number) => api.post('/api/balance/topup', { amount: amt }).then((r) => r.data as TopupResult),
    onSuccess: (result) => {
      setCryptoPayment(result.payment)
      setAmount('')
      setError(null)
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  function handleTopup() {
    const amt = parseFloat(amount)
    if (!amt || amt < 1) { setError('Montant minimum : 1 USDT'); return }
    setError(null)
    topupMutation.mutate(amt)
  }

  function handleConfirmed() {
    queryClient.invalidateQueries({ queryKey: ['balance'] })
    setCryptoPayment(null)
  }

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MON SOLDE</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>USDT TRC-20</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* Solde */}
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(251,191,36,0.2)', padding: '20px 16px', textAlign: 'center' }}>
          <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 8 }}>SOLDE DISPONIBLE</div>
          {isLoading ? (
            <div style={{ height: 36, borderRadius: 8, background: 'rgba(255,255,255,0.05)' }} />
          ) : (
            <div style={{ ...BEBAS, fontSize: 42, color: GOLD, letterSpacing: '0.04em', lineHeight: 1 }}>
              €{(data?.balance ?? 0).toFixed(2)}
            </div>
          )}
        </div>

        {/* QR flow actif */}
        {cryptoPayment && <QRFlow payment={cryptoPayment} onConfirmed={handleConfirmed} />}

        {/* Formulaire recharge */}
        {!cryptoPayment && (
          <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 12 }}>RECHARGER EN USDT</div>
            <input
              style={INPUT_STYLE}
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Montant en USDT (min. 1)"
              inputMode="decimal"
            />
            {error && <div style={{ marginTop: 8, fontSize: 11, ...MONO, color: '#ef4444' }}>{error}</div>}
            <button
              onClick={handleTopup}
              disabled={topupMutation.isPending}
              style={{ marginTop: 12, width: '100%', padding: '13px', borderRadius: 10, background: topupMutation.isPending ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: topupMutation.isPending ? 'not-allowed' : 'pointer' }}
            >
              {topupMutation.isPending ? '...' : 'GÉNÉRER ADRESSE USDT'}
            </button>
          </div>
        )}

        {/* Historique top-ups */}
        {(data?.topUps?.length ?? 0) > 0 && (
          <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px' }}>
            <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(255,255,255,0.3)', marginBottom: 10 }}>HISTORIQUE RECHARGES</div>
            {data!.topUps.map((t) => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                <div>
                  <div style={{ ...MONO, fontSize: 10, color: t.status === 'CONFIRMED' ? '#4ade80' : '#fbbf24' }}>
                    {t.status === 'CONFIRMED' ? '✅' : '⏳'} {t.status}
                  </div>
                  <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                    {new Date(t.createdAt).toLocaleDateString('fr-FR')}
                  </div>
                </div>
                <div style={{ ...BEBAS, fontSize: 18, color: GOLD }}>+€{t.amount.toFixed(2)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; } input::placeholder { color: rgba(255,255,255,0.2); }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Balance.tsx
git commit -m "feat: add Balance page (solde + recharge USDT + QR flow)"
```

---

## Task 14: Frontend — Checkout avec sélecteur de paiement

**Files:**
- Modify: `frontend/src/pages/Checkout.tsx`

- [ ] **Step 1: Ajouter le sélecteur de paiement + QR flow**

Dans `frontend/src/pages/Checkout.tsx`, ajouter les imports:
```typescript
import { useQuery } from '@tanstack/react-query'
import type { CryptoPaymentInfo } from 'floramini-types'
```

Ajouter l'état dans le composant `Checkout`:
```typescript
const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE')
const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)

const { data: balanceData } = useQuery<{ balance: number }>({
  queryKey: ['balance'],
  queryFn: () => api.get('/api/balance').then((r) => r.data),
})
const balance = balanceData?.balance ?? 0
```

Modifier la `mutationFn` pour passer `paymentMethod` au `/:id/pay`:
```typescript
const mutation = useMutation({
  mutationFn: async () => {
    if (isMock) {
      // ... logique mock inchangée ...
    }
    const body: Record<string, unknown> = {
      note: note || undefined, format,
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity, options: i.options })),
    }
    const order: Order = await api.post('/api/orders', body).then((r) => r.data)
    const payRes = await api.post(`/api/orders/${order.id}/pay`, { paymentMethod })
    if (paymentMethod === 'CRYPTO' && payRes.data.cryptoPayment) {
      setCryptoPayment(payRes.data.cryptoPayment)
      return null // ne pas naviguer — attendre le paiement
    }
    return order
  },
  onSuccess: (order) => {
    if (!order) return
    clear()
    navigate(`/order/${order.id}`)
  },
})
```

Ajouter dans le JSX, avant le bloc total, la section sélecteur:
```tsx
{/* Mode paiement */}
{!isMock && (
  <Section label="MODE DE PAIEMENT">
    <div style={{ display: 'flex', gap: 8 }}>
      {(['BALANCE', 'CRYPTO'] as const).map((m) => {
        const active = paymentMethod === m
        return (
          <button
            key={m}
            onClick={() => setPaymentMethod(m)}
            style={{
              flex: 1, padding: '10px', borderRadius: 10, cursor: 'pointer',
              background: active ? 'rgba(251,191,36,0.08)' : 'rgba(255,255,255,0.03)',
              border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`,
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: active ? '#fbbf24' : 'rgba(255,255,255,0.4)', fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.08em' }}>
              {m === 'BALANCE' ? 'SOLDE' : 'CRYPTO'}
            </div>
            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.25)', fontFamily: '"JetBrains Mono",monospace', marginTop: 3 }}>
              {m === 'BALANCE' ? `€${balance.toFixed(2)} dispo` : 'QR USDT TRC-20'}
            </div>
          </button>
        )
      })}
    </div>
    {paymentMethod === 'BALANCE' && balance < total && (
      <div style={{ marginTop: 8, fontSize: 10, color: '#ef4444', fontFamily: '"JetBrains Mono",monospace' }}>
        Solde insuffisant — recharge dans ton profil
      </div>
    )}
  </Section>
)}
```

Ajouter le QR flow juste après le header (avant le contenu scrollable):
```tsx
{cryptoPayment && (
  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
    <div style={{ fontSize: 8, fontFamily: '"JetBrains Mono",monospace', letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>PAIEMENT EN ATTENTE</div>
    <img src={cryptoPayment.qrCode} alt="QR" style={{ width: 180, height: 180, borderRadius: 12 }} />
    <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: '#fff', wordBreak: 'break-all', textAlign: 'center' }}>{cryptoPayment.walletAddress}</div>
    <div style={{ fontSize: 9, fontFamily: '"JetBrains Mono",monospace', color: 'rgba(255,255,255,0.3)' }}>La livraison se fait automatiquement après réception du paiement</div>
  </div>
)}
```

Wrapper le contenu scrollable avec `{!cryptoPayment && (...)}`.

Modifier le `canSubmit` pour bloquer si solde insuffisant:
```typescript
const canSubmit = items.length > 0 && !mutation.isPending && !cryptoPayment &&
  (isMock || paymentMethod === 'CRYPTO' || balance >= total)
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/Checkout.tsx
git commit -m "feat: add dual payment selector (BALANCE/CRYPTO) to Checkout"
```

---

## Task 15: Frontend — Page PreOrder

**Files:**
- Create: `frontend/src/pages/PreOrderPage.tsx`

- [ ] **Step 1: Créer la page**

```tsx
// frontend/src/pages/PreOrderPage.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { CryptoPaymentInfo } from 'floramini-types'

type CardLevel = 'CLASSIC' | 'GOLD' | 'PLATINUM' | 'BLACK'
type CardNetwork = 'VISA' | 'MASTERCARD' | 'AMEX' | 'OTHER'
type CardType = 'DEBIT' | 'CREDIT'
type AgeRange = '18-30' | '31-45' | '46-60' | '61+'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }
const LABEL: React.CSSProperties = { fontSize: 8, letterSpacing: '0.22em', color: 'rgba(255,255,255,0.22)', ...MONO, textTransform: 'uppercase' as const }
const INPUT: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 9, padding: '9px 12px', color: '#fff', fontSize: 13, ...MONO, outline: 'none', boxSizing: 'border-box' as const }

const LEVELS: CardLevel[] = ['CLASSIC', 'GOLD', 'PLATINUM', 'BLACK']
const NETWORKS: CardNetwork[] = ['VISA', 'MASTERCARD', 'AMEX', 'OTHER']
const CARD_TYPES: CardType[] = ['DEBIT', 'CREDIT']
const AGE_RANGES: AgeRange[] = ['18-30', '31-45', '46-60', '61+']

const LEVEL_COLORS = { CLASSIC: '#9ca3af', GOLD: '#fbbf24', PLATINUM: '#e5e7eb', BLACK: '#fff' }
const NET_COLORS = { VISA: '#818cf8', MASTERCARD: '#fb923c', AMEX: '#4ade80', OTHER: '#9ca3af' }
const TYPE_COLORS = { DEBIT: '#facc15', CREDIT: '#4ade80' }

export default function PreOrderPage() {
  const navigate = useNavigate()
  const [paymentMethod, setPaymentMethod] = useState<'BALANCE' | 'CRYPTO'>('BALANCE')
  const [quantity, setQuantity] = useState('1')
  const [pricePerCard, setPricePerCard] = useState('')
  const [bank, setBank] = useState('')
  const [department, setDepartment] = useState('')
  const [bin, setBin] = useState('')
  const [level, setLevel] = useState<CardLevel | ''>('')
  const [network, setNetwork] = useState<CardNetwork | ''>('')
  const [cardType, setCardType] = useState<CardType | ''>('')
  const [ageRange, setAgeRange] = useState<AgeRange | ''>('')
  const [error, setError] = useState<string | null>(null)
  const [cryptoPayment, setCryptoPayment] = useState<CryptoPaymentInfo | null>(null)
  const [success, setSuccess] = useState(false)

  const { data: balanceData } = useQuery<{ balance: number }>({
    queryKey: ['balance'],
    queryFn: () => api.get('/api/balance').then((r) => r.data),
  })
  const balance = balanceData?.balance ?? 0

  const total = (parseInt(quantity) || 0) * (parseFloat(pricePerCard) || 0)

  const mutation = useMutation({
    mutationFn: () =>
      api.post('/api/preorders', {
        paymentMethod, quantity: parseInt(quantity), pricePerCard: parseFloat(pricePerCard),
        ...(bank ? { bank } : {}),
        ...(department ? { department } : {}),
        ...(bin ? { bin } : {}),
        ...(level ? { level } : {}),
        ...(network ? { network } : {}),
        ...(cardType ? { cardType } : {}),
        ...(ageRange ? { ageRange } : {}),
      }).then((r) => r.data),
    onSuccess: (data) => {
      if (data.cryptoPayment) {
        setCryptoPayment(data.cryptoPayment)
      } else {
        setSuccess(true)
      }
    },
    onError: (err: any) => setError(err?.response?.data?.error ?? 'Erreur'),
  })

  function handleSubmit() {
    if (!quantity || !pricePerCard) { setError('Quantité et prix/carte requis'); return }
    if (paymentMethod === 'BALANCE' && balance < total) { setError('Solde insuffisant'); return }
    setError(null)
    mutation.mutate()
  }

  function toggleBtn<T extends string>(val: T, current: T | '', color: string) {
    const active = current === val
    return {
      flex: 1, padding: '7px 0', borderRadius: 9, cursor: 'pointer' as const,
      border: `1px solid ${active ? color + '60' : 'rgba(255,255,255,0.07)'}`,
      background: active ? color + '18' : 'transparent',
      color: active ? color : 'rgba(255,255,255,0.2)',
      fontSize: 8, ...MONO, fontWeight: 700 as const, letterSpacing: '0.06em',
    }
  }

  if (success) {
    return (
      <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ fontSize: 40 }}>✅</div>
        <div style={{ ...BEBAS, fontSize: 24, color: '#fff', letterSpacing: '0.08em', textAlign: 'center' }}>PRÉCOMMANDE ENVOYÉE</div>
        <div style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.4)', textAlign: 'center', lineHeight: 1.6 }}>
          Un admin va valider ta demande. Tu seras notifié par Telegram.
        </div>
        <button onClick={() => navigate('/mes-precommandes')} style={{ marginTop: 8, padding: '12px 24px', borderRadius: 10, background: GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: 'pointer' }}>
          MES PRÉCOMMANDES
        </button>
      </div>
    )
  }

  if (cryptoPayment) {
    return (
      <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }}>
        <div style={{ ...MONO, fontSize: 8, letterSpacing: '0.2em', color: 'rgba(251,191,36,0.6)' }}>PAYER EN USDT TRC-20</div>
        <img src={cryptoPayment.qrCode} alt="QR" style={{ width: 180, height: 180, borderRadius: 12, border: '1px solid rgba(255,255,255,0.1)' }} />
        <div style={{ ...MONO, fontSize: 9, color: '#fff', wordBreak: 'break-all', textAlign: 'center', padding: '8px 12px', background: 'rgba(255,255,255,0.04)', borderRadius: 8 }}>{cryptoPayment.walletAddress}</div>
        <div style={{ ...BEBAS, fontSize: 24, color: GOLD }}>€{total.toFixed(2)} USDT</div>
        <div style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>
          Après paiement, l'admin validera ta précommande et les cartes arriveront automatiquement.
        </div>
        <button onClick={() => navigate('/mes-precommandes')} style={{ padding: '10px 20px', borderRadius: 10, background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.5)', ...MONO, fontSize: 10, cursor: 'pointer' }}>
          MES PRÉCOMMANDES
        </button>
      </div>
    )
  }

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>PRÉCOMMANDE CC</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2 }}>Cartes livrées automatiquement selon tes filtres</div>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div style={{ background: '#111', borderRadius: 14, border: '1px solid rgba(255,255,255,0.07)', padding: '16px', display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Quantité + Prix */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Quantité</div>
              <input style={INPUT} type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} placeholder="1" inputMode="numeric" min={1} max={100} />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Prix/carte (€)</div>
              <input style={INPUT} type="number" value={pricePerCard} onChange={(e) => setPricePerCard(e.target.value)} placeholder="50.00" inputMode="decimal" />
            </div>
          </div>

          {/* Total */}
          {total > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'rgba(251,191,36,0.04)', borderRadius: 10, border: '1px solid rgba(251,191,36,0.12)' }}>
              <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.4)' }}>TOTAL RÉSERVÉ</span>
              <span style={{ ...BEBAS, fontSize: 22, color: GOLD }}>€{total.toFixed(2)}</span>
            </div>
          )}

          {/* Paiement */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Mode de paiement</div>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['BALANCE', 'CRYPTO'] as const).map((m) => {
                const active = paymentMethod === m
                return (
                  <button key={m} onClick={() => setPaymentMethod(m)} style={{ flex: 1, padding: '8px', borderRadius: 9, cursor: 'pointer', border: `1px solid ${active ? 'rgba(251,191,36,0.5)' : 'rgba(255,255,255,0.07)'}`, background: active ? 'rgba(251,191,36,0.08)' : 'transparent' }}>
                    <div style={{ ...MONO, fontSize: 9, fontWeight: 700, color: active ? GOLD : 'rgba(255,255,255,0.3)', letterSpacing: '0.08em' }}>{m === 'BALANCE' ? 'SOLDE' : 'CRYPTO'}</div>
                    <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)', marginTop: 2 }}>
                      {m === 'BALANCE' ? `€${balance.toFixed(2)} dispo` : 'QR USDT'}
                    </div>
                  </button>
                )
              })}
            </div>
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.06)' }} />
          <div style={{ ...LABEL, color: 'rgba(251,191,36,0.5)' }}>· FILTRES (optionnels)</div>

          {/* Banque + BIN */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>Banque</div>
              <input style={INPUT} value={bank} onChange={(e) => setBank(e.target.value)} placeholder="BNP Paribas" />
            </div>
            <div>
              <div style={{ ...LABEL, marginBottom: 6 }}>BIN (préfixe)</div>
              <input style={INPUT} value={bin} onChange={(e) => setBin(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="456789" inputMode="numeric" />
            </div>
          </div>

          {/* Département */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Département</div>
            <input style={INPUT} value={department} onChange={(e) => setDepartment(e.target.value.replace(/\D/g, '').slice(0, 3))} placeholder="75" inputMode="numeric" />
          </div>

          {/* Level */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Level</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {LEVELS.map((l) => (
                <button key={l} onClick={() => setLevel(level === l ? '' : l)} style={toggleBtn(l, level, LEVEL_COLORS[l])}>
                  {l}
                </button>
              ))}
            </div>
          </div>

          {/* Réseau */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Réseau</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {NETWORKS.map((n) => (
                <button key={n} onClick={() => setNetwork(network === n ? '' : n)} style={toggleBtn(n, network, NET_COLORS[n])}>
                  {n}
                </button>
              ))}
            </div>
          </div>

          {/* Type */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Type</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {CARD_TYPES.map((t) => (
                <button key={t} onClick={() => setCardType(cardType === t ? '' : t)} style={toggleBtn(t, cardType, TYPE_COLORS[t])}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Âge */}
          <div>
            <div style={{ ...LABEL, marginBottom: 6 }}>Tranche d'âge</div>
            <div style={{ display: 'flex', gap: 6 }}>
              {AGE_RANGES.map((a) => (
                <button key={a} onClick={() => setAgeRange(ageRange === a ? '' : a)} style={toggleBtn(a, ageRange, '#c084fc')}>
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div style={{ fontSize: 11, ...MONO, color: '#ef4444', padding: '8px 12px', background: 'rgba(239,68,68,0.07)', borderRadius: 8, border: '1px solid rgba(239,68,68,0.2)' }}>
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={mutation.isPending || total === 0}
            style={{ padding: '13px', borderRadius: 10, background: mutation.isPending || total === 0 ? 'rgba(251,191,36,0.3)' : GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 15, letterSpacing: '0.1em', cursor: mutation.isPending || total === 0 ? 'not-allowed' : 'pointer' }}
          >
            {mutation.isPending ? '...' : `PRÉCOMMANDER — €${total.toFixed(2)}`}
          </button>
        </div>
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); * { box-sizing: border-box; } input::placeholder { color: rgba(255,255,255,0.2); } ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/PreOrderPage.tsx
git commit -m "feat: add PreOrderPage with filters, dual payment, QR flow"
```

---

## Task 16: Frontend — MesPreCommandes

**Files:**
- Create: `frontend/src/pages/MesPreCommandes.tsx`

- [ ] **Step 1: Créer la page**

```tsx
// frontend/src/pages/MesPreCommandes.tsx
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '../lib/api'
import type { PreOrder, PreOrderStatus } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const STATUS_CFG: Record<PreOrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'EN ATTENTE', color: '#fbbf24', bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)' },
  APPROVED:  { label: 'APPROUVÉE',  color: '#4ade80', bg: 'rgba(74,222,128,0.08)', border: 'rgba(74,222,128,0.2)' },
  REJECTED:  { label: 'REFUSÉE',    color: '#f87171', bg: 'rgba(248,113,113,0.08)', border: 'rgba(248,113,113,0.2)' },
  FULFILLED: { label: 'COMPLÈTE',   color: '#818cf8', bg: 'rgba(129,140,248,0.08)', border: 'rgba(129,140,248,0.2)' },
}

export default function MesPreCommandes() {
  const navigate = useNavigate()

  const { data: preorders = [], isLoading } = useQuery<PreOrder[]>({
    queryKey: ['my-preorders'],
    queryFn: () => api.get('/api/preorders').then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 60_000,
  })

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate(-1)} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 20, letterSpacing: '0.06em', color: '#fff', lineHeight: 1 }}>MES PRÉCOMMANDES</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2 }}>{preorders.length} au total</div>
        </div>
        <div style={{ marginLeft: 'auto' }}>
          <button onClick={() => navigate('/precommande')} style={{ padding: '6px 12px', borderRadius: 8, background: 'rgba(251,191,36,0.12)', border: '1px solid rgba(251,191,36,0.3)', color: GOLD, ...MONO, fontSize: 9, cursor: 'pointer', letterSpacing: '0.08em', fontWeight: 700 }}>
            + NOUVELLE
          </button>
        </div>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {isLoading ? (
          [1, 2].map((i) => <div key={i} style={{ height: 90, borderRadius: 14, background: '#111', opacity: 0.5 }} />)
        ) : preorders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>📋</div>
            <div style={{ ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>AUCUNE PRÉCOMMANDE</div>
            <button onClick={() => navigate('/precommande')} style={{ marginTop: 16, padding: '10px 20px', borderRadius: 10, background: GOLD, color: '#050505', border: 'none', ...BEBAS, fontSize: 14, letterSpacing: '0.1em', cursor: 'pointer' }}>
              CRÉER UNE PRÉCOMMANDE
            </button>
          </div>
        ) : (
          preorders.map((po) => {
            const sc = STATUS_CFG[po.status as PreOrderStatus] ?? STATUS_CFG.PENDING
            const tags = [po.network, po.level, po.cardType, po.bank].filter(Boolean)
            const progress = po.quantity > 0 ? po.fulfilled / po.quantity : 0
            return (
              <div key={po.id} style={{ background: '#111', borderRadius: 14, border: `1px solid ${sc.border}`, padding: '14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>#{po.id}</span>
                    <span style={{ fontSize: 8, padding: '2px 7px', borderRadius: 5, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, ...MONO, fontWeight: 700, letterSpacing: '0.06em' }}>{sc.label}</span>
                  </div>
                  <span style={{ ...BEBAS, fontSize: 18, color: GOLD }}>€{po.total.toFixed(2)}</span>
                </div>

                {/* Tags filtres */}
                {tags.length > 0 && (
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {tags.map((t) => (
                      <span key={t} style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>{t}</span>
                    ))}
                    {po.department && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>DEPT {po.department}</span>}
                    {po.ageRange && <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.4)', ...MONO }}>{po.ageRange} ANS</span>}
                  </div>
                )}

                {/* Progression */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)' }}>LIVRAISON</span>
                    <span style={{ ...MONO, fontSize: 8, color: sc.color }}>{po.fulfilled} / {po.quantity}</span>
                  </div>
                  <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                    <div style={{ height: 3, borderRadius: 2, background: sc.color, width: `${progress * 100}%`, transition: 'width 0.3s' }} />
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{new Date(po.createdAt).toLocaleDateString('fr-FR')}</span>
                  <span style={{ ...MONO, fontSize: 8, color: po.paymentMethod === 'BALANCE' ? '#4ade80' : '#818cf8' }}>{po.paymentMethod === 'BALANCE' ? '💳 SOLDE' : '🔗 CRYPTO'}</span>
                </div>
              </div>
            )
          })
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/MesPreCommandes.tsx
git commit -m "feat: add MesPreCommandes page with status, progress bar, filters"
```

---

## Task 17: Frontend — AdminPreOrders

**Files:**
- Create: `frontend/src/pages/admin/AdminPreOrders.tsx`

- [ ] **Step 1: Créer la page admin**

```tsx
// frontend/src/pages/admin/AdminPreOrders.tsx
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type { PreOrder, PreOrderStatus } from 'floramini-types'

const GOLD = '#fbbf24'
const MONO: React.CSSProperties = { fontFamily: '"JetBrains Mono", monospace' }
const BEBAS: React.CSSProperties = { fontFamily: '"Bebas Neue", "Impact", sans-serif' }

const STATUS_CFG: Record<PreOrderStatus, { label: string; color: string; bg: string; border: string }> = {
  PENDING:   { label: 'EN ATTENTE', color: '#fbbf24', bg: 'rgba(251,191,36,0.1)',  border: 'rgba(251,191,36,0.25)' },
  APPROVED:  { label: 'APPROUVÉE',  color: '#4ade80', bg: 'rgba(74,222,128,0.1)',  border: 'rgba(74,222,128,0.25)' },
  REJECTED:  { label: 'REFUSÉE',    color: '#f87171', bg: 'rgba(248,113,113,0.1)', border: 'rgba(248,113,113,0.25)' },
  FULFILLED: { label: 'COMPLÈTE',   color: '#818cf8', bg: 'rgba(129,140,248,0.1)', border: 'rgba(129,140,248,0.25)' },
}

interface AdminPreOrder extends PreOrder {
  user?: { id: number; firstName: string; username: string | null }
}

export default function AdminPreOrders() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string>('PENDING')
  const [expandedId, setExpandedId] = useState<number | null>(null)

  const { data: preorders = [], isLoading } = useQuery<AdminPreOrder[]>({
    queryKey: ['admin-preorders', filterStatus],
    queryFn: () => api.get(`/api/admin/preorders?status=${filterStatus}`).then((r) => r.data),
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const actionMutation = useMutation({
    mutationFn: ({ id, action }: { id: number; action: 'APPROVE' | 'REJECT' }) =>
      api.patch(`/api/admin/preorders/${id}`, { action }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-preorders'] })
      setExpandedId(null)
    },
  })

  const filters = ['PENDING', 'APPROVED', 'REJECTED', 'FULFILLED']

  return (
    <div style={{ background: '#050505', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Header */}
      <div style={{ flexShrink: 0, background: 'rgba(5,5,5,0.95)', backdropFilter: 'blur(14px)', borderBottom: '1px solid rgba(251,191,36,0.15)', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={() => navigate('/admin')} style={{ width: 32, height: 32, borderRadius: 9, border: '1px solid rgba(251,191,36,0.2)', background: 'rgba(251,191,36,0.08)', color: 'rgba(251,191,36,0.9)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15 }}>←</button>
        <div>
          <div style={{ ...BEBAS, fontSize: 17, letterSpacing: '0.08em', color: '#fff', lineHeight: 1 }}>PRÉCOMMANDES</div>
          <div style={{ ...MONO, fontSize: 9, color: 'rgba(251,191,36,0.5)', marginTop: 2, letterSpacing: '0.1em' }}>{preorders.length} ENTRÉE{preorders.length !== 1 ? 'S' : ''}</div>
        </div>
      </div>

      {/* Filter bar */}
      <div style={{ flexShrink: 0, display: 'flex', gap: 6, overflowX: 'auto', padding: '10px 16px 0', scrollbarWidth: 'none' }}>
        {filters.map((f) => {
          const active = filterStatus === f
          const sc = STATUS_CFG[f as PreOrderStatus]
          return (
            <button key={f} onClick={() => setFilterStatus(f)} style={{ flexShrink: 0, padding: '5px 10px', borderRadius: 20, border: `1px solid ${active ? sc.border : 'rgba(255,255,255,0.08)'}`, background: active ? sc.bg : 'transparent', color: active ? sc.color : 'rgba(255,255,255,0.25)', fontSize: 8, ...MONO, fontWeight: 700, letterSpacing: '0.08em', cursor: 'pointer' }}>
              {sc.label}
            </button>
          )
        })}
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 16px 24px', display: 'flex', flexDirection: 'column', gap: 6 }}>
        {isLoading ? (
          [1, 2].map((i) => <div key={i} style={{ height: 80, borderRadius: 14, background: '#111', opacity: 0.5 }} />)
        ) : preorders.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 0', ...MONO, fontSize: 11, color: 'rgba(255,255,255,0.2)' }}>
            AUCUNE PRÉCOMMANDE {filterStatus}
          </div>
        ) : (
          preorders.map((po) => {
            const sc = STATUS_CFG[po.status as PreOrderStatus] ?? STATUS_CFG.PENDING
            const expanded = expandedId === po.id
            const tags = [po.network, po.level, po.cardType, po.bank, po.department && `DEPT ${po.department}`, po.ageRange && `${po.ageRange} ANS`].filter(Boolean)
            return (
              <div key={po.id} style={{ background: '#111', borderRadius: 14, border: `1px solid ${expanded ? 'rgba(251,191,36,0.15)' : 'rgba(255,255,255,0.06)'}`, overflow: 'hidden' }}>
                <button onClick={() => setExpandedId(expanded ? null : po.id)} style={{ width: '100%', display: 'flex', alignItems: 'center', padding: '12px 14px', background: 'transparent', border: 'none', cursor: 'pointer', gap: 10 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 4, background: sc.color, flexShrink: 0 }} />
                  <div style={{ flex: 1, textAlign: 'left', minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ ...MONO, fontSize: 11, fontWeight: 700, color: '#fff' }}>#{po.id}</span>
                      <span style={{ ...MONO, fontSize: 10, color: 'rgba(255,255,255,0.35)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{po.user?.firstName ?? '—'}</span>
                      {po.user?.username && <span style={{ ...MONO, fontSize: 9, color: 'rgba(255,255,255,0.2)' }}>@{po.user.username}</span>}
                    </div>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      <span style={{ fontSize: 8, padding: '2px 6px', borderRadius: 4, background: sc.bg, color: sc.color, border: `1px solid ${sc.border}`, ...MONO, fontWeight: 700 }}>{sc.label}</span>
                      <span style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.2)' }}>{po.quantity} cartes × €{po.pricePerCard}</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ ...BEBAS, fontSize: 18, color: GOLD }}>€{po.total.toFixed(2)}</div>
                    <div style={{ ...MONO, fontSize: 8, color: po.paymentMethod === 'BALANCE' ? '#4ade80' : '#818cf8' }}>{po.paymentMethod}</div>
                  </div>
                  <span style={{ color: 'rgba(255,255,255,0.2)', fontSize: 14, marginLeft: 4, transition: 'transform 0.2s', transform: expanded ? 'rotate(90deg)' : 'rotate(0)' }}>›</span>
                </button>

                {expanded && (
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                    {/* Détails filtres */}
                    <div style={{ padding: '10px 14px', display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {tags.map((t) => (
                        <span key={t} style={{ fontSize: 8, padding: '3px 8px', borderRadius: 5, background: 'rgba(255,255,255,0.06)', color: 'rgba(255,255,255,0.5)', ...MONO }}>{t}</span>
                      ))}
                      {po.bin && <span style={{ fontSize: 8, padding: '3px 8px', borderRadius: 5, background: 'rgba(251,191,36,0.08)', color: '#fbbf24', ...MONO }}>BIN {po.bin}</span>}
                    </div>

                    {/* Progression */}
                    <div style={{ padding: '0 14px 10px' }}>
                      <div style={{ ...MONO, fontSize: 8, color: 'rgba(255,255,255,0.3)', marginBottom: 4 }}>{po.fulfilled}/{po.quantity} CARTES LIVRÉES</div>
                      <div style={{ height: 3, borderRadius: 2, background: 'rgba(255,255,255,0.06)' }}>
                        <div style={{ height: 3, borderRadius: 2, background: sc.color, width: `${po.quantity > 0 ? (po.fulfilled / po.quantity) * 100 : 0}%` }} />
                      </div>
                    </div>

                    {/* Actions */}
                    {po.status === 'PENDING' && (
                      <div style={{ padding: '10px 14px', borderTop: '1px solid rgba(255,255,255,0.04)', display: 'flex', gap: 8 }}>
                        <button
                          onClick={() => actionMutation.mutate({ id: po.id, action: 'APPROVE' })}
                          disabled={actionMutation.isPending}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(74,222,128,0.12)', border: '1px solid rgba(74,222,128,0.3)', color: '#4ade80', ...MONO, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
                        >
                          ✅ APPROUVER
                        </button>
                        <button
                          onClick={() => actionMutation.mutate({ id: po.id, action: 'REJECT' })}
                          disabled={actionMutation.isPending}
                          style={{ flex: 1, padding: '8px', borderRadius: 8, background: 'rgba(248,113,113,0.12)', border: '1px solid rgba(248,113,113,0.3)', color: '#f87171', ...MONO, fontSize: 9, fontWeight: 700, cursor: 'pointer', letterSpacing: '0.08em' }}
                        >
                          ❌ REJETER
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=JetBrains+Mono:wght@400;700&display=swap'); ::-webkit-scrollbar { display: none; }`}</style>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/pages/admin/AdminPreOrders.tsx
git commit -m "feat: add AdminPreOrders page (list + approve/reject)"
```

---

## Task 18: Frontend — App.tsx routes + Profile nav

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/pages/Profile.tsx`
- Modify: `frontend/src/pages/admin/Dashboard.tsx`

- [ ] **Step 1: Ajouter les routes dans App.tsx**

Dans `frontend/src/App.tsx`, ajouter les imports:
```typescript
import Balance from './pages/Balance'
import PreOrderPage from './pages/PreOrderPage'
import MesPreCommandes from './pages/MesPreCommandes'
import AdminPreOrders from './pages/admin/AdminPreOrders'
```

Dans le router, ajouter dans les enfants du Layout (à côté des autres routes utilisateur):
```typescript
{ path: 'balance', element: <Balance /> },
{ path: 'precommande', element: <PreOrderPage /> },
{ path: 'mes-precommandes', element: <MesPreCommandes /> },
```

Dans la section admin:
```typescript
{ path: 'preorders', element: <AdminPreOrders /> },
```

- [ ] **Step 2: Ajouter la navigation dans Profile.tsx**

Dans `frontend/src/pages/Profile.tsx`, dans la section Navigation, ajouter après la NavRow "MES COMMANDES":
```tsx
<NavRow label="MON SOLDE" icon="💰" onClick={() => navigate('/balance')} accent="gold" />
<NavRow label="MES PRÉCOMMANDES" icon="🎯" onClick={() => navigate('/mes-precommandes')} accent="cyan" />
```

- [ ] **Step 3: Ajouter le lien PreOrders dans le Dashboard admin**

Lire `frontend/src/pages/admin/Dashboard.tsx` et ajouter un NavCard ou lien vers `/admin/preorders` avec le label "PRÉCOMMANDES" en suivant le pattern existant.

- [ ] **Step 4: Build de vérification**

```bash
cd frontend && npm run build
```

Expected: build sans erreurs TypeScript

- [ ] **Step 5: Build du backend**

```bash
cd backend && npm run build
```

Expected: compilation sans erreurs

- [ ] **Step 6: Commit final**

```bash
git add frontend/src/App.tsx frontend/src/pages/Profile.tsx frontend/src/pages/admin/Dashboard.tsx
git commit -m "feat: add routes Balance, PreOrder, MesPreCommandes, AdminPreOrders + nav"
```

---

## Task 19: Variables d'environnement

**Files:**
- Modify: `backend/.env` (ou `.env.example`)

- [ ] **Step 1: Ajouter les variables requises**

Dans `backend/.env`, ajouter:
```env
CRYPTO_API_URL=http://deploy-crypto-api-1:3000
CRYPTO_API_ADMIN_KEY=<ta-clé-admin-crypto-api>
WEBHOOK_SECRET=<secret-partagé-avec-crypto-api>
```

Dans le `crypto-api` sur le VPS, configurer:
```env
WEBHOOK_INTERNAL_URL=http://<auto-shop-backend-host>/api/crypto/webhook
WEBHOOK_SECRET=<même-secret>
```

- [ ] **Step 2: Vérifier .env.example**

S'assurer que `backend/.env.example` (ou `backend/.env`) documente ces variables sans les valeurs sensibles.

- [ ] **Step 3: Commit**

```bash
git add backend/.env.example  # ou le fichier équivalent non gitignored
git commit -m "docs: add CRYPTO_API_URL, CRYPTO_API_ADMIN_KEY, WEBHOOK_SECRET to env example"
```

---

## Self-Review — Vérification de couverture spec

### Spec → Tasks mapping

| Requirement | Task(s) |
|---|---|
| Solde user (balance) | Task 1 (schema) + Task 5 (routes) + Task 13 (frontend) |
| Recharge USDT TRC-20 | Task 3 (crypto client) + Task 5 (routes) + Task 13 (frontend QR) |
| Webhook crypto → crédit solde | Task 6 (webhook) |
| Paiement BALANCE au checkout CC | Task 4 (fulfillment) + Task 14 (frontend) |
| Paiement CRYPTO au checkout CC | Task 4 (pay route) + Task 14 (frontend QR) |
| Paiement BALANCE aux extractions fiches | Task 8 (dataOrders) |
| Paiement CRYPTO aux extractions fiches | Task 8 (dataOrders) + Task 6 (webhook fulfillDataOrder) |
| Précommande avec filtres | Task 11 (routes user) + Task 15 (frontend) |
| Validation admin précommande | Task 12 (admin routes) + Task 17 (frontend admin) |
| Notification Telegram admin | Task 11 (notifyAdminsPreOrder) + Task 6 (webhook preorder) |
| Matching auto à l'ajout de stock | Task 9 (matcher) + Task 10 (trigger collab) |
| Remboursement si rejet BALANCE | Task 12 (admin routes) |
| Liste précommandes user | Task 11 (GET /) + Task 16 (frontend) |
| DA respectée (colors, fonts) | Tasks 13-17 (tous inline styles gold+mono) |

### Gaps identifiés et résolus

- ✅ `deliverySlot` optionnel dans CreateOrderSchema — résolu Task 2
- ✅ Logique de livraison CC extraite en lib partagée — Task 4 (fulfillment.ts)
- ✅ Webhook dispatche par `metadata.type` — Task 6
- ✅ Variables d'environnement documentées — Task 19
- ✅ Matcher déclenché côté admin bulk upload aussi (via `admin/products.ts`) — **à vérifier**: le bulk upload admin (`backend/src/routes/admin/products.ts`) a aussi un endpoint bulk. Ajouter le même trigger dans la Task 10 si ce fichier expose aussi du bulk upload.

### Note sur admin/products.ts bulk upload

Dans `backend/src/routes/admin/products.ts`, le handler `POST /:id/inventory/bulk` doit aussi appeler `matchAndDeliver`. Ajouter cette ligne dans Task 10 :

```typescript
// Dans admin/products.ts également
import { matchAndDeliver } from '../../lib/preorderMatcher'
// Après la mise à jour du stock dans POST /:id/inventory/bulk :
matchAndDeliver(productId).catch((err) => console.warn('[matcher] Error:', err))
```
