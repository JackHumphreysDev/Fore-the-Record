ALTER TABLE "RoundPlayingPartner"
ADD COLUMN "result" "RoundGameResult",
ADD COLUMN "tagRemovedAt" TIMESTAMPTZ(3);

CREATE TABLE "RoundGuestPlayer" (
  "id" UUID NOT NULL,
  "roundId" UUID NOT NULL,
  "name" VARCHAR(80) NOT NULL,
  "normalizedName" VARCHAR(80) NOT NULL,
  "result" "RoundGameResult",
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "RoundGuestPlayer_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "RoundGuestPlayer_roundId_fkey"
    FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

INSERT INTO "RoundGuestPlayer" ("id", "roundId", "name", "normalizedName")
SELECT gen_random_uuid(), round."id", guest.name, LOWER(guest.name)
FROM "Round" round
CROSS JOIN LATERAL UNNEST(round."guestPlayerNames") AS guest(name)
ON CONFLICT DO NOTHING;

CREATE UNIQUE INDEX "RoundGuestPlayer_roundId_normalizedName_key"
ON "RoundGuestPlayer"("roundId", "normalizedName");

CREATE INDEX "RoundGuestPlayer_normalizedName_idx"
ON "RoundGuestPlayer"("normalizedName");
