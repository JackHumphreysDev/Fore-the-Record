import { describe, expect, it } from 'vitest'
import {
  AdminCatalogueValidationError,
  parseAdminClubInput,
  parseAdminCourseInput,
  parseAdminScorecardInput,
  parseAdminTeeInput,
  parseCatalogueDeleteConfirmation,
} from '../src/adminCatalogue.js'

describe('admin catalogue validation', () => {
  it('normalizes club, course, and tee details', () => {
    expect(parseAdminClubInput({ name: '  Example   Golf Club ', countryCode: 'eng' })).toMatchObject({ name: 'Example Golf Club', countryCode: 'ENG' })
    expect(parseAdminCourseInput({ name: ' Main Course ', holes: 18, par: 72 })).toMatchObject({ name: 'Main Course', holes: 18, par: 72 })
    expect(parseAdminTeeInput({ teeName: ' White ', courseRating: 72.4, slopeRating: 128 })).toMatchObject({ teeName: 'White', courseRating: 72.4, slopeRating: 128 })
  })

  it('rejects invalid ratings and country codes', () => {
    expect(() => parseAdminClubInput({ name: 'Example Club', countryCode: 'USA' })).toThrow(new AdminCatalogueValidationError('Country code must be ENG, SCO, WAL, or NIR'))
    expect(() => parseAdminTeeInput({ teeName: 'White', courseRating: 72, slopeRating: 200 })).toThrow(new AdminCatalogueValidationError('slope rating must be between 55 and 155'))
  })

  it('requires a complete valid scorecard', () => {
    const holes = Array.from({ length: 18 }, (_, index) => ({ holeNumber: index + 1, par: index % 3 + 3, strokeIndex: index + 1, yardage: 300 + index }))
    expect(parseAdminScorecardInput({ holes })).toHaveLength(18)
    expect(() => parseAdminScorecardInput({ holes: holes.slice(0, 17) })).toThrow('The scorecard must contain holes 1–18 and each stroke index once.')
  })

  it('requires exact typed deletion confirmation', () => {
    expect(parseCatalogueDeleteConfirmation({ confirmation: 'DELETE' })).toBeUndefined()
    expect(() => parseCatalogueDeleteConfirmation({ confirmation: 'delete' })).toThrow('Type DELETE to confirm permanent removal')
  })
})
