-- Every profile starts as a player. Administrative access must be granted
-- through the controlled, audited promotion command.
CREATE TYPE "UserRole" AS ENUM ('PLAYER', 'ADMIN');

ALTER TABLE "User"
ADD COLUMN "role" "UserRole" NOT NULL DEFAULT 'PLAYER';

-- Administrative changes are recorded separately from application data so
-- the actor, target, and safe before/after state remain reviewable.
CREATE TABLE "AdminAuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID NOT NULL,
    "action" VARCHAR(80) NOT NULL,
    "targetType" VARCHAR(80) NOT NULL,
    "targetId" VARCHAR(128),
    "before" JSONB,
    "after" JSONB,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditLog_actorUserId_createdAt_idx"
ON "AdminAuditLog"("actorUserId", "createdAt");

CREATE INDEX "AdminAuditLog_targetType_targetId_idx"
ON "AdminAuditLog"("targetType", "targetId");

ALTER TABLE "AdminAuditLog"
ADD CONSTRAINT "AdminAuditLog_actorUserId_fkey"
FOREIGN KEY ("actorUserId") REFERENCES "User"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
