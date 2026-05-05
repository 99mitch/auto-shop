# Spec — Précommandes CC + Système de Paiement Dual

**Date** : 2026-05-06  
**Statut** : Approuvé

---

## Contexte

Le projet auto-shop est une Mini App Telegram pour vente de CC (cartes bancaires) et fiches de données. Les collaborateurs ajoutent des cartes via un espace dédié. Les clients achètent via un catalogue ou des commandes de données.

Cette spec couvre deux fonctionnalités liées :
1. **Système de paiement dual** (solde pré-chargé ou crypto direct) pour toutes les commandes
2. **Système de précommandes CC** avec filtres, ticket admin, et livraison automatique

L'API crypto (`/home/mitch/crypto-api`) est déjà déployée sur le VPS `deploy-crypto-api-1` et gère USDT TRC-20, BTC, ETH, SOL. Elle envoie des webhooks HMAC-SHA256 signés.

---

## Schéma DB (ajouts Prisma)

### Champ balance sur User
```prisma
balance Float @default(0)
```

### BalanceTopUp — historique des recharges
```prisma
model BalanceTopUp {
  id        Int      @id @default(autoincrement())
  userId    Int
  user      User     @relation(fields: [userId], references: [id])
  paymentId String   @unique  // ID retourné par crypto-api (ex: "PAY-C3A9E4B6")
  amount    Float              // montant en USDT/€
  status    String   @default("PENDING") // PENDING | CONFIRMED
  createdAt DateTime @default(now())
}
```

### PreOrder — précommandes CC
```prisma
model PreOrder {
  id             Int      @id @default(autoincrement())
  userId         Int
  user           User     @relation(fields: [userId], references: [id])
  status         String   @default("PENDING")
  // Statuts : PENDING | APPROVED | REJECTED | FULFILLED

  // Filtres optionnels
  bank           String?
  department     String?   // ex: "75" → match product.cp.startsWith("75")
  ageRange       String?   // "18-30" | "31-45" | "46-60" | "61+"
  bin            String?   // préfixe BIN, ex: "4567"
  level          String?   // CLASSIC | GOLD | PLATINUM | BLACK
  cardType       String?   // DEBIT | CREDIT
  network        String?   // VISA | MASTERCARD | AMEX | OTHER

  // Finance
  paymentMethod  String    // "BALANCE" | "CRYPTO"
  quantity       Int
  pricePerCard   Float     // prix fixe négocié par carte
  total          Float     // quantity × pricePerCard
  fulfilled      Int       @default(0)

  // Crypto direct uniquement
  cryptoPaymentId String?  // rempli si paymentMethod = CRYPTO et paiement créé
  cryptoPaid      Boolean  @default(false)

  createdAt      DateTime  @default(now())
}
```

---

## Backend — nouvelles routes

### Balance

| Méthode | Route | Description |
|---|---|---|
| GET | `/api/balance` | Retourne `{ balance, topUps[] }` |
| POST | `/api/balance/topup` | Crée paiement crypto-api → `{ paymentId, walletAddress, qrCode, expiresAt }` |
| GET | `/api/balance/topup/:paymentId/status` | Polling → `{ status, amount }` |

