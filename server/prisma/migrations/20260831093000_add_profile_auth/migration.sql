-- Existing profiles remain unlinked until their owner confirms the same email
-- address through Supabase Auth and completes the claim flow.
ALTER TABLE "User" ADD COLUMN "authUserId" UUID;

CREATE UNIQUE INDEX "User_authUserId_key" ON "User"("authUserId");
