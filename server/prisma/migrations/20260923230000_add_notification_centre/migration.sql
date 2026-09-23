CREATE TYPE "NotificationCategory" AS ENUM ('SOCIAL', 'SUPPORT', 'ROUND', 'GROUP', 'ACHIEVEMENT');
CREATE TYPE "NotificationAction" AS ENUM ('FRIENDS', 'SUPPORT', 'HISTORY', 'GROUPS', 'ACHIEVEMENTS');

CREATE TABLE "Notification" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "recipientId" UUID NOT NULL,
  "category" "NotificationCategory" NOT NULL,
  "eventType" VARCHAR(80) NOT NULL,
  "title" VARCHAR(120) NOT NULL,
  "message" VARCHAR(500) NOT NULL,
  "action" "NotificationAction" NOT NULL,
  "actionTargetId" VARCHAR(128),
  "dedupeKey" VARCHAR(220),
  "readAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Notification_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "Notification_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "Notification_dedupeKey_key" ON "Notification"("dedupeKey");
CREATE INDEX "Notification_recipientId_createdAt_idx" ON "Notification"("recipientId", "createdAt");
CREATE INDEX "Notification_recipientId_readAt_createdAt_idx" ON "Notification"("recipientId", "readAt", "createdAt");
CREATE INDEX "Notification_recipientId_category_createdAt_idx" ON "Notification"("recipientId", "category", "createdAt");
