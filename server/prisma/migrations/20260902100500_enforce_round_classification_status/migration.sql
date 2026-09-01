-- The enum value is added by the preceding migration and committed before
-- this constraint uses it.
ALTER TABLE "Round"
ADD CONSTRAINT "Round_scorecard_status_by_participation_check" CHECK (
  ("participation" = 'TEAM' AND "scorecardStatus" = 'NOT_REQUIRED')
  OR
  ("participation" = 'INDIVIDUAL' AND "scorecardStatus" <> 'NOT_REQUIRED')
);
