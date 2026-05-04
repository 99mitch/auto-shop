-- CreateTable
CREATE TABLE "DataFile" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "uploadedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "DataRecord" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "fileId" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "gender" TEXT,
    "dob" TEXT,
    "department" TEXT,
    "bank" TEXT,
    "rawData" TEXT NOT NULL DEFAULT '{}',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DataRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DataFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "DataRecord_fileId_idx" ON "DataRecord"("fileId");
CREATE INDEX "DataRecord_type_idx" ON "DataRecord"("type");
CREATE INDEX "DataRecord_gender_idx" ON "DataRecord"("gender");
CREATE INDEX "DataRecord_dob_idx" ON "DataRecord"("dob");
CREATE INDEX "DataRecord_department_idx" ON "DataRecord"("department");
CREATE INDEX "DataRecord_bank_idx" ON "DataRecord"("bank");
