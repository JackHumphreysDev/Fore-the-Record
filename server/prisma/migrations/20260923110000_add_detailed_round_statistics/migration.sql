CREATE TYPE "FairwayResult" AS ENUM ('HIT', 'MISSED_LEFT', 'MISSED_RIGHT', 'NOT_APPLICABLE');
CREATE TYPE "UpAndDownResult" AS ENUM ('NOT_ATTEMPTED', 'SUCCESSFUL', 'UNSUCCESSFUL');

ALTER TABLE "HoleScore"
ADD COLUMN "putts" INTEGER,
ADD COLUMN "fairwayResult" "FairwayResult",
ADD COLUMN "greenInRegulation" BOOLEAN,
ADD COLUMN "penaltyStrokes" INTEGER,
ADD COLUMN "bunkerVisits" INTEGER,
ADD COLUMN "upAndDownResult" "UpAndDownResult";

ALTER TABLE "HoleScore"
ADD CONSTRAINT "HoleScore_putts_check" CHECK ("putts" IS NULL OR ("putts" >= 0 AND "putts" <= 9)),
ADD CONSTRAINT "HoleScore_penaltyStrokes_check" CHECK ("penaltyStrokes" IS NULL OR ("penaltyStrokes" >= 0 AND "penaltyStrokes" <= 9)),
ADD CONSTRAINT "HoleScore_bunkerVisits_check" CHECK ("bunkerVisits" IS NULL OR ("bunkerVisits" >= 0 AND "bunkerVisits" <= 9));