### Webhook crypto

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/crypto/webhook` | Réception webhook crypto-api (vérifie signature HMAC-SHA256) |

Le webhook dispatche selon `metadata.type` :
- `"topup"` → crédite `user.balance`
- `"order"` → confirme l'ordre et déclenche la livraison
- `"preorder"` → marque `cryptoPaid = true`, envoie ticket admin Telegram

### Checkout enrichi

`POST /api/orders` accepte désormais `paymentMethod: "BALANCE" | "CRYPTO"` :

- **BALANCE** : vérifie `balance ≥ total`, déduit, crée ordre, livre immédiatement
- **CRYPTO** : crée ordre `status = PENDING_PAYMENT`, appelle crypto-api, retourne QR. Le webhook déclenche la livraison.

Même logique appliquée à `POST /api/dataOrders` pour les fiches.

### Précommandes

| Méthode | Route | Description |
|---|---|---|
| POST | `/api/preorders` | Crée précommande |
| GET | `/api/preorders` | Liste des précommandes de l'utilisateur |
| DELETE | `/api/preorders/:id` | Annule si PENDING (remboursement solde si BALANCE) |
| GET | `/api/admin/preorders` | Liste toutes les précommandes (filtre par statut) |
| PATCH | `/api/admin/preorders/:id` | `{ action: "APPROVE" \| "REJECT" }` |

**Création précommande — règles :**
- `BALANCE` : vérifie `balance ≥ total`, déduit immédiatement, statut `PENDING`
- `CRYPTO` : génère paiement crypto-api, retourne QR, statut `PENDING` jusqu'au webhook
- Après paiement crypto confirmé → notifie admin via Telegram

**Admin APPROVE :**
- Notifie l'utilisateur via Telegram
- La précommande passe `APPROVED`, le matching automatique démarre dès la prochaine entrée de stock

**Admin REJECT :**
- Méthode BALANCE → rembourse `total` sur `user.balance`
- Méthode CRYPTO → flag `needsManualRefund = true` (remboursement manuel côté admin)
- Notifie l'utilisateur via Telegram

---

## Logique de matching automatique

Déclenchée dans `POST /collab/products/:id/inventory/bulk` après insertion des cartes.

**Algorithme :**
1. Parser les metadata JSON du produit (`bank`, `network`, `level`, `type`, `bin`, `cp`, `age`)
2. Trouver les `PreOrder` avec `status = APPROVED` et `fulfilled < quantity`
3. Critères de match (filtres non-null seulement) :
   - `bank` → égalité insensible à la casse
   - `network`, `level`, `cardType` → égalité exacte
   - `bin` → `product.bin.startsWith(preorder.bin)`
   - `department` → `product.cp.startsWith(preorder.department)`
   - `ageRange` → parse la tranche, vérifie `parseInt(product.age)` dans l'intervalle
4. Trier les précommandes matchées par `createdAt ASC` (FIFO)
5. Pour chaque carte ajoutée, distribuer aux précommandes dans l'ordre :
   - Envoyer la carte via Telegram (`deliverCards`)
   - Marquer `CardInventory.sold = true`
   - Incrémenter `preorder.fulfilled`
   - Si `fulfilled === quantity` → `status = FULFILLED`

---

## Flux de paiement

### BALANCE — commande catalogue/fiches
```
Checkout → user choisit SOLDE → backend vérifie balance ≥ total
→ débit → ordre créé → livraison Telegram immédiate
```

### CRYPTO — commande catalogue/fiches
```
Checkout → user choisit CRYPTO → backend crée ordre PENDING_PAYMENT
→ appel crypto-api → QR USDT affiché → polling /status
→ webhook payment.confirmed → ordre livré via Telegram
```

### BALANCE — précommande
```
Formulaire → user choisit SOLDE → balance vérifiée + réservée
→ ticket Telegram admin → admin APPROVE/REJECT
→ APPROVE : matching automatique au fur et à mesure du stock
→ REJECT : remboursement solde + notification user
```

### CRYPTO — précommande
```
Formulaire → user choisit CRYPTO → QR généré
→ paiement USDT → webhook → ticket Telegram admin
→ admin APPROVE/REJECT
→ APPROVE : matching automatique
→ REJECT : flag remboursement manuel
```

### Recharge solde
```
Page Balance → user tape montant → POST /api/balance/topup
→ QR USDT TRC-20 affiché → polling GET /status
→ webhook payment.swept → balance créditée → confirmation UI
```

---

## Intégration crypto-api

**URL de base** : `http://deploy-crypto-api-1:3000`

**Appel création paiement** :
```json
POST /api/payments
{
  "amount": 50,
  "description": "Recharge solde #42",
  "metadata": { "userId": 42, "type": "topup", "refId": 7 }
}
```

**Webhook entrant** (configuré via `WEBHOOK_INTERNAL_URL` dans crypto-api) :
```
POST /api/crypto/webhook  (sur auto-shop backend)
Header: X-Webhook-Signature: <hmac-sha256>
Header: X-Webhook-Event: payment.confirmed | payment.swept
```

Vérification de signature avec `WEBHOOK_SECRET` partagé entre les deux services.

---

## Pages frontend

| Page | Route | Description |
|---|---|---|
| `Balance.tsx` | `/balance` | Solde, historique, flow recharge QR + polling |
| `PreOrderPage.tsx` | `/precommande` | Formulaire filtres CC + qty + prix/carte + choix paiement |
| `MesPreCommandes.tsx` | `/mes-precommandes` | Liste précommandes user avec statuts et progression |
| `AdminPreOrders.tsx` | `/admin/preorders` | Panel admin : tickets précommandes, approuver/rejeter |
| `Checkout.tsx` (modif) | `/checkout` | Ajout section "MODE DE PAIEMENT" (SOLDE / CRYPTO) |
| `ExtractionPage.tsx` (modif) | `/extraction` | Ajout section "MODE DE PAIEMENT" (SOLDE / CRYPTO) |

**Design system** : identique au reste du projet — fond `#050505`/`#111`, gold `#fbbf24`, JetBrains Mono + Bebas Neue, inline styles.

---

## Variables d'environnement (ajouts)

```env
# auto-shop backend
CRYPTO_API_URL=http://deploy-crypto-api-1:3000
CRYPTO_API_ADMIN_KEY=<clé admin crypto-api>
WEBHOOK_SECRET=<secret partagé avec crypto-api>

# crypto-api (déjà déployé)
WEBHOOK_INTERNAL_URL=http://auto-shop-backend/api/crypto/webhook
```
