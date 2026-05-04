-- Set admin role for the main admin user (telegramId: 1396143328)
-- Safe to run multiple times (no-op if already set)
UPDATE "User" SET "role" = 'ADMIN' WHERE "telegramId" = '1396143328' AND "role" != 'ADMIN';
