CREATE TABLE "LiveRoundDraft" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teeId" UUID NOT NULL,
    "state" JSONB NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "LiveRoundDraft_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "LiveRoundDraft_userId_key" ON "LiveRoundDraft"("userId");
CREATE INDEX "LiveRoundDraft_teeId_idx" ON "LiveRoundDraft"("teeId");

ALTER TABLE "LiveRoundDraft"
ADD CONSTRAINT "LiveRoundDraft_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "LiveRoundDraft"
ADD CONSTRAINT "LiveRoundDraft_teeId_fkey"
FOREIGN KEY ("teeId") REFERENCES "Tee"("id") ON DELETE CASCADE ON UPDATE CASCADE;
