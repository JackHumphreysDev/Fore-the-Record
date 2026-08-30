import { useState, type FormEvent } from 'react'
import './App.css'
import brandLogo from './assets/fore-the-record-logo.png'

type Profile = {
  id: string
  name: string
  email: string
  homeClubId: string | null
  handicapIndex: number | null
  createdAt: string
}

type ProfileForm = {
  name: string
  email: string
}

type FormErrors = Partial<Record<keyof ProfileForm, string>>

const COMMON_EMAIL_DOMAIN_TYPOS: Record<string, string> = {
  'gamil.com': 'gmail.com',
  'gmail.coom': 'gmail.com',
  'gmail.con': 'gmail.com',
  'hotmail.coom': 'hotmail.com',
  'outlook.coom': 'outlook.com',
  'yahoo.coom': 'yahoo.com',
}

const EMPTY_FORM: ProfileForm = {
  name: '',
  email: '',
}

function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join('')
}

function validateProfile(form: ProfileForm): FormErrors {
  const errors: FormErrors = {}
  const email = form.email.trim()

  if (form.name.trim() === '') {
    errors.name = 'Enter your name'
  }

  if (email === '') {
    errors.email = 'Enter your email address'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Enter a valid email address'
  } else {
    const [localPart, domain] = email.split('@')
    const suggestedDomain = domain
      ? COMMON_EMAIL_DOMAIN_TYPOS[domain.toLowerCase()]
      : undefined

    if (localPart && suggestedDomain) {
      errors.email = `Check the email domain. Did you mean ${localPart}@${suggestedDomain}?`
    }
  }

  return errors
}

async function getApiError(response: Response): Promise<string> {
  const body: unknown = await response.json().catch(() => null)

  if (
    typeof body === 'object' &&
    body !== null &&
    'error' in body &&
    typeof body.error === 'string'
  ) {
    return body.error
  }

  return 'We could not create your profile. Please try again.'
}

function App() {
  const [form, setForm] = useState<ProfileForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [apiError, setApiError] = useState('')
  const [profile, setProfile] = useState<Profile | null>(null)

  function updateField(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setErrors((current) => ({ ...current, [field]: undefined }))
    setApiError('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextErrors = validateProfile(form)

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors)
      return
    }

    setIsSubmitting(true)
    setApiError('')

    try {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
        }),
      })

      if (!response.ok) {
        throw new Error(await getApiError(response))
      }

      const createdProfile = (await response.json()) as Profile
      setProfile(createdProfile)
    } catch (error: unknown) {
      setApiError(
        error instanceof TypeError
          ? 'We could not reach the server. Please check your connection and try again.'
          : error instanceof Error
          ? error.message
          : 'We could not create your profile. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  function resetProfile() {
    setProfile(null)
    setForm(EMPTY_FORM)
    setErrors({})
    setApiError('')
  }

  return (
    <div className="app-shell">
      <header className="site-header">
        <a className="brand" href="#profile" aria-label="Fore the Record home">
          <img className="brand-logo" src={brandLogo} alt="" />
        </a>

        <nav className="site-nav" aria-label="Primary navigation">
          <a href="#profile" aria-current="page">
            Profile
          </a>
          <span aria-disabled="true">
            Courses <small>Soon</small>
          </span>
          <span aria-disabled="true">
            Rounds <small>Soon</small>
          </span>
        </nav>
      </header>

      <main>
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
                <strong>—</strong>
                <span>Ready for round one</span>
              </div>
            </div>

            <ol className="journey-steps" aria-label="How Fore the Record works">
              <li>
                <span>01</span>
                <div>
                  <strong>Create your profile</strong>
                  <small>Your home for every score</small>
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
            {profile ? (
              <div className="profile-success" aria-live="polite">
                <div className="success-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24">
                    <path d="m6 12.5 3.5 3.5L18 7.5" />
                  </svg>
                </div>
                <p className="form-kicker">Profile created</p>
                <h2>You’re on the tee.</h2>
                <p className="form-intro">
                  Your record is ready. Add a round when the scorecard flow
                  lands next.
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
                    <dd>{profile.homeClubId ? 'Selected' : 'Not set yet'}</dd>
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

                <button
                  className="secondary-button"
                  type="button"
                  onClick={resetProfile}
                >
                  Create another profile
                </button>
              </div>
            ) : (
              <form className="profile-form" onSubmit={handleSubmit} noValidate>
                <p className="form-kicker">Let’s get started</p>
                <h2>Create your player profile</h2>
                <p className="form-intro">
                  Two details now. Your home club and first round can follow.
                </p>

                <div className="form-fields">
                  <div className="field-group">
                    <label htmlFor="name">Full name</label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      autoComplete="name"
                      placeholder="e.g. Tiger Woods"
                      value={form.name}
                      aria-invalid={Boolean(errors.name)}
                      aria-describedby={errors.name ? 'name-error' : undefined}
                      onChange={(event) =>
                        updateField('name', event.target.value)
                      }
                    />
                    {errors.name ? (
                      <span className="field-error" id="name-error">
                        {errors.name}
                      </span>
                    ) : null}
                  </div>

                  <div className="field-group">
                    <label htmlFor="email">Email address</label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      autoComplete="email"
                      inputMode="email"
                      placeholder="you@example.com"
                      value={form.email}
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? 'email-error' : undefined}
                      onChange={(event) =>
                        updateField('email', event.target.value)
                      }
                    />
                    {errors.email ? (
                      <span className="field-error" id="email-error">
                        {errors.email}
                      </span>
                    ) : null}
                  </div>
                </div>

                {apiError ? (
                  <div className="api-error" role="alert">
                    <span aria-hidden="true">!</span>
                    {apiError}
                  </div>
                ) : null}

                <button
                  className="primary-button"
                  type="submit"
                  disabled={isSubmitting}
                >
                  <span>
                    {isSubmitting ? 'Creating profile…' : 'Create my profile'}
                  </span>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M5 12h14m-5-5 5 5-5 5" />
                  </svg>
                </button>

                <p className="privacy-note">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M7 10V7a5 5 0 0 1 10 0v3m-11 0h12v10H6V10Z" />
                  </svg>
                  Your details are only used for your Fore the Record profile.
                </p>
              </form>
            )}
          </div>
        </section>
      </main>

      <footer className="site-footer">
        <span>Fore the Record</span>
        <span>Built for the next round</span>
      </footer>
    </div>
  )
}

export default App
