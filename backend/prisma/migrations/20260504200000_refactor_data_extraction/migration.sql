-- Drop old data tables (destructive – real data will come from CSV import)
DROP TABLE IF EXISTS "DataRecord";
DROP TABLE IF EXISTS "DataFile";

-- New DataFile with column flags and per-category counts
CREATE TABLE "DataFile" (
  "id"            INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "name"          TEXT     NOT NULL UNIQUE,
  "uploadedAt"    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "hasNom"        BOOLEAN  NOT NULL DEFAULT false,
  "hasPrenom"     BOOLEAN  NOT NULL DEFAULT false,
  "hasNumero"     BOOLEAN  NOT NULL DEFAULT false,
  "hasDob"        BOOLEAN  NOT NULL DEFAULT false,
  "hasAdresse"    BOOLEAN  NOT NULL DEFAULT false,
  "hasCodePostal" BOOLEAN  NOT NULL DEFAULT false,
  "hasVille"      BOOLEAN  NOT NULL DEFAULT false,
  "hasEmail"      BOOLEAN  NOT NULL DEFAULT false,
  "hasIban"       BOOLEAN  NOT NULL DEFAULT false,
  "hasBic"        BOOLEAN  NOT NULL DEFAULT false,
  "ficheCount"    INTEGER  NOT NULL DEFAULT 0,
  "numlistCount"  INTEGER  NOT NULL DEFAULT 0,
  "maillistCount" INTEGER  NOT NULL DEFAULT 0
);

-- New DataRecord with all CSV fields + derived fields + extraction tracking
CREATE TABLE "DataRecord" (
  "id"                  INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "fileId"              INTEGER  NOT NULL,
  "nom"                 TEXT,
  "prenom"              TEXT,
  "numero"              TEXT,
  "dateNaissance"       TEXT,
  "adresse"             TEXT,
  "codePostal"          TEXT,
  "ville"               TEXT,
  "email"               TEXT,
  "iban"                TEXT,
  "bic"                 TEXT,
  "bank"                TEXT,
  "gender"              TEXT,
  "department"          TEXT,
  "inFiche"             BOOLEAN  NOT NULL DEFAULT false,
  "inNumlist"           BOOLEAN  NOT NULL DEFAULT false,
  "inMaillist"          BOOLEAN  NOT NULL DEFAULT false,
  "extractedAsFiche"    BOOLEAN  NOT NULL DEFAULT false,
  "extractedAsNumlist"  BOOLEAN  NOT NULL DEFAULT false,
  "extractedAsMaillist" BOOLEAN  NOT NULL DEFAULT false,
  "createdAt"           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataRecord_fileId_fkey" FOREIGN KEY ("fileId") REFERENCES "DataFile" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "DataRecord_fileId_idx"             ON "DataRecord"("fileId");
CREATE INDEX "DataRecord_inFiche_idx"            ON "DataRecord"("inFiche", "extractedAsFiche");
CREATE INDEX "DataRecord_inNumlist_idx"          ON "DataRecord"("inNumlist", "extractedAsNumlist");
CREATE INDEX "DataRecord_inMaillist_idx"         ON "DataRecord"("inMaillist", "extractedAsMaillist");
CREATE INDEX "DataRecord_bank_idx"               ON "DataRecord"("bank");
CREATE INDEX "DataRecord_gender_idx"             ON "DataRecord"("gender");
CREATE INDEX "DataRecord_department_idx"         ON "DataRecord"("department");
CREATE INDEX "DataRecord_dateNaissance_idx"      ON "DataRecord"("dateNaissance");

-- DataOrder: one extraction request = one order
CREATE TABLE "DataOrder" (
  "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "userId"    INTEGER  NOT NULL,
  "type"      TEXT     NOT NULL,
  "status"    TEXT     NOT NULL DEFAULT 'READY',
  "withNames" BOOLEAN  NOT NULL DEFAULT false,
  "lineCount" INTEGER  NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataOrder_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

CREATE INDEX "DataOrder_userId_idx" ON "DataOrder"("userId");

-- Join table: which records belong to which order
CREATE TABLE "DataOrderRecord" (
  "orderId"  INTEGER NOT NULL,
  "recordId" INTEGER NOT NULL,
  PRIMARY KEY ("orderId", "recordId"),
  CONSTRAINT "DataOrderRecord_orderId_fkey"  FOREIGN KEY ("orderId")  REFERENCES "DataOrder"  ("id") ON DELETE CASCADE,
  CONSTRAINT "DataOrderRecord_recordId_fkey" FOREIGN KEY ("recordId") REFERENCES "DataRecord" ("id") ON DELETE CASCADE
);

CREATE INDEX "DataOrderRecord_orderId_idx"  ON "DataOrderRecord"("orderId");
CREATE INDEX "DataOrderRecord_recordId_idx" ON "DataOrderRecord"("recordId");

-- Generated files attached to each order (RAW csv + SPECIAL txt)
CREATE TABLE "DataOrderFile" (
  "id"        INTEGER  NOT NULL PRIMARY KEY AUTOINCREMENT,
  "orderId"   INTEGER  NOT NULL,
  "fileType"  TEXT     NOT NULL,
  "filename"  TEXT     NOT NULL,
  "content"   TEXT     NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DataOrderFile_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "DataOrder" ("id") ON DELETE CASCADE
);

CREATE INDEX "DataOrderFile_orderId_idx" ON "DataOrderFile"("orderId");
