CREATE TYPE "GolfClubType" AS ENUM ('DRIVER', 'FAIRWAY_WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER', 'OTHER');

CREATE TABLE "GolfClub" (
  "id" UUID NOT NULL,
  "userId" UUID NOT NULL,
  "type" "GolfClubType" NOT NULL,
  "brand" VARCHAR(80),
  "model" VARCHAR(100),
  "nickname" VARCHAR(80),
  "loft" DECIMAL(4,1),
  "shaftFlex" VARCHAR(30),
  "carryDistanceYards" INTEGER,
  "sortOrder" INTEGER NOT NULL,
  "archivedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "GolfClub_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "GolfClub_loft_check" CHECK ("loft" IS NULL OR "loft" BETWEEN 0 AND 90),
  CONSTRAINT "GolfClub_carry_check" CHECK ("carryDistanceYards" IS NULL OR "carryDistanceYards" BETWEEN 1 AND 400),
  CONSTRAINT "GolfClub_sort_order_check" CHECK ("sortOrder" >= 0)
);

CREATE INDEX "GolfClub_userId_archivedAt_sortOrder_idx" ON "GolfClub"("userId", "archivedAt", "sortOrder");
ALTER TABLE "GolfClub" ADD CONSTRAINT "GolfClub_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
