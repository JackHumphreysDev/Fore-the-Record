CREATE TYPE "PlayerGoalType" AS ENUM (
    'HANDICAP_INDEX',
    'LOWEST_GROSS_SCORE',
    'ROUNDS_PLAYED',
    'BIRDIES',
    'PARS'
);

CREATE TABLE "PlayerGoal" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "PlayerGoalType" NOT NULL,
    "targetValue" DECIMAL(6,1) NOT NULL,
    "targetDate" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,
    CONSTRAINT "PlayerGoal_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PlayerGoal_userId_type_key"
ON "PlayerGoal"("userId", "type");

CREATE INDEX "PlayerGoal_userId_updatedAt_idx"
ON "PlayerGoal"("userId", "updatedAt");

ALTER TABLE "PlayerGoal"
ADD CONSTRAINT "PlayerGoal_userId_fkey"
FOREIGN KEY ("userId") REFERENCES "User"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
