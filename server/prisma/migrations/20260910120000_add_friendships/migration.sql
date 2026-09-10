CREATE TYPE "FriendshipStatus" AS ENUM ('PENDING', 'ACCEPTED');

CREATE TABLE "Friendship" (
    "id" UUID NOT NULL,
    "pairKey" VARCHAR(73) NOT NULL,
    "requesterId" UUID NOT NULL,
    "addresseeId" UUID NOT NULL,
    "status" "FriendshipStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "Friendship_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "Friendship_no_self_request" CHECK ("requesterId" <> "addresseeId")
);

CREATE UNIQUE INDEX "Friendship_pairKey_key" ON "Friendship"("pairKey");
CREATE INDEX "Friendship_requesterId_status_updatedAt_idx" ON "Friendship"("requesterId", "status", "updatedAt");
CREATE INDEX "Friendship_addresseeId_status_updatedAt_idx" ON "Friendship"("addresseeId", "status", "updatedAt");

ALTER TABLE "Friendship"
ADD CONSTRAINT "Friendship_requesterId_fkey"
FOREIGN KEY ("requesterId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Friendship"
ADD CONSTRAINT "Friendship_addresseeId_fkey"
FOREIGN KEY ("addresseeId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
