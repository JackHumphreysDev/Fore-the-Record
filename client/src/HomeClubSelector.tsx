import { useState, type FormEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildCatalogueClubsPath,
  isCatalogueClubsResponse,
  type CatalogueClub,
} from './courseCatalogueApi.ts'
import './HomeClubSelector.css'

type HomeClub = {
  id: string
  name: string
}

type HomeClubUpdate = {
  homeClubId: string | null
  homeClub: HomeClub | null
}

type HomeClubSelectorProps = {
  homeClubId: string | null
  homeClub: HomeClub | null | undefined
  onHomeClubUpdated: (update: HomeClubUpdate) => void
  onGoToCourses: () => void
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHomeClub(value: unknown): value is HomeClub {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    typeof value.name === 'string'
  )
}

function isHomeClubUpdate(value: unknown): value is HomeClubUpdate {
  return (
    isRecord(value) &&
    (value.homeClubId === null || typeof value.homeClubId === 'string') &&
    (value.homeClub === null || isHomeClub(value.homeClub))
  )
}

async function readApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  return isRecord(body) && typeof body.error === 'string'
    ? body.error
    : fallbackMessage
}

function formatClubLocation(club: CatalogueClub): string {
  return [club.city, club.county, club.postcode].filter(Boolean).join(', ')
}

function HomeClubSelector({
  homeClubId,
  homeClub,
  onHomeClubUpdated,
  onGoToCourses,
}: HomeClubSelectorProps) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<CatalogueClub[]>([])
  const [hasSearched, setHasSearched] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [savingClubId, setSavingClubId] = useState<string | null>(null)
  const [searchError, setSearchError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  async function searchClubs(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const search = query.trim()

    if (!search) {
      setSearchError('Enter all or part of a club name')
      return
    }

    setIsSearching(true)
    setHasSearched(false)
    setSearchError('')
    setUpdateError('')
    setStatusMessage('')

    try {
      const response = await authenticatedFetch(
        buildCatalogueClubsPath(search, 1, 10),
      )

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not search the club catalogue. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isCatalogueClubsResponse(body)) {
        throw new Error('The club search results returned were incomplete.')
      }

      setResults(body.clubs)
      setHasSearched(true)
    } catch (error: unknown) {
      setResults([])
      setSearchError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not search the club catalogue. Please try again.',
      )
    } finally {
      setIsSearching(false)
    }
  }

  async function saveHomeClub(nextHomeClubId: string | null) {
    setSavingClubId(nextHomeClubId ?? 'remove')
    setUpdateError('')
    setStatusMessage('')

    try {
      const response = await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ homeClubId: nextHomeClubId }),
      })

      if (!response.ok) {
        throw new Error(
          await readApiError(
            response,
            'We could not update your home club. Please try again.',
          ),
        )
      }

      const body: unknown = await response.json()

      if (!isHomeClubUpdate(body)) {
        throw new Error('The updated profile data returned was incomplete.')
      }

      onHomeClubUpdated(body)
      setStatusMessage(
        body.homeClub
          ? `${body.homeClub.name} is now your home club.`
          : 'Your home club has been removed.',
      )
    } catch (error: unknown) {
      setUpdateError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not update your home club. Please try again.',
      )
    } finally {
      setSavingClubId(null)
    }
  }

  return (
    <section className="home-club-selector" aria-labelledby="home-club-title">
      <div className="home-club-heading">
        <div>
          <span>Home club</span>
          <h3 id="home-club-title">
            {homeClubId ? 'Change your home club' : 'Choose your home club'}
          </h3>
        </div>
        <button type="button" onClick={onGoToCourses}>
          Browse courses
        </button>
      </div>

      {homeClub ? (
        <div className="home-club-current">
          <span>Current home club</span>
          <strong>{homeClub.name}</strong>
        </div>
      ) : null}

      <form className="home-club-search" onSubmit={searchClubs} noValidate>
        <label htmlFor="home-club-search">Search club catalogue</label>
        <div className="home-club-search-control">
          <input
            id="home-club-search"
            type="search"
            maxLength={100}
            autoComplete="off"
            placeholder="e.g. Sickleholme"
            value={query}
            aria-invalid={Boolean(searchError)}
            onChange={(event) => {
              setQuery(event.target.value)
              setSearchError('')
            }}
          />
          <button type="submit" disabled={isSearching || savingClubId !== null}>
            {isSearching ? 'Searching…' : 'Search'}
          </button>
        </div>
        <small>Enter a full or partial club name.</small>
      </form>

      {searchError ? (
        <p className="home-club-error" role="alert">
          {searchError}
        </p>
      ) : null}

      {hasSearched && results.length === 0 ? (
        <p className="home-club-state">
          No clubs matched “{query.trim()}”. Try fewer words or browse Courses.
        </p>
      ) : null}

      {results.length > 0 ? (
        <div className="home-club-results" aria-label="Club search results">
          {results.map((club) => {
            const location = formatClubLocation(club)
            const isCurrent = club.id === homeClubId

            return (
              <article key={club.id}>
                <div>
                  <strong>{club.name}</strong>
                  <span>
                    {location || 'Location not supplied'}
                    {' · '}
                    {club.courseCount}{' '}
                    {club.courseCount === 1 ? 'course' : 'courses'}
                  </span>
                </div>
                <button
                  type="button"
                  disabled={isCurrent || savingClubId !== null}
                  onClick={() => void saveHomeClub(club.id)}
                >
                  {isCurrent
                    ? 'Current'
                    : savingClubId === club.id
                      ? 'Saving…'
                      : 'Set home club'}
                </button>
              </article>
            )
          })}
        </div>
      ) : null}

      {homeClubId ? (
        <button
          className="home-club-remove"
          type="button"
          disabled={savingClubId !== null}
          onClick={() => void saveHomeClub(null)}
        >
          {savingClubId === 'remove' ? 'Removing…' : 'Remove home club'}
        </button>
      ) : null}

      {updateError ? (
        <p className="home-club-error" role="alert">
          {updateError}
        </p>
      ) : null}
      {statusMessage ? (
        <p className="home-club-status" role="status">
          {statusMessage}
        </p>
      ) : null}
    </section>
  )
}

export default HomeClubSelector
