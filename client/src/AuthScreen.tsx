import { useState, type FormEvent } from 'react'
import brandLogo from './assets/fore-the-record-logo.png'
import { getSupabaseClient } from './supabase.ts'
import './AuthScreen.css'

type AuthMode = 'login' | 'register' | 'claim' | 'forgot'

type AuthScreenProps = {
  notice?: string
}

const MODE_CONTENT: Record<
  Exclude<AuthMode, 'forgot'>,
  { kicker: string; title: string; intro: string; submit: string }
> = {
  login: {
    kicker: 'Welcome back',
    title: 'Sign in to your record.',
    intro: 'Pick up where your last round left off.',
    submit: 'Sign in',
  },
  register: {
    kicker: 'Start your record',
    title: 'Create your account.',
    intro: 'Your profile, courses and rounds will follow you securely.',
    submit: 'Create account',
  },
  claim: {
    kicker: 'Existing player',
    title: 'Claim your profile.',
    intro:
      'Use the email on your existing profile. We will verify it before linking your account.',
    submit: 'Claim profile',
  },
}

function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function AuthScreen({ notice = '' }: AuthScreenProps) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [message, setMessage] = useState(notice)
  const [isSubmitting, setIsSubmitting] = useState(false)

  function changeMode(nextMode: AuthMode) {
    setMode(nextMode)
    setPassword('')
    setConfirmPassword('')
    setError('')
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const normalizedEmail = email.trim().toLowerCase()

    if (!isValidEmail(normalizedEmail)) {
      setError('Enter a valid email address')
      return
    }

    if (mode === 'register' && name.trim() === '') {
      setError('Enter your full name')
      return
    }

    if (mode !== 'forgot' && password.length < 8) {
      setError('Use a password with at least 8 characters')
      return
    }

    if (
      (mode === 'register' || mode === 'claim') &&
      password !== confirmPassword
    ) {
      setError('The passwords do not match')
      return
    }

    setIsSubmitting(true)
    setError('')
    setMessage('')

    try {
      const supabase = getSupabaseClient()

      if (mode === 'login') {
        const { error: signInError } = await supabase.auth.signInWithPassword({
          email: normalizedEmail,
          password,
        })

        if (signInError) {
          throw new Error('Email or password not recognised')
        }

        return
      }

      if (mode === 'forgot') {
        const { error: resetError } =
          await supabase.auth.resetPasswordForEmail(normalizedEmail, {
            redirectTo: `${window.location.origin}/?reset-password=true`,
          })

        if (resetError) {
          throw resetError
        }

        setMessage(
          'If an account exists for that email, a password-reset link is on its way.',
        )
        return
      }

      const { error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/?auth=confirmed`,
          data:
            mode === 'register'
              ? { full_name: name.trim(), profile_action: 'register' }
              : { profile_action: 'claim' },
        },
      })

      if (signUpError) {
        throw signUpError
      }

      setMessage(
        'Check your inbox and confirm your email. You will return here to finish securely.',
      )
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'We could not complete that request. Please try again.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const content = mode === 'forgot' ? null : MODE_CONTENT[mode]

  return (
    <main className="auth-page">
      <section className="auth-story">
        <img src={brandLogo} alt="Fore the Record" />
        <div>
          <p className="auth-eyebrow">Your game, safely kept</p>
          <h1>
            Every round.
            <span>Yours alone.</span>
          </h1>
          <p>
            Sign in wherever you play and keep your profile, courses and
            Handicap Index connected to you.
          </p>
        </div>
        <small>Fore the Record · Built for the next round</small>
      </section>

      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="auth-card">
          {mode !== 'forgot' ? (
            <div className="auth-switcher" aria-label="Account options">
              <button
                type="button"
                aria-pressed={mode === 'login'}
                onClick={() => changeMode('login')}
              >
                Sign in
              </button>
              <button
                type="button"
                aria-pressed={mode === 'register'}
                onClick={() => changeMode('register')}
              >
                New account
              </button>
              <button
                type="button"
                aria-pressed={mode === 'claim'}
                onClick={() => changeMode('claim')}
              >
                Claim profile
              </button>
            </div>
          ) : null}

          <p className="form-kicker">
            {mode === 'forgot' ? 'Account recovery' : content?.kicker}
          </p>
          <h2 id="auth-title">
            {mode === 'forgot' ? 'Reset your password.' : content?.title}
          </h2>
          <p className="auth-intro">
            {mode === 'forgot'
              ? 'Enter your account email and we will send a secure reset link.'
              : content?.intro}
          </p>

          <form className="auth-form" onSubmit={handleSubmit} noValidate>
            {mode === 'register' ? (
              <label>
                Full name
                <input
                  type="text"
                  autoComplete="name"
                  placeholder="e.g. Tiger Woods"
                  value={name}
                  onChange={(event) => {
                    setName(event.target.value)
                    setError('')
                  }}
                />
              </label>
            ) : null}

            <label>
              Email address
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                placeholder="you@example.com"
                value={email}
                onChange={(event) => {
                  setEmail(event.target.value)
                  setError('')
                }}
              />
            </label>

            {mode !== 'forgot' ? (
              <label>
                Password
                <input
                  type="password"
                  autoComplete={
                    mode === 'login' ? 'current-password' : 'new-password'
                  }
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                />
              </label>
            ) : null}

            {mode === 'register' || mode === 'claim' ? (
              <label>
                Confirm password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(event) => {
                    setConfirmPassword(event.target.value)
                    setError('')
                  }}
                />
              </label>
            ) : null}

            {error ? (
              <div className="auth-error" role="alert">
                {error}
              </div>
            ) : null}
            {message ? (
              <div className="auth-message" role="status">
                {message}
              </div>
            ) : null}

            <button
              className="auth-submit"
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting
                ? 'Please wait…'
                : mode === 'forgot'
                  ? 'Send reset link'
                  : content?.submit}
            </button>
          </form>

          {mode === 'login' ? (
            <button
              className="auth-text-button"
              type="button"
              onClick={() => changeMode('forgot')}
            >
              Forgotten your password?
            </button>
          ) : mode === 'forgot' ? (
            <button
              className="auth-text-button"
              type="button"
              onClick={() => changeMode('login')}
            >
              Return to sign in
            </button>
          ) : null}
        </div>
      </section>
    </main>
  )
}

export default AuthScreen
