CREATE TYPE "RoundCategory" AS ENUM ('CASUAL', 'COMPETITION');
CREATE TYPE "RoundParticipation" AS ENUM ('INDIVIDUAL', 'TEAM');

ALTER TYPE "RoundScorecardStatus" ADD VALUE 'NOT_REQUIRED';

ALTER TABLE "Round"
ADD COLUMN "timePlayed" VARCHAR(5),
ADD COLUMN "category" "RoundCategory" NOT NULL DEFAULT 'CASUAL',
ADD COLUMN "participation" "RoundParticipation" NOT NULL DEFAULT 'INDIVIDUAL',
ADD COLUMN "competitionName" VARCHAR(120),
ADD COLUMN "competitionFormat" VARCHAR(100),
ADD COLUMN "numberOfPlayers" INTEGER,
ALTER COLUMN "grossScore" DROP NOT NULL,
ALTER COLUMN "adjustedGrossScore" DROP NOT NULL,
ALTER COLUMN "weatherCondition" DROP NOT NULL,
ALTER COLUMN "scoreDifferential" DROP NOT NULL;

ALTER TABLE "Round"
ADD CONSTRAINT "Round_competition_details_check" CHECK (
  ("category" = 'CASUAL'
    AND "participation" = 'INDIVIDUAL'
    AND "competitionName" IS NULL
    AND "competitionFormat" IS NULL
    AND "numberOfPlayers" IS NULL)
  OR
  ("category" = 'COMPETITION'
    AND "competitionName" IS NOT NULL
    AND char_length(btrim("competitionName")) BETWEEN 2 AND 120
    AND "competitionFormat" IS NOT NULL
    AND char_length(btrim("competitionFormat")) BETWEEN 2 AND 100
    AND "numberOfPlayers" IS NOT NULL
    AND "numberOfPlayers" BETWEEN 1 AND 10000)
),
ADD CONSTRAINT "Round_team_record_only_check" CHECK (
  "participation" <> 'TEAM'
  OR (
    "category" = 'COMPETITION'
    AND "timePlayed" IS NOT NULL
    AND "grossScore" IS NULL
    AND "adjustedGrossScore" IS NULL
    AND "weatherCondition" IS NULL
    AND "scoreDifferential" IS NULL
    AND "isAcceptable" = false
    AND "usedInHandicapCalc" = false
  )
),
ADD CONSTRAINT "Round_individual_score_check" CHECK (
  "participation" <> 'INDIVIDUAL'
  OR (
    "grossScore" IS NOT NULL
    AND "adjustedGrossScore" IS NOT NULL
    AND "weatherCondition" IS NOT NULL
    AND "scoreDifferential" IS NOT NULL
  )
),
ADD CONSTRAINT "Round_time_played_check" CHECK (
  "timePlayed" IS NULL OR "timePlayed" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
);

CREATE INDEX "Round_userId_category_participation_datePlayed_idx"
ON "Round"("userId", "category", "participation", "datePlayed");
