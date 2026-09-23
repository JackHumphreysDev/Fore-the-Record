export type ReviewSeason = 'ALL' | 'WINTER' | 'SPRING' | 'SUMMER' | 'AUTUMN'

export type NotableReviewRound = {
  roundId: string
  value: number
  datePlayed: string
  clubName: string
  courseName: string
  teeName: string
}

export type PeriodReview = {
  year: number
  season: ReviewSeason
  roundsPlayed: number
  holesPlayed: number
  totalShots: number
  yardsCovered: number
  eagles: number
  birdies: number
  pars: number
  bogeys: number
  handicap: { startingIndex: number | null; endingIndex: number | null; change: number | null }
  mostPlayedCourse: { courseId: string; clubName: string; courseName: string; rounds: number } | null
  notableRounds: {
    lowestGross: NotableReviewRound | null
    highestStableford: NotableReviewRound | null
    bestDifferential: NotableReviewRound | null
  }
}

export type SeasonYearReviewsResponse = {
  options: {
    years: number[]
    seasons: Array<{ id: ReviewSeason; name: string; months: string }>
  }
  selected: { year: number; season: ReviewSeason }
  review: PeriodReview
  previous: PeriodReview
}

function object(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function count(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function nullableNumber(value: unknown): value is number | null {
  return value === null || typeof value === 'number' && Number.isFinite(value)
}

function season(value: unknown): value is ReviewSeason {
  return ['ALL', 'WINTER', 'SPRING', 'SUMMER', 'AUTUMN'].includes(String(value))
}

function notable(value: unknown): value is NotableReviewRound | null {
  return value === null || object(value) && typeof value.roundId === 'string' &&
    typeof value.value === 'number' && /^\d{4}-\d{2}-\d{2}$/.test(String(value.datePlayed)) &&
    typeof value.clubName === 'string' && typeof value.courseName === 'string' && typeof value.teeName === 'string'
}

function period(value: unknown): value is PeriodReview {
  if (!object(value) || !object(value.handicap) || !object(value.notableRounds)) return false
  const mostPlayed = value.mostPlayedCourse
  return Number.isInteger(value.year) && season(value.season) && count(value.roundsPlayed) &&
    count(value.holesPlayed) && count(value.totalShots) && count(value.yardsCovered) &&
    count(value.eagles) && count(value.birdies) && count(value.pars) && count(value.bogeys) &&
    nullableNumber(value.handicap.startingIndex) && nullableNumber(value.handicap.endingIndex) && nullableNumber(value.handicap.change) &&
    (mostPlayed === null || object(mostPlayed) && typeof mostPlayed.courseId === 'string' &&
      typeof mostPlayed.clubName === 'string' && typeof mostPlayed.courseName === 'string' && count(mostPlayed.rounds)) &&
    notable(value.notableRounds.lowestGross) && notable(value.notableRounds.highestStableford) && notable(value.notableRounds.bestDifferential)
}

export function isSeasonYearReviewsResponse(value: unknown): value is SeasonYearReviewsResponse {
  if (!object(value) || !object(value.options) || !object(value.selected) || !period(value.review) || !period(value.previous)) return false
  return Array.isArray(value.options.years) && value.options.years.every((year) => Number.isInteger(year)) &&
    Array.isArray(value.options.seasons) && value.options.seasons.every((item) => object(item) && season(item.id) && typeof item.name === 'string' && typeof item.months === 'string') &&
    Number.isInteger(value.selected.year) && season(value.selected.season) &&
    value.review.year === value.selected.year && value.review.season === value.selected.season &&
    value.previous.year === Number(value.selected.year) - 1 && value.previous.season === value.selected.season
}

export function buildSeasonYearReviewsPath(year: number | null, selectedSeason: ReviewSeason): string {
  const params = new URLSearchParams()
  if (year !== null) params.set('year', String(year))
  params.set('season', selectedSeason)
  return `/api/users/me/season-year-reviews?${params.toString()}`
}
