const MAX_RECENT_ROUNDS = 20
const MAX_COUNTING_ROUNDS = 8
const STANDARD_SLOPE_RATING = 113
const HOLES_IN_ROUND = 18
const MAX_HANDICAP_STROKES_PER_HOLE = 3

export type AdjustedGrossScoreInput = {
  grossScore: number
  holeScores?: readonly AdjustedGrossScoreHoleInput[]
}

export type AdjustedGrossScoreHoleInput = {
  par: number
  strokesTaken: number
  handicapStrokesReceived: number
}

export type AdjustedGrossScoreResult = {
  adjustedGrossScore: number
  isCapped: boolean
}

export type ScoreDifferentialInput = {
  adjustedGrossScore: number
  courseRating: number
  slopeRating: number
  pccAdjustment: number
}

export type CourseHandicapInput = {
  handicapIndex: number
  slopeRating: number
  courseRating: number
  par: number
}

export type HandicapRoundInput = {
  id: string
  datePlayed: Date | string
  scoreDifferential: number
  isAcceptable: boolean
}

export type HandicapCalculation = {
  handicapIndex: number | null
  consideredRoundIds: string[]
  usedRoundIds: string[]
}

export function calculateAdjustedGrossScore({
  grossScore,
  holeScores,
}: AdjustedGrossScoreInput): AdjustedGrossScoreResult {
  if (!holeScores?.length) {
    return {
      adjustedGrossScore: grossScore,
      isCapped: false,
    }
  }

  const adjustedHoles = holeScores.map(
    ({ par, strokesTaken, handicapStrokesReceived }) => {
      const maximumHoleScore = par + 2 + handicapStrokesReceived
      const adjustedHoleScore = Math.min(strokesTaken, maximumHoleScore)

      return {
        adjustedHoleScore,
        isCapped: adjustedHoleScore < strokesTaken,
      }
    },
  )

  return {
    adjustedGrossScore: adjustedHoles.reduce(
      (total, hole) => total + hole.adjustedHoleScore,
      0,
    ),
    isCapped: adjustedHoles.some((hole) => hole.isCapped),
  }
}

function roundToOneDecimal(value: number): number {
  const roundedValue =
    (Math.sign(value) * Math.round(Math.abs(value) * 10 + Number.EPSILON)) / 10

  return Object.is(roundedValue, -0) ? 0 : roundedValue
}

function assertFiniteNumber(value: number, fieldName: string): void {
  if (!Number.isFinite(value)) {
    throw new RangeError(`${fieldName} must be a finite number`)
  }
}

function roundToWholeNumber(value: number): number {
  const roundedValue = Math.sign(value) * Math.round(Math.abs(value))

  return Object.is(roundedValue, -0) ? 0 : roundedValue
}

/**
 * Converts a Handicap Index into the Course Handicap used to allocate
 * strokes across the scorecard for Net Double Bogey adjustment.
 */
export function calculateCourseHandicap({
  handicapIndex,
  slopeRating,
  courseRating,
  par,
}: CourseHandicapInput): number {
  assertFiniteNumber(handicapIndex, 'handicapIndex')
  assertFiniteNumber(slopeRating, 'slopeRating')
  assertFiniteNumber(courseRating, 'courseRating')
  assertFiniteNumber(par, 'par')

  if (slopeRating <= 0) {
    throw new RangeError('slopeRating must be greater than zero')
  }

  if (courseRating <= 0) {
    throw new RangeError('courseRating must be greater than zero')
  }

  if (par <= 0) {
    throw new RangeError('par must be greater than zero')
  }

  return roundToWholeNumber(
    handicapIndex * (slopeRating / STANDARD_SLOPE_RATING) +
      (courseRating - par),
  )
}

/**
 * Allocates Course Handicap strokes using the hole's stroke index. Plus
 * handicaps return negative values on holes where a stroke is given back.
 * Three received strokes caps the maximum hole score at par + 5.
 */
