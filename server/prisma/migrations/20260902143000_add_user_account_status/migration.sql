CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

ALTER TABLE "User"
ADD COLUMN "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "updatedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

CREATE INDEX "User_status_createdAt_idx"
ON "User"("status", "createdAt");
