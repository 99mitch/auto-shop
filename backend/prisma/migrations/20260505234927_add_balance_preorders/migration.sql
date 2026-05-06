-- DropIndex
DROP INDEX "DataOrder_userId_idx";

-- DropIndex
DROP INDEX "DataRecord_dateNaissance_idx";

-- DropIndex
DROP INDEX "DataRecord_department_idx";

-- DropIndex
DROP INDEX "DataRecord_gender_idx";

-- DropIndex
DROP INDEX "DataRecord_bank_idx";

-- DropIndex
DROP INDEX "DataRecord_inMaillist_idx";

-- DropIndex
DROP INDEX "DataRecord_inNumlist_idx";

-- DropIndex
DROP INDEX "DataRecord_inFiche_idx";

-- DropIndex
DROP INDEX "DataRecord_fileId_idx";

-- AlterTable
ALTER TABLE "DataOrder" ADD COLUMN "cryptoPaymentId" TEXT;

-- AlterTable
ALTER TABLE "Order" ADD COLUMN "cryptoPaymentId" TEXT;
ALTER TABLE "Order" ADD COLUMN "paymentMethod" TEXT;

-- CreateTable
CREATE TABLE "BalanceTopUp" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "paymentId" TEXT NOT NULL,
    "amount" REAL NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BalanceTopUp_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PreOrder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "bank" TEXT,
    "department" TEXT,
    "ageRange" TEXT,
    "bin" TEXT,
    "level" TEXT,
    "cardType" TEXT,
    "network" TEXT,
    "paymentMethod" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "pricePerCard" REAL NOT NULL,
    "total" REAL NOT NULL,
    "fulfilled" INTEGER NOT NULL DEFAULT 0,
    "cryptoPaymentId" TEXT,
    "cryptoPaid" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PreOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DataOrderFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "orderId" INTEGER NOT NULL,
    "fileType" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "partNumber" INTEGER,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataOrderFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DataOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DataOrderFile" ("content", "createdAt", "fileType", "filename", "id", "orderId", "partNumber") SELECT "content", "createdAt", "fileType", "filename", "id", "orderId", "partNumber" FROM "DataOrderFile";
DROP TABLE "DataOrderFile";
ALTER TABLE "new_DataOrderFile" RENAME TO "DataOrderFile";
CREATE TABLE "new_DataOrderRecord" (
    "orderId" INTEGER NOT NULL,
    "recordId" INTEGER NOT NULL,

    PRIMARY KEY ("orderId", "recordId"),
    CONSTRAINT "DataOrderRecord_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DataOrder" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "DataOrderRecord_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DataRecord" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_DataOrderRecord" ("orderId", "recordId") SELECT "orderId", "recordId" FROM "DataOrderRecord";
DROP TABLE "DataOrderRecord";
ALTER TABLE "new_DataOrderRecord" RENAME TO "DataOrderRecord";
CREATE TABLE "new_User" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "telegramId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT,
    "username" TEXT,
    "photoUrl" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "role" TEXT NOT NULL DEFAULT 'CUSTOMER',
    "balance" REAL NOT NULL DEFAULT 0
);
INSERT INTO "new_User" ("createdAt", "firstName", "id", "lastName", "photoUrl", "role", "telegramId", "username") SELECT "createdAt", "firstName", "id", "lastName", "photoUrl", "role", "telegramId", "username" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_telegramId_key" ON "User"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "BalanceTopUp_paymentId_key" ON "BalanceTopUp"("paymentId");

-- CreateIndex (DataFile_name_key already exists via autoindex, skip redefine)
-- CREATE UNIQUE INDEX "DataFile_name_key" ON "DataFile"("name");
