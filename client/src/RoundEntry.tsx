import { Fragment, useEffect, useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import ledgerGreen from './assets/ledger-green-engraving.png'
import {
  buildCatalogueCoursesPath,
  isCatalogueCoursesResponse,
  type CatalogueCoursesResponse,
  type CatalogueTee,
} from './courseCatalogueApi.ts'
import {
  buildCoursePreferencePath,
  isCoursePreferencesResponse,
  type CoursePreference,
} from './coursePreferencesApi.ts'
import { isFriendsResponse, type FriendshipItem } from './friendsApi.ts'
import {
  isRoundResult,
  type RoundCategory,
  type RoundParticipation,
  type RoundResult,
  type RoundGameResult,
  type RoundScoringFormat,
  type WeatherCondition,
} from './roundRecordValidation.ts'
import './RoundEntry.css'
import HandicapProgressionChart from './HandicapProgressionChart.tsx'
import { calculateRoundScoreTotals } from './roundScorecardTotals.ts'
import { ROUND_NOTES_MAX_LENGTH } from './roundNotesApi.ts'
import {
  calculateCourseHandicap,
  calculateStablefordTotals,
} from './stableford.ts'

type RoundEntryProfile = {
  id: string
  name: string
  handicapIndex: number | null
}

type TeeOption = CatalogueTee & {
  courseId: string
  clubName: string
  courseName: string
  isFavourite: boolean
}

type RoundForm = {
  teeId: string
  datePlayed: string
  timePlayed: string
  category: RoundCategory
  participation: RoundParticipation
  scoringFormat: RoundScoringFormat
  playingHandicap: string
  holeCount: 9 | 18
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE'
  competitionName: string
  competitionFormat: string
  competitionFormatOther: string
  gameFormat: string
  gameFormatOther: string
  gameResult: '' | 'WON' | 'LOST' | 'TIED'
  playingPartnerIds: string[]
  playingPartnerResults: Record<string, RoundGameResult | ''>
  guestPlayerNames: string
  guestPlayerResults: Record<string, RoundGameResult | ''>
  numberOfPlayers: string
  grossScore: string
  weatherCondition: WeatherCondition
  notes: string
}

type RoundFormErrors = Partial<
  Record<
    | 'teeId'
    | 'datePlayed'
    | 'timePlayed'
    | 'competitionName'
    | 'competitionFormat'
    | 'gameFormat'
    | 'playingPartners'
    | 'numberOfPlayers'
    | 'grossScore'
    | 'playingHandicap'
    | 'scorecard'
    | 'notes',
    string
  >
>

type ScorecardStatus = 'idle' | 'loading' | 'available' | 'manual_required'

type ScorecardHole = {
  holeNumber: number
  par: number
  strokeIndex: number
  yardage: number | null
}

type HoleEntry = {
  holeNumber: number
  par: string
  strokeIndex: string
  yardage: string
  strokesTaken: string
  pickedUp: boolean
}

type ScorecardResponse =
  | {
      status: 'available'
      source: 'saved' | 'provider'
      holes: ScorecardHole[]
    }
  | { status: 'manual_required'; holes: [] }

type RoundConfirmation = RoundResult & {
  teeLabel: string
}

const INDIVIDUAL_COMPETITION_FORMATS = [
  'Medal / Stroke Play',
  'Stableford',
  'Match Play',
  'Bogey / Par',
] as const
const TEAM_COMPETITION_FORMATS = [
  'Fourball Better Ball',
  'Foursomes',
  'Greensomes',
  'Scramble / Texas Scramble',
] as const
const SOCIAL_GAME_FORMATS = [
  'Wolf',
  'Sixes / Sixers',
  'Skins',
  'Nassau',
  'Match Play',
  'Bingo Bango Bongo',
] as const

type RoundEntryProps = {
  profile: RoundEntryProfile | null
  onGoToCourses: () => void
  onGoToProfile: () => void
  onGoToHistory: () => void
  onRoundLogged: (handicapIndex: number | null) => void
}

const WEATHER_OPTIONS: Array<{
  value: WeatherCondition
  label: string
  description: string
}> = [
  { value: 'DRY', label: 'Dry', description: 'Firm and running' },
  { value: 'MOIST', label: 'Moist', description: 'A little give' },
  { value: 'WET', label: 'Wet', description: 'Soft underfoot' },
  {
    value: 'SUPER_WET',
    label: 'Super wet',
    description: 'Heavy conditions',
  },
]

function getToday(): string {
  const today = new Date()
  const year = today.getFullYear()
  const month = String(today.getMonth() + 1).padStart(2, '0')
  const day = String(today.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function getCurrentTime(): string {
  const now = new Date()

  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isScorecardHole(value: unknown): value is ScorecardHole {
  return (
    isRecord(value) &&
    Number.isInteger(value.holeNumber) &&
    Number(value.holeNumber) >= 1 &&
    Number(value.holeNumber) <= 18 &&
    Number.isInteger(value.par) &&
    Number.isInteger(value.strokeIndex) &&
    (value.yardage === null || Number.isInteger(value.yardage))
  )
}

function isScorecardResponse(value: unknown): value is ScorecardResponse {
  if (!isRecord(value) || !Array.isArray(value.holes)) {
    return false
  }

  if (value.status === 'manual_required') {
    return value.holes.length === 0
  }

  return (
    value.status === 'available' &&
    (value.source === 'saved' || value.source === 'provider') &&
    (value.holes.length === 9 || value.holes.length === 18) &&
    value.holes.every(isScorecardHole)
  )
}

function selectedHoleNumbers(
  holeCount: 9 | 18,
  segment: 'FRONT_NINE' | 'BACK_NINE',
): number[] {
  const start = holeCount === 9 && segment === 'BACK_NINE' ? 10 : 1
  return Array.from({ length: holeCount }, (_, index) => index + start)
}

function getEmptyManualCard(
  holeCount: 9 | 18,
  segment: 'FRONT_NINE' | 'BACK_NINE',
): HoleEntry[] {
  return selectedHoleNumbers(holeCount, segment).map((holeNumber) => ({
    holeNumber,
    par: '',
    strokeIndex: '',
    yardage: '',
    strokesTaken: '',
    pickedUp: false,
  }))
}

function getHoleEntries(
  holes: ScorecardHole[],
  holeCount: 9 | 18,
  segment: 'FRONT_NINE' | 'BACK_NINE',
): HoleEntry[] {
  const selected = new Set(selectedHoleNumbers(holeCount, segment))
  return holes.filter((hole) => selected.has(hole.holeNumber)).map((hole) => ({
    holeNumber: hole.holeNumber,
    par: String(hole.par),
    strokeIndex: String(hole.strokeIndex),
    yardage: hole.yardage === null ? '' : String(hole.yardage),
    strokesTaken: '',
    pickedUp: false,
  }))
}

function getTeeOptions(
  response: CatalogueCoursesResponse | null,
  favourites: CoursePreference[],
): TeeOption[] {
  const favouriteOrder = new Map(
    favourites.map((favourite, index) => [favourite.course.id, index]),
  )

  return (response?.courses ?? [])
    .flatMap((course) =>
      course.tees.map((tee) => ({
        ...tee,
        courseId: course.id,
        clubName: course.club.name,
        courseName: course.name,
        isFavourite: favouriteOrder.has(course.id),
      })),
    )
    .sort((left, right) => {
      const leftOrder = favouriteOrder.get(left.courseId)
      const rightOrder = favouriteOrder.get(right.courseId)

      if (leftOrder !== undefined || rightOrder !== undefined) {
        if (leftOrder === undefined) return 1
        if (rightOrder === undefined) return -1
        if (leftOrder !== rightOrder) return leftOrder - rightOrder
      }

      return 0
    })
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (isRecord(body) && typeof body.error === 'string') {
    return body.error
  }

  return fallbackMessage
}

function formatRoundDate(datePlayed: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(datePlayed))
}

function RoundEntry({
  profile,
  onGoToCourses,
  onGoToProfile,
  onGoToHistory,
  onRoundLogged,
}: RoundEntryProps) {
  const [clubQuery, setClubQuery] = useState('')
  const [courseQuery, setCourseQuery] = useState('')
  const [catalogueResponse, setCatalogueResponse] =
    useState<CatalogueCoursesResponse | null>(null)
  const [form, setForm] = useState<RoundForm>({
    teeId: '',
    datePlayed: getToday(),
    timePlayed: getCurrentTime(),
    category: 'CASUAL',
    participation: 'INDIVIDUAL',
    scoringFormat: 'STROKE_PLAY',
    playingHandicap: '',
    holeCount: 18,
    nineHoleSegment: 'FRONT_NINE',
    competitionName: '',
    competitionFormat: '',
    competitionFormatOther: '',
    gameFormat: '',
    gameFormatOther: '',
    gameResult: '',
    playingPartnerIds: [],
    playingPartnerResults: {},
    guestPlayerNames: '',
    guestPlayerResults: {},
    numberOfPlayers: '',
    grossScore: '',
    weatherCondition: 'DRY',
    notes: '',
  })
  const [errors, setErrors] = useState<RoundFormErrors>({})
  const [courseSearchError, setCourseSearchError] = useState('')
  const [submitError, setSubmitError] = useState('')
  const [isSearching, setIsSearching] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [confirmation, setConfirmation] =
    useState<RoundConfirmation | null>(null)
  const [scorecardStatus, setScorecardStatus] =
    useState<ScorecardStatus>('idle')
  const [scorecardSource, setScorecardSource] = useState<
    'saved' | 'provider' | null
  >(null)
  const [holeEntries, setHoleEntries] = useState<HoleEntry[]>([])
  const [scorecardLoadError, setScorecardLoadError] = useState('')
  const [favourites, setFavourites] = useState<CoursePreference[]>([])
  const [favouritesError, setFavouritesError] = useState('')
  const [isLoadingFavourites, setIsLoadingFavourites] = useState(true)
  const [friends, setFriends] = useState<FriendshipItem[]>([])
  const [friendsError, setFriendsError] = useState('')

  const teeOptions = getTeeOptions(catalogueResponse, favourites)
  const selectedTee = teeOptions.find((option) => option.id === form.teeId)
  const isCompetition = form.category === 'COMPETITION'
  const isSocialGame = form.category === 'SOCIAL_GAME'
  const isOrganisedRound = isCompetition || isSocialGame
  const isTeamRound =
    isCompetition && form.participation === 'TEAM'
  const isStableford = !isTeamRound && form.scoringFormat === 'STABLEFORD'
  const expectedHoleCount = form.holeCount
  const hasPickedUpHole = holeEntries.some((hole) => hole.pickedUp)
  const completedStrokeCount = holeEntries.filter(({ strokesTaken, pickedUp }) => {
    if (pickedUp) return true
    const strokes = Number(strokesTaken)
    return strokesTaken.trim() !== '' && Number.isInteger(strokes) && strokes > 0
  }).length
  const scoreTotals = calculateRoundScoreTotals(holeEntries)
  const holeScoreTotal = scoreTotals.total ?? 0
  const declaredGrossScore = Number(form.grossScore)
  const scoreDifference =
    !hasPickedUpHole &&
    completedStrokeCount === expectedHoleCount &&
    Number.isInteger(declaredGrossScore) &&
    declaredGrossScore > 0
      ? holeScoreTotal - declaredGrossScore
      : 0
  const playingHandicap = Number(form.playingHandicap)
  const stablefordTotals = calculateStablefordTotals(
    holeEntries,
    playingHandicap,
  )
  const stablefordRankByHole = new Map(
    [...holeEntries]
      .sort((left, right) => Number(left.strokeIndex) - Number(right.strokeIndex))
      .map((hole, index) => [hole.holeNumber, index + 1]),
  )

  const suggestedPlayingHandicap = (() => {
    const scorecardPar = holeEntries.length === expectedHoleCount
      ? holeEntries.reduce((total, hole) => total + Number(hole.par || 0), 0)
      : 0
    const par = form.holeCount === 18
      ? selectedTee?.par ?? (scorecardPar > 0 ? scorecardPar : null)
      : scorecardPar > 0 ? scorecardPar : null

    const courseRating = form.holeCount === 18
      ? selectedTee?.courseRating
      : form.nineHoleSegment === 'FRONT_NINE'
        ? selectedTee?.frontNineCourseRating
        : selectedTee?.backNineCourseRating
    const slopeRating = form.holeCount === 18
      ? selectedTee?.slopeRating
      : form.nineHoleSegment === 'FRONT_NINE'
        ? selectedTee?.frontNineSlopeRating
        : selectedTee?.backNineSlopeRating

    if (!selectedTee || !profile || profile.handicapIndex === null || par === null || courseRating === null || courseRating === undefined || slopeRating === null || slopeRating === undefined) return ''

    return String(
      calculateCourseHandicap(
        profile.handicapIndex,
        slopeRating,
        courseRating,
        par,
      ),
    )
  })()

  useEffect(() => {
    const controller = new AbortController()

    async function loadFavourites() {
      setIsLoadingFavourites(true)
      try {
        const response = await authenticatedFetch(buildCoursePreferencePath(), {
          signal: controller.signal,
        })

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              'We could not load your favourite courses.',
            ),
          )
        }

        const body: unknown = await response.json()
        if (!isCoursePreferencesResponse(body)) {
          throw new Error('Your favourite-course details were incomplete.')
        }

        setFavourites(body.favourites)
        setFavouritesError('')
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setFavouritesError(
          error instanceof Error
            ? error.message
            : 'We could not load your favourite courses.',
        )
      } finally {
        setIsLoadingFavourites(false)
      }
    }

    void loadFavourites()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    async function loadFriends() {
      try {
        const response = await authenticatedFetch('/api/users/me/friends', {
          signal: controller.signal,
        })
        if (!response.ok) throw new Error(await readApiError(response, 'We could not load your friends.'))
        const body: unknown = await response.json()
        if (!isFriendsResponse(body)) throw new Error('Your friend details were incomplete.')
        if (!controller.signal.aborted) {
          setFriends(body.friends)
          setFriendsError('')
        }
      } catch (error: unknown) {
        if (controller.signal.aborted) return
        setFriendsError(error instanceof Error ? error.message : 'We could not load your friends.')
      }
    }
    void loadFriends()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!form.teeId || isTeamRound) {
      return
    }

    const controller = new AbortController()

    async function loadScorecard() {
      setScorecardStatus('loading')
      setScorecardSource(null)
      setHoleEntries([])
      setScorecardLoadError('')

      try {
        const response = await authenticatedFetch(
          `/api/tees/${encodeURIComponent(form.teeId)}/scorecard${form.holeCount === 9 ? `?segment=${form.nineHoleSegment}` : ''}`,
          { signal: controller.signal },
        )

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              'We could not load this tee’s scorecard. Please try again.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!isScorecardResponse(body)) {
          throw new Error('The scorecard returned was incomplete.')
        }

        if (body.status === 'available') {
          setScorecardStatus('available')
          setScorecardSource(body.source)
          setHoleEntries(getHoleEntries(body.holes, form.holeCount, form.nineHoleSegment))
        } else {
          setScorecardStatus('manual_required')
          setHoleEntries(getEmptyManualCard(form.holeCount, form.nineHoleSegment))
        }
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return
        }

        setScorecardStatus('idle')
        setHoleEntries([])
        setScorecardLoadError(
          error instanceof TypeError
            ? 'We could not reach the server. Check your connection and try again.'
            : error instanceof Error
              ? error.message
              : 'We could not load this tee’s scorecard. Please try again.',
        )
      }
    }

    void loadScorecard()

    return () => controller.abort()
  }, [form.teeId, form.holeCount, form.nineHoleSegment, isTeamRound])

  useEffect(() => {
    if (!isStableford || form.playingHandicap !== '') return

    if (suggestedPlayingHandicap !== '') {
      // This synchronizes the editable field after an asynchronously loaded
      // scorecard supplies the par needed for the tee-based suggestion.
      // oxlint-disable-next-line react/set-state-in-effect
      setForm((current) => ({
        ...current,
        playingHandicap: suggestedPlayingHandicap,
      }))
    }
  }, [form.playingHandicap, isStableford, suggestedPlayingHandicap])

  async function handleCourseSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const club = clubQuery.trim()
    const course = courseQuery.trim()

    if (!club && !course) {
      setCourseSearchError('Enter a club name, a course name, or both')
      return
    }

    setIsSearching(true)
    setCourseSearchError('')
    setSubmitError('')

    try {
      const response = await authenticatedFetch(
        buildCatalogueCoursesPath({ club, course, page: 1, pageSize: 10 }),
      )

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not search the course catalogue. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isCatalogueCoursesResponse(body)) {
        throw new Error('The course search results returned were incomplete.')
      }

      const nextOptions = getTeeOptions(body, favourites)
      const defaultTeeId = favourites.find(
        (favourite) =>
          favourite.defaultTeeId &&
          nextOptions.some(
            (option) => option.id === favourite.defaultTeeId,
          ),
      )?.defaultTeeId
      setCatalogueResponse(body)
      setForm((current) => ({
        ...current,
        teeId:
          defaultTeeId ??
          (nextOptions.some((option) => option.id === current.teeId)
            ? current.teeId
            : (nextOptions[0]?.id ?? '')),
      }))
      setErrors((current) => ({ ...current, teeId: undefined }))
    } catch (error: unknown) {
      setCatalogueResponse(null)
      setForm((current) => ({ ...current, teeId: '' }))
      setCourseSearchError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not search the course catalogue. Please try again.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  function updateField<Field extends keyof RoundForm>(
    field: Field,
    value: RoundForm[Field],
  ) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setSubmitError('')
  }

  function updateTee(teeId: string) {
    setForm((current) => ({
      ...current,
      teeId,
      playingHandicap:
        current.scoringFormat === 'STABLEFORD' ? '' : current.playingHandicap,
    }))
    setErrors((current) => ({
      ...current,
      teeId: undefined,
      playingHandicap: undefined,
    }))
    setSubmitError('')
  }

  function updateCategory(category: RoundCategory) {
    setForm((current) => ({
      ...current,
      category,
      participation:
        category === 'COMPETITION' ? current.participation : 'INDIVIDUAL',
      competitionName:
        category === 'COMPETITION' ? current.competitionName : '',
      competitionFormat:
        category === 'COMPETITION'
          ? current.competitionFormat || 'Medal / Stroke Play'
          : '',
      competitionFormatOther: category === 'COMPETITION' ? current.competitionFormatOther : '',
      gameFormat: category === 'SOCIAL_GAME' ? current.gameFormat || 'Wolf' : '',
      gameFormatOther: category === 'SOCIAL_GAME' ? current.gameFormatOther : '',
      gameResult: category === 'SOCIAL_GAME' ? current.gameResult : '',
      numberOfPlayers:
        category === 'CASUAL' ? '' : current.numberOfPlayers || '1',
      playingPartnerIds: category === 'CASUAL' ? [] : current.playingPartnerIds,
      playingPartnerResults: category === 'CASUAL' ? {} : current.playingPartnerResults,
      guestPlayerNames: category === 'CASUAL' ? '' : current.guestPlayerNames,
      guestPlayerResults: category === 'CASUAL' ? {} : current.guestPlayerResults,
    }))
    setErrors((current) => ({
      ...current,
      competitionName: undefined,
      competitionFormat: undefined,
      gameFormat: undefined,
      playingPartners: undefined,
      numberOfPlayers: undefined,
      grossScore: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')
  }

  function updateParticipation(participation: RoundParticipation) {
    setForm((current) => ({
      ...current,
      participation,
      scoringFormat:
        participation === 'TEAM' ? 'STROKE_PLAY' : current.scoringFormat,
      playingHandicap: participation === 'TEAM' ? '' : current.playingHandicap,
      holeCount: participation === 'TEAM' ? 18 : current.holeCount,
      competitionFormat: participation === 'TEAM'
        ? 'Fourball Better Ball'
        : 'Medal / Stroke Play',
      competitionFormatOther: '',
    }))
    setErrors((current) => ({
      ...current,
      grossScore: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')

    if (participation === 'TEAM') {
      setScorecardStatus('idle')
      setScorecardSource(null)
      setHoleEntries([])
      setScorecardLoadError('')
    }
  }

  function updateHoleCount(holeCount: 9 | 18) {
    setForm((current) => ({
      ...current,
      holeCount,
      grossScore: '',
      playingHandicap:
        current.scoringFormat === 'STABLEFORD' ? '' : current.playingHandicap,
    }))
    setErrors((current) => ({
      ...current,
      grossScore: undefined,
      playingHandicap: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')
  }

  function togglePlayingPartner(playerId: string) {
    setForm((current) => {
      const removing = current.playingPartnerIds.includes(playerId)
      const playingPartnerResults = { ...current.playingPartnerResults }
      if (removing) delete playingPartnerResults[playerId]
      else playingPartnerResults[playerId] = ''
      return {
        ...current,
        playingPartnerIds: removing
          ? current.playingPartnerIds.filter((id) => id !== playerId)
          : [...current.playingPartnerIds, playerId],
        playingPartnerResults,
      }
    })
    setErrors((current) => ({ ...current, playingPartners: undefined }))
  }

  function updateNineHoleSegment(
    nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE',
  ) {
    setForm((current) => ({
      ...current,
      nineHoleSegment,
      grossScore: '',
      playingHandicap:
        current.scoringFormat === 'STABLEFORD' ? '' : current.playingHandicap,
    }))
    setErrors((current) => ({
      ...current,
      grossScore: undefined,
      playingHandicap: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')
  }

  function updateScoringFormat(scoringFormat: RoundScoringFormat) {
    setForm((current) => ({
      ...current,
      scoringFormat,
      playingHandicap:
        scoringFormat === 'STABLEFORD'
          ? current.playingHandicap || suggestedPlayingHandicap
          : '',
      grossScore:
        scoringFormat === 'STROKE_PLAY' && hasPickedUpHole
          ? ''
          : current.grossScore,
    }))
    if (scoringFormat === 'STROKE_PLAY' && hasPickedUpHole) {
      setHoleEntries((current) =>
        current.map((hole) => ({ ...hole, pickedUp: false })),
      )
    }
    setErrors((current) => ({
      ...current,
      playingHandicap: undefined,
      grossScore: undefined,
      scorecard: undefined,
    }))
    setSubmitError('')
  }

  function updatePickedUp(holeNumber: number, pickedUp: boolean) {
    setHoleEntries((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber
          ? { ...hole, pickedUp, strokesTaken: pickedUp ? '' : hole.strokesTaken }
          : hole,
      ),
    )
    if (pickedUp) {
      updateField('grossScore', '')
    }
    setErrors((current) => ({ ...current, scorecard: undefined, grossScore: undefined }))
  }

  function updateHoleEntry(
    holeNumber: number,
    field: keyof Omit<HoleEntry, 'holeNumber'>,
    value: string,
  ) {
    setHoleEntries((current) =>
      current.map((hole) =>
        hole.holeNumber === holeNumber ? { ...hole, [field]: value } : hole,
      ),
    )
    setErrors((current) => ({ ...current, scorecard: undefined }))
    setSubmitError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!profile) {
      return
    }

    const nextErrors: RoundFormErrors = {}
    const grossScore = Number(form.grossScore)

    if (form.notes.length > ROUND_NOTES_MAX_LENGTH) {
      nextErrors.notes = `Keep your round notes to ${ROUND_NOTES_MAX_LENGTH.toLocaleString('en-GB')} characters or fewer`
    }

    if (!selectedTee) {
      nextErrors.teeId = 'Choose a saved tee'
    }

    if (form.datePlayed === '') {
      nextErrors.datePlayed = 'Choose the date played'
    } else if (form.datePlayed > getToday()) {
      nextErrors.datePlayed = 'The round date cannot be in the future'
    }

    if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(form.timePlayed)) {
      nextErrors.timePlayed = 'Choose the time played'
    }

    const numberOfPlayers = Number(form.numberOfPlayers)
    const guestPlayerNames = form.guestPlayerNames
      .split(/[,\n]/)
      .map((name) => name.trim())
      .filter(Boolean)
    const competitionFormat = form.competitionFormat === 'OTHER'
      ? `Other — ${form.competitionFormatOther.trim()}`
      : form.competitionFormat
    const gameFormat = form.gameFormat === 'OTHER'
      ? `Other — ${form.gameFormatOther.trim()}`
      : form.gameFormat

    if (isCompetition) {
      if (
        form.competitionName.trim().length < 2 ||
        form.competitionName.trim().length > 120
      ) {
        nextErrors.competitionName =
          'Enter the competition name (2–120 characters)'
      }

      if (
        competitionFormat.trim().length < 2 ||
        competitionFormat.trim().length > 100 ||
        (form.competitionFormat === 'OTHER' && form.competitionFormatOther.trim().length < 2)
      ) {
        nextErrors.competitionFormat =
          'Enter the competition format (2–100 characters)'
      }

      if (
        form.numberOfPlayers.trim() === '' ||
        !Number.isInteger(numberOfPlayers) ||
        numberOfPlayers <= 0 ||
        numberOfPlayers > 10000
      ) {
        nextErrors.numberOfPlayers =
          'Enter the number of players as a positive whole number'
      }
    }

    if (isSocialGame) {
      if (
        gameFormat.trim().length < 2 || gameFormat.trim().length > 100 ||
        (form.gameFormat === 'OTHER' && form.gameFormatOther.trim().length < 2)
      ) {
        nextErrors.gameFormat = 'Choose a game or describe the other format'
      }
      if (
        form.numberOfPlayers.trim() === '' || !Number.isInteger(numberOfPlayers) ||
        numberOfPlayers <= 0 || numberOfPlayers > 100
      ) {
        nextErrors.numberOfPlayers = 'Enter the number of players (1–100)'
      }
    }

    if (isOrganisedRound) {
      if (guestPlayerNames.length > 20 || guestPlayerNames.some((name) => name.length < 2 || name.length > 80)) {
        nextErrors.playingPartners = 'Add no more than 20 guest names of 2–80 characters each'
      }
      if (form.playingPartnerIds.length + guestPlayerNames.length > Math.max(numberOfPlayers - 1, 0)) {
        nextErrors.playingPartners = 'The named playing partners exceed the number of other players in this round'
      }
    }

    if (!isTeamRound) {
      if (isStableford && (
        form.playingHandicap.trim() === '' ||
        !Number.isInteger(playingHandicap) ||
        playingHandicap < -20 ||
        playingHandicap > 54
      )) {
        nextErrors.playingHandicap =
          'Enter the Playing Handicap from the card (-20 to 54)'
      }

      if (!hasPickedUpHole && (
        form.grossScore.trim() === '' ||
        !Number.isInteger(grossScore) ||
        grossScore <= 0
      )) {
        nextErrors.grossScore = 'Enter a whole-number total score'
      }

      if (scorecardStatus === 'loading') {
        nextErrors.scorecard = 'Wait for the scorecard to finish loading'
      } else if (holeEntries.length !== expectedHoleCount) {
        nextErrors.scorecard = `Load a complete ${expectedHoleCount}-hole scorecard`
      } else if (completedStrokeCount !== expectedHoleCount) {
        nextErrors.scorecard = isStableford
          ? 'Enter a whole-number score or mark Picked up for every hole'
          : 'Enter a whole-number stroke score for every hole'
      } else if (scorecardStatus === 'manual_required') {
        const hasInvalidDefinition = holeEntries.some((hole) => {
          const par = Number(hole.par)
          const strokeIndex = Number(hole.strokeIndex)
          const yardage = Number(hole.yardage)

          return (
            !Number.isInteger(par) ||
            par < 2 ||
            par > 7 ||
            !Number.isInteger(strokeIndex) ||
            strokeIndex < 1 ||
            strokeIndex > 18 ||
            (hole.yardage.trim() !== '' &&
              (!Number.isInteger(yardage) || yardage <= 0))
          )
        })
        const strokeIndexes = new Set(
          holeEntries.map(({ strokeIndex }) => Number(strokeIndex)),
        )

        if (hasInvalidDefinition || strokeIndexes.size !== expectedHoleCount) {
          nextErrors.scorecard =
            `Enter par 2–7 and ${expectedHoleCount} unique stroke indexes. Yardage is optional.`
        }
      }

      if (
        !nextErrors.grossScore &&
        completedStrokeCount === expectedHoleCount &&
        scoreDifference !== 0
      ) {
        nextErrors.scorecard = `Your hole-by-hole scores total ${holeScoreTotal}, but your total score is ${grossScore}—a difference of ${Math.abs(scoreDifference)} ${Math.abs(scoreDifference) === 1 ? 'stroke' : 'strokes'}. Review your scorecard before submitting.`
      }
    }

    if (Object.keys(nextErrors).length > 0 || !selectedTee) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      const response = await authenticatedFetch('/api/rounds', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          teeId: selectedTee.id,
          datePlayed: form.datePlayed,
          timePlayed: form.timePlayed,
          category: form.category,
          participation: form.participation,
          notes: form.notes,
          ...(isCompetition
            ? {
                competitionName: form.competitionName.trim(),
                competitionFormat,
                numberOfPlayers,
              }
            : {}),
          ...(isSocialGame
            ? {
                gameFormat,
                ...(form.gameResult ? { gameResult: form.gameResult } : {}),
                numberOfPlayers,
              }
            : {}),
          ...(isOrganisedRound
            ? {
                playingPartnerIds: form.playingPartnerIds,
                guestPlayerNames,
                playingPartnerResults: Object.fromEntries(form.playingPartnerIds.map((id) => [id, form.playingPartnerResults[id] || null])),
                guestPlayerResults: Object.fromEntries(guestPlayerNames.map((name) => [name, form.guestPlayerResults[name] || null])),
              }
            : {}),
          ...(!isTeamRound
            ? {
                grossScore: hasPickedUpHole ? null : grossScore,
                scoringFormat: form.scoringFormat,
                holeCount: form.holeCount,
                ...(form.holeCount === 9
                  ? { nineHoleSegment: form.nineHoleSegment }
                  : {}),
                ...(isStableford ? { playingHandicap } : {}),
                weatherCondition: form.weatherCondition,
                holeScores: holeEntries.map((hole) => ({
                  holeNumber: hole.holeNumber,
                  par: Number(hole.par),
                  strokeIndex: Number(hole.strokeIndex),
                  strokesTaken: hole.pickedUp
                    ? null
                    : Number(hole.strokesTaken),
                  pickedUp: hole.pickedUp,
                  ...(hole.yardage.trim() === ''
                    ? {}
                    : { yardage: Number(hole.yardage) }),
                })),
              }
            : {}),
        }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not save this round. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isRoundResult(body)) {
        throw new Error('The saved round data returned was incomplete.')
      }

      setConfirmation({
        ...body,
        teeLabel: `${selectedTee.clubName} · ${selectedTee.courseName} · ${selectedTee.teeName}`,
      })
      onRoundLogged(body.handicapIndex)
    } catch (error: unknown) {
      setSubmitError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not save this round. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!profile) {
    return (
      <section className="rounds-page" id="rounds">
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            01
          </span>
          <p className="form-kicker">Player required</p>
          <h1>Create your profile before logging a round.</h1>
          <p>
            A round belongs to a player and updates that player’s Handicap
            Index.
          </p>
          <button type="button" onClick={onGoToProfile}>
            Go to profile
          </button>
        </div>
      </section>
    )
  }

  if (confirmation) {
    const isTeamConfirmation =
      confirmation.round.participation === 'TEAM'

    return (
      <section className="rounds-page" id="rounds">
        <div className="round-confirmation" aria-live="polite">
          <div className="round-confirmation-mark" aria-hidden="true">
            ✓
          </div>
          <p className="form-kicker">
            {isTeamConfirmation
              ? 'Team competition recorded'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Round saved for review'
              : 'Round recorded'}
          </p>
          <h1>
            {isTeamConfirmation
              ? 'Added to your golf record.'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Your card is with the admin.'
              : 'That one counts.'}
          </h1>
          <p className="round-confirmation-course">{confirmation.teeLabel}</p>
          {confirmation.round.competitionName ? (
            <p className="round-confirmation-competition">
              {confirmation.round.competitionName}
            </p>
          ) : null}
          {confirmation.round.gameFormat ? (
            <p className="round-confirmation-competition">
              {confirmation.round.gameFormat}{confirmation.round.gameResult ? ` · ${confirmation.round.gameResult === 'WON' ? 'Won' : confirmation.round.gameResult === 'LOST' ? 'Lost' : 'Tied'}` : ''}
            </p>
          ) : null}

          <div className="round-confirmation-grid">
            <div>
              <small>Date played</small>
              <strong>{formatRoundDate(confirmation.round.datePlayed)}</strong>
            </div>
            <div>
              <small>Time played</small>
              <strong>{confirmation.round.timePlayed ?? '—'}</strong>
            </div>
            {isTeamConfirmation ? (
              <>
                <div>
                  <small>Format</small>
                  <strong>{confirmation.round.competitionFormat}</strong>
                </div>
                <div>
                  <small>Players</small>
                  <strong>{confirmation.round.numberOfPlayers}</strong>
                </div>
                <div>
                  <small>Entry</small>
                  <strong>Team record</strong>
                </div>
              </>
            ) : confirmation.round.category === 'SOCIAL_GAME' ? (
              <>
                <div><small>Game</small><strong>{confirmation.round.gameFormat}</strong></div>
                <div><small>Players</small><strong>{confirmation.round.numberOfPlayers}</strong></div>
                <div><small>Result</small><strong>{confirmation.round.gameResult ? confirmation.round.gameResult.toLocaleLowerCase('en-GB') : 'Not recorded'}</strong></div>
                <div><small>Gross score</small><strong>{confirmation.round.grossScore ?? '—'}</strong></div>
              </>
            ) : (
              <>
                <div>
                  <small>
                    {confirmation.round.scoringFormat === 'STABLEFORD'
                      ? 'Stableford points'
                      : 'Gross score'}
                  </small>
                  <strong>
                    {confirmation.round.scoringFormat === 'STABLEFORD'
                      ? confirmation.round.stablefordPoints
                      : confirmation.round.grossScore}
                  </strong>
                </div>
                <div>
                  <small>
                    {confirmation.round.scoringFormat === 'STABLEFORD'
                      ? 'Playing Handicap'
                      : 'Adjusted'}
                  </small>
                  <strong>
                    {confirmation.round.scoringFormat === 'STABLEFORD'
                      ? confirmation.round.playingHandicap
                      : confirmation.round.adjustedGrossScore}
                  </strong>
                </div>
                <div>
                  <small>Differential</small>
                  <strong>
                    {confirmation.round.scoreDifferential?.toFixed(1) ?? '—'}
                  </strong>
                </div>
              </>
            )}
            <div className="round-confirmation-handicap">
              <small>New Handicap Index</small>
              <strong>
                {confirmation.handicapIndex === null
                  ? '—'
                  : confirmation.handicapIndex.toFixed(1)}
              </strong>
            </div>
          </div>

          <p className="round-capping-note">
            {isTeamConfirmation
              ? 'Team competition entries are saved for your playing history only. They do not affect your Handicap Index.'
              : confirmation.round.holeCount === 9
              ? 'Your nine-hole round is saved in History. It is not included in your Handicap Index because official expected-differential support is not yet available.'
              : confirmation.round.scorecardStatus === 'PENDING_REVIEW'
              ? 'Your strokes are saved. This round is provisionally calculated but will not affect your Handicap Index until the manually entered scorecard is approved.'
              : confirmation.round.isCapped
              ? 'Net Double Bogey adjustments were applied.'
              : 'The submitted hole-by-hole card was used to calculate the adjusted gross score.'}
          </p>

          <div className="round-confirmation-actions">
            <button
              className="round-secondary-button"
              type="button"
              onClick={onGoToHistory}
            >
              View round history
            </button>
            <button
              className="round-primary-button"
              type="button"
              onClick={() => {
                setConfirmation(null)
                setForm((current) => ({
                  ...current,
                  category: 'CASUAL',
                  participation: 'INDIVIDUAL',
                  scoringFormat: 'STROKE_PLAY',
                  playingHandicap: '',
                  holeCount: 18,
                  nineHoleSegment: 'FRONT_NINE',
                  competitionName: '',
                  competitionFormat: '',
                  competitionFormatOther: '',
                  gameFormat: '',
                  gameFormatOther: '',
                  gameResult: '',
                  playingPartnerIds: [],
                  playingPartnerResults: {},
                  guestPlayerNames: '',
                  guestPlayerResults: {},
                  numberOfPlayers: '',
                  grossScore: '',
                  notes: '',
                  timePlayed: getCurrentTime(),
                }))
                setHoleEntries((current) =>
                  current.map((hole) => ({
                    ...hole,
                    strokesTaken: '',
                    pickedUp: false,
                  })),
                )
              }}
            >
              Log another round
            </button>
          </div>
        </div>
      </section>
    )
  }

  return (
    <section className="rounds-page" id="rounds">
      <header className="rounds-hero">
        <div>
          <p className="eyebrow">
            <span aria-hidden="true" /> Round entry
          </p>
          <h1>
            Every round,
            <span>on the record.</span>
          </h1>
        </div>
        <p>
          Record a casual score, a competition, or a game with friends.
          Only complete individual cards can affect your Handicap Index.
        </p>
        <div className="rounds-hero-engraving" aria-hidden="true">
          <span />
          <img src={ledgerGreen} alt="" />
        </div>
      </header>

      <HandicapProgressionChart profileId={profile.id} />

      <form className="round-course-search" onSubmit={handleCourseSearch} noValidate>
        <div>
          <label>
            Club name
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Sickleholme"
              value={clubQuery}
              aria-invalid={Boolean(courseSearchError)}
              onChange={(event) => {
                setClubQuery(event.target.value)
                setCourseSearchError('')
              }}
            />
          </label>
          <label>
            Course name
            <input
              type="search"
              maxLength={100}
              autoComplete="off"
              placeholder="e.g. Old Course"
              value={courseQuery}
              aria-invalid={Boolean(courseSearchError)}
              onChange={(event) => {
                setCourseQuery(event.target.value)
                setCourseSearchError('')
              }}
            />
          </label>
          <button type="submit" disabled={isSearching || isLoadingFavourites}>
            {isLoadingFavourites
              ? 'Loading favourites…'
              : isSearching
                ? 'Searching…'
                : 'Find tees'}
          </button>
        </div>
        <small>
          Use either field or combine both for a narrower result. Favourite
          courses appear first and their default tee is selected automatically.
        </small>
      </form>

      {favouritesError ? (
        <p className="round-course-search-error" role="alert">
          {favouritesError} You can still choose a tee normally.
        </p>
      ) : null}

      {courseSearchError ? (
        <p className="round-course-search-error" role="alert">
          {courseSearchError}
        </p>
      ) : null}

      {isSearching ? (
        <div className="round-state-card" aria-live="polite">
          <div className="round-loading" aria-label="Searching for tees">
            <span />
            <span />
            <span />
          </div>
          <h2>Searching the course catalogue…</h2>
        </div>
      ) : null}

      {!isSearching && catalogueResponse && teeOptions.length === 0 ? (
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            00
          </span>
          <p className="form-kicker">No rated tees found</p>
          <h2>Try a broader course search.</h2>
          <p>
            Use fewer words or browse the full catalogue. Missing course
            details can be sent to the administrator from Courses.
          </p>
          <button type="button" onClick={onGoToCourses}>
            Browse courses
          </button>
        </div>
      ) : null}

      {!isSearching && !courseSearchError && !catalogueResponse ? (
        <div className="round-state-card">
          <span className="round-state-number" aria-hidden="true">
            01
          </span>
          <p className="form-kicker">Choose a rated tee</p>
          <h2>Find the course you played.</h2>
          <p>
            Search by club, course, or both. Only the matching tees will be
            loaded into your round form.
          </p>
        </div>
      ) : null}

      {!isSearching && teeOptions.length > 0 ? (
        <div className="round-entry-layout">
          <form className="round-entry-form" onSubmit={handleSubmit} noValidate>
            <div className="round-form-heading">
              <div>
                <p className="form-kicker">Score details</p>
                <h2>How did you play?</h2>
              </div>
              <span>{profile.name}</span>
            </div>

            <div className="round-field">
              <label htmlFor="round-tee">Course and tee</label>
              <select
                id="round-tee"
                value={form.teeId}
                aria-invalid={Boolean(errors.teeId)}
                aria-describedby={errors.teeId ? 'round-tee-error' : undefined}
                onChange={(event) => updateTee(event.target.value)}
              >
                {teeOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.isFavourite ? '★ ' : ''}
                    {option.clubName} — {option.courseName} — {option.teeName}
                  </option>
                ))}
              </select>
              {catalogueResponse && catalogueResponse.pagination.total > 10 ? (
                <small>
                  Showing tees from the first 10 matching courses. Refine your
                  search if the course you need is not listed.
                </small>
              ) : null}
              {errors.teeId ? (
                <span className="round-field-error" id="round-tee-error">
                  {errors.teeId}
                </span>
              ) : null}
            </div>

            <fieldset className="round-choice-fieldset">
              <legend>Round type</legend>
              <div className="round-choice-options">
                <label
                  className={
                    form.category === 'CASUAL'
                      ? 'round-choice-option round-choice-option-selected'
                      : 'round-choice-option'
                  }
                >
                  <input
                    type="radio"
                    name="round-category"
                    value="CASUAL"
                    checked={form.category === 'CASUAL'}
                    onChange={() => updateCategory('CASUAL')}
                  />
                  <span>
                    <strong>Casual round</strong>
                    <small>Individual score that may count</small>
                  </span>
                </label>
                <label
                  className={
                    form.category === 'COMPETITION'
                      ? 'round-choice-option round-choice-option-selected'
                      : 'round-choice-option'
                  }
                >
                  <input
                    type="radio"
                    name="round-category"
                    value="COMPETITION"
                    checked={form.category === 'COMPETITION'}
                    onChange={() => updateCategory('COMPETITION')}
                  />
                  <span>
                    <strong>Competition round</strong>
                    <small>Individual or team competition</small>
                  </span>
                </label>
                <label
                  className={
                    form.category === 'SOCIAL_GAME'
                      ? 'round-choice-option round-choice-option-selected'
                      : 'round-choice-option'
                  }
                >
                  <input
                    type="radio"
                    name="round-category"
                    value="SOCIAL_GAME"
                    checked={form.category === 'SOCIAL_GAME'}
                    onChange={() => updateCategory('SOCIAL_GAME')}
                  />
                  <span>
                    <strong>Game with friends</strong>
                    <small>Wolf, Sixes, Skins and more</small>
                  </span>
                </label>
              </div>
            </fieldset>

            {isCompetition ? (
              <>
                <fieldset className="round-choice-fieldset">
                  <legend>Participation</legend>
                  <div className="round-choice-options">
                    <label
                      className={
                        form.participation === 'INDIVIDUAL'
                          ? 'round-choice-option round-choice-option-selected'
                          : 'round-choice-option'
                      }
                    >
                      <input
                        type="radio"
                        name="round-participation"
                        value="INDIVIDUAL"
                        checked={form.participation === 'INDIVIDUAL'}
                        onChange={() => updateParticipation('INDIVIDUAL')}
                      />
                      <span>
                        <strong>Individual</strong>
                        <small>Submit your own complete score</small>
                      </span>
                    </label>
                    <label
                      className={
                        form.participation === 'TEAM'
                          ? 'round-choice-option round-choice-option-selected'
                          : 'round-choice-option'
                      }
                    >
                      <input
                        type="radio"
                        name="round-participation"
                        value="TEAM"
                        checked={form.participation === 'TEAM'}
                        onChange={() => updateParticipation('TEAM')}
                      />
                      <span>
                        <strong>Team / record only</strong>
                        <small>No gross score or handicap effect</small>
                      </span>
                    </label>
                  </div>
                </fieldset>

                <div className="round-field-row">
                  <div className="round-field">
                    <label htmlFor="round-competition-name">
                      Competition name
                    </label>
                    <input
                      id="round-competition-name"
                      type="text"
                      maxLength={120}
                      placeholder="e.g. Captain’s Day"
                      value={form.competitionName}
                      aria-invalid={Boolean(errors.competitionName)}
                      onChange={(event) =>
                        updateField('competitionName', event.target.value)
                      }
                    />
                    {errors.competitionName ? (
                      <span className="round-field-error">
                        {errors.competitionName}
                      </span>
                    ) : null}
                  </div>
                  <div className="round-field">
                    <label htmlFor="round-competition-format">
                      Competition format
                    </label>
                    <select
                      id="round-competition-format"
                      value={form.competitionFormat}
                      aria-invalid={Boolean(errors.competitionFormat)}
                      onChange={(event) => {
                        const format = event.target.value
                        setForm((current) => ({
                          ...current,
                          competitionFormat: format,
                          competitionFormatOther: format === 'OTHER' ? current.competitionFormatOther : '',
                          scoringFormat: format === 'Stableford' ? 'STABLEFORD' : format === 'Medal / Stroke Play' ? 'STROKE_PLAY' : current.scoringFormat,
                        }))
                        setErrors((current) => ({ ...current, competitionFormat: undefined }))
                      }}
                    >
                      {(form.participation === 'TEAM' ? TEAM_COMPETITION_FORMATS : INDIVIDUAL_COMPETITION_FORMATS).map((format) => <option key={format} value={format}>{format}</option>)}
                      <option value="OTHER">Other</option>
                    </select>
                    {form.competitionFormat === 'OTHER' ? <input type="text" maxLength={90} placeholder="Describe the format" value={form.competitionFormatOther} onChange={(event) => updateField('competitionFormatOther', event.target.value)} /> : null}
                    {errors.competitionFormat ? (
                      <span className="round-field-error">
                        {errors.competitionFormat}
                      </span>
                    ) : null}
                  </div>
                </div>

                <div className="round-field round-player-count-field">
                  <label htmlFor="round-player-count">Number of players</label>
                  <input
                    id="round-player-count"
                    type="number"
                    min="1"
                    max="10000"
                    step="1"
                    inputMode="numeric"
                    placeholder="e.g. 64"
                    value={form.numberOfPlayers}
                    aria-invalid={Boolean(errors.numberOfPlayers)}
                    onChange={(event) =>
                      updateField('numberOfPlayers', event.target.value)
                    }
                  />
                  {errors.numberOfPlayers ? (
                    <span className="round-field-error">
                      {errors.numberOfPlayers}
                    </span>
                  ) : null}
                </div>
              </>
            ) : null}

            {isSocialGame ? (
              <>
                <div className="round-field-row">
                  <div className="round-field">
                    <label htmlFor="round-game-format">Game</label>
                    <select id="round-game-format" value={form.gameFormat} aria-invalid={Boolean(errors.gameFormat)} onChange={(event) => updateField('gameFormat', event.target.value)}>
                      {SOCIAL_GAME_FORMATS.map((format) => <option key={format} value={format}>{format}</option>)}
                      <option value="OTHER">Other</option>
                    </select>
                    {form.gameFormat === 'OTHER' ? <input type="text" maxLength={90} placeholder="Describe the game" value={form.gameFormatOther} onChange={(event) => updateField('gameFormatOther', event.target.value)} /> : null}
                    {errors.gameFormat ? <span className="round-field-error">{errors.gameFormat}</span> : null}
                  </div>
                  <div className="round-field">
                    <label htmlFor="round-game-result">Your result</label>
                    <select id="round-game-result" value={form.gameResult} onChange={(event) => updateField('gameResult', event.target.value as RoundForm['gameResult'])}>
                      <option value="">Not recorded</option><option value="WON">Won</option><option value="LOST">Lost</option><option value="TIED">Tied</option>
                    </select>
                  </div>
                </div>
                <div className="round-field round-player-count-field">
                  <label htmlFor="round-game-player-count">Number of players</label>
                  <input id="round-game-player-count" type="number" min="1" max="100" step="1" value={form.numberOfPlayers} onChange={(event) => updateField('numberOfPlayers', event.target.value)} />
                  {errors.numberOfPlayers ? <span className="round-field-error">{errors.numberOfPlayers}</span> : null}
                </div>
              </>
            ) : null}

            {isOrganisedRound ? (
              <fieldset className="round-partners-fieldset">
                <legend>Who played with you? <small>Optional</small></legend>
                {friends.length > 0 ? <div className="round-partner-options">{friends.map((item) => {
                  const selected = form.playingPartnerIds.includes(item.player.id)
                  return <div className="round-partner-option" key={item.player.id}><label><input type="checkbox" checked={selected} onChange={() => togglePlayingPartner(item.player.id)} /><span><strong>{item.player.name}</strong><small>{item.player.homeClub?.name ?? 'Home club not set'}</small></span></label>{selected ? <select aria-label={`Result against ${item.player.name}`} value={form.playingPartnerResults[item.player.id] ?? ''} onChange={(event) => setForm((current) => ({ ...current, playingPartnerResults: { ...current.playingPartnerResults, [item.player.id]: event.target.value as RoundGameResult | '' } }))}><option value="">No result</option><option value="WON">Won</option><option value="LOST">Lost</option><option value="TIED">Tied</option></select> : null}</div>
                })}</div> : <p className="round-partners-help">{friendsError || 'Add accepted friends from the Friends screen to link their profiles.'}</p>}
                <div className="round-field"><label htmlFor="round-guests">Guests without an account</label><textarea id="round-guests" rows={2} placeholder="One name per line, or separate names with commas" value={form.guestPlayerNames} onChange={(event) => updateField('guestPlayerNames', event.target.value)} /></div>
                {form.guestPlayerNames.split(/[,\n]/).map((name) => name.trim()).filter(Boolean).map((name) => <label className="round-guest-result" key={name}>Result against {name}<select value={form.guestPlayerResults[name] ?? ''} onChange={(event) => setForm((current) => ({ ...current, guestPlayerResults: { ...current.guestPlayerResults, [name]: event.target.value as RoundGameResult | '' } }))}><option value="">No result</option><option value="WON">Won</option><option value="LOST">Lost</option><option value="TIED">Tied</option></select></label>)}
                <p className="round-partners-help">Linked friends can see this tag and remove themselves. They cannot see your private card, note, or photo.</p>
                {errors.playingPartners ? <span className="round-field-error">{errors.playingPartners}</span> : null}
              </fieldset>
            ) : null}

            <div className="round-field-row">
              <div className="round-field">
                <label htmlFor="round-date">Date played</label>
                <input
                  id="round-date"
                  type="date"
                  max={getToday()}
                  value={form.datePlayed}
                  aria-invalid={Boolean(errors.datePlayed)}
                  aria-describedby={
                    errors.datePlayed ? 'round-date-error' : undefined
                  }
                  onChange={(event) =>
                    updateField('datePlayed', event.target.value)
                  }
                />
                {errors.datePlayed ? (
                  <span className="round-field-error" id="round-date-error">
                    {errors.datePlayed}
                  </span>
                ) : null}
              </div>

              <div className="round-field">
                <label htmlFor="round-time">Time played</label>
                <input
                  id="round-time"
                  type="time"
                  value={form.timePlayed}
                  aria-invalid={Boolean(errors.timePlayed)}
                  onChange={(event) =>
                    updateField('timePlayed', event.target.value)
                  }
                />
                {errors.timePlayed ? (
                  <span className="round-field-error">
                    {errors.timePlayed}
                  </span>
                ) : null}
              </div>
            </div>

            {!isTeamRound ? (
              <>
              <fieldset className="round-choice-fieldset">
                <legend>Holes played</legend>
                <div className="round-choice-options">
                  <label className={form.holeCount === 18 ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                    <input type="radio" name="hole-count" checked={form.holeCount === 18} onChange={() => updateHoleCount(18)} />
                    <span><strong>18 holes</strong><small>A complete rated round</small></span>
                  </label>
                  <label className={form.holeCount === 9 ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                    <input type="radio" name="hole-count" checked={form.holeCount === 9} onChange={() => updateHoleCount(9)} />
                    <span><strong>9 holes</strong><small>Front or back rated nine</small></span>
                  </label>
                </div>
              </fieldset>

              {form.holeCount === 9 ? (
                <fieldset className="round-choice-fieldset">
                  <legend>Nine played</legend>
                  <div className="round-choice-options">
                    <label className={form.nineHoleSegment === 'FRONT_NINE' ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                      <input type="radio" name="nine-segment" checked={form.nineHoleSegment === 'FRONT_NINE'} onChange={() => updateNineHoleSegment('FRONT_NINE')} />
                      <span><strong>Front 9</strong><small>Holes 1–9</small></span>
                    </label>
                    <label className={form.nineHoleSegment === 'BACK_NINE' ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                      <input type="radio" name="nine-segment" checked={form.nineHoleSegment === 'BACK_NINE'} onChange={() => updateNineHoleSegment('BACK_NINE')} />
                      <span><strong>Back 9</strong><small>Holes 10–18</small></span>
                    </label>
                  </div>
                  <small>Nine-hole rounds are saved to your record. They remain outside the Handicap Index until an official expected differential is available.</small>
                </fieldset>
              ) : null}

              <fieldset className="round-choice-fieldset">
                <legend>Scoring method</legend>
                <div className="round-choice-options">
                  <label className={form.scoringFormat === 'STROKE_PLAY' ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                    <input type="radio" name="scoring-format" checked={form.scoringFormat === 'STROKE_PLAY'} onChange={() => updateScoringFormat('STROKE_PLAY')} />
                    <span><strong>Stroke play</strong><small>Record a complete gross score</small></span>
                  </label>
                  <label className={form.scoringFormat === 'STABLEFORD' ? 'round-choice-option round-choice-option-selected' : 'round-choice-option'}>
                    <input type="radio" name="scoring-format" checked={form.scoringFormat === 'STABLEFORD'} onChange={() => updateScoringFormat('STABLEFORD')} />
                    <span><strong>Stableford</strong><small>Score points from each net hole result</small></span>
                  </label>
                </div>
              </fieldset>

              {isStableford ? (
                <div className="round-field round-playing-handicap-field">
                  <label htmlFor="round-playing-handicap">Playing Handicap</label>
                  <input
                    id="round-playing-handicap"
                    type="number"
                    min="-20"
                    max="54"
                    step="1"
                    inputMode="numeric"
                    value={form.playingHandicap}
                    aria-invalid={Boolean(errors.playingHandicap)}
                    onChange={(event) => updateField('playingHandicap', event.target.value)}
                  />
                  {errors.playingHandicap ? (
                    <span className="round-field-error">{errors.playingHandicap}</span>
                  ) : (
                    <small>Use the Playing Handicap shown on the competition or scorecard. The suggested value uses this tee’s Course Handicap.</small>
                  )}
                </div>
              ) : null}

              {hasPickedUpHole ? (
                <div className="round-scorecard-notice">
                  No gross total is required because at least one Stableford hole was picked up. A Net Double Bogey replacement will be used only for handicap processing.
                </div>
              ) : (
              <div className="round-field round-gross-score-field">
                <label htmlFor="round-score">Total gross score</label>
                <input
                  id="round-score"
                  type="number"
                  min="1"
                  step="1"
                  inputMode="numeric"
                  placeholder="e.g. 84"
                  value={form.grossScore}
                  aria-invalid={Boolean(errors.grossScore)}
                  aria-describedby={
                    errors.grossScore ? 'round-score-error' : 'round-score-note'
                  }
                  onChange={(event) =>
                    updateField('grossScore', event.target.value)
                  }
                />
                {errors.grossScore ? (
                  <span className="round-field-error" id="round-score-error">
                    {errors.grossScore}
                  </span>
                ) : (
                  <small id="round-score-note">
                    Enter the signed total from your card.
                  </small>
                )}
              </div>
              )}

            <section className="round-scorecard" aria-labelledby="round-scorecard-title">
              <div className="round-scorecard-heading">
                <div>
                  <p className="form-kicker">Hole-by-hole scorecard</p>
                  <h3 id="round-scorecard-title">Check every hole.</h3>
                </div>
                <div className="round-scorecard-total" aria-live="polite">
                  <small>{isStableford ? 'Stableford points' : 'Running total'}</small>
                  <strong>{isStableford ? (stablefordTotals.total ?? '—') : (holeScoreTotal || '—')}</strong>
                  <span>{completedStrokeCount}/{expectedHoleCount} holes</span>
                </div>
              </div>

              {scorecardStatus === 'loading' ? (
                <p className="round-scorecard-notice" role="status">
                  Loading saved hole details…
                </p>
              ) : null}

              {scorecardLoadError ? (
                <p className="round-scorecard-notice round-scorecard-notice-error" role="alert">
                  {scorecardLoadError}
                </p>
              ) : null}

              {scorecardStatus === 'available' ? (
                <p className="round-scorecard-notice">
                  Par, stroke index and available yardages are locked to the {scorecardSource === 'provider' ? 'provider' : 'approved'} scorecard. Enter your strokes for all {expectedHoleCount} holes.
                </p>
              ) : null}

              {scorecardStatus === 'manual_required' ? (
                <p className="round-scorecard-notice round-scorecard-notice-review">
                  No complete scorecard is available for this tee. Enter par and stroke index; yardage is optional. Your round will be saved for administrator review. {form.holeCount === 9 ? 'After approval it will be available for future rounds, but this nine remains outside your Handicap Index until official expected-differential support is available.' : 'It will not affect your Handicap Index until approval.'}
                </p>
              ) : null}

              {holeEntries.length === expectedHoleCount ? (
                <div className="round-scorecard-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th scope="col">Hole</th>
                        <th scope="col">Par</th>
                        <th scope="col">SI</th>
                        <th scope="col">Yards</th>
                        <th scope="col">Strokes</th>
                        {isStableford ? <th scope="col">Picked up</th> : null}
                        {isStableford ? <th scope="col">Net</th> : null}
                        {isStableford ? <th scope="col">Points</th> : null}
                      </tr>
                    </thead>
                    <tbody>
                      {holeEntries.map((hole, index) => (
                        <Fragment key={hole.holeNumber}>
                        <tr>
                          <th scope="row">{hole.holeNumber}</th>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} par`}
                                type="number"
                                min="2"
                                max="7"
                                step="1"
                                inputMode="numeric"
                                value={hole.par}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'par', event.target.value)
                                }
                              />
                            ) : (
                              hole.par
                            )}
                          </td>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} stroke index`}
                                type="number"
                                min="1"
                                max="18"
                                step="1"
                                inputMode="numeric"
                                value={hole.strokeIndex}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'strokeIndex', event.target.value)
                                }
                              />
                            ) : (
                              hole.strokeIndex
                            )}
                          </td>
                          <td>
                            {scorecardStatus === 'manual_required' ? (
                              <input
                                aria-label={`Hole ${hole.holeNumber} yardage optional`}
                                type="number"
                                min="1"
                                step="1"
                                inputMode="numeric"
                                placeholder="—"
                                value={hole.yardage}
                                onChange={(event) =>
                                  updateHoleEntry(hole.holeNumber, 'yardage', event.target.value)
                                }
                              />
                            ) : (
                              hole.yardage || '—'
                            )}
                          </td>
                          <td>
                            <input
                              className="round-strokes-input"
                              aria-label={`Hole ${hole.holeNumber} strokes`}
                              type="number"
                              min="1"
                              step="1"
                              inputMode="numeric"
                              value={hole.strokesTaken}
                              disabled={hole.pickedUp}
                              onChange={(event) =>
                                updateHoleEntry(hole.holeNumber, 'strokesTaken', event.target.value)
                              }
                            />
                          </td>
                          {isStableford ? (
                            <td>
                              <input
                                aria-label={`Hole ${hole.holeNumber} picked up`}
                                type="checkbox"
                                checked={hole.pickedUp}
                                onChange={(event) => updatePickedUp(hole.holeNumber, event.target.checked)}
                              />
                            </td>
                          ) : null}
                          {isStableford ? (
                            <td>
                              {hole.pickedUp ||
                              hole.strokesTaken === '' ||
                              !Number.isInteger(playingHandicap) ||
                              !Number.isInteger(Number(hole.strokeIndex))
                                ? '—'
                                : Number(hole.strokesTaken) - Math.floor((playingHandicap + expectedHoleCount - (stablefordRankByHole.get(hole.holeNumber) ?? Number(hole.strokeIndex))) / expectedHoleCount)}
                            </td>
                          ) : null}
                          {isStableford ? <td>{stablefordTotals.points[index] ?? '—'}</td> : null}
                        </tr>
                        {form.holeCount === 18 && hole.holeNumber === 9 ? (
                          <tr className="round-nine-total">
                            <th scope="row" colSpan={isStableford ? 7 : 4}>Front 9 total</th>
                            <td>{isStableford ? (stablefordTotals.frontNine ?? '—') : (scoreTotals.frontNine ?? '—')}</td>
                          </tr>
                        ) : null}
                        {form.holeCount === 18 && hole.holeNumber === 18 ? (
                          <>
                            <tr className="round-nine-total">
                              <th scope="row" colSpan={isStableford ? 7 : 4}>Back 9 total</th>
                              <td>{isStableford ? (stablefordTotals.backNine ?? '—') : (scoreTotals.backNine ?? '—')}</td>
                            </tr>
                            <tr className="round-nine-total round-eighteen-total">
                              <th scope="row" colSpan={isStableford ? 7 : 4}>18-hole total</th>
                              <td>{isStableford ? (stablefordTotals.total ?? '—') : (scoreTotals.total ?? '—')}</td>
                            </tr>
                          </>
                        ) : null}
                        {form.holeCount === 9 && index === holeEntries.length - 1 ? (
                          <tr className="round-nine-total round-eighteen-total">
                            <th scope="row" colSpan={isStableford ? 7 : 4}>{form.nineHoleSegment === 'FRONT_NINE' ? 'Front 9' : 'Back 9'} total</th>
                            <td>{isStableford ? (stablefordTotals.total ?? '—') : (scoreTotals.total ?? '—')}</td>
                          </tr>
                        ) : null}
                        </Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : null}

              {scoreDifference !== 0 ? (
                <p className="round-score-mismatch" role="alert">
                  Your hole-by-hole scores total {holeScoreTotal}, but your total score is {declaredGrossScore}—a difference of {Math.abs(scoreDifference)} {Math.abs(scoreDifference) === 1 ? 'stroke' : 'strokes'}. Review your scorecard before submitting.
                </p>
              ) : null}

              {errors.scorecard && scoreDifference === 0 ? (
                <p className="round-field-error" role="alert">
                  {errors.scorecard}
                </p>
              ) : null}
            </section>

            <fieldset className="weather-fieldset">
              <legend>Playing conditions</legend>
              <div className="weather-options">
                {WEATHER_OPTIONS.map((weather) => (
                  <label
                    className={
                      form.weatherCondition === weather.value
                        ? 'weather-option weather-option-selected'
                        : 'weather-option'
                    }
                    key={weather.value}
                  >
                    <input
                      type="radio"
                      name="weather-condition"
                      value={weather.value}
                      checked={form.weatherCondition === weather.value}
                      onChange={() =>
                        updateField('weatherCondition', weather.value)
                      }
                    />
                    <span>
                      <strong>{weather.label}</strong>
                      <small>{weather.description}</small>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
              </>
            ) : (
              <div className="round-team-record-notice">
                <strong>No scorecard is required.</strong>
                <p>
                  This team competition will appear in your history with its
                  course, date, time and competition details. It will not
                  change your Handicap Index.
                </p>
              </div>
            )}

            <div className="round-field round-notes-field">
              <label htmlFor="round-notes">Round notes <span>Optional</span></label>
              <textarea
                id="round-notes"
                rows={5}
                maxLength={ROUND_NOTES_MAX_LENGTH}
                placeholder="How did the round feel? Add memorable shots, lessons, or anything you want to revisit."
                value={form.notes}
                aria-invalid={Boolean(errors.notes)}
                aria-describedby="round-notes-help"
                onChange={(event) => updateField('notes', event.target.value)}
              />
              <div className="round-notes-help" id="round-notes-help">
                <small>Private to your account. You can edit this later in Round History.</small>
                <small>{form.notes.length.toLocaleString('en-GB')} / {ROUND_NOTES_MAX_LENGTH.toLocaleString('en-GB')}</small>
              </div>
              {errors.notes ? <span className="round-field-error">{errors.notes}</span> : null}
            </div>

            {submitError ? (
              <div className="round-submit-error" role="alert">
                <span aria-hidden="true">!</span>
                {submitError}
              </div>
            ) : null}

            <button
              className="round-primary-button"
              type="submit"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? 'Saving round…'
                  : isTeamRound
                    ? 'Add team round to history'
                    : 'Record this round'}
              </span>
              <svg viewBox="0 0 24 24" aria-hidden="true">
                <path d="M5 12h14m-5-5 5 5-5 5" />
              </svg>
            </button>
          </form>

          <aside className="round-summary" aria-live="polite">
            <p className="round-summary-label">Selected tee</p>
            <h2>{selectedTee?.clubName}</h2>
            <p className="round-summary-course">
              {selectedTee?.courseName} · {selectedTee?.teeName}
            </p>

            <dl className="round-rating-grid">
              <div>
                <dt>Course rating</dt>
                <dd>{selectedTee?.courseRating.toFixed(1)}</dd>
              </div>
              <div>
                <dt>Slope</dt>
                <dd>{selectedTee?.slopeRating}</dd>
              </div>
              <div>
                <dt>Par</dt>
                <dd>{selectedTee?.par ?? '—'}</dd>
              </div>
            </dl>

            <div className="round-handicap-preview">
              <small>Current Handicap Index</small>
              <strong>
                {profile.handicapIndex === null
                  ? '—'
                  : profile.handicapIndex.toFixed(1)}
              </strong>
              <span>
                {isTeamRound
                  ? 'Unaffected by this team entry'
                  : 'Recalculated when this round is saved'}
              </span>
            </div>

            <p className="round-summary-note">
              {isTeamRound
                ? 'Team competitions are preserved in your golf history as record-only entries, without a score differential or counting-round status.'
                : 'Hole-by-hole scores must match the signed total. Net Double Bogey capping uses the approved card; PCC defaults to 0 for this round.'}
            </p>
          </aside>
        </div>
      ) : null}
    </section>
  )
}

export default RoundEntry
