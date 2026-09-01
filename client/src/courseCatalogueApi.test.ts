import { describe, expect, it } from 'vitest'
import {
  buildCatalogueClubsPath,
  buildCatalogueCoursesPath,
  buildProviderCourseImportBody,
  buildProviderClubCoursesPath,
  buildProviderClubsSearchPath,
  buildProviderCourseSearchPath,
  getProviderCourseSearchQuery,
  isCatalogueClubsResponse,
  isCatalogueCoursesResponse,
  isProviderCourseSearchResult,
  isProviderClubSearchResponse,
} from './courseCatalogueApi.ts'

describe('catalogue paths', () => {
  it('should build an encoded club-search path', () => {
    expect(buildCatalogueClubsPath('  Sickle + Hope  ', 2, 10)).toBe(
      '/api/catalogue/clubs?search=Sickle+%2B+Hope&page=2&pageSize=10',
    )
  })

  it('should build independent club and course filters', () => {
    expect(
      buildCatalogueCoursesPath({
        club: '  Example Golf  ',
        course: '  Old Course  ',
        page: 1,
        pageSize: 10,
      }),
    ).toBe(
      '/api/catalogue/courses?club=Example+Golf&course=Old+Course&page=1&pageSize=10',
    )
  })

  it('should build an encoded on-demand provider lookup path', () => {
    expect(buildProviderCourseSearchPath('  Sickle + Hope  ')).toBe(
      '/api/courses/search?q=Sickle+%2B+Hope',
    )
  })

  it('should use the club field for a provider lookup when supplied', () => {
    expect(
      getProviderCourseSearchQuery({
        club: '  Hallamshire  ',
        course: 'Old Course',
      }),
    ).toBe('Hallamshire')
  })

  it('should treat a course-only search as a possible club name', () => {
    expect(
      getProviderCourseSearchQuery({ club: '', course: '  Halla  ' }),
    ).toBe('Halla')
  })

  it('should build provider candidate and selected-club paths', () => {
    const club = {
      id: '11111111-1111-4111-8111-111111111111',
      name: 'Hallamshire Golf Club',
      city: 'Sheffield',
      county: 'South Yorkshire',
      postcode: 'S10 4LA',
      countryCode: 'ENG',
    }

    expect(buildProviderClubsSearchPath('  Hall  ')).toBe(
      '/api/courses/provider/clubs?q=Hall',
    )
    expect(buildProviderClubCoursesPath(club)).toBe(
      '/api/courses/provider/clubs/11111111-1111-4111-8111-111111111111/courses?name=Hallamshire+Golf+Club',
    )
  })
})

describe('catalogue response validation', () => {
  const pagination = {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  }

  it('should accept a paginated club result', () => {
    expect(
      isCatalogueClubsResponse({
        clubs: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Example Golf Club',
            city: 'Example City',
            county: 'Example County',
            postcode: 'AA0 0AA',
            countryCode: 'ENG',
            courseCount: 1,
          },
        ],
        pagination,
      }),
    ).toBe(true)
  })

  it('should accept course, club, and tee details', () => {
    expect(
      isCatalogueCoursesResponse({
        courses: [
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Old Course',
            holes: 18,
            par: 70,
            designedBy: 'Example Designer',
            yearOpened: '1901',
            club: {
              id: '11111111-1111-4111-8111-111111111111',
              name: 'Example Golf Club',
              city: 'Example City',
              county: 'Example County',
            },
            tees: [
              {
                id: '33333333-3333-4333-8333-333333333333',
                teeName: 'Championship',
                colour: 'white',
                gender: 'male',
                totalYardage: 6627,
                totalMetres: 6060,
                par: 70,
                courseRating: 73.1,
                slopeRating: 137,
              },
            ],
          },
        ],
        pagination,
      }),
    ).toBe(true)
  })

  it('should reject a tee without numeric ratings', () => {
    expect(
      isCatalogueCoursesResponse({
        courses: [
          {
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
                colour: null,
                gender: null,
                totalYardage: null,
                totalMetres: null,
                par: null,
                courseRating: null,
                slopeRating: 120,
              },
            ],
          },
        ],
        pagination,
      }),
    ).toBe(false)
  })

  it('should validate provider results and build an all-unsaved import body', () => {
    const result = {
      clubName: 'Example Golf Club',
      source: 'api' as const,
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
          isSaved: true,
        },
        {
          courseName: 'Old Course',
          teeName: 'Forward',
          courseRating: 69.2,
          slopeRating: 125,
          par: 70,
          isSaved: false,
        },
      ],
    }

    expect(isProviderCourseSearchResult(result)).toBe(true)
    expect(buildProviderCourseImportBody(result)).toEqual({
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Forward',
          courseRating: 69.2,
          slopeRating: 125,
          par: 70,
        },
      ],
    })
  })

  it('should validate multiple provider club candidates', () => {
    expect(
      isProviderClubSearchResponse({
        clubs: [
          {
            id: '11111111-1111-4111-8111-111111111111',
            name: 'Hallamshire Golf Club',
            city: 'Sheffield',
            county: 'South Yorkshire',
            postcode: 'S10 4LA',
            countryCode: 'ENG',
          },
          {
            id: '22222222-2222-4222-8222-222222222222',
            name: 'Hallowes Golf Club',
          },
        ],
      }),
    ).toBe(true)
  })
})
