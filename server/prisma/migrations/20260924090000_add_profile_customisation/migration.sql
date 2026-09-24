ALTER TABLE "User"
  ADD COLUMN "showProfileToFriends" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "bio" VARCHAR(280),
  ADD COLUMN "location" VARCHAR(100),
  ADD COLUMN "profileImagePath" VARCHAR(500),
  ADD COLUMN "profileImageName" VARCHAR(255),
  ADD COLUMN "profileImageMimeType" VARCHAR(100),
  ADD COLUMN "profileImageSize" INTEGER,
  ADD COLUMN "profileImageUploadedAt" TIMESTAMPTZ(3);

ALTER TABLE "User"
  ADD CONSTRAINT "User_profileImageSize_check"
  CHECK ("profileImageSize" IS NULL OR "profileImageSize" > 0);

ALTER TABLE "User"
  ADD CONSTRAINT "User_profileImageMetadata_check"
  CHECK (
    ("profileImagePath" IS NULL AND "profileImageName" IS NULL AND "profileImageMimeType" IS NULL AND "profileImageSize" IS NULL AND "profileImageUploadedAt" IS NULL)
    OR
    ("profileImagePath" IS NOT NULL AND "profileImageName" IS NOT NULL AND "profileImageMimeType" IS NOT NULL AND "profileImageSize" IS NOT NULL AND "profileImageUploadedAt" IS NOT NULL)
  );
