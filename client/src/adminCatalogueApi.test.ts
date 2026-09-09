import { describe, expect, it } from 'vitest'
import {
  adminCataloguePath,
  isAdminCatalogueResponse,
} from './adminCatalogueApi.ts'

const response = {
  clubs: [
    {
      id: 'club-1',
      externalId: null,
      name: 'Example Golf Club',
      city: null,
      county: 'Derbyshire',
      postcode: null,
      countryCode: 'ENG',
      latitude: null,
      longitude: null,
      googleRating: null,
      clubType: null,
      courseType: null,
      canDelete: false,
      courses: [
        {
          id: 'course-1',
          externalId: null,
          name: 'Main Course',
          holes: 18,
          par: 72,
          designedBy: null,
          yearOpened: null,
          canDelete: false,
          tees: [
            {
              id: 'tee-1',
              externalId: null,
              teeName: 'White',
              colour: 'white',
              gender: 'male',
              totalYardage: 6500,
              totalMetres: null,
              par: 72,
              courseRating: 72.1,
              slopeRating: 128,
              source: 'MANUAL',
              canDelete: true,
              isUsed: false,
              holes: [],
            },
          ],
        },
      ],
    },
  ],
  pagination: { page: 1, pageSize: 10, total: 1, totalPages: 1 },
}

describe('admin catalogue API helpers', () => {
  it('accepts a complete catalogue response', () => {
    expect(isAdminCatalogueResponse(response)).toBe(true)
  })

  it('rejects an unsafe incomplete response', () => {
    expect(
      isAdminCatalogueResponse({
        ...response,
        clubs: [{ ...response.clubs[0], canDelete: 'yes' }],
      }),
    ).toBe(false)
  })

  it('builds a trimmed, encoded search path', () => {
    expect(adminCataloguePath(' Hallamshire ', 2)).toBe(
      '/api/admin/catalogue?page=2&pageSize=10&search=Hallamshire',
    )
  })
})
