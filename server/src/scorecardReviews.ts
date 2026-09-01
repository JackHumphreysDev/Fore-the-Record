import type { ScorecardHoleData } from './courseScorecards.js'
import { isCompleteScorecard } from './courseScorecards.js'

export type ScorecardReviewDecision =
  | { action: 'REJECT' }
  | { action: 'APPROVE'; holes: ScorecardHoleData[] }

export class ScorecardReviewValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ScorecardReviewValidationError'
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function parseHole(value: unknown): ScorecardHoleData {
  if (
    !isRecord(value) ||
    typeof value.holeNumber !== 'number' ||
    !Number.isInteger(value.holeNumber) ||
    value.holeNumber < 1 ||
    value.holeNumber > 18 ||
    typeof value.par !== 'number' ||
    !Number.isInteger(value.par) ||
    value.par < 2 ||
    value.par > 7 ||
    typeof value.strokeIndex !== 'number' ||
    !Number.isInteger(value.strokeIndex) ||
    value.strokeIndex < 1 ||
    value.strokeIndex > 18 ||
    (value.yardage !== undefined &&
      value.yardage !== null &&
      (typeof value.yardage !== 'number' ||
        !Number.isInteger(value.yardage) ||
        value.yardage <= 0))
  ) {
    throw new ScorecardReviewValidationError(
      'Every hole needs a valid par and unique stroke index; yardage is optional.',
    )
  }

  return {
    holeNumber: value.holeNumber,
    par: value.par,
    strokeIndex: value.strokeIndex,
    ...(typeof value.yardage === 'number' ? { yardage: value.yardage } : {}),
  }
}

export function parseScorecardReviewDecision(
  value: unknown,
): ScorecardReviewDecision {
  if (!isRecord(value) || (value.action !== 'APPROVE' && value.action !== 'REJECT')) {
    throw new ScorecardReviewValidationError(
      'Choose whether to approve or reject this scorecard.',
    )
  }

  if (value.action === 'REJECT') {
    return { action: 'REJECT' }
  }

  if (!Array.isArray(value.holes)) {
    throw new ScorecardReviewValidationError(
      'A complete 18-hole scorecard is required for approval.',
    )
  }

  const holes = value.holes.map(parseHole).sort(
    (left, right) => left.holeNumber - right.holeNumber,
  )

  if (!isCompleteScorecard(holes)) {
    throw new ScorecardReviewValidationError(
      'The scorecard must contain holes 1–18 and each stroke index once.',
    )
  }

  return { action: 'APPROVE', holes }
}

export function scorecardWasAmended(
  submitted: readonly ScorecardHoleData[],
  approved: readonly ScorecardHoleData[],
): boolean {
  return approved.some((hole) => {
    const original = submitted.find(
      (candidate) => candidate.holeNumber === hole.holeNumber,
    )

    return (
      !original ||
      original.par !== hole.par ||
      original.strokeIndex !== hole.strokeIndex ||
      (original.yardage ?? null) !== (hole.yardage ?? null)
    )
  })
}
