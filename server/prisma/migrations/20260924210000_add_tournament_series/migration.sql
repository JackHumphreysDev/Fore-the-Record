CREATE TYPE "TournamentSeriesStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

CREATE TABLE "TournamentSeries" (
  "id" UUID NOT NULL, "organizerId" UUID NOT NULL, "name" VARCHAR(100) NOT NULL,
  "description" VARCHAR(500), "status" "TournamentSeriesStatus" NOT NULL DEFAULT 'DRAFT',
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "TournamentSeries_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TournamentSeriesMember" (
  "seriesId" UUID NOT NULL, "userId" UUID NOT NULL, "status" "KnockoutParticipantStatus" NOT NULL DEFAULT 'INVITED',
  "respondedAt" TIMESTAMPTZ(3), CONSTRAINT "TournamentSeriesMember_pkey" PRIMARY KEY ("seriesId", "userId")
);
CREATE TABLE "TournamentSeriesEvent" (
  "id" UUID NOT NULL, "seriesId" UUID NOT NULL, "name" VARCHAR(100) NOT NULL, "playedOn" DATE NOT NULL,
  "course" VARCHAR(160), "notes" VARCHAR(500), "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL, CONSTRAINT "TournamentSeriesEvent_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "TournamentSeriesResult" (
  "eventId" UUID NOT NULL, "seriesId" UUID NOT NULL, "userId" UUID NOT NULL, "position" INTEGER NOT NULL,
  "points" DECIMAL(7,2) NOT NULL, CONSTRAINT "TournamentSeriesResult_pkey" PRIMARY KEY ("eventId", "userId"),
  CONSTRAINT "TournamentSeriesResult_position_check" CHECK ("position" > 0),
  CONSTRAINT "TournamentSeriesResult_points_check" CHECK ("points" >= 0)
);
CREATE INDEX "TournamentSeries_organizerId_createdAt_idx" ON "TournamentSeries"("organizerId", "createdAt");
CREATE INDEX "TournamentSeries_status_updatedAt_idx" ON "TournamentSeries"("status", "updatedAt");
CREATE INDEX "TournamentSeriesMember_userId_status_idx" ON "TournamentSeriesMember"("userId", "status");
CREATE INDEX "TournamentSeriesEvent_seriesId_playedOn_idx" ON "TournamentSeriesEvent"("seriesId", "playedOn");
CREATE INDEX "TournamentSeriesResult_seriesId_userId_idx" ON "TournamentSeriesResult"("seriesId", "userId");
ALTER TABLE "TournamentSeries" ADD CONSTRAINT "TournamentSeries_organizerId_fkey" FOREIGN KEY ("organizerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSeriesMember" ADD CONSTRAINT "TournamentSeriesMember_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TournamentSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSeriesMember" ADD CONSTRAINT "TournamentSeriesMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSeriesEvent" ADD CONSTRAINT "TournamentSeriesEvent_seriesId_fkey" FOREIGN KEY ("seriesId") REFERENCES "TournamentSeries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSeriesResult" ADD CONSTRAINT "TournamentSeriesResult_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "TournamentSeriesEvent"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "TournamentSeriesResult" ADD CONSTRAINT "TournamentSeriesResult_seriesId_userId_fkey" FOREIGN KEY ("seriesId", "userId") REFERENCES "TournamentSeriesMember"("seriesId", "userId") ON DELETE CASCADE ON UPDATE CASCADE;
