import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  clearCourseScorecardCache,
  getProviderTeeScorecard,
  parseProviderScorecard,
} from '../src/courseScorecards.js'

const holes = Array.from({ length: 18 }, (_, index) => ({
  hole_number: index + 1,
  par: index % 3 === 0 ? 3 : index % 3 === 1 ? 4 : 5,
  stroke_index: 18 - index,
  yardage: 150 + index * 10,
}))

afterEach(() => {
  clearCourseScorecardCache()
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

describe('parseProviderScorecard', () => {
  it('normalizes the current single-tee scorecard response', () => {
    expect(
      parseProviderScorecard({
        course_id: 'course-id',
        course_name: 'Hallamshire',
        tee_set: {
          id: 'tee-id',
          name: 'Red',
          course_rating: 68.8,
          slope_rating: 120,
        },
        holes,
      }),
    ).toEqual([
      {
        teeExternalId: 'tee-id',
        teeName: 'Red',
        courseRating: 68.8,
        slopeRating: 120,
        holes: holes.map((hole) => ({
          holeNumber: hole.hole_number,
          par: hole.par,
          strokeIndex: hole.stroke_index,
          yardage: hole.yardage,
        })),
      },
    ])
  })

  it('normalizes complete tee-specific hole data', () => {
    expect(
      parseProviderScorecard({
        id: 'course-id',
        tee_sets: [
          {
            id: 'tee-id',
            name: 'White',
            course_rating: 71.2,
            slope_rating: 128,
            holes,
          },
        ],
      }),
    ).toEqual([
      {
        teeExternalId: 'tee-id',
        teeName: 'White',
        courseRating: 71.2,
        slopeRating: 128,
        holes: holes.map((hole) => ({
          holeNumber: hole.hole_number,
          par: hole.par,
          strokeIndex: hole.stroke_index,
          yardage: hole.yardage,
        })),
      },
    ])
  })

  it('rejects an incomplete scorecard', () => {
    expect(
      parseProviderScorecard({
        tee_sets: [{ name: 'White', holes: holes.slice(0, 17) }],
      }),
    ).toEqual([])
  })
})

describe('getProviderTeeScorecard', () => {
  it('fetches a course once and matches its selected tee', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(
        JSON.stringify({
          tee_sets: [
            {
              id: 'tee-id',
              name: 'White',
              course_rating: 71.2,
              slope_rating: 128,
              holes,
            },
          ],
        }),
        { status: 200 },
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    const tee = {
      externalId: 'tee-id',
      teeName: 'White',
      courseRating: 71.2,
      slopeRating: 128,
    }

    await expect(getProviderTeeScorecard('course-id', tee)).resolves.toEqual({
      holes: holes.map((hole) => ({
        holeNumber: hole.hole_number,
        par: hole.par,
        strokeIndex: hole.stroke_index,
        yardage: hole.yardage,
      })),
    })
    await getProviderTeeScorecard('course-id', tee)

    expect(fetchMock).toHaveBeenCalledOnce()
    expect(String(fetchMock.mock.calls[0]?.[0])).toBe(
      'https://uk-golf-course-data-api.p.rapidapi.com/courses/course-id/scorecard?tee_id=tee-id',
    )
  })

  it('fetches different tees on the same course separately', async () => {
    vi.stubEnv('RAPIDAPI_KEY', 'test-key')
    vi.stubEnv('RAPIDAPI_HOST', 'uk-golf-course-data-api.p.rapidapi.com')
    const fetchMock = vi.fn().mockImplementation((url: URL) => {
      const teeId = url.searchParams.get('tee_id')

      return Promise.resolve(
        new Response(
          JSON.stringify({
            tee_set: {
              id: teeId,
              name: teeId === 'white-id' ? 'White' : 'Red',
              course_rating: teeId === 'white-id' ? 71.2 : 68.8,
              slope_rating: teeId === 'white-id' ? 128 : 120,
            },
            holes,
          }),
          { status: 200 },
        ),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await getProviderTeeScorecard('course-id', {
      externalId: 'white-id',
      teeName: 'White',
      courseRating: 71.2,
      slopeRating: 128,
    })
    await getProviderTeeScorecard('course-id', {
      externalId: 'red-id',
      teeName: 'Red',
      courseRating: 68.8,
      slopeRating: 120,
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('tee_id=white-id')
    expect(String(fetchMock.mock.calls[1]?.[0])).toContain('tee_id=red-id')
  })
})
