import { describe, expect, it } from 'vitest'
import {
  buildCoursePreferencePath,
  isCoursePreferencesResponse,
} from './coursePreferencesApi.ts'

const course = {
  id: 'course-id',
  name: 'Old Course',
  holes: 18,
  par: 70,
  designedBy: null,
  yearOpened: null,
  club: {
    id: 'club-id',
    name: 'Example Golf Club',
    city: null,
    county: null,
  },
  tees: [
    {
      id: 'tee-id',
      teeName: 'White',
      colour: 'white',
      gender: 'male',
      totalYardage: 6500,
      totalMetres: null,
      par: 70,
      courseRating: 71.2,
      slopeRating: 128,
    },
  ],
}

describe('course preferences API', () => {
  it('builds collection and course paths', () => {
    expect(buildCoursePreferencePath()).toBe(
      '/api/users/me/course-preferences',
    )
    expect(buildCoursePreferencePath('course/id')).toBe(
      '/api/users/me/course-preferences/course%2Fid',
    )
  })

  it('accepts a complete favourite-course response', () => {
    expect(
      isCoursePreferencesResponse({
        favourites: [
          {
            id: 'preference-id',
            defaultTeeId: 'tee-id',
            createdAt: '2026-09-09T10:00:00.000Z',
            updatedAt: '2026-09-09T10:00:00.000Z',
            course,
          },
        ],
      }),
    ).toBe(true)
  })

  it('rejects a default tee with no course details', () => {
    expect(
      isCoursePreferencesResponse({
        favourites: [
          {
            id: 'preference-id',
            defaultTeeId: 'tee-id',
            createdAt: '2026-09-09T10:00:00.000Z',
            updatedAt: '2026-09-09T10:00:00.000Z',
          },
        ],
      }),
    ).toBe(false)
  })
})
