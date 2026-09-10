ALTER TABLE "User"
ADD COLUMN "profileDiscoverable" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "friendRequestsEnabled" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN "showHandicapToFriends" BOOLEAN NOT NULL DEFAULT true;
