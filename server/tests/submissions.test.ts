import { describe, expect, it } from 'vitest'
import {
  parseSubmissionInput,
  SubmissionValidationError,
} from '../src/submissions.js'

describe('parseSubmissionInput', () => {
  it('should normalize a standard submission without course metadata', () => {
    expect(
      parseSubmissionInput({
        type: 'IDEA',
        subject: '  Add a yearly summary  ',
        message: '  It would be useful to compare each season.  ',
        clubName: 'Ignored club',
      }),
    ).toEqual({
      type: 'IDEA',
      subject: 'Add a yearly summary',
      message: 'It would be useful to compare each season.',
      clubName: null,
      townCounty: null,
      websiteUrl: null,
      courseName: null,
      teeDetails: null,
    })
  })

  it('should normalize structured missing-course details', () => {
    expect(
      parseSubmissionInput({
        type: 'MISSING_COURSE',
        subject: '  Missing local club  ',
        message: '  I cannot find this club in course search.  ',
        clubName: '  Example Golf Club  ',
        townCounty: '  Sheffield, South Yorkshire  ',
        websiteUrl: '  https://example.com/course  ',
        courseName: '  Championship Course  ',
        teeDetails: '  White tees: 6,500 yards  ',
      }),
    ).toEqual({
      type: 'MISSING_COURSE',
      subject: 'Missing local club',
      message: 'I cannot find this club in course search.',
      clubName: 'Example Golf Club',
      townCounty: 'Sheffield, South Yorkshire',
      websiteUrl: 'https://example.com/course',
      courseName: 'Championship Course',
      teeDetails: 'White tees: 6,500 yards',
    })
  })

  it('should reject an unsupported submission type', () => {
    expect(() =>
      parseSubmissionInput({
        type: 'GENERAL',
        subject: 'General message',
        message: 'This message has enough detail.',
      }),
    ).toThrow(
      new SubmissionValidationError('Choose a valid submission type'),
    )
  })

  it('should reject short subjects and messages', () => {
    expect(() =>
      parseSubmissionInput({
        type: 'ISSUE',
        subject: 'Bug',
        message: 'Too short',
      }),
    ).toThrow(
      new SubmissionValidationError(
        'Subject must be between 5 and 120 characters',
      ),
    )
  })

  it('should require identifying details for a missing course', () => {
    expect(() =>
      parseSubmissionInput({
        type: 'MISSING_COURSE',
        subject: 'Missing local club',
        message: 'I cannot find this club in course search.',
        clubName: 'Example Golf Club',
      }),
    ).toThrow(
      new SubmissionValidationError(
        'Town or county must be between 2 and 160 characters',
      ),
    )
  })

  it('should reject a non-web website URL', () => {
    expect(() =>
      parseSubmissionInput({
        type: 'MISSING_COURSE',
        subject: 'Missing local club',
        message: 'I cannot find this club in course search.',
        clubName: 'Example Golf Club',
        townCounty: 'Sheffield',
        websiteUrl: 'javascript:alert(1)',
      }),
    ).toThrow(
      new SubmissionValidationError(
        'Website must be a valid http or https URL',
      ),
    )
  })
})
