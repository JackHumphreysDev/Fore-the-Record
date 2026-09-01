import { describe, expect, it, vi } from 'vitest'
import {
  CatalogueValidationError,
  parseCatalogueClubPage,
  parseCatalogueCourses,
  runCourseCatalogueImport,
} from '../src/courseCatalogue.js'
import {
  createRapidApiCatalogueClient,
  parseCatalogueImportCommandOptions,
} from '../src/courseCatalogueImport.js'

const club = {
  externalId: '11111111-1111-4111-8111-111111111111',
  name: 'Example Golf Club',
  city: 'Example City',
  county: 'Example County',
  postcode: 'AA0 0AA',
  countryCode: 'ENG',
  latitude: 53.3811,
  longitude: -1.4701,
  googleRating: 4.5,
  clubType: 'private',
  courseType: 'heathland',
}

const course = {
  externalId: '22222222-2222-4222-8222-222222222222',
  name: 'Old Course',
  holes: 18,
  par: 70,
  designedBy: 'Willie Park Jr',
  yearOpened: '1901',
  tees: [
    {
      externalId: '33333333-3333-4333-8333-333333333333',
      name: 'Championship',
      colour: 'white',
      gender: 'male',
      totalYardage: 6627,
      totalMetres: 6060,
      par: 70,
      courseRating: 73.1,
      slopeRating: 137,
    },
  ],
}

describe('catalogue response normalization', () => {
  it('should normalize a paginated club response', () => {
    expect(
      parseCatalogueClubPage({
        total: 2668,
        page: 1,
        per_page: 100,
        total_pages: 27,
        clubs: [
          {
            id: club.externalId,
            name: club.name,
            city: club.city,
            county: club.county,
            postcode: club.postcode,
            country_code: club.countryCode,
            latitude: club.latitude,
            longitude: club.longitude,
            google_rating: club.googleRating,
            club_type: club.clubType,
            course_type: club.courseType,
          },
        ],
      }),
    ).toEqual({
      total: 2668,
      page: 1,
      perPage: 100,
      totalPages: 27,
      clubs: [club],
    })
  })

  it('should normalize courses and every tee-set field', () => {
    expect(
      parseCatalogueCourses([
        {
          id: course.externalId,
          name: course.name,
          holes: course.holes,
          par: course.par,
          designed_by: course.designedBy,
          year_opened: course.yearOpened,
          tee_sets: [
            {
              id: course.tees[0]?.externalId,
              name: course.tees[0]?.name,
              colour: course.tees[0]?.colour,
              gender: course.tees[0]?.gender,
              total_yardage: course.tees[0]?.totalYardage,
              total_metres: course.tees[0]?.totalMetres,
              par: course.tees[0]?.par,
              course_rating: course.tees[0]?.courseRating,
              slope_rating: course.tees[0]?.slopeRating,
            },
          ],
        },
      ]),
    ).toEqual([course])
  })

  it('should reject an incomplete top-level response', () => {
    expect(() =>
      parseCatalogueClubPage({ page: 1, clubs: [] }),
    ).toThrow(
      new CatalogueValidationError(
        'RapidAPI returned an invalid paginated clubs response',
      ),
    )
  })
})

describe('runCourseCatalogueImport', () => {
  it('should resume from a requested page and persist normalized club trees', async () => {
    const listClubs = vi.fn().mockResolvedValue({
      total: 2668,
      page: 2,
      perPage: 100,
      totalPages: 2,
      clubs: [club],
    })
    const listCourses = vi.fn().mockResolvedValue([course])
    const saveClub = vi.fn().mockResolvedValue(undefined)

    await expect(
      runCourseCatalogueImport(
        { listClubs, listCourses },
        { saveClub },
        { startPage: 2, perPage: 100, dryRun: false },
      ),
    ).resolves.toEqual({
      availableClubs: 2668,
      processedClubs: 1,
      processedCourses: 1,
      processedTeeSets: 1,
      pagesRead: 1,
      dryRun: false,
    })
    expect(listClubs).toHaveBeenCalledWith(2, 100)
    expect(listCourses).toHaveBeenCalledWith(club.externalId)
    expect(saveClub).toHaveBeenCalledWith(club, [course])
  })

  it('should support a bounded dry run without writing', async () => {
    const secondClub = {
      ...club,
      externalId: '44444444-4444-4444-8444-444444444444',
      name: 'Another Golf Club',
    }
    const listClubs = vi.fn().mockResolvedValue({
      total: 2,
      page: 1,
      perPage: 100,
      totalPages: 1,
      clubs: [club, secondClub],
    })
    const listCourses = vi.fn().mockResolvedValue([course])
    const saveClub = vi.fn()

    const result = await runCourseCatalogueImport(
      { listClubs, listCourses },
      { saveClub },
      { startPage: 1, perPage: 100, maxClubs: 1, dryRun: true },
    )

    expect(result.processedClubs).toBe(1)
    expect(result.processedCourses).toBe(1)
    expect(result.processedTeeSets).toBe(1)
    expect(listCourses).toHaveBeenCalledTimes(1)
    expect(saveClub).not.toHaveBeenCalled()
  })
})

describe('RapidAPI catalogue client', () => {
  it('should request paginated clubs and retry a rate-limited response', async () => {
    const waitImplementation = vi.fn().mockResolvedValue(undefined)
    const fetchImplementation = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(null, {
          status: 429,
          headers: { 'retry-after': '0' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 0,
            page: 2,
            per_page: 100,
            total_pages: 2,
            clubs: [],
          }),
          { status: 200 },
        ),
      )
    const client = createRapidApiCatalogueClient({
      apiKey: 'test-key',
      apiHost: 'example.p.rapidapi.com',
      clubsPath: '/clubs',
      fetchImplementation,
      waitImplementation,
    })

    await expect(client.listClubs(2, 100)).resolves.toMatchObject({
      page: 2,
      perPage: 100,
    })
    expect(fetchImplementation).toHaveBeenCalledTimes(2)
    expect(String(fetchImplementation.mock.calls[0]?.[0])).toBe(
      'https://example.p.rapidapi.com/clubs?page=2&limit=100',
    )
    expect(fetchImplementation.mock.calls[0]?.[1]).toEqual({
      headers: {
        'X-RapidAPI-Key': 'test-key',
        'X-RapidAPI-Host': 'example.p.rapidapi.com',
      },
    })
    expect(waitImplementation).toHaveBeenCalledWith(0)
  })
})

describe('catalogue import command options', () => {
  it('should default to a non-writing dry run', () => {
    expect(parseCatalogueImportCommandOptions([])).toEqual({
      dryRun: true,
      startPage: 1,
      perPage: 20,
    })
  })

  it('should parse an explicit bounded write run', () => {
    expect(
      parseCatalogueImportCommandOptions([
        '--write',
        '--start-page=4',
        '--per-page=50',
        '--max-clubs=10',
      ]),
    ).toEqual({
      dryRun: false,
      startPage: 4,
      perPage: 50,
      maxClubs: 10,
    })
  })
})
