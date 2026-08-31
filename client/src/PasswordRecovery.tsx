import { useState, type FormEvent } from 'react'
import brandLogo from './assets/fore-the-record-logo.png'
import { getSupabaseClient } from './supabase.ts'
import './AuthScreen.css'

type PasswordRecoveryProps = {
  onComplete: () => void
}

function PasswordRecovery({ onComplete }: PasswordRecoveryProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isComplete, setIsComplete] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (password.length < 8) {
      setError('Use a password with at least 8 characters')
      return
    }

    if (password !== confirmation) {
      setError('The passwords do not match')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const { error: updateError } = await getSupabaseClient().auth.updateUser({
        password,
      })

      if (updateError) {
        throw updateError
      }

      setIsComplete(true)
    } catch (caughtError: unknown) {
      setError(
        caughtError instanceof Error
          ? caughtError.message
          : 'We could not update your password. Please request a new link.',
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <main className="auth-page auth-recovery-page">
      <section className="auth-panel">
        <div className="auth-card">
          <img className="auth-recovery-logo" src={brandLogo} alt="Fore the Record" />
          <p className="form-kicker">Secure recovery</p>
          <h2>{isComplete ? 'Password updated.' : 'Choose a new password.'}</h2>
          <p className="auth-intro">
            {isComplete
              ? 'Your new password is ready to use.'
              : 'Use at least 8 characters and avoid a password you use elsewhere.'}
          </p>

          {isComplete ? (
            <button className="auth-submit" type="button" onClick={onComplete}>
              Return to sign in
            </button>
          ) : (
            <form className="auth-form" onSubmit={handleSubmit} noValidate>
              <label>
                New password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => {
                    setPassword(event.target.value)
                    setError('')
                  }}
                />
              </label>
              <label>
                Confirm new password
                <input
                  type="password"
                  autoComplete="new-password"
                  value={confirmation}
                  onChange={(event) => {
                    setConfirmation(event.target.value)
                    setError('')
                  }}
                />
              </label>

              {error ? (
                <div className="auth-error" role="alert">
                  {error}
                </div>
              ) : null}

              <button
                className="auth-submit"
                type="submit"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          )}
        </div>
      </section>
    </main>
  )
}

export default PasswordRecovery
