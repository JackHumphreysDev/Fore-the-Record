import { describe, expect, it } from 'vitest'
import {
  buildAdminSubmissionsPath,
  buildAdminSubmissionStatusPath,
  buildSubmissionMessagesPath,
  buildSubmissionsPath,
  isAdminSubmissionsResponse,
  isSubmission,
  isSubmissionMessage,
  isSubmissionMessagesResponse,
  isSubmissionStatusUpdate,
  isSubmissionsResponse,
} from './submissionApi.ts'

describe('submission paths', () => {
  it('should build a player pagination path', () => {
    expect(buildSubmissionsPath(2, 20)).toBe(
      '/api/submissions?page=2&pageSize=20',
    )
  })

  it('should build encoded administrator filters', () => {
    expect(
      buildAdminSubmissionsPath({
        search: '  login + email  ',
        status: 'NEW',
        type: 'ISSUE',
        page: 3,
        pageSize: 20,
      }),
    ).toBe(
      '/api/admin/submissions?search=login+%2B+email&status=NEW&type=ISSUE&page=3&pageSize=20',
    )
  })

  it('should build player and administrator conversation paths', () => {
    const submissionId = '11111111-1111-4111-8111-111111111111'

    expect(buildSubmissionMessagesPath(submissionId, false)).toBe(
      `/api/submissions/${submissionId}/messages`,
    )
    expect(buildSubmissionMessagesPath(submissionId, true)).toBe(
      `/api/admin/submissions/${submissionId}/messages`,
    )
    expect(buildAdminSubmissionStatusPath(submissionId)).toBe(
      `/api/admin/submissions/${submissionId}/status`,
    )
  })
})

describe('submission response validation', () => {
  const submission = {
    id: '11111111-1111-4111-8111-111111111111',
    type: 'MISSING_COURSE',
    status: 'NEW',
    subject: 'Missing local club',
    message: 'This club does not appear in course search.',
    clubName: 'Example Golf Club',
    townCounty: 'Sheffield',
    websiteUrl: 'https://example.com',
    courseName: null,
    teeDetails: null,
    createdAt: '2026-08-31T20:00:00.000Z',
    updatedAt: '2026-08-31T20:00:00.000Z',
  }

  it('should accept a complete submission', () => {
    expect(isSubmission(submission)).toBe(true)
  })

  it('should reject unsupported types and unsafe URLs', () => {
    expect(isSubmission({ ...submission, type: 'GENERAL' })).toBe(false)
    expect(
      isSubmission({ ...submission, websiteUrl: 'javascript:alert(1)' }),
    ).toBe(false)
  })

  it('should accept a player submissions page', () => {
    expect(
      isSubmissionsResponse({
        submissions: [submission],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    ).toBe(true)
  })

  it('should accept an administrator queue item with safe user identity', () => {
    expect(
      isAdminSubmissionsResponse({
        submissions: [
          {
            ...submission,
            user: {
              id: '22222222-2222-4222-8222-222222222222',
              name: 'Example Player',
              email: 'player@example.com',
            },
          },
        ],
        pagination: {
          page: 1,
          pageSize: 20,
          total: 1,
          totalPages: 1,
        },
      }),
    ).toBe(true)
  })

  it('should validate conversation messages and their sender role', () => {
    const message = {
      id: '33333333-3333-4333-8333-333333333333',
      body: 'Could you confirm which browser you used?',
      createdAt: '2026-08-31T21:00:00.000Z',
      sender: {
        id: '22222222-2222-4222-8222-222222222222',
        name: 'Site Administrator',
        role: 'ADMIN',
      },
    }

    expect(isSubmissionMessage(message)).toBe(true)
    expect(
      isSubmissionMessagesResponse({ messages: [message] }),
    ).toBe(true)
    expect(
      isSubmissionMessage({
        ...message,
        sender: { ...message.sender, role: 'OWNER' },
      }),
    ).toBe(false)
  })

  it('should validate a submission status update', () => {
    expect(
      isSubmissionStatusUpdate({
        id: submission.id,
        status: 'RESOLVED',
        updatedAt: '2026-08-31T21:15:00.000Z',
      }),
    ).toBe(true)
    expect(
      isSubmissionStatusUpdate({
        id: submission.id,
        status: 'WAITING',
        updatedAt: '2026-08-31T21:15:00.000Z',
      }),
    ).toBe(false)
  })
})
