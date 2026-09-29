import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import type { Session, SupabaseClient } from '@supabase/supabase-js'
import './App.css'
import AccountSettings from './AccountSettings.tsx'
import AchievementsBadges from './AchievementsBadges.tsx'
import { fetchWithAccessToken } from './api.ts'
import {
  isAdminIdentity,
  type AdminIdentity,
} from './adminApi.ts'
import AuthScreen from './AuthScreen.tsx'
import brandLogo from './assets/fore-the-record-logo.png'
import CourseSearch from './CourseSearch.tsx'
import Friends from './Friends.tsx'
import HomeClubSelector from './HomeClubSelector.tsx'
import PasswordRecovery from './PasswordRecovery.tsx'
import PerformanceSummary from './PerformanceSummary.tsx'
import PerformanceAnalysis from './PerformanceAnalysis.tsx'
import PerformanceInsights from './PerformanceInsights.tsx'
import CoursePersonalBests from './CoursePersonalBests.tsx'
import CustomStatisticsDashboard from './CustomStatisticsDashboard.tsx'
import PersonalMilestones from './PersonalMilestones.tsx'
import NotificationCentre from './NotificationCentre.tsx'
import ProfileAvatar from './ProfileAvatar.tsx'
import { friendsNotificationDestination, type FriendsDestination } from './dashboardDestinations.ts'
import { isNotificationUnreadCount, type NotificationAction } from './notificationsApi.ts'
import PlayerGoals from './PlayerGoals.tsx'
import GolfBag from './GolfBag.tsx'
import RoundEntry from './RoundEntry.tsx'
import RoundHistory from './RoundHistory.tsx'
import RoundComparison from './RoundComparison.tsx'
import SeasonYearReviews from './SeasonYearReviews.tsx'
import Support from './Support.tsx'
import type { SubmissionType } from './submissionApi.ts'
import { isSubmissionUnreadCountResponse } from './submissionApi.ts'
import { getSupabaseClient } from './supabase.ts'
import WhatsNew from './WhatsNew.tsx'
import './LedgerTheme.css'
import './Dashboard.css'
import { DashboardTabs, DashboardPanel } from './DashboardTabs.tsx'
import ProfileOverview from './ProfileOverview.tsx'
import HandicapProgressionChart from './HandicapProgressionChart.tsx'

const AdminPortal = lazy(() => import('./AdminPortal.tsx'))

type ActiveView =
  | 'profile'
  | 'friends'
  | 'courses'
  | 'rounds'
  | 'history'
  | 'settings'
  | 'support'
  | 'notifications'
  | 'whats-new'
  | 'admin'

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
  bio: string | null
  location: string | null
  showProfileToFriends: boolean
  profileImage: { name: string; mimeType: string; size: number; uploadedAt: string } | null
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

