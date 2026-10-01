ALTER TABLE "Round" ADD COLUMN "sourceLiveRoundDraftId" UUID;
CREATE UNIQUE INDEX "Round_sourceLiveRoundDraftId_key" ON "Round"("sourceLiveRoundDraftId");
