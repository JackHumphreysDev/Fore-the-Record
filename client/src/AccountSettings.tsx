import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react'
import {
  checkEmailAvailability,
  normalizeEmail,
  normalizeName,
  updateProfileName,
  validateEmail,
  validateName,
  type AccountProfile,
} from './accountSettingsApi.ts'
import { getAuthErrorMessage } from './authErrors.ts'
import { createCredentialVerificationClient, getSupabaseClient } from './supabase.ts'
import {
  buildAccountSecuritySnapshot,
  isGlobalSignOutConfirmation,
  type AccountSecuritySnapshot,
} from './accountSecurity.ts'
import {
  deleteOwnAccount,
  getPersonalDataExport,
  getPrivacySettings,
  savePrivacySettings,
  type PrivacySettings,
} from './privacySettingsApi.ts'
import './AccountSettings.css'
import ProfileAvatar from './ProfileAvatar.tsx'
import { confirmProfileImage, removeProfileImage, requestProfileImageUpload, saveProfileCustomisation, validateBio, validateLocation } from './profileCustomisationApi.ts'
import { SCORECARD_PHOTO_BUCKET, SCORECARD_PHOTO_MAX_BYTES, SCORECARD_PHOTO_TYPES } from './scorecardPhotoApi.ts'

type AccountSettingsProps = {
  profile: AccountProfile
  onBack: () => void
  onProfileUpdated: (profile: AccountProfile) => void
  onAccountDeleted: () => Promise<void>
  onSessionEnded: () => void
}

async function verifyCurrentPassword(email: string, password: string) {
  const verificationClient = createCredentialVerificationClient()
  const { error } = await verificationClient.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    throw new Error('Current password is incorrect')
  }

  return verificationClient
}

