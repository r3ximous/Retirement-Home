PRAGMA foreign_keys=OFF;
PRAGMA defer_foreign_keys=ON;

BEGIN TRANSACTION;

CREATE TABLE "new_UserProfile" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "phone" TEXT,
  "email" TEXT,
  "passwordHash" TEXT,
  "fullName" TEXT NOT NULL,
  "pointsBalance" INTEGER NOT NULL DEFAULT 1240,
  "tierLevel" TEXT NOT NULL DEFAULT 'Gold',
  "streakCount" INTEGER NOT NULL DEFAULT 3,
  "lastOrderAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastGachaAt" DATETIME,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO "new_UserProfile" (
  "id", "phone", "email", "passwordHash", "fullName", "pointsBalance",
  "tierLevel", "streakCount", "lastOrderAt", "lastGachaAt", "createdAt"
)
SELECT
  lower(
    hex(randomblob(4)) || '-' ||
    hex(randomblob(2)) || '-4' ||
    substr(hex(randomblob(2)), 2) || '-' ||
    substr('89ab', (random() & 3) + 1, 1) ||
    substr(hex(randomblob(2)), 2) || '-' ||
    hex(randomblob(6))
  ),
  "phone", NULL, NULL, "fullName", "pointsBalance", "tierLevel",
  "streakCount", "lastOrderAt", "lastGachaAt", "createdAt"
FROM "UserProfile";

CREATE TABLE "new_Order" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "queueNumber" INTEGER NOT NULL,
  "customerId" TEXT,
  "customerPhone" TEXT,
  "itemsJson" TEXT NOT NULL,
  "totalAmount" REAL NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'Pending',
  "timeslot" DATETIME,
  "isPaid" BOOLEAN NOT NULL DEFAULT false,
  "stripeSessionId" TEXT,
  "pointsAwarded" INTEGER NOT NULL DEFAULT 0,
  "smsSent" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" DATETIME NOT NULL,
  CONSTRAINT "Order_customerId_fkey"
    FOREIGN KEY ("customerId") REFERENCES "UserProfile" ("id")
    ON DELETE SET NULL ON UPDATE CASCADE
);

INSERT INTO "new_Order" (
  "id", "queueNumber", "customerId", "customerPhone", "itemsJson",
  "totalAmount", "status", "timeslot", "isPaid", "stripeSessionId",
  "pointsAwarded", "smsSent", "createdAt", "updatedAt"
)
SELECT
  o."id", o."queueNumber", u."id", o."customerPhone", o."itemsJson",
  o."totalAmount", o."status", o."timeslot", o."isPaid", o."stripeSessionId",
  o."pointsAwarded", o."smsSent", o."createdAt", o."updatedAt"
FROM "Order" o
LEFT JOIN "new_UserProfile" u ON u."phone" = o."customerPhone";

CREATE TABLE "new_GachaReward" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "userId" TEXT NOT NULL,
  "rewardType" TEXT NOT NULL,
  "rewardLabel" TEXT NOT NULL,
  "isClaimed" BOOLEAN NOT NULL DEFAULT false,
  "unlockedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "pullSeed" INTEGER NOT NULL,
  CONSTRAINT "GachaReward_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_GachaReward" (
  "id", "userId", "rewardType", "rewardLabel", "isClaimed", "unlockedAt", "pullSeed"
)
SELECT
  g."id", u."id", g."rewardType", g."rewardLabel", g."isClaimed",
  g."unlockedAt", g."pullSeed"
FROM "GachaReward" g
JOIN "new_UserProfile" u ON u."phone" = g."phone";

CREATE TABLE "new_EventRSVP" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "eventId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EventRSVP_eventId_fkey"
    FOREIGN KEY ("eventId") REFERENCES "ClubEvent" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "EventRSVP_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "UserProfile" ("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
);

INSERT INTO "new_EventRSVP" ("id", "eventId", "userId", "createdAt")
SELECT r."id", r."eventId", u."id", r."createdAt"
FROM "EventRSVP" r
JOIN "new_UserProfile" u ON u."phone" = r."phone";

DROP TABLE "EventRSVP";
DROP TABLE "GachaReward";
DROP TABLE "Order";
DROP TABLE "UserProfile";

ALTER TABLE "new_UserProfile" RENAME TO "UserProfile";
ALTER TABLE "new_Order" RENAME TO "Order";
ALTER TABLE "new_GachaReward" RENAME TO "GachaReward";
ALTER TABLE "new_EventRSVP" RENAME TO "EventRSVP";

CREATE UNIQUE INDEX "UserProfile_phone_key" ON "UserProfile"("phone");
CREATE UNIQUE INDEX "UserProfile_email_key" ON "UserProfile"("email");
CREATE UNIQUE INDEX "Order_queueNumber_key" ON "Order"("queueNumber");
CREATE UNIQUE INDEX "Order_stripeSessionId_key" ON "Order"("stripeSessionId");
CREATE INDEX "Order_status_timeslot_idx" ON "Order"("status", "timeslot");
CREATE INDEX "Order_status_createdAt_idx" ON "Order"("status", "createdAt");
CREATE UNIQUE INDEX "EventRSVP_eventId_userId_key" ON "EventRSVP"("eventId", "userId");

COMMIT;

PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
