-- CreateEnum
CREATE TYPE "TeeSource" AS ENUM ('api', 'fallback_scrape', 'manual');

-- CreateEnum
CREATE TYPE "WeatherCondition" AS ENUM ('DRY', 'MOIST', 'WET', 'SUPER_WET');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "homeClubId" UUID,
    "handicapIndex" DECIMAL(4,1),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Club" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,

    CONSTRAINT "Club_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Course" (
    "id" UUID NOT NULL,
    "clubId" UUID NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Course_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tee" (
    "id" UUID NOT NULL,
    "courseId" UUID NOT NULL,
    "teeName" TEXT NOT NULL,
    "courseRating" DECIMAL(4,1) NOT NULL,
    "slopeRating" INTEGER NOT NULL,
    "par" INTEGER,
    "source" "TeeSource" NOT NULL,

    CONSTRAINT "Tee_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "teeId" UUID NOT NULL,
    "datePlayed" DATE NOT NULL,
    "grossScore" INTEGER NOT NULL,
    "adjustedGrossScore" INTEGER NOT NULL,
    "isCapped" BOOLEAN NOT NULL DEFAULT false,
    "weatherCondition" "WeatherCondition" NOT NULL,
    "pccAdjustment" DECIMAL(2,1) NOT NULL DEFAULT 0,
    "scoreDifferential" DECIMAL(4,1) NOT NULL,
    "isAcceptable" BOOLEAN NOT NULL,
    "usedInHandicapCalc" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HoleScore" (
    "id" UUID NOT NULL,
    "roundId" UUID NOT NULL,
    "holeNumber" INTEGER NOT NULL,
    "par" INTEGER NOT NULL,
    "strokeIndex" INTEGER NOT NULL,
    "strokesTaken" INTEGER NOT NULL,

    CONSTRAINT "HoleScore_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "HoleScore_roundId_holeNumber_key" ON "HoleScore"("roundId", "holeNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_homeClubId_fkey" FOREIGN KEY ("homeClubId") REFERENCES "Club"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Course" ADD CONSTRAINT "Course_clubId_fkey" FOREIGN KEY ("clubId") REFERENCES "Club"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tee" ADD CONSTRAINT "Tee_courseId_fkey" FOREIGN KEY ("courseId") REFERENCES "Course"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Round" ADD CONSTRAINT "Round_teeId_fkey" FOREIGN KEY ("teeId") REFERENCES "Tee"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HoleScore" ADD CONSTRAINT "HoleScore_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE CASCADE ON UPDATE CASCADE;
