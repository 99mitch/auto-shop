-- AlterTable
ALTER TABLE "Order" ADD COLUMN "payoutSplitSnapshot" TEXT;

-- AlterTable
ALTER TABLE "Product" ADD COLUMN "costEur" REAL;

-- CreateTable
CREATE TABLE "CollabWallet" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "CollabWallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_CollaboratorEarning" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "orderItemId" INTEGER NOT NULL,
    "collaboratorId" INTEGER NOT NULL,
    "amount" REAL NOT NULL,
    "platformFee" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CREDITED_OFFCHAIN',
    "currency" TEXT,
    "cryptoAmount" REAL,
    "txHash" TEXT,
    "walletAddress" TEXT,
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CollaboratorEarning_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "Order" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CollaboratorEarning_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "OrderItem" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "CollaboratorEarning_collaboratorId_fkey" FOREIGN KEY ("collaboratorId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_CollaboratorEarning" ("amount", "collaboratorId", "createdAt", "id", "orderId", "orderItemId", "platformFee") SELECT "amount", "collaboratorId", "createdAt", "id", "orderId", "orderItemId", "platformFee" FROM "CollaboratorEarning";
DROP TABLE "CollaboratorEarning";
ALTER TABLE "new_CollaboratorEarning" RENAME TO "CollaboratorEarning";
CREATE UNIQUE INDEX "CollaboratorEarning_orderItemId_key" ON "CollaboratorEarning"("orderItemId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "CollabWallet_userId_currency_key" ON "CollabWallet"("userId", "currency");
