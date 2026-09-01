ALTER TABLE "Club"
ADD COLUMN "externalId" UUID,
ADD COLUMN "city" VARCHAR(160),
ADD COLUMN "county" VARCHAR(160),
ADD COLUMN "postcode" VARCHAR(16),
ADD COLUMN "countryCode" VARCHAR(3),
ADD COLUMN "googleRating" DOUBLE PRECISION,
ADD COLUMN "clubType" VARCHAR(80),
ADD COLUMN "courseType" VARCHAR(80);

ALTER TABLE "Course"
ADD COLUMN "externalId" UUID,
ADD COLUMN "holes" INTEGER,
ADD COLUMN "par" INTEGER,
ADD COLUMN "designedBy" VARCHAR(200),
ADD COLUMN "yearOpened" VARCHAR(20);

ALTER TABLE "Tee"
ADD COLUMN "externalId" UUID,
ADD COLUMN "colour" VARCHAR(80),
ADD COLUMN "gender" VARCHAR(40),
ADD COLUMN "totalYardage" INTEGER,
ADD COLUMN "totalMetres" INTEGER;

CREATE UNIQUE INDEX "Club_externalId_key" ON "Club"("externalId");
CREATE UNIQUE INDEX "Course_externalId_key" ON "Course"("externalId");
CREATE UNIQUE INDEX "Tee_externalId_key" ON "Tee"("externalId");
CREATE INDEX "Club_name_idx" ON "Club"("name");
CREATE INDEX "Course_name_idx" ON "Course"("name");
CREATE INDEX "Course_clubId_name_idx" ON "Course"("clubId", "name");
CREATE INDEX "Tee_courseId_teeName_idx" ON "Tee"("courseId", "teeName");