function AccountSettings({
  profile,
  onBack,
  onProfileUpdated,
  onAccountDeleted,
  onSessionEnded,
}: AccountSettingsProps) {
  const [name, setName] = useState(profile.name)
  const [nameError, setNameError] = useState('')
  const [nameMessage, setNameMessage] = useState('')
  const [isSavingName, setIsSavingName] = useState(false)
  const [bio, setBio] = useState(profile.bio ?? '')
  const [location, setLocation] = useState(profile.location ?? '')
  const [showProfileToFriends, setShowProfileToFriends] = useState(profile.showProfileToFriends)
  const [customisationError, setCustomisationError] = useState('')
  const [customisationMessage, setCustomisationMessage] = useState('')
  const [isSavingCustomisation, setIsSavingCustomisation] = useState(false)

  const [newEmail, setNewEmail] = useState('')
  const [emailPassword, setEmailPassword] = useState('')
  const [emailError, setEmailError] = useState('')
  const [emailMessage, setEmailMessage] = useState('')
  const [isSavingEmail, setIsSavingEmail] = useState(false)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [passwordMessage, setPasswordMessage] = useState('')
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [privacy, setPrivacy] = useState<PrivacySettings | null>(null)
  const [privacyError, setPrivacyError] = useState('')
  const [privacyMessage, setPrivacyMessage] = useState('')
  const [isSavingPrivacy, setIsSavingPrivacy] = useState(false)
  const [exportError, setExportError] = useState('')
  const [isExporting, setIsExporting] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [isDeleting, setIsDeleting] = useState(false)
  const [security, setSecurity] = useState<AccountSecuritySnapshot | null>(null)
  const [securityError, setSecurityError] = useState('')
  const [securityMessage, setSecurityMessage] = useState('')
  const [isSigningOutOthers, setIsSigningOutOthers] = useState(false)
  const [isSigningOutEverywhere, setIsSigningOutEverywhere] = useState(false)
  const [globalSignOutConfirmation, setGlobalSignOutConfirmation] = useState('')

  useEffect(() => {
    let cancelled = false
    void getPrivacySettings()
      .then((settings) => {
        if (!cancelled) setPrivacy(settings)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setPrivacyError(
            error instanceof Error
              ? error.message
              : 'We could not load your privacy settings.',
          )
        }
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    let cancelled = false
    void getSupabaseClient().auth.getUser().then(({ data, error }) => {
      if (cancelled) return
      if (error || !data.user) {
        setSecurityError('We could not load your current security details.')
        return
      }
      setSecurity(buildAccountSecuritySnapshot(data.user))
    })
    return () => { cancelled = true }
  }, [])

  async function signOutOtherDevices() {
    setIsSigningOutOthers(true)
    setSecurityError('')
    setSecurityMessage('')
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'others' })
      if (error) throw error
      setSecurityMessage('Other device sessions have been signed out. This device remains signed in.')
    } catch (error: unknown) {
      setSecurityError(error instanceof Error ? getAuthErrorMessage(error) : 'We could not sign out other devices.')
    } finally {
      setIsSigningOutOthers(false)
    }
  }

  async function signOutEverywhere(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!isGlobalSignOutConfirmation(globalSignOutConfirmation)) {
      setSecurityError('Type SIGN OUT exactly to confirm')
      return
    }
    setIsSigningOutEverywhere(true)
    setSecurityError('')
    setSecurityMessage('')
    try {
      const { error } = await getSupabaseClient().auth.signOut({ scope: 'global' })
      if (error) throw error
      onSessionEnded()
    } catch (error: unknown) {
      setSecurityError(error instanceof Error ? getAuthErrorMessage(error) : 'We could not sign out every device.')
      setIsSigningOutEverywhere(false)
    }
  }

  function formatSecurityDate(value: string | null): string {
    if (!value) return 'Not available'
    return new Intl.DateTimeFormat('en-GB', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(value))
  }

  async function saveName(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateName(name)
    if (validationError) {
      setNameError(validationError)
      return
    }

    const normalizedName = normalizeName(name)
    if (normalizedName === profile.name) {
      setNameError('Enter a different name before saving')
      return
    }

    setIsSavingName(true)
    setNameError('')
    setNameMessage('')
    try {
      const updatedProfile = await updateProfileName(normalizedName)
      setName(updatedProfile.name)
      onProfileUpdated(updatedProfile)
      setNameMessage('Your full name has been updated.')
    } catch (error: unknown) {
      setNameError(
        error instanceof Error ? error.message : 'We could not update your name.',
      )
    } finally {
      setIsSavingName(false)
    }
  }

  async function saveEmail(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validationError = validateEmail(newEmail)
    if (validationError) {
      setEmailError(validationError)
      return
    }
    if (!emailPassword) {
      setEmailError('Enter your current password')
      return
    }

    const normalizedEmail = normalizeEmail(newEmail)
    if (normalizedEmail === profile.email.toLowerCase()) {
      setEmailError('Enter a different email address')
      return
    }

    setIsSavingEmail(true)
    setEmailError('')
    setEmailMessage('')
    try {
      const verificationClient = await verifyCurrentPassword(
        profile.email,
        emailPassword,
      )
      await checkEmailAvailability(normalizedEmail)

      const { error } = await verificationClient.auth.updateUser(
        { email: normalizedEmail },
        { emailRedirectTo: `${window.location.origin}/?auth=email-change` },
      )
      if (error) throw error

      setNewEmail('')
      setEmailPassword('')
      setEmailMessage(
        'Confirmation sent. Your current email remains active until you complete the secure email-change link.',
      )
    } catch (error: unknown) {
      setEmailError(
        error instanceof Error &&
        error.message === 'Current password is incorrect'
          ? error.message
          : error instanceof Error && !('code' in error)
            ? error.message
            : getAuthErrorMessage(error),
      )
    } finally {
      setIsSavingEmail(false)
    }
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!currentPassword) {
      setPasswordError('Enter your current password')
      return
    }
    if (newPassword.length < 8) {
      setPasswordError('Use a new password with at least 8 characters')
      return
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new passwords do not match')
      return
    }
    if (newPassword === currentPassword) {
      setPasswordError('Your new password must be different')
      return
    }

    setIsSavingPassword(true)
    setPasswordError('')
    setPasswordMessage('')
    try {
      const verificationClient = await verifyCurrentPassword(
        profile.email,
        currentPassword,
      )
      const { error } = await verificationClient.auth.updateUser({
        password: newPassword,
      })
      if (error) throw error

      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordMessage('Your password has been updated.')
    } catch (error: unknown) {
      setPasswordError(
        error instanceof Error &&
        error.message === 'Current password is incorrect'
          ? error.message
          : getAuthErrorMessage(error),
      )
    } finally {
      setIsSavingPassword(false)
    }
  }

  async function savePrivacy(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!privacy) return
    setIsSavingPrivacy(true)
    setPrivacyError('')
    setPrivacyMessage('')
    try {
      setPrivacy(await savePrivacySettings(privacy))
      setPrivacyMessage('Your privacy choices have been saved.')
    } catch (error: unknown) {
      setPrivacyError(
        error instanceof Error
          ? error.message
          : 'We could not save your privacy settings.',
      )
    } finally {
      setIsSavingPrivacy(false)
    }
  }

  async function downloadData() {
    setIsExporting(true)
    setExportError('')
    try {
      const data = await getPersonalDataExport()
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: 'application/json',
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = `fore-the-record-data-${new Date().toISOString().slice(0, 10)}.json`
      anchor.click()
      URL.revokeObjectURL(url)
    } catch (error: unknown) {
      setExportError(
        error instanceof Error
          ? error.message
          : 'We could not prepare your data export.',
      )
    } finally {
      setIsExporting(false)
    }
  }

  async function deleteAccount(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (deleteConfirmation.trim().toLowerCase() !== profile.email.toLowerCase()) {
      setDeleteError('Enter your full email address exactly as shown')
      return
    }
    if (!deletePassword) {
      setDeleteError('Enter your current password')
      return
    }

    setIsDeleting(true)
    setDeleteError('')
    try {
      await verifyCurrentPassword(profile.email, deletePassword)
      await deleteOwnAccount(deleteConfirmation)
      await onAccountDeleted()
    } catch (error: unknown) {
      setDeleteError(
        error instanceof Error
          ? error.message
          : 'We could not delete your account.',
      )
      setIsDeleting(false)
    }
  }

  async function saveCustomisation(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validateBio(bio) || validateLocation(location)
    if (validation) { setCustomisationError(validation); return }
    setIsSavingCustomisation(true); setCustomisationError(''); setCustomisationMessage('')
    try {
      const updated = await saveProfileCustomisation({ bio, location, showProfileToFriends })
      onProfileUpdated(updated)
      setBio(updated.bio ?? ''); setLocation(updated.location ?? '')
      setCustomisationMessage('Your profile details have been saved.')
    } catch (error: unknown) {
      setCustomisationError(error instanceof Error ? error.message : 'We could not save your profile details.')
    } finally { setIsSavingCustomisation(false) }
  }

  async function uploadProfileImage(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    if (!SCORECARD_PHOTO_TYPES.includes(file.type as typeof SCORECARD_PHOTO_TYPES[number])) { setCustomisationError('Choose a JPEG, PNG, or WebP profile picture.'); return }
    if (file.size <= 0 || file.size > SCORECARD_PHOTO_MAX_BYTES) { setCustomisationError('Keep the profile picture at 10 MB or smaller.'); return }
    setIsSavingCustomisation(true); setCustomisationError(''); setCustomisationMessage('')
    try {
      const metadata = { fileName: file.name, mimeType: file.type, size: file.size }
      const ticket = await requestProfileImageUpload(metadata)
      const uploaded = await getSupabaseClient().storage.from(SCORECARD_PHOTO_BUCKET).uploadToSignedUrl(ticket.path, ticket.token, file, { contentType: file.type, cacheControl: '3600' })
      if (uploaded.error) throw new Error('The profile picture upload did not finish.')
      const profileImage = await confirmProfileImage({ ...metadata, path: ticket.path })
      onProfileUpdated({ ...profile, profileImage })
      setCustomisationMessage(profile.profileImage ? 'Profile picture replaced.' : 'Profile picture added.')
    } catch (error: unknown) {
      setCustomisationError(error instanceof Error ? error.message : 'We could not upload your profile picture.')
    } finally { setIsSavingCustomisation(false) }
  }

  async function removeImage() {
    if (!window.confirm('Remove your profile picture?')) return
    setIsSavingCustomisation(true); setCustomisationError(''); setCustomisationMessage('')
    try {
      await removeProfileImage()
      onProfileUpdated({ ...profile, profileImage: null })
      setCustomisationMessage('Profile picture removed.')
    } catch (error: unknown) {
      setCustomisationError(error instanceof Error ? error.message : 'We could not remove your profile picture.')
    } finally { setIsSavingCustomisation(false) }
  }

  return (
    <section className="settings-page" aria-labelledby="settings-title">
      <header className="settings-heading">
        <button className="settings-back" type="button" onClick={onBack}>
          <span aria-hidden="true">←</span> Back to profile
        </button>
        <p className="eyebrow"><span aria-hidden="true" /> Your account</p>
        <h1 id="settings-title">Account settings.</h1>
        <p>Keep your personal details and sign-in credentials up to date.</p>
      </header>

      <div className="settings-grid">
        <form className="settings-card" onSubmit={saveName} noValidate>
          <div>
            <p className="form-kicker">Profile details</p>
            <h2>Your name</h2>
            <p>This is the name shown throughout your private golf record.</p>
          </div>
          <label>
            Full name
            <input
              type="text"
              autoComplete="name"
              value={name}
              aria-invalid={Boolean(nameError)}
              onChange={(event) => {
                setName(event.target.value)
                setNameError('')
                setNameMessage('')
              }}
            />
          </label>
          {nameError ? <p className="settings-error" role="alert">{nameError}</p> : null}
          {nameMessage ? <p className="settings-success" role="status">{nameMessage}</p> : null}
          <button type="submit" disabled={isSavingName}>
            {isSavingName ? 'Saving…' : 'Save name'}
          </button>
        </form>

        <form className="settings-card settings-customisation-card" onSubmit={saveCustomisation} noValidate>
          <div>
            <p className="form-kicker">Profile customisation</p>
            <h2>Make the record yours</h2>
            <p>Add a private profile picture and optional details. You control whether accepted friends can see them.</p>
          </div>
          <div className="profile-picture-editor">
            <ProfileAvatar userId={profile.id} name={profile.name} hasImage={profile.profileImage !== null} imageVersion={profile.profileImage?.uploadedAt} />
            <div>
              <label className="profile-picture-upload">{profile.profileImage ? 'Replace picture' : 'Add picture'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={isSavingCustomisation} onChange={(event) => void uploadProfileImage(event)} /></label>
              {profile.profileImage ? <button type="button" className="profile-picture-remove" disabled={isSavingCustomisation} onClick={() => void removeImage()}>Remove picture</button> : null}
            </div>
          </div>
          <label>Player bio<textarea rows={4} maxLength={280} value={bio} placeholder="A few words about your golf…" onChange={(event) => { setBio(event.target.value); setCustomisationError(''); setCustomisationMessage('') }} /><small>{bio.length}/280 characters</small></label>
          <label>Location<input type="text" maxLength={100} value={location} placeholder="e.g. Sheffield" onChange={(event) => { setLocation(event.target.value); setCustomisationError(''); setCustomisationMessage('') }} /></label>
          <label className="settings-toggle"><input type="checkbox" checked={showProfileToFriends} onChange={(event) => { setShowProfileToFriends(event.target.checked); setCustomisationError(''); setCustomisationMessage('') }} /><span><strong>Show custom profile details to friends</strong><small>Accepted friends can see your picture, bio, and location. Other players still see only the standard search details.</small></span></label>
          {customisationError ? <p className="settings-error" role="alert">{customisationError}</p> : null}
          {customisationMessage ? <p className="settings-success" role="status">{customisationMessage}</p> : null}
          <button type="submit" disabled={isSavingCustomisation}>{isSavingCustomisation ? 'Saving…' : 'Save profile customisation'}</button>
        </form>

        <form className="settings-card" onSubmit={saveEmail} noValidate>
          <div>
            <p className="form-kicker">Sign-in email</p>
            <h2>Change your email</h2>
            <p>Current email: <strong>{profile.email}</strong></p>
          </div>
          <label>
            New email address
            <input
              type="email"
              autoComplete="email"
              inputMode="email"
              value={newEmail}
              placeholder="you@example.com"
              aria-invalid={Boolean(emailError)}
              onChange={(event) => {
                setNewEmail(event.target.value)
                setEmailError('')
                setEmailMessage('')
              }}
            />
          </label>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={emailPassword}
              aria-invalid={Boolean(emailError)}
              onChange={(event) => {
                setEmailPassword(event.target.value)
                setEmailError('')
                setEmailMessage('')
              }}
            />
          </label>
          {emailError ? <p className="settings-error" role="alert">{emailError}</p> : null}
          {emailMessage ? <p className="settings-success" role="status">{emailMessage}</p> : null}
          <button type="submit" disabled={isSavingEmail}>
            {isSavingEmail ? 'Sending…' : 'Send confirmation'}
          </button>
        </form>

        <section className="settings-card settings-security-centre">
          <div>
            <p className="form-kicker">Account security centre</p>
            <h2>Protect your sign-in</h2>
            <p>Review the security information Supabase provides and close sessions you no longer recognise.</p>
          </div>
          {security ? (
            <dl className="security-summary">
              <div><dt>Sign-in email</dt><dd>{security.email}</dd></div>
              <div><dt>Email status</dt><dd className={security.emailVerified ? 'is-secure' : 'is-warning'}>{security.emailVerified ? 'Verified' : 'Confirmation required'}</dd></div>
              <div><dt>Sign-in method</dt><dd>{security.signInMethod}</dd></div>
              <div><dt>Last successful sign-in</dt><dd>{formatSecurityDate(security.lastSignInAt)}</dd></div>
              <div><dt>Account created</dt><dd>{formatSecurityDate(security.accountCreatedAt)}</dd></div>
            </dl>
          ) : !securityError ? <p>Loading your security details…</p> : null}
          <div className="security-session-actions">
            <article>
              <div><strong>Other devices</strong><span>Close every other refreshable session while keeping this browser signed in.</span></div>
              <button type="button" disabled={isSigningOutOthers || isSigningOutEverywhere} onClick={() => void signOutOtherDevices()}>{isSigningOutOthers ? 'Signing out…' : 'Sign out other devices'}</button>
            </article>
            <form onSubmit={signOutEverywhere}>
              <div><strong>Every device</strong><span>Type <b>SIGN OUT</b> to close all sessions, including this one.</span></div>
              <label>Confirmation<input type="text" autoComplete="off" value={globalSignOutConfirmation} onChange={(event) => { setGlobalSignOutConfirmation(event.target.value); setSecurityError(''); setSecurityMessage('') }} /></label>
              <button type="submit" disabled={isSigningOutEverywhere || isSigningOutOthers}>{isSigningOutEverywhere ? 'Signing out…' : 'Sign out everywhere'}</button>
            </form>
          </div>
          {securityError ? <p className="settings-error" role="alert">{securityError}</p> : null}
          {securityMessage ? <p className="settings-success" role="status">{securityMessage}</p> : null}
          <p className="security-limit-note">Fore the Record can show your latest successful sign-in, but it does not receive a complete device list, failed-login history, passwords, or authentication tokens from Supabase.</p>
        </section>

        <form className="settings-card settings-security-card" onSubmit={savePassword} noValidate>
          <div>
            <p className="form-kicker">Account security</p>
            <h2>Change your password</h2>
            <p>Use at least eight characters and keep it unique to this account.</p>
          </div>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={currentPassword}
              aria-invalid={Boolean(passwordError)}
              onChange={(event) => {
                setCurrentPassword(event.target.value)
                setPasswordError('')
                setPasswordMessage('')
              }}
            />
          </label>
          <label>
            New password
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              placeholder="At least 8 characters"
              aria-invalid={Boolean(passwordError)}
              onChange={(event) => {
                setNewPassword(event.target.value)
                setPasswordError('')
                setPasswordMessage('')
              }}
            />
          </label>
          <label>
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              aria-invalid={Boolean(passwordError)}
              onChange={(event) => {
                setConfirmPassword(event.target.value)
                setPasswordError('')
                setPasswordMessage('')
              }}
            />
          </label>
          {passwordError ? <p className="settings-error" role="alert">{passwordError}</p> : null}
          {passwordMessage ? <p className="settings-success" role="status">{passwordMessage}</p> : null}
          <button type="submit" disabled={isSavingPassword}>
            {isSavingPassword ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <form className="settings-card settings-privacy-card" onSubmit={savePrivacy}>
          <div>
            <p className="form-kicker">Privacy choices</p>
            <h2>Control how players find you</h2>
            <p>Your email address, notes, full scorecards, goals, and performance details always remain private.</p>
          </div>
          {!privacy && !privacyError ? <p>Loading your privacy choices…</p> : null}
          {privacy ? (
            <div className="settings-toggle-list">
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={privacy.profileDiscoverable}
                  onChange={(event) => {
                    setPrivacy({ ...privacy, profileDiscoverable: event.target.checked })
                    setPrivacyMessage('')
                  }}
                />
                <span><strong>Appear in player search</strong><small>Let other players find your name and home club.</small></span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={privacy.friendRequestsEnabled}
                  onChange={(event) => {
                    setPrivacy({ ...privacy, friendRequestsEnabled: event.target.checked })
                    setPrivacyMessage('')
                  }}
                />
                <span><strong>Allow new friend requests</strong><small>Existing friendships are not removed when this is switched off.</small></span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={privacy.showHandicapToFriends}
                  onChange={(event) => {
                    setPrivacy({ ...privacy, showHandicapToFriends: event.target.checked })
                    setPrivacyMessage('')
                  }}
                />
                <span><strong>Show my Handicap Index</strong><small>Choose whether other players can see your current Handicap Index.</small></span>
              </label>
              <label className="settings-toggle">
                <input
                  type="checkbox"
                  checked={privacy.shareRoundActivity}
                  onChange={(event) => {
                    setPrivacy({ ...privacy, shareRoundActivity: event.target.checked })
                    setPrivacyMessage('')
                  }}
                />
                <span><strong>Share my round activity</strong><small>Let accepted friends see a limited summary when you record a verified round. Notes and hole-by-hole scores stay private.</small></span>
              </label>
            </div>
          ) : null}
          {privacyError ? <p className="settings-error" role="alert">{privacyError}</p> : null}
          {privacyMessage ? <p className="settings-success" role="status">{privacyMessage}</p> : null}
          <button type="submit" disabled={!privacy || isSavingPrivacy}>
            {isSavingPrivacy ? 'Saving…' : 'Save privacy choices'}
          </button>
        </form>

        <section className="settings-card settings-data-card">
          <div>
            <p className="form-kicker">Your information</p>
            <h2>Download your data</h2>
            <p>Save a JSON copy of your profile, rounds, goals, favourites, and support conversations.</p>
          </div>
          {exportError ? <p className="settings-error" role="alert">{exportError}</p> : null}
          <button type="button" disabled={isExporting} onClick={() => void downloadData()}>
            {isExporting ? 'Preparing…' : 'Download my data'}
          </button>
        </section>

        <form className="settings-card settings-danger-card" onSubmit={deleteAccount} noValidate>
          <div>
            <p className="form-kicker">Permanent action</p>
            <h2>Delete your account</h2>
            <p>This permanently removes your login, profile, rounds, scorecards, goals, friendships, and support requests. It cannot be undone.</p>
          </div>
          <label>
            Type your email address to confirm
            <input
              type="email"
              autoComplete="off"
              value={deleteConfirmation}
              placeholder={profile.email}
              aria-invalid={Boolean(deleteError)}
              onChange={(event) => {
                setDeleteConfirmation(event.target.value)
                setDeleteError('')
              }}
            />
          </label>
          <label>
            Current password
            <input
              type="password"
              autoComplete="current-password"
              value={deletePassword}
              aria-invalid={Boolean(deleteError)}
              onChange={(event) => {
                setDeletePassword(event.target.value)
                setDeleteError('')
              }}
            />
          </label>
          {deleteError ? <p className="settings-error" role="alert">{deleteError}</p> : null}
          <button type="submit" disabled={isDeleting}>
            {isDeleting ? 'Deleting account…' : 'Permanently delete my account'}
          </button>
        </form>
      </div>
    </section>
  )
}

export default AccountSettings
