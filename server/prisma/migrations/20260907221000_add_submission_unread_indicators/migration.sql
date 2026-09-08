-- Existing conversations start read; new activity sets the relevant flag.
ALTER TABLE "Submission"
ADD COLUMN "playerHasUnread" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "adminHasUnread" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "Submission_userId_playerHasUnread_idx"
ON "Submission"("userId", "playerHasUnread");

CREATE INDEX "Submission_adminHasUnread_idx"
ON "Submission"("adminHasUnread");
