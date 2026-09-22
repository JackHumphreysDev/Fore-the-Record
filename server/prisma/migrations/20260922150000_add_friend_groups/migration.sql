CREATE TABLE "FriendGroup" (
    "id" UUID NOT NULL,
    "ownerId" UUID NOT NULL,
    "name" VARCHAR(80) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "FriendGroup_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FriendGroupMember" (
    "groupId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "joinedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendGroupMember_pkey" PRIMARY KEY ("groupId", "userId")
);

CREATE INDEX "FriendGroup_ownerId_createdAt_idx" ON "FriendGroup"("ownerId", "createdAt");
CREATE INDEX "FriendGroupMember_userId_joinedAt_idx" ON "FriendGroupMember"("userId", "joinedAt");

ALTER TABLE "FriendGroup" ADD CONSTRAINT "FriendGroup_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendGroupMember" ADD CONSTRAINT "FriendGroupMember_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FriendGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendGroupMember" ADD CONSTRAINT "FriendGroupMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "FriendGroupMessage" (
    "id" UUID NOT NULL,
    "groupId" UUID NOT NULL,
    "authorId" UUID NOT NULL,
    "roundId" UUID,
    "body" VARCHAR(500) NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FriendGroupMessage_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "FriendGroupMessage_groupId_createdAt_idx" ON "FriendGroupMessage"("groupId", "createdAt");
CREATE INDEX "FriendGroupMessage_authorId_idx" ON "FriendGroupMessage"("authorId");
CREATE INDEX "FriendGroupMessage_roundId_idx" ON "FriendGroupMessage"("roundId");

ALTER TABLE "FriendGroupMessage" ADD CONSTRAINT "FriendGroupMessage_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "FriendGroup"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendGroupMessage" ADD CONSTRAINT "FriendGroupMessage_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FriendGroupMessage" ADD CONSTRAINT "FriendGroupMessage_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE SET NULL ON UPDATE CASCADE;
