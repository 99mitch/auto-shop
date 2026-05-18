# Collab crypto payouts — design

## Objectif
Permettre aux collaborateurs de recevoir directement leur part en crypto, sur leur propre wallet, lors de chaque vente. Le collab fixe son `costEur`, l'admin fixe le `price` de vente, la différence reste à la plateforme.

## Décisions
- **Modèle split** : coût fixe en € par produit (`Product.costEur`), prix de vente `Product.price` fixé par l'admin.
- **Wallets collab** : 1 adresse par crypto (USDT-Tron, ETH, SOL). BTC non supporté au lancement.
- **Fallback** : si pas de wallet pour la crypto choisie → tout va au wallet central, earning créé en `CREDITED_OFFCHAIN` (paiement manuel par admin).
- **Conversion EUR→crypto** : ratio proportionnel = `collabCutEur / orderTotalEur`, appliqué au `receivedAmount` au sweep.
- **Panier multi-collab** : 1 paiement crypto, N transferts au sweep.
- **Gas** : collab paye sur ETH/SOL (déduit de sa part). USDT-Tron : la plateforme fournit le TRX (négligeable).
- **Timing** : payout immédiat au sweep.
- **Produits admin (sans collab)** : 100% wallet central (comportement actuel).

## Architecture
```
Frontend collab  → /api/collab/wallets        → DB CollabWallet
Frontend collab  → /api/collab/products       → Product { costEur }
Customer pay     → /api/orders/:id/pay        → crypto-api createPayment + metadata.payoutSplit
crypto-api sweep → transfer wallet collab × N + reste → central
crypto-api hook  → /api/cryptoWebhook         → CollaboratorEarning { status, txHash, ... }
```

## Schéma DB (auto-shop Prisma)

### Product
```prisma
costEur Float?
```

### Nouvelle table
```prisma
model CollabWallet {
  id        Int    @id @default(autoincrement())
  userId    Int
  user      User   @relation(fields: [userId], references: [id])
  currency  String
  address   String
  updatedAt DateTime @updatedAt
  @@unique([userId, currency])
}
```

### CollaboratorEarning
```prisma
status        String  @default("PENDING")  // PENDING | PAID_ONCHAIN | CREDITED_OFFCHAIN
currency      String?
cryptoAmount  Float?
txHash        String?
walletAddress String?
```

## crypto-api : metadata
```js
metadata.payoutSplit = [
  { address, ratio, currency, collabId }
]
```
Validation : `currency` matche `payment.currency`, `Σ ratios ≤ 1`.

## Backend : routes

### Espace collab
- `GET    /api/collab/wallets`
- `PUT    /api/collab/wallets/:currency` body `{ address }`
- `DELETE /api/collab/wallets/:currency`

Validation address par regex.

### Espace admin
- `PUT /api/admin/products/:id` accepte `price` pour fixer le prix final.

### Pay flow
`/api/orders/:id/pay` (CRYPTO) :
1. Charge items + collab + collabWallets
2. Construit `payoutSplit` (skip si pas de wallet → fallback central)
3. `createCryptoPayment(total, ..., { ...metadata, payoutSplit }, currency)`
4. Snapshot `expectedPayoutSplit` sur Order pour audit (champ JSON)

## Backend : webhook
Payload étendu : `payoutResults: [{ collabId, address, amount, currency, txHash, status, error? }]`.
Traitement :
- Pour chaque collab du `expectedPayoutSplit` :
  - Si présent dans `payoutResults` avec `status=success` → earning `PAID_ONCHAIN`
  - Si présent avec `status=failed` → earning `PENDING` + détail erreur
  - Si absent (wallet manquant à la création) → earning `CREDITED_OFFCHAIN`
- Continue `fulfillCCOrder` standard.

## crypto-api : sweep multi-destinations
Pseudo-code :
```js
function calcDestinations(payment) {
  const received = payment.receivedAmount
  const split = payment.metadata?.payoutSplit ?? []
  return split.map(s => ({
    address: s.address,
    amount: floorPrecision(received * s.ratio, decimals),
    collabId: s.collabId
  }))
}
```
Pour USDT-Tron : `ensureGasForSweep(temp, destinations.length + 1 + hasFees)`. N transferts USDT, puis central reçoit le reste.
Pour ETH/SOL : N transactions, gas/fees déduit du montant collab. Central reçoit le reste.

Résultats stockés dans `Payment.payoutResults: [{ address, amount, collabId, txHash, status, error? }]` et émis dans webhook.

## Tests
- Unit : `buildPayoutSplit` (multi-collab, missing wallet, produit admin pur, mix)
- Unit : sweep-with-split mocks (TronWeb / ethers / @solana/web3.js)
- Integration : webhook payment.confirmed → earnings + fulfillment
- Manual : tests testnet (Sepolia, Solana devnet, Nile USDT)

## Migrations
- `Product.costEur` nullable, pas de backfill auto. Tu choisis quoi faire des anciens produits collab.
- `CollaboratorEarning.status` default `CREDITED_OFFCHAIN` pour les rows historiques.

## Edge cases
- Sur/sous-paiement : ratio appliqué sur `receivedAmount` réel.
- Concurrence webhook : `fulfillCCOrder` déjà idempotent.
- Collab change wallet entre commande et paiement : snapshot dans `expectedPayoutSplit`.
- Tx collab échouée : earning `PENDING`, retry admin via `/api/admin/earnings/:id/retry` (futur).
