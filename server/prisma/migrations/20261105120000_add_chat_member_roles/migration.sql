-- CreateEnum
CREATE TYPE "ChatRole" AS ENUM ('OWNER', 'MEMBER');

-- AlterTable
ALTER TABLE "ChatMember" ADD COLUMN "role" "ChatRole" NOT NULL DEFAULT 'MEMBER';

-- Backfill: the earliest joined member of every existing group becomes its owner
UPDATE "ChatMember" AS cm
SET "role" = 'OWNER'
FROM (
    SELECT DISTINCT ON ("chatId") "id"
    FROM "ChatMember"
    ORDER BY "chatId", "joinedAt" ASC, "id" ASC
) AS first_member
WHERE cm."id" = first_member."id"
  AND cm."chatId" IN (SELECT "id" FROM "Chat" WHERE "isGroup" = true);
