import {
  findBestClubNameMatch,
  normalizeClubName,
} from './clubNameMatch.js'

export type CourseTeeData = {
  courseName?: string
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
}

export type CourseData = {
  clubName: string
  source: 'api' | 'fallback_scrape' | 'manual'
  tees: CourseTeeData[]
}

const FALLBACK_CLUBS = [
  {
    name: 'Sickleholme Golf Club',
    url: 'https://www.sickleholme.co.uk/course/course-slope-ratings/',
  },
] as const

const BROWSER_USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36'

const successfulLookupCache = new Map<string, CourseData>()

export function clearCourseRatingsCache(): void {
  successfulLookupCache.clear()
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getApiTees(responseBody: unknown): CourseTeeData[] {
  if (!Array.isArray(responseBody)) {
    return []
  }

  const tees: CourseTeeData[] = []

  for (const course of responseBody) {
    if (
      !isRecord(course) ||
      typeof course.name !== 'string' ||
      !Array.isArray(course.tee_sets)
    ) {
      continue
    }

    for (const teeSet of course.tee_sets) {
      if (
        !isRecord(teeSet) ||
        typeof teeSet.name !== 'string' ||
        typeof teeSet.course_rating !== 'number' ||
        typeof teeSet.slope_rating !== 'number'
      ) {
        continue
      }

      tees.push({
        courseName: course.name,
        teeName: teeSet.name,
        courseRating: teeSet.course_rating,
        slopeRating: teeSet.slope_rating,
        ...(typeof teeSet.par === 'number' ? { par: teeSet.par } : {}),
      })
    }
  }

  return tees
}

// Matches: <tee name> - Slope Rating <integer> - Course Rating <decimal>
// Separators may be a hyphen, en dash, or em dash with flexible whitespace.
const FALLBACK_RATING_PATTERN =
  /([^\n]+?)\s*[-–—]\s*Slope\s+Rating\s*:?\s*(\d+)\s*[-–—]\s*Course\s+Rating\s*:?\s*(\d+(?:\.\d+)?)/gi

export function parseFallbackRatings(html: string): CourseTeeData[] {
  const visibleText = html
    .replace(/<[^>]*>/g, '\n')
    .replace(/&nbsp;/gi, ' ')

  const tees: CourseTeeData[] = []

  for (const match of visibleText.matchAll(FALLBACK_RATING_PATTERN)) {
    const teeName = match[1]?.trim()
    const slopeRating = Number(match[2])
    const courseRating = Number(match[3])

    if (!teeName) {
      continue
    }

    tees.push({
      teeName,
      slopeRating,
      courseRating,
    })
  }

  return tees
}

async function getApiRatings(clubName: string): Promise<CourseData | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST
  const searchPath = process.env.RAPIDAPI_SEARCH_PATH
  const searchQueryParam = process.env.RAPIDAPI_SEARCH_QUERY_PARAM

  if (!apiKey || !apiHost || !searchPath || !searchQueryParam) {
    console.warn(`RapidAPI configuration is incomplete for ${clubName}`)
    return null
  }

  try {
    const url = new URL(searchPath, `https://${apiHost}`)
    url.searchParams.set(searchQueryParam, clubName)

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
    })

    if (!response.ok) {
      console.warn(`RapidAPI returned ${response.status} for ${clubName}`)
      return null
    }

    const responseBody: unknown = await response.json()
    const clubs =
      isRecord(responseBody) && Array.isArray(responseBody.clubs)
        ? responseBody.clubs
        : []
    const availableClubs = clubs.flatMap((club) =>
      isRecord(club) &&
      typeof club.id === 'string' &&
      typeof club.name === 'string'
        ? [{ id: club.id, name: club.name }]
        : [],
    )
    const matchingClub = findBestClubNameMatch(availableClubs, clubName)

    if (!matchingClub) {
      console.warn(`RapidAPI returned no match for ${clubName}`)
      return null
    }

    const coursesUrl = new URL(
      `/clubs/${encodeURIComponent(matchingClub.id)}/courses`,
      `https://${apiHost}`,
    )
    const coursesResponse = await fetch(coursesUrl, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
    })

    if (!coursesResponse.ok) {
      console.warn(
        `RapidAPI returned ${coursesResponse.status} for ${clubName} courses`,
      )
      return null
    }

    const tees = getApiTees(await coursesResponse.json())

    if (tees.length === 0) {
      console.warn(`RapidAPI returned no tee ratings for ${clubName}`)
      return null
    }

    return {
      clubName: matchingClub.name,
      source: 'api',
      tees,
    }
  } catch (error: unknown) {
    console.warn(`RapidAPI lookup failed for ${clubName}`, error)
    return null
  }
}

async function getFallbackRatings(
  clubName: string,
): Promise<CourseData | null> {
  const fallbackClub = findBestClubNameMatch(FALLBACK_CLUBS, clubName)
  const fallbackUrl = fallbackClub?.url

  if (!fallbackUrl) {
    console.warn(`No fallback URL is configured for ${clubName}`)
    return null
  }

  try {
    const response = await fetch(fallbackUrl, {
      headers: {
        'User-Agent': BROWSER_USER_AGENT,
      },
    })

    if (!response.ok) {
      console.warn(
        `Fallback lookup returned ${response.status} for ${clubName} at ${fallbackUrl}`,
      )
      return null
    }

    const tees = parseFallbackRatings(await response.text())

    if (tees.length === 0) {
      console.warn(
        `Fallback lookup found 0 matches for ${clubName} at ${fallbackUrl}; page structure may have changed`,
      )
      return null
    }

    return {
      clubName: fallbackClub.name,
      source: 'fallback_scrape',
      tees,
    }
  } catch (error: unknown) {
    console.warn(`Fallback lookup failed for ${clubName} at ${fallbackUrl}`, error)
    return null
  }
}

export async function getCourseRatings(
  clubName: string,
): Promise<CourseData | null> {
  const normalizedClubName = clubName.trim()

  if (normalizedClubName === '') {
    console.warn('Course ratings lookup requires a club name')
    return null
  }

  const cacheKey = normalizeClubName(normalizedClubName)
  const cachedResult = successfulLookupCache.get(cacheKey)

  if (cachedResult) {
    return cachedResult
  }

  const apiResult = await getApiRatings(normalizedClubName)

  if (apiResult) {
    successfulLookupCache.set(cacheKey, apiResult)
    successfulLookupCache.set(normalizeClubName(apiResult.clubName), apiResult)
    return apiResult
  }

  const fallbackResult = await getFallbackRatings(normalizedClubName)

  if (fallbackResult) {
    successfulLookupCache.set(cacheKey, fallbackResult)
    successfulLookupCache.set(
      normalizeClubName(fallbackResult.clubName),
      fallbackResult,
    )
  }

  return fallbackResult
}
