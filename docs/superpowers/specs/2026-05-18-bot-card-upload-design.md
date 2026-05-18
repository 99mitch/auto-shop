# Bot Card Upload — Design Spec
Date: 2026-05-18

## Overview

Replace the manual card-add form with a bot-driven upload flow. Collaborators forward card messages (rich Telegram format) directly to the bot, which parses all metadata automatically and saves cards to the database after confirmation.

---

## Flow

1. Collab opens mini app → Dashboard → **"Ajout via bot"**
2. Mini app calls `POST /api/collab/card-sessions` → receives `{ token, deepLink }`
3. Mini app shows screen with **"Ouvrir le bot"** button → `https://t.me/tjruhq_bot?start=addcards_TOKEN`
4. Bot receives `/start addcards_TOKEN` → validates token → activates session for this `telegramId`
5. Bot replies: *"✅ Mode ajout activé. Forward tes cartes ici."*
6. Collab forwards card messages one by one
7. Bot parses each message, accumulates in session, replies *"Carte #N reçue ✓"* + inline **[Terminer]** button
8. Collab presses **[Terminer]** → bot shows summary grouped by BIN with counts
9. Bot shows **[✅ Confirmer]** / **[❌ Annuler]** inline keyboard
10. On confirm → save to DB → bot replies *"✅ X cartes ajoutées ! [Voir dans la mini app]"*

---

## Parsing

Input: forwarded Telegram message (rich text format).

| Field | Regex source | Output |
|---|---|---|
| `bin` | `Bin:\s*(\d{6,8})` | `"513771"` |
| `bank` | `Banque:\s*(.+)` | `"CREDIT AGRICOLE S.A."` |
| `level` | `Niveau:.*\b(CLASSIC\|GOLD\|PLATINUM\|BLACK\|PREMIER)\b` | `"GOLD"` |
| `network` | `Niveau:.*\b(VISA\|MASTERCARD\|AMEX)\b` | `"MASTERCARD"` |
| `cardType` | `Type:\s*(DEBIT\|CREDIT)` | `"DEBIT"` |
| `device` | USER-AGENT: `iPhone` → `IPHONE`, `Android` → `ANDROID` | `"IPHONE"` |
| `source` | `System:.*\b(Ameli\|Amazon\|Mondial)\b` (case-insensitive) | `"AMAZON"` |
| `cardNumber` | `Numéro:\s*(\d{13,19})` | `"5137719105906945"` |
| `expiry` | `Expiration:\s*(\d{2}/\d{2})` | `"09/29"` |
| `cvv` | `CVV:\s*(\d{3,4})` | `"194"` |

`fullData` format stored in `CardInventory.fullData`: `{cardNumber}|{expMonth}|{expYear}|{cvv}`

Minimum valid message: must have `bin` + `cardNumber` + `cvv`. Otherwise bot replies *"❌ Message non reconnu."* and continues listening.

Source mapping:
- `Ameli` / `ameli` → `AMELI`
- `Amazon` / `amazon` → `AMAZON`
- `Mondial` / `mondial relay` → `MONDIAL_RELAY`
- anything else → `OTHER`

Level mapping (from Niveau field):
- Contains `GOLD` → `GOLD`
- Contains `PLATINUM` or `PREMIER` → `PLATINUM`
- Contains `BLACK` or `INFINITE` → `BLACK`
- Default → `CLASSIC`

Network fallback (if not in Niveau line): first digit of card number — `4`→VISA, `5`→MASTERCARD, `3`→AMEX.

---

## Session Management

- **Storage**: module-level `Map<telegramId, CardSession>` in the bot process (bot and backend share the same Node.js process on Railway)
- **Token format**: `addcards_${collabUserId}_${crypto.randomBytes(4).toString('hex')}` — valid once, consumed on `/start`
- **TTL**: 30 minutes from creation. Expired sessions are rejected with an error message.
- **CardSession shape**:
```ts
interface CardSession {
  collabUserId: number
  cards: ParsedCard[]
  createdAt: number // Date.now()
}

interface ParsedCard {
  bin: string; bank: string; level: string; network: string
  cardType: string; device: string; source: string
  fullData: string // "number|mm|yy|cvv"
}
```
- Sessions are deleted from the Map after confirmation or cancellation.

---

## Database Logic (on confirm)

For each unique BIN in the session:

1. Look for existing `Product` owned by this collab where `description` JSON contains `"bin": "<BIN>"`
2. **If found** → use that product, append `CardInventory` rows, update `stock`
3. **If not found** → create new `Product`:
   - `name`: `"{bank} {network} {level}"`
   - `description`: JSON with all parsed metadata
   - `price`: `0` (collab sets price later in mini app)
   - `collaboratorId`: collab's user id
   - `imageUrl`: `https://cardimages.imaginecurve.com/cards/{bin}.png`
4. Create `CardInventory` rows: one per card line with `fullData`
5. Recalculate and update `product.stock` = count of unsold cards for that product

After all BINs processed, trigger `matchAndDeliver` for each product id (fire-and-forget, existing logic).

---

## Backend Changes

### New route: `POST /api/collab/card-sessions`
- Auth: collab JWT required
- Creates a session token, stores in the shared `cardSessions` Map
- Returns `{ token: string, deepLink: string }`

### Shared session Map
- Lives in `backend/src/lib/cardSessions.ts`
- Exported Map + helper functions: `createSession`, `consumeSession`, `getSession`, `deleteSession`
- Imported by both the route and the bot handler

---

## Bot Changes (`backend/src/bot.ts`)

### New handlers:

1. **`/start addcards_TOKEN`** — consume token, activate session, greet
2. **Message handler** — if sender has active session: parse message, add card to session, reply with count + [Terminer] button
3. **Callback: `upload_done`** — show BIN summary + [Confirmer] [Annuler] buttons
4. **Callback: `upload_confirm`** — save to DB, reply success + mini app link
5. **Callback: `upload_cancel`** — delete session, reply cancelled

---

## Mini App Changes

### `CollabDashboard.tsx`
- Replace single "NOUVELLE CARTE" button with two options:
  - **"AJOUT MANUEL"** → existing `/collab/add` route
  - **"AJOUT VIA BOT"** → new `/collab/bot-upload` route

### New page: `CollabBotUpload.tsx`
- Calls `POST /api/collab/card-sessions` on mount
- Shows instructions: *"Forward tes cartes au bot ci-dessous"*
- Button **"Ouvrir le bot"** → opens `tg://resolve?domain=BOT_USERNAME&start=TOKEN` (or https fallback)
- Shows spinner while session is being created
- No confirmation needed in the mini app — everything happens in the bot

---

## Out of scope (this spec)
- Price configuration UI (will be addressed separately)
- Editing parsed cards before confirmation
- Bulk `.txt` file upload
