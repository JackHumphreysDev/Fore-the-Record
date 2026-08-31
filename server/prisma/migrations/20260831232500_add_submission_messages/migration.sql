CREATE TABLE "SubmissionMessage" (
    "id" UUID NOT NULL,
    "submissionId" UUID NOT NULL,
    "senderUserId" UUID NOT NULL,
    "body" VARCHAR(2000) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SubmissionMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SubmissionMessage_submissionId_createdAt_idx"
ON "SubmissionMessage"("submissionId", "createdAt");

CREATE INDEX "SubmissionMessage_senderUserId_createdAt_idx"
ON "SubmissionMessage"("senderUserId", "createdAt");

ALTER TABLE "SubmissionMessage"
ADD CONSTRAINT "SubmissionMessage_submissionId_fkey"
FOREIGN KEY ("submissionId") REFERENCES "Submission"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "SubmissionMessage"
ADD CONSTRAINT "SubmissionMessage_senderUserId_fkey"
FOREIGN KEY ("senderUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
