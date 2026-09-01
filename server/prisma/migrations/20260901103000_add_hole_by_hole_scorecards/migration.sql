ALTER TYPE "SubmissionType" ADD VALUE 'SCORECARD_REVIEW';

CREATE TYPE "ScorecardSource" AS ENUM ('API', 'PLAYER_APPROVED', 'ADMIN');
CREATE TYPE "RoundScorecardStatus" AS ENUM ('VERIFIED', 'PENDING_REVIEW', 'REJECTED');

ALTER TABLE "Round"
ADD COLUMN "scorecardStatus" "RoundScorecardStatus" NOT NULL DEFAULT 'VERIFIED';

CREATE TABLE "TeeHole" (
    "id" UUID NOT NULL,
    "teeId" UUID NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "strokeIndex" INTEGER NOT NULL,
    "yardage" INTEGER,
    "source" "ScorecardSource" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "TeeHole_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScorecardReview" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "teeId" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "ScorecardReview_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ScorecardReviewHole" (
    "id" UUID NOT NULL,
    "scorecardReviewId" UUID NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "strokeIndex" INTEGER NOT NULL,
    "yardage" INTEGER,
    CONSTRAINT "ScorecardReviewHole_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TeeHole_teeId_holeNumber_key" ON "TeeHole"("teeId", "holeNumber");
CREATE INDEX "TeeHole_teeId_idx" ON "TeeHole"("teeId");
CREATE UNIQUE INDEX "ScorecardReview_submissionId_key" ON "ScorecardReview"("submissionId");
CREATE UNIQUE INDEX "ScorecardReview_roundId_key" ON "ScorecardReview"("roundId");
CREATE INDEX "ScorecardReview_teeId_createdAt_idx" ON "ScorecardReview"("teeId", "createdAt");
CREATE INDEX "ScorecardReview_reviewedById_reviewedAt_idx" ON "ScorecardReview"("reviewedById", "reviewedAt");
CREATE UNIQUE INDEX "ScorecardReviewHole_scorecardReviewId_holeNumber_key" ON "ScorecardReviewHole"("scorecardReviewId", "holeNumber");

ALTER TABLE "TeeHole" ADD CONSTRAINT "TeeHole_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "Tee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScorecardReview" ADD CONSTRAINT "ScorecardReview_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ScorecardReview" ADD CONSTRAINT "ScorecardReview_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "Tee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScorecardReview" ADD CONSTRAINT "ScorecardReview_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ScorecardReview" ADD CONSTRAINT "ScorecardReview_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ScorecardReviewHole" ADD CONSTRAINT "ScorecardReviewHole_scorecardReviewId_fkey" FOREIGN KEY ("scorecardReviewId") REFERENCES "ScorecardReview"("id") ON DELETE CASCADE ON UPDATE CASCADE;
