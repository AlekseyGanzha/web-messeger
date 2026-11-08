-- Rename duplicates that differ only by case or surrounding whitespace
WITH ranked AS (
    SELECT
        "id",
        row_number() OVER (
            PARTITION BY lower(btrim("username"))
            ORDER BY "createdAt" ASC, "id" ASC
        ) AS rn
    FROM "User"
)
UPDATE "User" AS u
SET "username" = btrim(u."username") || '_dup' || substr(u."id", 1, 8)
FROM ranked
WHERE u."id" = ranked."id"
  AND ranked.rn > 1;

-- Trim remaining usernames
UPDATE "User"
SET "username" = btrim("username")
WHERE "username" <> btrim("username");

-- Enforce uniqueness regardless of letter case
CREATE UNIQUE INDEX IF NOT EXISTS "User_username_lower_key" ON "User" (lower("username"));
