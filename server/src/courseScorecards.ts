export type ScorecardHoleData = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage?: number | null
}

export type ProviderTeeScorecard = {
  teeExternalId?: string
  teeName: string
  courseRating?: number
  slopeRating?: number
  holes: ScorecardHoleData[]
}

export type TeeScorecardMatch = {
  holes: ScorecardHoleData[]
}

type TeeIdentity = {
  externalId?: string | null
  teeName: string
  courseRating: number
  slopeRating: number
}

const HOLES_IN_ROUND = 18
const providerScorecardCache = new Map<string, ProviderTeeScorecard[]>()

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function normalizeProviderHole(value: unknown): ScorecardHoleData | null {
  if (
    !isRecord(value) ||
    typeof value.hole_number !== 'number' ||
    !Number.isInteger(value.hole_number) ||
    value.hole_number < 1 ||
    value.hole_number > HOLES_IN_ROUND ||
    typeof value.par !== 'number' ||
    !Number.isInteger(value.par) ||
    value.par < 2 ||
    value.par > 7 ||
    typeof value.stroke_index !== 'number' ||
    !Number.isInteger(value.stroke_index) ||
    value.stroke_index < 1 ||
    value.stroke_index > HOLES_IN_ROUND
  ) {
    return null
  }

  if (
    value.yardage !== undefined &&
    value.yardage !== null &&
    (typeof value.yardage !== 'number' ||
      !Number.isInteger(value.yardage) ||
      value.yardage <= 0)
  ) {
    return null
  }

  return {
    holeNumber: value.hole_number,
    par: value.par,
    strokeIndex: value.stroke_index,
    ...(typeof value.yardage === 'number' ? { yardage: value.yardage } : {}),
  }
}

export function isCompleteScorecard(
  holes: readonly ScorecardHoleData[],
): boolean {
  return (
    holes.length === HOLES_IN_ROUND &&
    new Set(holes.map(({ holeNumber }) => holeNumber)).size ===
      HOLES_IN_ROUND &&
    new Set(holes.map(({ strokeIndex }) => strokeIndex)).size ===
      HOLES_IN_ROUND
  )
}

export function parseProviderScorecard(
  responseBody: unknown,
): ProviderTeeScorecard[] {
  const body =
    isRecord(responseBody) && isRecord(responseBody.data)
      ? responseBody.data
      : responseBody

  if (!isRecord(body) || !Array.isArray(body.tee_sets)) {
    return []
  }

  return body.tee_sets.flatMap((teeSet): ProviderTeeScorecard[] => {
    if (
      !isRecord(teeSet) ||
      typeof teeSet.name !== 'string' ||
      !Array.isArray(teeSet.holes)
    ) {
      return []
    }

    const holes = teeSet.holes
      .map(normalizeProviderHole)
      .filter((hole): hole is ScorecardHoleData => hole !== null)
      .sort((left, right) => left.holeNumber - right.holeNumber)

    if (!isCompleteScorecard(holes)) {
      return []
    }

    return [
      {
        ...(typeof teeSet.id === 'string'
          ? { teeExternalId: teeSet.id }
          : {}),
        teeName: teeSet.name,
        ...(typeof teeSet.course_rating === 'number'
          ? { courseRating: teeSet.course_rating }
          : {}),
        ...(typeof teeSet.slope_rating === 'number'
          ? { slopeRating: teeSet.slope_rating }
          : {}),
        holes,
      },
    ]
  })
}

function selectMatchingScorecard(
  scorecards: readonly ProviderTeeScorecard[],
  tee: TeeIdentity,
): ProviderTeeScorecard | null {
  if (tee.externalId) {
    const externalIdMatch = scorecards.find(
      (scorecard) => scorecard.teeExternalId === tee.externalId,
    )

    if (externalIdMatch) {
      return externalIdMatch
    }
  }

  const nameMatches = scorecards.filter(
    (scorecard) =>
      normalizeLabel(scorecard.teeName) === normalizeLabel(tee.teeName),
  )

  if (nameMatches.length === 1) {
    return nameMatches[0] ?? null
  }

  return (
    nameMatches.find(
      (scorecard) =>
        scorecard.courseRating === tee.courseRating &&
        scorecard.slopeRating === tee.slopeRating,
    ) ?? null
  )
}

export function clearCourseScorecardCache(): void {
  providerScorecardCache.clear()
}

export async function getProviderTeeScorecard(
  courseExternalId: string,
  tee: TeeIdentity,
): Promise<TeeScorecardMatch | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST

  if (!apiKey || !apiHost) {
    console.warn('RapidAPI configuration is incomplete for scorecard lookup')
    return null
  }

  let scorecards = providerScorecardCache.get(courseExternalId)

  if (!scorecards) {
    try {
      const url = new URL(
        `/courses/${encodeURIComponent(courseExternalId)}/scorecard`,
        `https://${apiHost}`,
      )
      const response = await fetch(url, {
        headers: {
          'X-RapidAPI-Key': apiKey,
          'X-RapidAPI-Host': apiHost,
        },
      })

      if (!response.ok) {
        console.warn(
          `RapidAPI returned ${response.status} for course scorecard ${courseExternalId}`,
        )
        return null
      }

      scorecards = parseProviderScorecard(await response.json())

      if (scorecards.length === 0) {
        return null
      }

      providerScorecardCache.set(courseExternalId, scorecards)
    } catch (error: unknown) {
      console.warn(
        `RapidAPI scorecard lookup failed for ${courseExternalId}`,
        error,
      )
      return null
    }
  }

  const match = selectMatchingScorecard(scorecards, tee)

  return match ? { holes: match.holes } : null
}
