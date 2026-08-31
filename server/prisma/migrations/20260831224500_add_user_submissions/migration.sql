CREATE TYPE "SubmissionType" AS ENUM (
    'IDEA',
    'ISSUE',
    'DATA_CORRECTION',
    'MISSING_COURSE'
);

CREATE TYPE "SubmissionStatus" AS ENUM (
    'NEW',
    'IN_PROGRESS',
    'RESOLVED',
    'CLOSED'
);

CREATE TABLE "Submission" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "SubmissionType" NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'NEW',
    "subject" VARCHAR(120) NOT NULL,
    "message" VARCHAR(2000) NOT NULL,
    "clubName" VARCHAR(160),
    "townCounty" VARCHAR(160),
    "websiteUrl" VARCHAR(500),
    "courseName" VARCHAR(160),
    "teeDetails" VARCHAR(1000),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Submission_userId_createdAt_idx"
ON "Submission"("userId", "createdAt");

CREATE INDEX "Submission_status_type_createdAt_idx"
ON "Submission"("status", "type", "createdAt");

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
