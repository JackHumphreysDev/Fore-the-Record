CREATE TYPE "NineHoleSegment" AS ENUM ('FRONT_NINE', 'BACK_NINE');

ALTER TABLE "Tee"
ADD COLUMN "frontNineCourseRating" DECIMAL(4,1),
ADD COLUMN "frontNineSlopeRating" INTEGER,
ADD COLUMN "backNineCourseRating" DECIMAL(4,1),
ADD COLUMN "backNineSlopeRating" INTEGER;

ALTER TABLE "Round"
ADD COLUMN "holeCount" INTEGER NOT NULL DEFAULT 18,
ADD COLUMN "nineHoleSegment" "NineHoleSegment";

ALTER TABLE "Tee"
ADD CONSTRAINT "Tee_front_nine_rating_pair_check"
CHECK (("frontNineCourseRating" IS NULL) = ("frontNineSlopeRating" IS NULL)),
ADD CONSTRAINT "Tee_back_nine_rating_pair_check"
CHECK (("backNineCourseRating" IS NULL) = ("backNineSlopeRating" IS NULL));

ALTER TABLE "Round"
ADD CONSTRAINT "Round_hole_count_segment_check"
CHECK (
  ("holeCount" = 18 AND "nineHoleSegment" IS NULL)
  OR
  ("holeCount" = 9 AND "nineHoleSegment" IS NOT NULL AND "participation" = 'INDIVIDUAL')
);
