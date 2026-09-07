-- Link an optional player support request to the round that needs correction.
-- SET NULL keeps the support conversation available if the round is deleted.
ALTER TABLE "Submission" ADD COLUMN "roundId" UUID;

CREATE INDEX "Submission_roundId_idx" ON "Submission"("roundId");

ALTER TABLE "Submission"
ADD CONSTRAINT "Submission_roundId_fkey"
FOREIGN KEY ("roundId") REFERENCES "Round"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
