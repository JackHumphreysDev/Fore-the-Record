import {
  findBestClubNameMatch,
  normalizeClubName,
} from './clubNameMatch.js'

export type CourseTeeData = {
  courseExternalId?: string
  teeExternalId?: string
  courseName?: string
  teeName: string
  courseRating: number
  slopeRating: number
  par?: number
}

export type CourseData = {
  clubExternalId?: string
  clubName: string
  source: 'api' | 'fallback_scrape' | 'manual'
  tees: CourseTeeData[]
}

export type ProviderClubCandidate = {
  id: string
  name: string
  city?: string
  county?: string
  postcode?: string
  countryCode?: string
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
const providerClubSearchCache = new Map<string, ProviderClubCandidate[]>()

export function clearCourseRatingsCache(): void {
  successfulLookupCache.clear()
  providerClubSearchCache.clear()
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
        ...(typeof course.id === 'string'
          ? { courseExternalId: course.id }
          : {}),
        ...(typeof teeSet.id === 'string'
          ? { teeExternalId: teeSet.id }
          : {}),
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

export async function searchCourseProviderClubs(
  clubName: string,
): Promise<ProviderClubCandidate[]> {
  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST
  const searchPath = process.env.RAPIDAPI_SEARCH_PATH
  const searchQueryParam = process.env.RAPIDAPI_SEARCH_QUERY_PARAM
  const normalizedClubName = clubName.trim()

  if (
    normalizedClubName === '' ||
    !apiKey ||
    !apiHost ||
    !searchPath ||
    !searchQueryParam
  ) {
    console.warn(`RapidAPI configuration is incomplete for ${clubName}`)
    return []
  }

  const cacheKey = normalizeClubName(normalizedClubName)
  const cachedClubs = providerClubSearchCache.get(cacheKey)

  if (cachedClubs) {
    return cachedClubs
  }

  try {
    const url = new URL(searchPath, `https://${apiHost}`)
    url.searchParams.set(searchQueryParam, normalizedClubName)
    url.searchParams.set('limit', '20')

    const response = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': apiKey,
        'X-RapidAPI-Host': apiHost,
      },
    })

    if (!response.ok) {
      console.warn(`RapidAPI returned ${response.status} for ${clubName}`)
      return []
    }

    const responseBody: unknown = await response.json()
    const clubs =
      isRecord(responseBody) && Array.isArray(responseBody.clubs)
        ? responseBody.clubs
        : []
    const availableClubs = clubs.flatMap((club): ProviderClubCandidate[] => {
      if (
        !isRecord(club) ||
        typeof club.id !== 'string' ||
        typeof club.name !== 'string'
      ) {
        return []
      }

      return [
        {
          id: club.id,
          name: club.name,
          ...(typeof club.city === 'string' ? { city: club.city } : {}),
          ...(typeof club.county === 'string' ? { county: club.county } : {}),
          ...(typeof club.postcode === 'string'
            ? { postcode: club.postcode }
            : {}),
          ...(typeof club.country_code === 'string'
            ? { countryCode: club.country_code }
            : {}),
        },
      ]
    })

    providerClubSearchCache.set(cacheKey, availableClubs)
    return availableClubs
  } catch (error: unknown) {
    console.warn(`RapidAPI lookup failed for ${clubName}`, error)
    return []
  }
}

export async function getProviderClubCourseRatings(
  club: Pick<ProviderClubCandidate, 'id' | 'name'>,
): Promise<CourseData | null> {
  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST

  if (!apiKey || !apiHost) {
    console.warn(`RapidAPI configuration is incomplete for ${club.name}`)
    return null
  }

  const cacheKey = `provider:${club.id}`
  const cachedResult = successfulLookupCache.get(cacheKey)

  if (cachedResult) {
    return cachedResult
  }

  try {

    const coursesUrl = new URL(
      `/clubs/${encodeURIComponent(club.id)}/courses`,
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
        `RapidAPI returned ${coursesResponse.status} for ${club.name} courses`,
      )
      return null
    }

    const tees = getApiTees(await coursesResponse.json())

    if (tees.length === 0) {
      console.warn(`RapidAPI returned no tee ratings for ${club.name}`)
      return null
    }

    const result: CourseData = {
      clubExternalId: club.id,
      clubName: club.name,
      source: 'api',
      tees,
    }

    successfulLookupCache.set(cacheKey, result)
    successfulLookupCache.set(normalizeClubName(club.name), result)
    return result
  } catch (error: unknown) {
    console.warn(`RapidAPI course lookup failed for ${club.name}`, error)
    return null
  }
}

async function getApiRatings(clubName: string): Promise<CourseData | null> {
  const availableClubs = await searchCourseProviderClubs(clubName)
  const matchingClub = findBestClubNameMatch(availableClubs, clubName)

  if (!matchingClub) {
    console.warn(`RapidAPI returned no match for ${clubName}`)
    return null
  }

  return getProviderClubCourseRatings(matchingClub)
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
