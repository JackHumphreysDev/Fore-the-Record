-- Fore the Record currently has one site owner. This partial unique index
-- allows any number of players but no more than one administrator.
CREATE UNIQUE INDEX "User_single_admin_role_key"
ON "User"("role")
WHERE "role" = 'ADMIN';
