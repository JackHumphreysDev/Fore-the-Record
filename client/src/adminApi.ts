export type AdminRole = 'PLAYER' | 'ADMIN'

export type AdminIdentity = {
  id: string
  name: string
  email: string
  role: 'ADMIN'
}

export type AdminUser = {
  id: string
  name: string
  email: string
  role: AdminRole
  handicapIndex: number | null
  createdAt: string
  homeClub: {
    id: string
    name: string
  } | null
  roundCount: number
}

export type AdminOverview = {
  totals: {
    users: number
    rounds: number
    clubs: number
  }
  recentRegistrations: AdminUser[]
}

export type AdminUsersResponse = {
  users: AdminUser[]
  pagination: {
    page: number
    pageSize: number
    total: number
    totalPages: number
  }
}

export type AdminScorecardReviewHole = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage: number | null
}

export type AdminScorecardReview = {
  id: string
  createdAt: string
  submission: {
    id: string
    status: 'NEW' | 'IN_PROGRESS'
    user: { id: string; name: string; email: string }
  }
  tee: {
    id: string
    teeName: string
    courseRating: number
    slopeRating: number
    course: { name: string; club: { name: string } }
  }
  round: {
    id: string
    datePlayed: string
    grossScore: number
    scoreDifferential: number
    holeScores: Array<{ holeNumber: number; strokesTaken: number }>
  }
  holes: AdminScorecardReviewHole[]
}

export type AdminScorecardReviewsResponse = {
  reviews: AdminScorecardReview[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNonNegativeInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function isPositiveInteger(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) > 0
}

function isHomeClub(value: unknown): value is NonNullable<AdminUser['homeClub']> {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  )
}

function isAdminUser(value: unknown): value is AdminUser {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    (value.role === 'PLAYER' || value.role === 'ADMIN') &&
    (value.handicapIndex === null ||
      (typeof value.handicapIndex === 'number' &&
        Number.isFinite(value.handicapIndex))) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    (value.homeClub === null || isHomeClub(value.homeClub)) &&
    isNonNegativeInteger(value.roundCount)
  )
}

function isAdminScorecardReviewHole(
  value: unknown,
): value is AdminScorecardReviewHole {
  return (
    isRecord(value) &&
    Number.isInteger(value.holeNumber) &&
    Number.isInteger(value.par) &&
    Number.isInteger(value.strokeIndex) &&
    (value.yardage === null || Number.isInteger(value.yardage))
  )
}

function isAdminScorecardReview(
  value: unknown,
): value is AdminScorecardReview {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.createdAt === 'string' &&
    isRecord(value.submission) &&
    typeof value.submission.id === 'string' &&
    (value.submission.status === 'NEW' ||
      value.submission.status === 'IN_PROGRESS') &&
    isRecord(value.submission.user) &&
    typeof value.submission.user.id === 'string' &&
    typeof value.submission.user.name === 'string' &&
    typeof value.submission.user.email === 'string' &&
    isRecord(value.tee) &&
    typeof value.tee.id === 'string' &&
    typeof value.tee.teeName === 'string' &&
    typeof value.tee.courseRating === 'number' &&
    Number.isInteger(value.tee.slopeRating) &&
    isRecord(value.tee.course) &&
    typeof value.tee.course.name === 'string' &&
    isRecord(value.tee.course.club) &&
    typeof value.tee.course.club.name === 'string' &&
    isRecord(value.round) &&
    typeof value.round.id === 'string' &&
    typeof value.round.datePlayed === 'string' &&
    Number.isInteger(value.round.grossScore) &&
    typeof value.round.scoreDifferential === 'number' &&
    Array.isArray(value.round.holeScores) &&
    value.round.holeScores.length === 18 &&
    value.round.holeScores.every(
      (score) =>
        isRecord(score) &&
        Number.isInteger(score.holeNumber) &&
        Number.isInteger(score.strokesTaken),
    ) &&
    Array.isArray(value.holes) &&
    value.holes.length === 18 &&
    value.holes.every(isAdminScorecardReviewHole)
  )
}

export function isAdminIdentity(value: unknown): value is AdminIdentity {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.email === 'string' &&
    value.role === 'ADMIN'
  )
}

export function isAdminOverview(value: unknown): value is AdminOverview {
  if (
    !isRecord(value) ||
    !isRecord(value.totals) ||
    !Array.isArray(value.recentRegistrations)
  ) {
    return false
  }

  return (
    isNonNegativeInteger(value.totals.users) &&
    isNonNegativeInteger(value.totals.rounds) &&
    isNonNegativeInteger(value.totals.clubs) &&
    value.recentRegistrations.every(isAdminUser)
  )
}

export function isAdminUsersResponse(
  value: unknown,
): value is AdminUsersResponse {
  if (
    !isRecord(value) ||
    !Array.isArray(value.users) ||
    !isRecord(value.pagination)
  ) {
    return false
  }

  return (
    value.users.every(isAdminUser) &&
    isPositiveInteger(value.pagination.page) &&
    isPositiveInteger(value.pagination.pageSize) &&
    isNonNegativeInteger(value.pagination.total) &&
    isNonNegativeInteger(value.pagination.totalPages)
  )
}

export function isAdminScorecardReviewsResponse(
  value: unknown,
): value is AdminScorecardReviewsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.reviews) &&
    value.reviews.every(isAdminScorecardReview)
  )
}

export function buildAdminUsersPath(
  search: string,
  page: number,
  pageSize: number,
): string {
  const parameters = new URLSearchParams()
  const normalizedSearch = search.trim()

  if (normalizedSearch) {
    parameters.set('search', normalizedSearch)
  }

  parameters.set('page', String(page))
  parameters.set('pageSize', String(pageSize))

  return `/api/admin/users?${parameters.toString()}`
}
