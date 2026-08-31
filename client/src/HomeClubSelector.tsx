import { useEffect, useMemo, useState } from 'react'
import { authenticatedFetch } from './api.ts'
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

  if (isRecord(body) && typeof body.error === 'string') {
    return body.error
  }

  return fallbackMessage
}

function HomeClubSelector({
  homeClubId,
  homeClub,
  onHomeClubUpdated,
  onGoToCourses,
}: HomeClubSelectorProps) {
  const [savedClubs, setSavedClubs] = useState<HomeClub[]>([])
  const [selectedClubId, setSelectedClubId] = useState(homeClubId ?? '')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [updateError, setUpdateError] = useState('')
  const [statusMessage, setStatusMessage] = useState('')

  useEffect(() => {
    let isCancelled = false

    async function loadSavedClubs() {
      try {
        const response = await authenticatedFetch('/api/courses')

        if (!response.ok) {
          throw new Error(
            await readApiError(
              response,
              'We could not load your saved clubs. Please refresh and try again.',
            ),
          )
        }

        const body: unknown = await response.json()

        if (!Array.isArray(body) || !body.every(isHomeClub)) {
          throw new Error('The saved club data returned was incomplete.')
        }

        if (!isCancelled) {
          setSavedClubs(body)
        }
      } catch (error: unknown) {
        if (!isCancelled) {
          setLoadError(
            error instanceof TypeError
              ? 'We could not reach the server to load your saved clubs.'
              : error instanceof Error
                ? error.message
                : 'We could not load your saved clubs. Please refresh and try again.',
          )
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadSavedClubs()

    return () => {
      isCancelled = true
    }
  }, [])

  const selectableClubs = useMemo(() => {
    if (!homeClub || savedClubs.some((club) => club.id === homeClub.id)) {
      return savedClubs
    }

    return [homeClub, ...savedClubs]
  }, [homeClub, savedClubs])

  async function saveHomeClub(nextHomeClubId: string | null) {
    setIsSaving(true)
    setUpdateError('')
    setStatusMessage('')

    try {
      const response = await authenticatedFetch('/api/users/me', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
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
      setSelectedClubId(body.homeClubId ?? '')
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
      setIsSaving(false)
    }
  }

  return (
    <section className="home-club-selector" aria-labelledby="home-club-title">
      <div className="home-club-heading">
        <div>
          <span>Course library</span>
          <h3 id="home-club-title">
            {homeClubId ? 'Change your home club' : 'Choose your home club'}
          </h3>
        </div>
        <button type="button" onClick={onGoToCourses}>
          Browse courses
        </button>
      </div>

      {isLoading ? (
        <p className="home-club-state" role="status">
          Loading saved clubs…
        </p>
      ) : loadError ? (
        <p className="home-club-error" role="alert">
          {loadError}
        </p>
      ) : selectableClubs.length === 0 ? (
        <p className="home-club-state">
          Save a club and at least one tee in Courses, then return here to set
          it as your home club.
        </p>
      ) : (
        <div className="home-club-controls">
          <label htmlFor="home-club">Saved club</label>
          <div className="home-club-actions">
            <select
              id="home-club"
              value={selectedClubId}
              disabled={isSaving}
              onChange={(event) => {
                setSelectedClubId(event.target.value)
                setUpdateError('')
                setStatusMessage('')
              }}
            >
              <option value="">Select a club</option>
              {selectableClubs.map((club) => (
                <option key={club.id} value={club.id}>
                  {club.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={
                isSaving ||
                selectedClubId === '' ||
                selectedClubId === homeClubId
              }
              onClick={() => void saveHomeClub(selectedClubId)}
            >
              {isSaving ? 'Saving…' : 'Save'}
            </button>
          </div>
        </div>
      )}

      {homeClubId ? (
        <button
          className="home-club-remove"
          type="button"
          disabled={isSaving}
          onClick={() => void saveHomeClub(null)}
        >
          Remove home club
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
