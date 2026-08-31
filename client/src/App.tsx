import { useEffect, useRef, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import './App.css'
import AdminPortal from './AdminPortal.tsx'
import { fetchWithAccessToken } from './api.ts'
import {
  isAdminIdentity,
  type AdminIdentity,
} from './adminApi.ts'
import AuthScreen from './AuthScreen.tsx'
import brandLogo from './assets/fore-the-record-logo.png'
import CourseSearch from './CourseSearch.tsx'
import HomeClubSelector from './HomeClubSelector.tsx'
import PasswordRecovery from './PasswordRecovery.tsx'
import RoundEntry from './RoundEntry.tsx'
import RoundHistory from './RoundHistory.tsx'
import { getSupabaseClient } from './supabase.ts'

type ActiveView = 'profile' | 'courses' | 'rounds' | 'history' | 'admin'

type HomeClub = {
  id: string
  name: string
}

type Profile = {
  id: string
  name: string
  email: string
  homeClubId: string | null
  handicapIndex: number | null
  createdAt: string
  homeClub: HomeClub | null
}

async function loadAdminIdentity(
  currentSession: Session,
): Promise<AdminIdentity | null> {
  try {
    const response = await fetchWithAccessToken(
      currentSession.access_token,
      '/api/admin/me',
    )

    if (!response.ok) {
      return null
    }

    const body: unknown = await response.json()

    return isAdminIdentity(body) ? body : null
  } catch {
    return null
  }
}

async function getApiError(
  response: Response,
  fallbackMessage: string,
): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error
  }

  return fallbackMessage
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function removeAuthQueryParameters() {
  const url = new URL(window.location.href)

  url.searchParams.delete('auth')
  url.searchParams.delete('reset-password')
  window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
}

function getAuthSetup(): { client: SupabaseClient | null; error: string } {
  try {
    return { client: getSupabaseClient(), error: '' }
  } catch (error: unknown) {
    return {
      client: null,
      error:
        error instanceof Error
          ? error.message
          : 'Authentication is not configured.',
    }
  }
}

