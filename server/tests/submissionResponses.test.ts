import { describe, expect, it } from 'vitest'
import {
  parseSubmissionMessageInput,
  parseSubmissionStatusInput,
  SubmissionResponseValidationError,
} from '../src/submissionResponses.js'

describe('parseSubmissionMessageInput', () => {
  it('should trim a valid reply', () => {
    expect(
      parseSubmissionMessageInput({
        message: '  Could you confirm which browser you used?  ',
      }),
    ).toEqual({
      body: 'Could you confirm which browser you used?',
    })
  })

  it('should reject an empty reply', () => {
    expect(() => parseSubmissionMessageInput({ message: '   ' })).toThrow(
      new SubmissionResponseValidationError(
        'Reply must be between 2 and 2000 characters',
      ),
    )
  })

  it('should reject an oversized reply', () => {
    expect(() =>
      parseSubmissionMessageInput({ message: 'a'.repeat(2001) }),
    ).toThrow(
      new SubmissionResponseValidationError(
        'Reply must be between 2 and 2000 characters',
      ),
    )
  })
})

describe('parseSubmissionStatusInput', () => {
  it('should accept a supported status', () => {
    expect(parseSubmissionStatusInput({ status: 'RESOLVED' })).toEqual({
      status: 'RESOLVED',
    })
  })

  it('should reject an unsupported status', () => {
    expect(() =>
      parseSubmissionStatusInput({ status: 'WAITING_FOR_PLAYER' }),
    ).toThrow(
      new SubmissionResponseValidationError('Choose a valid status'),
    )
  })
})
