-- Record-only cards have no aggregate score or handicap differential. Keep the
-- existing requirements for completed individual rounds.
ALTER TABLE "Round"
DROP CONSTRAINT "Round_individual_score_check",
ADD CONSTRAINT "Round_individual_score_check" CHECK (
  "participation" <> 'INDIVIDUAL'
  OR (
    "isPartial" = true
    AND "grossScore" IS NULL
    AND "adjustedGrossScore" IS NULL
    AND "scoreDifferential" IS NULL
    AND "isAcceptable" = false
    AND "usedInHandicapCalc" = false
  )
  OR (
    "isPartial" = false
    AND "grossScore" IS NOT NULL
    AND "adjustedGrossScore" IS NOT NULL
    AND "weatherCondition" IS NOT NULL
    AND "scoreDifferential" IS NOT NULL
  )
),
DROP CONSTRAINT "Round_scorecard_status_by_participation_check",
ADD CONSTRAINT "Round_scorecard_status_by_participation_check" CHECK (
  ("participation" = 'TEAM' AND "scorecardStatus" = 'NOT_REQUIRED')
  OR ("participation" = 'INDIVIDUAL' AND "isPartial" = true AND "scorecardStatus" = 'NOT_REQUIRED')
  OR ("participation" = 'INDIVIDUAL' AND "isPartial" = false AND "scorecardStatus" <> 'NOT_REQUIRED')
),
DROP CONSTRAINT "Round_stableford_fields_check",
ADD CONSTRAINT "Round_stableford_fields_check" CHECK (
  ("scoringFormat" = 'STROKE_PLAY' AND "playingHandicap" IS NULL AND "stablefordPoints" IS NULL)
  OR (
    "scoringFormat" = 'STABLEFORD'
    AND "participation" = 'INDIVIDUAL'
    AND (("isPartial" = false AND "playingHandicap" IS NOT NULL AND "stablefordPoints" IS NOT NULL)
      OR ("isPartial" = true AND "stablefordPoints" IS NULL))
  )
);
