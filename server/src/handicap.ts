const MAX_RECENT_ROUNDS = 20
const MAX_COUNTING_ROUNDS = 8

export type ScoreDifferentialInput = {
  adjustedGrossScore: number
  courseRating: number
  slopeRating: number
  pccAdjustment: number
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

  const averageDifferential =
    countingDifferentials.reduce(
      (total, scoreDifferential) => total + scoreDifferential,
      0,
    ) / countingDifferentials.length

  return roundToOneDecimal(averageDifferential)
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
