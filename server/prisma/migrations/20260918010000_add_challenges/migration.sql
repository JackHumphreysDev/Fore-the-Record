CREATE TYPE "ChallengeMetric" AS ENUM ('ROUND_COUNT', 'STABLEFORD_POINTS', 'LOWEST_GROSS_SCORE');
CREATE TYPE "ChallengeStatus" AS ENUM ('PENDING', 'ACTIVE', 'DECLINED', 'CANCELLED');

CREATE TABLE "PlayerChallenge" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "creatorId" UUID NOT NULL,
  "opponentId" UUID NOT NULL,
  "metric" "ChallengeMetric" NOT NULL,
  "status" "ChallengeStatus" NOT NULL DEFAULT 'PENDING',
  "startsOn" DATE NOT NULL,
  "endsOn" DATE NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "PlayerChallenge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "PlayerChallenge_creatorId_fkey" FOREIGN KEY ("creatorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerChallenge_opponentId_fkey" FOREIGN KEY ("opponentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "PlayerChallenge_distinct_players" CHECK ("creatorId" <> "opponentId"),
  CONSTRAINT "PlayerChallenge_valid_dates" CHECK ("endsOn" >= "startsOn")
);

CREATE INDEX "PlayerChallenge_creatorId_status_endsOn_idx" ON "PlayerChallenge"("creatorId", "status", "endsOn");
CREATE INDEX "PlayerChallenge_opponentId_status_endsOn_idx" ON "PlayerChallenge"("opponentId", "status", "endsOn");