function removeAuthQueryParameters() {
  const url = new URL(window.location.href)

  url.searchParams.delete('auth')
  url.searchParams.delete('reset-password')
  url.searchParams.delete('set-password')
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
  const [profileTab, setProfileTab] = useState('overview')
  const [roundsTab, setRoundsTab] = useState('entry')
  const [goalsTab, setGoalsTab] = useState('dashboard')
  const [statisticsTab, setStatisticsTab] = useState('dashboard')
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [friendsDestination, setFriendsDestination] = useState<FriendsDestination>({ tab: 'activity', competition: 'overview' })
  useEffect(() => { window.scrollTo(0, 0) }, [activeView])
  const [historyFocusRoundId, setHistoryFocusRoundId] = useState('')
  const [supportInitialType, setSupportInitialType] =
    useState<SubmissionType>('IDEA')
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [adminIdentity, setAdminIdentity] =
    useState<AdminIdentity | null>(null)
  const [supportUnreadCount, setSupportUnreadCount] = useState(0)
  const [adminUnreadCount, setAdminUnreadCount] = useState(0)
  const [notificationUnreadCount, setNotificationUnreadCount] = useState(0)
  const [unreadRefresh, setUnreadRefresh] = useState(0)
  const [isAuthLoading, setIsAuthLoading] = useState(
    authSetup.client !== null,
  )
  const [authError, setAuthError] = useState(authSetup.error)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(
    () => new URLSearchParams(window.location.search).has('reset-password'),
  )
  const [isInvitationSetup, setIsInvitationSetup] = useState(
    () => new URLSearchParams(window.location.search).has('set-password'),
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

      let nextProfile = (await response.json()) as Profile

      const authenticatedEmail = currentSession.user.email?.trim().toLowerCase()
      if (
        authenticatedEmail &&
        authenticatedEmail !== nextProfile.email.trim().toLowerCase()
      ) {
        const syncResponse = await fetchWithAccessToken(
          currentSession.access_token,
          '/api/users/me/settings/sync-email',
          { method: 'POST' },
        )

        if (!syncResponse.ok) {
          throw new Error(
            await getApiError(
              syncResponse,
              'We could not synchronise your confirmed email address.',
            ),
          )
        }

        nextProfile = (await syncResponse.json()) as Profile
      }
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

      async function applySession(
        nextSession: Session | null,
        resetActiveView = true,
      ) {
        if (isCancelled) {
          return
        }

        setSession(nextSession)
        setAdminIdentity(null)
        if (resetActiveView) {
          setActiveView('profile')
        }
        setSupportUnreadCount(0)
        setAdminUnreadCount(0)
        setNotificationUnreadCount(0)

        if (!nextSession) {
          profileRequestNumber.current += 1
          setProfile(null)
          setIsAuthLoading(false)
          return
        }

        if (isPasswordRecovery || isInvitationSetup) {
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
          void applySession(
            nextSession,
            event === 'SIGNED_IN' || event === 'SIGNED_OUT',
          )
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
  }, [authSetup.client, isInvitationSetup, isPasswordRecovery])

  useEffect(() => {
    if (!session || !profile) {
      return
    }

    const controller = new AbortController()

    async function loadUnreadCounts() {
      const notificationResponse = await fetchWithAccessToken(
        session!.access_token,
        '/api/users/me/notifications/unread-count',
        { signal: controller.signal },
      ).catch(() => null)

      if (notificationResponse?.ok) {
        const body: unknown = await notificationResponse.json().catch(() => null)
        if (isNotificationUnreadCount(body)) setNotificationUnreadCount(body.count)
      }

      const playerResponse = await fetchWithAccessToken(
        session!.access_token,
        '/api/submissions/unread-count',
        { signal: controller.signal },
      ).catch(() => null)

      if (playerResponse?.ok) {
        const body: unknown = await playerResponse.json().catch(() => null)
        if (isSubmissionUnreadCountResponse(body)) {
          setSupportUnreadCount(body.count)
        }
      }

      if (!adminIdentity) {
        setAdminUnreadCount(0)
        return
      }

      const adminResponse = await fetchWithAccessToken(
        session!.access_token,
        '/api/admin/submissions/unread-count',
        { signal: controller.signal },
      ).catch(() => null)

      if (adminResponse?.ok) {
        const body: unknown = await adminResponse.json().catch(() => null)
        if (isSubmissionUnreadCountResponse(body)) {
          setAdminUnreadCount(body.count)
        }
      }
    }

    void loadUnreadCounts()
    return () => controller.abort()
  }, [activeView, adminIdentity, profile, session, unreadRefresh])

  function refreshUnreadCounts() {
    setUnreadRefresh((value) => value + 1)
  }

  function clearSignedOutState() {
    profileRequestNumber.current += 1
    setSession(null)
    setProfile(null)
    setAdminIdentity(null)
    setActiveView('profile')
    setSupportUnreadCount(0)
    setAdminUnreadCount(0)
    setNotificationUnreadCount(0)
  }

  function openNotificationDestination(action: NotificationAction, targetId: string | null, eventType: string) {
    if (action === 'FRIENDS' || action === 'GROUPS') {
      setFriendsDestination(friendsNotificationDestination(action, eventType))
      setActiveView('friends')
    }
    if (action === 'SUPPORT') {
      setSupportInitialType('IDEA')
      setActiveView('support')
    }
    if (action === 'HISTORY') {
      setHistoryFocusRoundId(targetId ?? '')
      setActiveView('history')
    }
    if (action === 'ACHIEVEMENTS') {
      setProfileTab('goals')
      setGoalsTab('badges')
      setActiveView('profile')
    }
  }

  async function signOut() {
    try {
      await getSupabaseClient().auth.signOut()
    } finally {
      clearSignedOutState()
    }
  }

  async function finishPasswordSetup() {
    await signOut()
    removeAuthQueryParameters()
    setIsPasswordRecovery(false)
    setIsInvitationSetup(false)
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

  function updateProfileDetails(nextProfile: Profile) {
    setProfile(nextProfile)
  }

  if ((isPasswordRecovery || isInvitationSetup) && session) {
    return (
      <PasswordRecovery
        purpose={isInvitationSetup ? 'invitation' : 'recovery'}
        onComplete={() => void finishPasswordSetup()}
      />
    )
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
    <div className="app-shell dashboard-shell">
      <a className="dashboard-skip-link" href="#main-content">Skip to content</a>
      <header className="site-header">
        <a
          className="brand"
          href="#profile"
          aria-label="Fore the Record home"
          onClick={() => { setActiveView('profile'); setMobileMenuOpen(false) }}
        >
          <img className="brand-logo" src={brandLogo} alt="" />
        </a>

        <div className="mobile-header-actions">
          <button type="button" className="mobile-notifications" aria-label={notificationUnreadCount ? `Notifications, ${notificationUnreadCount} unread` : 'Notifications'} onClick={() => { setActiveView('notifications'); setMobileMenuOpen(false) }}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
            {notificationUnreadCount > 0 ? <span>{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span> : null}
          </button>
          <button type="button" aria-expanded={mobileMenuOpen} aria-controls="primary-navigation" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>{mobileMenuOpen ? 'Close menu' : 'Menu'}</button>
        </div>
        <div className={`site-header-navigation ${mobileMenuOpen ? 'is-open' : ''}`}>
          <nav id="primary-navigation" className="site-nav" aria-label="Primary navigation" onClick={() => setMobileMenuOpen(false)}>
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
              onClick={() => {
                setHistoryFocusRoundId('')
                setActiveView('history')
              }}
            >
              History
            </button>
            <button
              type="button"
              aria-current={activeView === 'friends' ? 'page' : undefined}
              onClick={() => { setFriendsDestination({ tab: 'activity', competition: 'overview' }); setActiveView('friends') }}
            >
              Friends
            </button>
            <button
              type="button"
              aria-current={activeView === 'notifications' ? 'page' : undefined}
              onClick={() => setActiveView('notifications')}
            >
              <svg className="nav-bell" viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>Notifications
              {notificationUnreadCount > 0 ? (
                <span className="nav-unread-count" aria-label={`${notificationUnreadCount} unread notifications`}>
                  {notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-current={activeView === 'support' ? 'page' : undefined}
              onClick={() => {
                setSupportInitialType('IDEA')
                setActiveView('support')
              }}
            >
              Support
              {supportUnreadCount > 0 ? (
                <span
                  className="nav-unread-count"
                  aria-label={`${supportUnreadCount} unread support requests`}
                >
                  {supportUnreadCount > 99 ? '99+' : supportUnreadCount}
                </span>
              ) : null}
            </button>
            <button
              type="button"
              aria-current={activeView === 'whats-new' ? 'page' : undefined}
              onClick={() => setActiveView('whats-new')}
            >
              What’s New
            </button>
            {adminIdentity ? (
              <button
                type="button"
                aria-current={activeView === 'admin' ? 'page' : undefined}
                onClick={() => setActiveView('admin')}
              >
                Admin
                {adminUnreadCount > 0 ? (
                  <span
                    className="nav-unread-count"
                    aria-label={`${adminUnreadCount} unread support requests`}
                  >
                    {adminUnreadCount > 99 ? '99+' : adminUnreadCount}
                  </span>
                ) : null}
              </button>
            ) : null}
            <button type="button" aria-current={activeView === 'settings' ? 'page' : undefined} onClick={() => setActiveView('settings')}>Settings</button>
          </nav>
          <button type="button" className="sidebar-account" onClick={() => setActiveView('settings')}><span aria-hidden="true">{profile.name.slice(0, 1).toUpperCase()}</span><strong>{profile.name}</strong></button>
          <button type="button" className="sidebar-signout" onClick={() => void signOut()}>Sign out</button>
          <p className="site-edition" aria-hidden="true">
            Your game,
            <span>in focus</span>
          </p>
        </div>
      </header>

      <main id="main-content">
        {activeView === 'profile' ? (
          <section className="profile-workspace" id="profile">
            <header className="dashboard-heading">
              <div><p className="form-kicker">{profile.name} / Player overview</p><h1>Your game, at a glance.</h1></div>
              <button type="button" className="dashboard-primary" onClick={() => { setRoundsTab('entry'); setActiveView('rounds') }}>+ Record round</button>
            </header>
            <DashboardTabs label="Profile views" value={profileTab} onChange={setProfileTab} tabs={[
              { id: 'overview', label: 'Overview' }, { id: 'goals', label: 'Goals & achievements' },
              { id: 'bag', label: 'Golf bag' }, { id: 'account', label: 'Account' },
            ]} />
            <DashboardPanel active={profileTab === 'overview'}>
              <ProfileOverview key={profileTab} profile={profile} onGoals={() => setProfileTab('goals')} onAccount={() => setProfileTab('account')}
                onHistory={(roundId) => { setHistoryFocusRoundId(roundId ?? ''); setActiveView('history') }} />
            </DashboardPanel>
            <DashboardPanel active={profileTab === 'goals'}>
              <DashboardTabs label="Goals and achievements" value={goalsTab} onChange={setGoalsTab} tabs={[
                { id: 'dashboard', label: 'Goals' }, { id: 'milestones', label: 'Milestones' }, { id: 'badges', label: 'Achievements' },
              ]} />
              <DashboardPanel active={goalsTab === 'dashboard'}><PlayerGoals profileId={profile.id} /></DashboardPanel>
              <DashboardPanel active={goalsTab === 'milestones'}><PersonalMilestones profileId={profile.id} /></DashboardPanel>
              <DashboardPanel active={goalsTab === 'badges'}><AchievementsBadges profileId={profile.id} onOpenRound={(roundId) => { setHistoryFocusRoundId(roundId); setActiveView('history') }} /></DashboardPanel>
            </DashboardPanel>
            <DashboardPanel active={profileTab === 'bag'}><GolfBag profileId={profile.id} /></DashboardPanel>
            <DashboardPanel active={profileTab === 'account'}>
              <div className="dashboard-card"><h2>Player details</h2>
                <ProfileAvatar userId={profile.id} name={profile.name} hasImage={profile.profileImage !== null} imageVersion={profile.profileImage?.uploadedAt} />
                <dl className="dashboard-details">
                <div><dt>Name</dt><dd>{profile.name}</dd></div><div><dt>Email</dt><dd>{profile.email}</dd></div>
                <div><dt>Location</dt><dd>{profile.location || 'Not set'}</dd></div><div><dt>About you</dt><dd>{profile.bio || 'Not set'}</dd></div>
                <div><dt>Member since</dt><dd>{new Intl.DateTimeFormat('en-GB', { year: 'numeric' }).format(new Date(profile.createdAt))}</dd></div>
              </dl><button type="button" onClick={() => setActiveView('settings')}>Edit profile & account settings →</button></div>
              <HomeClubSelector homeClubId={profile.homeClubId} homeClub={profile.homeClub} onHomeClubUpdated={updateHomeClub} onGoToCourses={() => setActiveView('courses')} />
            </DashboardPanel>
          </section>
        ) : activeView === 'settings' ? (
          <AccountSettings
            profile={profile}
            onBack={() => setActiveView('profile')}
            onProfileUpdated={updateProfileDetails}
            onAccountDeleted={signOut}
            onSessionEnded={clearSignedOutState}
          />
        ) : activeView === 'friends' ? (
          <Friends
            profileId={profile.id}
            initialDestination={friendsDestination}
            onOpenRound={(roundId) => {
              setHistoryFocusRoundId(roundId)
              setActiveView('history')
            }}
          />
        ) : activeView === 'courses' ? (
          <CourseSearch
            onReportMissingCourse={() => {
              setSupportInitialType('MISSING_COURSE')
              setActiveView('support')
            }}
          />
        ) : activeView === 'rounds' ? (
          <section className="rounds-workspace">
            <header className="dashboard-heading"><div><p className="form-kicker">Your rounds</p><h1>From first tee to final score.</h1></div></header>
            <DashboardTabs label="Rounds views" value={roundsTab} onChange={setRoundsTab} tabs={[
              { id: 'entry', label: 'Record round' }, { id: 'statistics', label: 'Statistics' }, { id: 'season', label: 'Season review' },
              { id: 'compare', label: 'Compare rounds' }, { id: 'records', label: 'Course records' },
            ]} />
            <DashboardPanel active={roundsTab === 'entry'}>
              <RoundEntry profile={profile} onGoToCourses={() => setActiveView('courses')} onGoToProfile={() => setActiveView('profile')}
                onGoToHistory={() => { setHistoryFocusRoundId(''); setActiveView('history') }} onRoundLogged={updateHandicapIndex} />
            </DashboardPanel>
            <DashboardPanel active={roundsTab === 'statistics'}>
              <DashboardTabs label="Statistics views" value={statisticsTab} onChange={setStatisticsTab} tabs={[
                { id: 'dashboard', label: 'My statistics' }, { id: 'handicap', label: 'Handicap journey' },
                { id: 'analysis', label: 'Performance analysis' }, { id: 'insights', label: 'Insights' },
              ]} />
              <DashboardPanel active={statisticsTab === 'dashboard'}><CustomStatisticsDashboard profileId={profile.id} handicapIndex={profile.handicapIndex} /></DashboardPanel>
              <DashboardPanel active={statisticsTab === 'handicap'}><PerformanceSummary profileId={profile.id} handicapIndex={profile.handicapIndex} /><HandicapProgressionChart profileId={profile.id} /></DashboardPanel>
              <DashboardPanel active={statisticsTab === 'analysis'}><PerformanceAnalysis profileId={profile.id} /></DashboardPanel>
              <DashboardPanel active={statisticsTab === 'insights'}><PerformanceInsights profileId={profile.id} onOpenRound={(roundId) => { setHistoryFocusRoundId(roundId); setActiveView('history') }} /></DashboardPanel>
            </DashboardPanel>
            <DashboardPanel active={roundsTab === 'season'}><SeasonYearReviews profileId={profile.id} onOpenRound={(roundId) => { setHistoryFocusRoundId(roundId); setActiveView('history') }} /></DashboardPanel>
            <DashboardPanel active={roundsTab === 'compare'}><RoundComparison profileId={profile.id} onOpenRound={(roundId) => { setHistoryFocusRoundId(roundId); setActiveView('history') }} /></DashboardPanel>
            <DashboardPanel active={roundsTab === 'records'}><CoursePersonalBests profileId={profile.id} /></DashboardPanel>
          </section>
        ) : activeView === 'history' ? (
          <RoundHistory
            profile={profile}
            focusedRoundId={historyFocusRoundId}
            onGoToProfile={() => setActiveView('profile')}
            onLogRound={() => { setRoundsTab('entry'); setActiveView('rounds') }}
          />
        ) : activeView === 'support' ? (
          <Support
            initialType={supportInitialType}
            onUnreadChanged={refreshUnreadCounts}
          />
        ) : activeView === 'notifications' ? (
          <NotificationCentre
            profileId={profile.id}
            onNavigate={openNotificationDestination}
            onUnreadChanged={refreshUnreadCounts}
          />
        ) : activeView === 'whats-new' ? (
          <WhatsNew />
        ) : adminIdentity ? (
          <Suspense
            fallback={
              <section className="admin-page" aria-live="polite">
                <div className="admin-state">Loading administrator portal…</div>
              </section>
            }
          >
            <AdminPortal
              administratorName={adminIdentity.name}
              onUnreadChanged={refreshUnreadCounts}
            />
          </Suspense>
        ) : null}
      </main>

      <footer className="site-footer">
        <span>Fore the Record — Est. 2024</span>
        <em>Golf leaves a mark. So do you.</em>
        <span>The Clubhouse Ledger</span>
      </footer>
    </div>
  )
}

export default App
