import { describe, expect, it } from 'vitest'
import { mergeCourseSearchData } from '../src/courseSearch.js'

describe('mergeCourseSearchData', () => {
  it('marks saved tees while retaining unsaved lookup tees', () => {
    const savedData = {
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape' as const,
      tees: [
        {
          courseName: 'Sickleholme Golf Club',
          teeName: "Men's White Tees",
          courseRating: 69.9,
          slopeRating: 124,
        },
      ],
    }
    const lookupData = {
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape' as const,
      tees: [
        {
          teeName: "Men's White Tees",
          courseRating: 69.9,
          slopeRating: 124,
        },
        {
          teeName: "Women's Red Tees",
          courseRating: 72.1,
          slopeRating: 130,
        },
      ],
    }

    expect(mergeCourseSearchData(lookupData, savedData)).toEqual({
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape',
      tees: [
        {
          teeName: "Men's White Tees",
          courseRating: 69.9,
          slopeRating: 124,
          isSaved: true,
        },
        {
          teeName: "Women's Red Tees",
          courseRating: 72.1,
          slopeRating: 130,
          isSaved: false,
        },
      ],
    })
  })

  it('keeps saved tees available when the external lookup fails', () => {
    const savedData = {
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape' as const,
      tees: [
        {
          courseName: 'Sickleholme Golf Club',
          teeName: "Men's White Tees",
          courseRating: 69.9,
          slopeRating: 124,
        },
      ],
    }

    expect(mergeCourseSearchData(null, savedData)).toEqual({
      clubName: 'Sickleholme Golf Club',
      source: 'fallback_scrape',
      tees: [
        {
          courseName: 'Sickleholme Golf Club',
          teeName: "Men's White Tees",
          courseRating: 69.9,
          slopeRating: 124,
          isSaved: true,
        },
      ],
    })
  })
})
