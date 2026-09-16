ALTER TABLE "Round"
ADD COLUMN "scorecardPhotoPath" VARCHAR(500),
ADD COLUMN "scorecardPhotoName" VARCHAR(255),
ADD COLUMN "scorecardPhotoMimeType" VARCHAR(50),
ADD COLUMN "scorecardPhotoSize" INTEGER,
ADD COLUMN "scorecardPhotoUploadedAt" TIMESTAMPTZ(3);

ALTER TABLE "Round"
ADD CONSTRAINT "Round_scorecardPhoto_metadata_check"
CHECK (
  ("scorecardPhotoPath" IS NULL
    AND "scorecardPhotoName" IS NULL
    AND "scorecardPhotoMimeType" IS NULL
    AND "scorecardPhotoSize" IS NULL
    AND "scorecardPhotoUploadedAt" IS NULL)
  OR
  ("scorecardPhotoPath" IS NOT NULL
    AND "scorecardPhotoName" IS NOT NULL
    AND "scorecardPhotoMimeType" IS NOT NULL
    AND "scorecardPhotoSize" IS NOT NULL
    AND "scorecardPhotoSize" > 0
    AND "scorecardPhotoUploadedAt" IS NOT NULL)
);
