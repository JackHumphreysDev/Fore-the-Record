export const SUBMISSION_TYPES = [
  'IDEA',
  'ISSUE',
  'DATA_CORRECTION',
  'MISSING_COURSE',
  'SCORECARD_REVIEW',
] as const

export const PLAYER_SUBMISSION_TYPES = SUBMISSION_TYPES.filter(
  (type) => type !== 'SCORECARD_REVIEW',
)

export const SUBMISSION_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'RESOLVED',
  'CLOSED',
] as const

export const ACTIVE_SUBMISSION_STATUSES = [
  'NEW',
  'IN_PROGRESS',
  'RESOLVED',
] as const

export type SubmissionType = (typeof SUBMISSION_TYPES)[number]
export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const SUBMISSION_TYPE_LABELS: Record<SubmissionType, string> = {
  IDEA: 'Idea or improvement',
  ISSUE: 'Problem with the site',
  DATA_CORRECTION: 'Incorrect information',
  MISSING_COURSE: 'Missing golf course',
  SCORECARD_REVIEW: 'Scorecard review',
}

export const SUBMISSION_STATUS_LABELS: Record<SubmissionStatus, string> = {
  NEW: 'New',
  IN_PROGRESS: 'In progress',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}

export type Submission = {
  id: string
  type: SubmissionType
  status: SubmissionStatus
  subject: string
  message: string
  clubName: string | null
  townCounty: string | null
  websiteUrl: string | null
  courseName: string | null
  teeDetails: string | null
  createdAt: string
  updatedAt: string
}

export type AdminSubmission = Submission & {
  user: {
    id: string
    name: string
    email: string
  }
}

type Pagination = {
  page: number
  pageSize: number
  total: number
  totalPages: number
}

export type SubmissionsResponse = {
  submissions: Submission[]
  pagination: Pagination
}

export type AdminSubmissionsResponse = {
  submissions: AdminSubmission[]
  pagination: Pagination
}

export type SubmissionMessage = {
  id: string
  body: string
  createdAt: string
  sender: {
    id: string
    name: string
    role: 'PLAYER' | 'ADMIN'
  }
}

export type SubmissionMessagesResponse = {
  messages: SubmissionMessage[]
}

export type SubmissionStatusUpdate = {
  id: string
  status: SubmissionStatus
  updatedAt: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string'
}

function isSubmissionType(value: unknown): value is SubmissionType {
  return (
    typeof value === 'string' &&
    SUBMISSION_TYPES.includes(value as SubmissionType)
  )
}

function isSubmissionStatus(value: unknown): value is SubmissionStatus {
  return (
    typeof value === 'string' &&
    SUBMISSION_STATUSES.includes(value as SubmissionStatus)
  )
}

function isSafeWebsiteUrl(value: unknown): value is string | null {
  if (value === null) {
    return true
  }

  if (typeof value !== 'string') {
    return false
  }

  try {
    const url = new URL(value)
    return url.protocol === 'http:' || url.protocol === 'https:'
  } catch {
    return false
  }
}

export function isSubmission(value: unknown): value is Submission {
  if (!isRecord(value)) {
    return false
  }

  const hasCourseIdentity =
    value.type !== 'MISSING_COURSE' ||
    (typeof value.clubName === 'string' &&
      typeof value.townCounty === 'string')

  return (
    typeof value.id === 'string' &&
    isSubmissionType(value.type) &&
    isSubmissionStatus(value.status) &&
    typeof value.subject === 'string' &&
    typeof value.message === 'string' &&
    isNullableString(value.clubName) &&
    isNullableString(value.townCounty) &&
    isSafeWebsiteUrl(value.websiteUrl) &&
    isNullableString(value.courseName) &&
    isNullableString(value.teeDetails) &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt)) &&
    hasCourseIdentity
  )
}

function isPagination(value: unknown): value is Pagination {
  return (
    isRecord(value) &&
    Number.isInteger(value.page) &&
    Number(value.page) > 0 &&
    Number.isInteger(value.pageSize) &&
    Number(value.pageSize) > 0 &&
    Number.isInteger(value.total) &&
    Number(value.total) >= 0 &&
    Number.isInteger(value.totalPages) &&
    Number(value.totalPages) >= 0
  )
}

export function isSubmissionsResponse(
  value: unknown,
): value is SubmissionsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isSubmission) &&
    isPagination(value.pagination)
  )
}

function isAdminSubmission(value: unknown): value is AdminSubmission {
  return (
    isSubmission(value) &&
    'user' in value &&
    isRecord(value.user) &&
    typeof value.user.id === 'string' &&
    typeof value.user.name === 'string' &&
    typeof value.user.email === 'string'
  )
}

export function isAdminSubmissionsResponse(
  value: unknown,
): value is AdminSubmissionsResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.submissions) &&
    value.submissions.every(isAdminSubmission) &&
    isPagination(value.pagination)
  )
}

export function isSubmissionMessage(
  value: unknown,
): value is SubmissionMessage {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.body === 'string' &&
    typeof value.createdAt === 'string' &&
    !Number.isNaN(Date.parse(value.createdAt)) &&
    isRecord(value.sender) &&
    typeof value.sender.id === 'string' &&
    typeof value.sender.name === 'string' &&
    (value.sender.role === 'PLAYER' || value.sender.role === 'ADMIN')
  )
}

export function isSubmissionMessagesResponse(
  value: unknown,
): value is SubmissionMessagesResponse {
  return (
    isRecord(value) &&
    Array.isArray(value.messages) &&
    value.messages.every(isSubmissionMessage)
  )
}

export function isSubmissionStatusUpdate(
  value: unknown,
): value is SubmissionStatusUpdate {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isSubmissionStatus(value.status) &&
    typeof value.updatedAt === 'string' &&
    !Number.isNaN(Date.parse(value.updatedAt))
  )
}

export function buildSubmissionsPath(page: number, pageSize: number): string {
  const parameters = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  })

  return `/api/submissions?${parameters.toString()}`
}

export function buildAdminSubmissionsPath(filters: {
  search: string
  status: SubmissionStatus | ''
  type: SubmissionType | ''
  page: number
  pageSize: number
}): string {
  const parameters = new URLSearchParams()
  const search = filters.search.trim()

  if (search) {
    parameters.set('search', search)
  }

  if (filters.status) {
    parameters.set('status', filters.status)
  }

  if (filters.type) {
    parameters.set('type', filters.type)
  }

  parameters.set('page', String(filters.page))
  parameters.set('pageSize', String(filters.pageSize))

  return `/api/admin/submissions?${parameters.toString()}`
}

export function buildSubmissionMessagesPath(
  submissionId: string,
  administrator: boolean,
): string {
  const prefix = administrator ? '/api/admin' : '/api'
  return `${prefix}/submissions/${encodeURIComponent(submissionId)}/messages`
}

export function buildAdminSubmissionStatusPath(
  submissionId: string,
): string {
  return `/api/admin/submissions/${encodeURIComponent(submissionId)}/status`
}
