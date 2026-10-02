CREATE TYPE "GroupRoundCardStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'GUEST');

ALTER TABLE "Round" ADD COLUMN "isPartial" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "GroupRoundCard" (
    "id" UUID NOT NULL,
    "hostRoundId" UUID NOT NULL,
    "friendId" UUID,
    "guestName" VARCHAR(80),
    "state" JSONB NOT NULL,
    "status" "GroupRoundCardStatus" NOT NULL DEFAULT 'PENDING',
    "approvedRoundId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "GroupRoundCard_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "GroupRoundCard_player_check" CHECK (
        ("friendId" IS NOT NULL AND "guestName" IS NULL) OR
        ("friendId" IS NULL AND "guestName" IS NOT NULL)
    )
);

CREATE UNIQUE INDEX "GroupRoundCard_approvedRoundId_key" ON "GroupRoundCard"("approvedRoundId");
CREATE UNIQUE INDEX "GroupRoundCard_hostRoundId_friendId_key" ON "GroupRoundCard"("hostRoundId", "friendId");
CREATE INDEX "GroupRoundCard_friendId_status_createdAt_idx" ON "GroupRoundCard"("friendId", "status", "createdAt");

ALTER TABLE "GroupRoundCard" ADD CONSTRAINT "GroupRoundCard_hostRoundId_fkey" FOREIGN KEY ("hostRoundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupRoundCard" ADD CONSTRAINT "GroupRoundCard_friendId_fkey" FOREIGN KEY ("friendId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroupRoundCard" ADD CONSTRAINT "GroupRoundCard_approvedRoundId_fkey" FOREIGN KEY ("approvedRoundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
