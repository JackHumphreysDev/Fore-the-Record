CREATE TYPE "RoundScoringFormat" AS ENUM ('STROKE_PLAY', 'STABLEFORD');

ALTER TABLE "Round"
ADD COLUMN "scoringFormat" "RoundScoringFormat" NOT NULL DEFAULT 'STROKE_PLAY',
ADD COLUMN "playingHandicap" INTEGER,
ADD COLUMN "stablefordPoints" INTEGER;

ALTER TABLE "HoleScore"
ADD COLUMN "pickedUp" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "Round"
ADD CONSTRAINT "Round_stableford_fields_check"
CHECK (
  ("scoringFormat" = 'STROKE_PLAY' AND "playingHandicap" IS NULL AND "stablefordPoints" IS NULL)
  OR
  ("scoringFormat" = 'STABLEFORD' AND "participation" = 'INDIVIDUAL' AND "playingHandicap" IS NOT NULL AND "stablefordPoints" IS NOT NULL)
);

ALTER TABLE "HoleScore"
ADD CONSTRAINT "HoleScore_picked_up_score_check"
CHECK (
  ("pickedUp" = false AND "strokesTaken" > 0)
  OR
  ("pickedUp" = true AND "strokesTaken" = 0)
);
