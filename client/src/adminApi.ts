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
