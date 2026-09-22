CREATE TABLE "RoundShare" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "roundId" UUID NOT NULL,
  "recipientId" UUID NOT NULL,
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoundShare_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoundShare_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "RoundShare_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "RoundShare_roundId_recipientId_key" ON "RoundShare"("roundId", "recipientId");
CREATE INDEX "RoundShare_recipientId_createdAt_idx" ON "RoundShare"("recipientId", "createdAt");
