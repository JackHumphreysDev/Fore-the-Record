import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearCourseRatingsCache,
  getCourseRatings,
  parseFallbackRatings,
} from '../src/courseRatings.js'

afterEach(() => {
  clearCourseRatingsCache()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseFallbackRatings', () => {
  it('parses tee ratings separated by hyphens or en dashes', () => {
    const html = `
      <p>Men's White - Slope Rating 130 - Course Rating 72.4</p>
      <p>Yellow – Slope Rating 125 – Course Rating 70.8</p>
    `

    expect(parseFallbackRatings(html)).toEqual([
      {
        teeName: "Men's White",
        slopeRating: 130,
        courseRating: 72.4,
      },
      {
        teeName: 'Yellow',
        slopeRating: 125,
        courseRating: 70.8,
      },
    ])
  })
})

describe('getCourseRatings', () => {
  it('normalizes an exact club match and its course tee sets', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-api-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    vi.stubEnv('RAPIDAPI_SEARCH_PATH', '/clubs')
    vi.stubEnv('RAPIDAPI_SEARCH_QUERY_PARAM', 'search')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            total: 1,
            page: 1,
            per_page: 20,
            total_pages: 1,
            clubs: [
              {
                id: '00000000-0000-0000-0000-000000000000',
                name: 'Example Golf Club',
              },
            ],
          }),
          { status: 200 },
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: '33333333-3333-4333-8333-333333333333',
              name: 'Old Course',
              par: 70,
              tee_sets: [
                {
                  id: '44444444-4444-4444-8444-444444444444',
                  name: 'Championship',
                  par: 70,
                  course_rating: 73.1,
                  slope_rating: 137,
                },
              ],
            },
          ]),
          { status: 200 },
        ),
      )

    vi.stubGlobal('fetch', fetchMock)

    await expect(getCourseRatings('example golf club')).resolves.toEqual({
      clubName: 'Example Golf Club',
      source: 'api',
      tees: [
        {
          courseName: 'Old Course',
          teeName: 'Championship',
          courseRating: 73.1,
          slopeRating: 137,
          par: 70,
        },
      ],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses the configured fallback when RapidAPI returns no match', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-api-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    vi.stubEnv('RAPIDAPI_SEARCH_PATH', '/search')
    vi.stubEnv('RAPIDAPI_SEARCH_QUERY_PARAM', 'club')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const fallbackHtml = `
      <p>Men's White - Slope Rating 130 - Course Rating 72.4</p>
      <p>Yellow – Slope Rating 125 – Course Rating 70.8</p>
    `
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify([]), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(new Response(fallbackHtml, { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    await expect(getCourseRatings('Sickleholme Golf Club')).resolves.toEqual({
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape',
      tees: [
        {
          teeName: "Men's White",
          slopeRating: 130,
          courseRating: 72.4,
        },
        {
          teeName: 'Yellow',
          slopeRating: 125,
          courseRating: 70.8,
        },
      ],
    })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('returns null when the API fails and no fallback is configured', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-api-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    vi.stubEnv('RAPIDAPI_SEARCH_PATH', '/search')
    vi.stubEnv('RAPIDAPI_SEARCH_QUERY_PARAM', 'club')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error('Network unavailable'))

    vi.stubGlobal('fetch', fetchMock)

    await expect(getCourseRatings('Unknown Golf Club')).resolves.toBeNull()
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('caches successful lookups by normalized club name', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-api-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    vi.stubEnv('RAPIDAPI_SEARCH_PATH', '/clubs')
    vi.stubEnv('RAPIDAPI_SEARCH_QUERY_PARAM', 'search')
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    const fallbackHtml = `
      <p>Men's White - Slope Rating 130 - Course Rating 72.4</p>
    `
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ clubs: [] }), { status: 200 }),
      )
      .mockResolvedValueOnce(new Response(fallbackHtml, { status: 200 }))

    vi.stubGlobal('fetch', fetchMock)

    const firstResult = await getCourseRatings('Sickleholme Golf Club')
    const cachedResult = await getCourseRatings('  sickleholme golf club  ')

    expect(cachedResult).toEqual(firstResult)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })
})
