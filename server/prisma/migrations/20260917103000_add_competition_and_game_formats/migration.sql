ALTER TYPE "RoundCategory" ADD VALUE 'SOCIAL_GAME';

CREATE TYPE "RoundGameResult" AS ENUM ('WON', 'LOST', 'TIED');

ALTER TABLE "Round"
ADD COLUMN "gameFormat" VARCHAR(100),
ADD COLUMN "gameResult" "RoundGameResult",
ADD COLUMN "guestPlayerNames" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "RoundPlayingPartner" (
  "id" UUID NOT NULL,
  "roundId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoundPlayingPartner_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoundPlayingPartner_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoundPlayingPartner_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoundPlayingPartner_roundId_userId_key"
ON "RoundPlayingPartner"("roundId", "userId");

CREATE INDEX "RoundPlayingPartner_userId_createdAt_idx"
ON "RoundPlayingPartner"("userId", "createdAt");
