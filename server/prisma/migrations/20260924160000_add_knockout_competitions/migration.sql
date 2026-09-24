CREATE TYPE "KnockoutCompetitionStatus" AS ENUM ('INVITING', 'ACTIVE', 'COMPLETED', 'CANCELLED');
CREATE TYPE "KnockoutParticipantStatus" AS ENUM ('INVITED', 'ACCEPTED', 'DECLINED');
CREATE TYPE "KnockoutMatchStatus" AS ENUM ('WAITING', 'READY', 'COMPLETED');

CREATE TABLE "KnockoutCompetition" (
  "id" UUID NOT NULL,
  "organizerId" UUID NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "status" "KnockoutCompetitionStatus" NOT NULL DEFAULT 'INVITING',
  "championId" UUID,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "KnockoutCompetition_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "KnockoutParticipant" (
  "competitionId" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "status" "KnockoutParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "seed" INTEGER NOT NULL,
  "respondedAt" TIMESTAMPTZ(3),
  CONSTRAINT "KnockoutParticipant_pkey" PRIMARY KEY ("competitionId", "userId")
);

CREATE TABLE "KnockoutMatch" (
  "id" UUID NOT NULL,
  "competitionId" UUID NOT NULL,
  "roundNumber" INTEGER NOT NULL,
  "position" INTEGER NOT NULL,
  "playerOneId" UUID,
  "playerTwoId" UUID,
  "winnerId" UUID,
  "status" "KnockoutMatchStatus" NOT NULL DEFAULT 'WAITING',
  "winningMargin" INTEGER,
  "holesRemaining" INTEGER,
  "resultLabel" VARCHAR(40),
  "completedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "KnockoutMatch_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "KnockoutMatch_margin_check" CHECK ("winningMargin" IS NULL OR "winningMargin" BETWEEN 1 AND 18),
  CONSTRAINT "KnockoutMatch_holes_remaining_check" CHECK ("holesRemaining" IS NULL OR "holesRemaining" BETWEEN 0 AND 17)
);

CREATE INDEX "KnockoutCompetition_organizerId_createdAt_idx" ON "KnockoutCompetition"("organizerId", "createdAt");
CREATE INDEX "KnockoutCompetition_status_updatedAt_idx" ON "KnockoutCompetition"("status", "updatedAt");
CREATE UNIQUE INDEX "KnockoutParticipant_competitionId_seed_key" ON "KnockoutParticipant"("competitionId", "seed");
CREATE INDEX "KnockoutParticipant_userId_status_idx" ON "KnockoutParticipant"("userId", "status");
CREATE UNIQUE INDEX "KnockoutMatch_competitionId_roundNumber_position_key" ON "KnockoutMatch"("competitionId", "roundNumber", "position");
CREATE INDEX "KnockoutMatch_playerOneId_status_idx" ON "KnockoutMatch"("playerOneId", "status");
CREATE INDEX "KnockoutMatch_playerTwoId_status_idx" ON "KnockoutMatch"("playerTwoId", "status");

ALTER TABLE "KnockoutCompetition" ADD CONSTRAINT "KnockoutCompetition_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnockoutCompetition" ADD CONSTRAINT "KnockoutCompetition_championId_fkey" FOREIGN KEY ("championId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnockoutParticipant" ADD CONSTRAINT "KnockoutParticipant_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "KnockoutCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnockoutParticipant" ADD CONSTRAINT "KnockoutParticipant_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnockoutMatch" ADD CONSTRAINT "KnockoutMatch_competitionId_fkey" FOREIGN KEY ("competitionId") REFERENCES "KnockoutCompetition"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "KnockoutMatch" ADD CONSTRAINT "KnockoutMatch_playerOneId_fkey" FOREIGN KEY ("playerOneId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnockoutMatch" ADD CONSTRAINT "KnockoutMatch_playerTwoId_fkey" FOREIGN KEY ("playerTwoId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "KnockoutMatch" ADD CONSTRAINT "KnockoutMatch_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
