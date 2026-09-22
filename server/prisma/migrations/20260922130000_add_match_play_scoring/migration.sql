ALTER TABLE "Round"
ADD COLUMN "matchPlayOpponentName" VARCHAR(80),
ADD COLUMN "matchPlayFinalScore" VARCHAR(20),
ADD COLUMN "matchPlayHoles" JSONB;