function App() {
  const [authSetup] = useState(getAuthSetup)
  const profileRequestNumber = useRef(0)
  const [activeView, setActiveView] = useState<ActiveView>('profile')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminIdentity, setAdminIdentity] =
    useState<AdminIdentity | null>(null)
  const [isAuthLoading, setIsAuthLoading] = useState(
    authSetup.client !== null,
  )
  const [authError, setAuthError] = useState(authSetup.error)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => new URLSearchParams(window.location.search).has('reset-password'),
  )

  async function loadProfile(currentSession: Session) {
    const currentRequest = ++profileRequestNumber.current

    setIsAuthLoading(true)
    setAuthError('')
    setAdminIdentity(null)

    try {
      let response = await fetchWithAccessToken(
        currentSession.access_token,
        '/api/users/me',
      )

      if (response.status === 404) {
        const fullName = currentSession.user.user_metadata.full_name

        response = await fetchWithAccessToken(
          currentSession.access_token,
          '/api/users',
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              ...(typeof fullName === 'string' ? { name: fullName } : {}),
            }),
          },
        )

        if (response.status === 409) {
          const conflictResponse = response
          const retryResponse = await fetchWithAccessToken(
            currentSession.access_token,
            '/api/users/me',
          )

          response = retryResponse.ok ? retryResponse : conflictResponse
        }
      }

      if (!response.ok) {
        throw new Error(
          await getApiError(
            response,
            'We could not load the profile linked to this account.',
          ),
        )
      }

      const nextProfile = (await response.json()) as Profile
      const nextAdminIdentity = await loadAdminIdentity(currentSession)

      if (currentRequest !== profileRequestNumber.current) {
        return
      }

      setProfile(nextProfile)
      setAdminIdentity(nextAdminIdentity)
      removeAuthQueryParameters()
    } catch (error: unknown) {
      if (currentRequest !== profileRequestNumber.current) {
        return
      }

      setProfile(null)
      setAdminIdentity(null)
      setAuthError(
        error instanceof TypeError
          ? 'We could not reach the server. Check your connection and try again.'
          : error instanceof Error
            ? error.message
            : 'We could not load the profile linked to this account.',
      )
    } finally {
      if (currentRequest === profileRequestNumber.current) {
        setIsAuthLoading(false)
      }
    }
  }

  useEffect(() => {
    let isCancelled = false

    const supabase = authSetup.client

    if (!supabase) {
      return
    }

      async function applySession(nextSession: Session | null) {
        if (isCancelled) {
          return
        }

        setSession(nextSession)
        setAdminIdentity(null)
        setActiveView('profile')

        if (!nextSession) {
          profileRequestNumber.current += 1
          setProfile(null)
          setIsAuthLoading(false)
          return
        }

        if (isPasswordRecovery) {
          setIsAuthLoading(false)
          return
        }

        await loadProfile(nextSession)
      }

      const {
        data: { subscription },
      } = supabase.auth.onAuthStateChange((event, nextSession) => {
        if (event === 'INITIAL_SESSION') {
          return
        }

        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
          setSession(nextSession)
          setIsAuthLoading(false)
          return
        }

        window.setTimeout(() => {
          void applySession(nextSession)
        }, 0)
      })

      void supabase.auth.getSession().then(({ data, error }) => {
        if (isCancelled) {
          return
        }

        if (error) {
          setAuthError(error.message)
          setIsAuthLoading(false)
          return
        }

        void applySession(data.session)
      })

    return () => {
      isCancelled = true
      subscription.unsubscribe()
    }
  }, [authSetup.client, isPasswordRecovery])

  async function signOut() {
    try {
      await getSupabaseClient().auth.signOut()
    } finally {
      profileRequestNumber.current += 1
      setSession(null)
      setProfile(null)
      setAdminIdentity(null)
      setActiveView('profile')
    }
  }

  async function finishPasswordRecovery() {
    await signOut()
    removeAuthQueryParameters()
    setIsPasswordRecovery(false)
  }

  function updateHandicapIndex(handicapIndex: number | null) {
    setProfile((current) =>
      current ? { ...current, handicapIndex } : current,
    )
  }

  function updateHomeClub(update: {
    homeClubId: string | null
    homeClub: HomeClub | null
  }) {
    setProfile((current) => (current ? { ...current, ...update } : current))
  }

  if (isPasswordRecovery && session) {
    return <PasswordRecovery onComplete={() => void finishPasswordRecovery()} />
  }

  if (isAuthLoading) {
    return (
      <main className="auth-page auth-recovery-page">
        <section className="auth-panel">
          <div className="auth-card profile-loading" role="status">
            <div className="profile-loading-indicator" aria-hidden="true" />
            <p className="form-kicker">Welcome back</p>
            <h2>Loading your record…</h2>
            <p className="auth-intro">
              Verifying your session and retrieving your latest Handicap Index.
            </p>
          </div>
        </section>
      </main>
    )
  }

  if (!session) {
    return <AuthScreen notice={authError} />
  }

  if (!profile) {
    return (
      <main className="auth-page auth-recovery-page">
        <section className="auth-panel">
          <div className="auth-card">
            <p className="form-kicker">Account needs attention</p>
            <h2>We couldn’t open your record.</h2>
            <p className="auth-intro" role="alert">
              {authError}
            </p>
            <div className="auth-form">
              <button
                className="auth-submit"
                type="button"
                onClick={() => void loadProfile(session)}
              >
                Try again
              </button>
              <button
                className="auth-text-button"
                type="button"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </section>
      </main>
    )
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a
          className="brand"
          href="#profile"
          aria-label="Fore the Record home"
          onClick={() => setActiveView('profile')}
        >
          <img className="brand-logo" src={brandLogo} alt="" />
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <button
            type="button"
            aria-current={activeView === 'profile' ? 'page' : undefined}
            onClick={() => setActiveView('profile')}
          >
            Profile
          </button>
          <button
            type="button"
            aria-current={activeView === 'courses' ? 'page' : undefined}
            onClick={() => setActiveView('courses')}
          >
            Courses
          </button>
          <button
            type="button"
            aria-current={activeView === 'rounds' ? 'page' : undefined}
            onClick={() => setActiveView('rounds')}
          >
            Rounds
          </button>
          <button
            type="button"
            aria-current={activeView === 'history' ? 'page' : undefined}
            onClick={() => setActiveView('history')}
          >
            History
          </button>
          {adminIdentity ? (
            <button
              type="button"
              aria-current={activeView === 'admin' ? 'page' : undefined}
              onClick={() => setActiveView('admin')}
            >
              Admin
            </button>
          ) : null}
        </nav>
      </header>

      <main>
        {activeView === 'profile' ? (
          <section className="profile-layout" id="profile">
            <div className="intro-panel">
              <div>
                <p className="eyebrow">
                  <span aria-hidden="true" /> Your personal golf record
                </p>
                <h1>
                  Every round.
                  <span>Worth remembering.</span>
                </h1>
                <p className="intro-copy">
                  Build a clear picture of your game—from the first card you
                  sign to the rounds shaping your Handicap Index.
                </p>
              </div>

              <div className="handicap-preview" aria-hidden="true">
                <div className="preview-orbit preview-orbit-one" />
                <div className="preview-orbit preview-orbit-two" />
                <div className="preview-score">
                  <small>Handicap Index</small>
                  <strong>{profile.handicapIndex ?? '—'}</strong>
                  <span>Your current record</span>
                </div>
              </div>

              <ol className="journey-steps" aria-label="How Fore the Record works">
                <li>
                  <span>01</span>
                  <div>
                    <strong>Secure your profile</strong>
                    <small>Your game stays connected to you</small>
                  </div>
                </li>
                <li>
                  <span>02</span>
                  <div>
                    <strong>Choose your course</strong>
                    <small>Ratings and tees, ready to go</small>
                  </div>
                </li>
                <li>
                  <span>03</span>
                  <div>
                    <strong>Watch your game unfold</strong>
                    <small>See which rounds truly count</small>
                  </div>
                </li>
              </ol>
            </div>

            <div className="form-panel">
              <div className="profile-success" aria-live="polite">
                <div className="success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m6 12.5 3.5 3.5L18 7.5" />
                  </svg>
                </div>
                <p className="form-kicker">Signed in</p>
                <h2>Your record is ready.</h2>
                <p className="form-intro">
                  Your profile and rounds are securely linked to this account.
                </p>

                <div className="profile-card">
                  <div className="profile-avatar" aria-hidden="true">
                    {getInitials(profile.name)}
                  </div>
                  <div className="profile-identity">
                    <strong>{profile.name}</strong>
                    <span>{profile.email}</span>
                  </div>
                  <div className="profile-handicap">
                    <small>Handicap</small>
                    <strong>{profile.handicapIndex ?? '—'}</strong>
                  </div>
                </div>

                <dl className="profile-details">
                  <div>
                    <dt>Home club</dt>
                    <dd>{profile.homeClub?.name ?? 'Not set yet'}</dd>
                  </div>
                  <div>
                    <dt>Member since</dt>
                    <dd>
                      {new Intl.DateTimeFormat('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                      }).format(new Date(profile.createdAt))}
                    </dd>
                  </div>
                </dl>

                <HomeClubSelector
                  homeClubId={profile.homeClubId}
                  homeClub={profile.homeClub}
                  onHomeClubUpdated={updateHomeClub}
                  onGoToCourses={() => setActiveView('courses')}
                />

                <button
                  className="secondary-button"
                  type="button"
                  onClick={() => void signOut()}
                >
                  Sign out
                </button>
              </div>
            </div>
          </section>
        ) : activeView === 'courses' ? (
          <CourseSearch />
        ) : activeView === 'rounds' ? (
          <RoundEntry
            profile={profile}
            onGoToCourses={() => setActiveView('courses')}
            onGoToProfile={() => setActiveView('profile')}
            onGoToHistory={() => setActiveView('history')}
            onRoundLogged={updateHandicapIndex}
          />
        ) : activeView === 'history' ? (
          <RoundHistory
            profile={profile}
            onGoToProfile={() => setActiveView('profile')}
            onLogRound={() => setActiveView('rounds')}
          />
        ) : adminIdentity ? (
          <AdminPortal administratorName={adminIdentity.name} />
        ) : null}
      </main>

      <footer className="site-footer">
        <span>Fore the Record</span>
        <span>Built for the next round</span>
      </footer>
    </div>
  )
}

export default App