export function calculateHandicapStrokesReceived(
  courseHandicap: number,
  strokeIndex: number,
): number {
  if (!Number.isInteger(courseHandicap)) {
    throw new RangeError('courseHandicap must be an integer')
  }

  if (
    !Number.isInteger(strokeIndex) ||
    strokeIndex < 1 ||
    strokeIndex > HOLES_IN_ROUND
  ) {
    throw new RangeError('strokeIndex must be an integer from 1 to 18')
  }

  const handicapStrokes = Math.floor(
    (courseHandicap + HOLES_IN_ROUND - strokeIndex) / HOLES_IN_ROUND,
  )

  return Math.min(handicapStrokes, MAX_HANDICAP_STROKES_PER_HOLE)
}

export function calculateScoreDifferential({
  adjustedGrossScore,
  courseRating,
  slopeRating,
  pccAdjustment,
}: ScoreDifferentialInput): number {
  assertFiniteNumber(adjustedGrossScore, 'adjustedGrossScore')
  assertFiniteNumber(courseRating, 'courseRating')
  assertFiniteNumber(slopeRating, 'slopeRating')
  assertFiniteNumber(pccAdjustment, 'pccAdjustment')

  if (adjustedGrossScore < 0) {
    throw new RangeError('adjustedGrossScore must not be negative')
  }

  if (courseRating <= 0) {
    throw new RangeError('courseRating must be greater than zero')
  }

  if (slopeRating <= 0) {
    throw new RangeError('slopeRating must be greater than zero')
  }

  const differential =
    (113 / slopeRating) *
    (adjustedGrossScore - courseRating - pccAdjustment)

  return roundToOneDecimal(differential)
}

/**
 * Averages the lowest eight score differentials in the supplied calculation
 * window. The caller is responsible for providing no more than the latest 20
 * acceptable differentials.
 */
export function calculateHandicapIndex(
  scoreDifferentials: readonly number[],
): number | null {
  scoreDifferentials.forEach((scoreDifferential) => {
    assertFiniteNumber(scoreDifferential, 'scoreDifferential')
  })

  const countingDifferentials = [...scoreDifferentials]
    .sort((left, right) => left - right)
    .slice(0, MAX_COUNTING_ROUNDS)

  if (countingDifferentials.length === 0) {
    return null
  }

  const totalDifferentialTenths = countingDifferentials.reduce(
    (total, scoreDifferential) =>
      total + Math.round(scoreDifferential * 10),
    0,
  )
  const handicapIndex =
    Math.trunc(totalDifferentialTenths / countingDifferentials.length) / 10

  return Object.is(handicapIndex, -0) ? 0 : handicapIndex
}

function getDatePlayedTimestamp(round: HandicapRoundInput): number {
  const timestamp = new Date(round.datePlayed).getTime()

  if (!Number.isFinite(timestamp)) {
    throw new RangeError(`datePlayed must be valid for round ${round.id}`)
  }

  return timestamp
}

/**
 * Applies the product's simplified handicap rule: consider the latest 20
 * acceptable rounds, then use the lowest 8 score differentials available.
 */
export function calculateHandicap(
  rounds: readonly HandicapRoundInput[],
): HandicapCalculation {
  const acceptableRounds = rounds
    .filter((round) => round.isAcceptable)
    .map((round, originalIndex) => {
      assertFiniteNumber(
        round.scoreDifferential,
        `scoreDifferential for round ${round.id}`,
      )

      return {
        round,
        originalIndex,
        datePlayedTimestamp: getDatePlayedTimestamp(round),
      }
    })
    .sort(
      (left, right) =>
        right.datePlayedTimestamp - left.datePlayedTimestamp ||
        left.originalIndex - right.originalIndex,
    )
    .slice(0, MAX_RECENT_ROUNDS)

  const countingRounds = [...acceptableRounds]
    .sort(
      (left, right) =>
        left.round.scoreDifferential - right.round.scoreDifferential ||
        right.datePlayedTimestamp - left.datePlayedTimestamp ||
        left.originalIndex - right.originalIndex,
    )
    .slice(0, MAX_COUNTING_ROUNDS)

  if (countingRounds.length === 0) {
    return {
      handicapIndex: null,
      consideredRoundIds: [],
      usedRoundIds: [],
    }
  }

  return {
    handicapIndex: calculateHandicapIndex(
      countingRounds.map(({ round }) => round.scoreDifferential),
    ),
    consideredRoundIds: acceptableRounds.map(({ round }) => round.id),
    usedRoundIds: countingRounds.map(({ round }) => round.id),
  }
}
