CREATE TABLE "UserCoursePreference" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "defaultTeeId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "UserCoursePreference_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserCoursePreference_userId_courseId_key"
ON "UserCoursePreference"("userId", "courseId");

CREATE INDEX "UserCoursePreference_userId_updatedAt_idx"
ON "UserCoursePreference"("userId", "updatedAt");

CREATE INDEX "UserCoursePreference_courseId_idx"
ON "UserCoursePreference"("courseId");

CREATE INDEX "UserCoursePreference_defaultTeeId_idx"
ON "UserCoursePreference"("defaultTeeId");

ALTER TABLE "UserCoursePreference"
ADD CONSTRAINT "UserCoursePreference_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCoursePreference"
ADD CONSTRAINT "UserCoursePreference_courseId_fkey"
FOREIGN KEY ("courseId") REFERENCES "Course"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserCoursePreference"
ADD CONSTRAINT "UserCoursePreference_defaultTeeId_fkey"
FOREIGN KEY ("defaultTeeId") REFERENCES "Tee"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
