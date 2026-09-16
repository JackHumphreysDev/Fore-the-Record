import { useState, type ChangeEvent } from 'react'
import { authenticatedFetch } from './api.ts'
import {
  buildScorecardPhotoPath,
  buildScorecardPhotoUploadPath,
  readConfirmedScorecardPhoto,
  readScorecardPhotoUrl,
  SCORECARD_PHOTO_BUCKET,
  SCORECARD_PHOTO_MAX_BYTES,
  SCORECARD_PHOTO_TYPES,
  isScorecardPhotoUploadTicket,
  type ScorecardPhoto as ScorecardPhotoDetails,
} from './scorecardPhotoApi.ts'
import { getSupabaseClient } from './supabase.ts'
import './ScorecardPhoto.css'

type Props = {
  roundId: string
  photo: ScorecardPhotoDetails | null
  admin?: boolean
  onPhotoChange?: (photo: ScorecardPhotoDetails | null) => void
}

async function readError(response: Response, fallback: string): Promise<string> {
  const body: unknown = await response.json().catch(() => null)
  return typeof body === 'object' && body !== null && 'error' in body &&
    typeof body.error === 'string' ? body.error : fallback
}

function fileSizeLabel(bytes: number): string {
  return bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toFixed(1)} MB`
    : `${Math.ceil(bytes / 1024)} KB`
}

function ScorecardPhoto({ roundId, photo, admin = false, onPhotoChange }: Props) {
  const [photoUrl, setPhotoUrl] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const canManage = !admin && Boolean(onPhotoChange)

  if (admin && !photo) return null

  async function openPhoto() {
    if (photoUrl) {
      setPhotoUrl('')
      return
    }
    setBusy(true)
    setError('')
    try {
      const response = await authenticatedFetch(
        buildScorecardPhotoPath(roundId, admin),
      )
      if (!response.ok) {
        throw new Error(await readError(response, 'We could not open this scorecard photo.'))
      }
      const url = readScorecardPhotoUrl(await response.json())
      if (!url) throw new Error('The private photo link returned was incomplete.')
      setPhotoUrl(url)
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'We could not open this scorecard photo.')
    } finally {
      setBusy(false)
    }
  }

  async function upload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!SCORECARD_PHOTO_TYPES.includes(file.type as typeof SCORECARD_PHOTO_TYPES[number])) {
      setError('Choose a JPEG, PNG, or WebP scorecard photo.')
      return
    }
    if (file.size <= 0 || file.size > SCORECARD_PHOTO_MAX_BYTES) {
      setError('Keep the scorecard photo at 10 MB or smaller.')
      return
    }
    if (photo && !window.confirm('Replace the existing scorecard photo?')) return

    setBusy(true)
    setError('')
    setMessage('')
    try {
      const metadata = { fileName: file.name, mimeType: file.type, size: file.size }
      const ticketResponse = await authenticatedFetch(
        buildScorecardPhotoUploadPath(roundId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(metadata),
        },
      )
      if (!ticketResponse.ok) {
        throw new Error(await readError(ticketResponse, 'We could not start the photo upload.'))
      }
      const ticket: unknown = await ticketResponse.json()
      if (!isScorecardPhotoUploadTicket(ticket)) {
        throw new Error('The private upload link returned was incomplete.')
      }

      const uploaded = await getSupabaseClient().storage
        .from(SCORECARD_PHOTO_BUCKET)
        .uploadToSignedUrl(ticket.path, ticket.token, file, {
          contentType: file.type,
          cacheControl: '3600',
        })
      if (uploaded.error) throw new Error('The scorecard photo upload did not finish.')

      const confirmResponse = await authenticatedFetch(
        buildScorecardPhotoPath(roundId),
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...metadata, path: ticket.path }),
        },
      )
      if (!confirmResponse.ok) {
        throw new Error(await readError(confirmResponse, 'We could not attach the photo to this round.'))
      }
      const confirmed = readConfirmedScorecardPhoto(await confirmResponse.json())
      if (!confirmed) throw new Error('The saved scorecard photo details were incomplete.')
      onPhotoChange?.(confirmed)
      setPhotoUrl('')
      setMessage(photo ? 'Scorecard photo replaced.' : 'Scorecard photo added.')
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'We could not upload the scorecard photo.')
    } finally {
      setBusy(false)
    }
  }

  async function removePhoto() {
    if (!window.confirm('Remove this scorecard photo? The round and scores will stay unchanged.')) return
    setBusy(true)
    setError('')
    setMessage('')
    try {
      const response = await authenticatedFetch(buildScorecardPhotoPath(roundId), {
        method: 'DELETE',
      })
      if (!response.ok) {
        throw new Error(await readError(response, 'We could not remove the scorecard photo.'))
      }
      setPhotoUrl('')
      onPhotoChange?.(null)
      setMessage('Scorecard photo removed.')
    } catch (caught: unknown) {
      setError(caught instanceof Error ? caught.message : 'We could not remove the scorecard photo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="scorecard-photo" aria-label="Scorecard photo">
      <header>
        <div>
          <strong>Scorecard photo</strong>
          <small>{admin ? 'Private supporting evidence' : 'Private to you and the administrator'}</small>
        </div>
        {photo ? <span>{fileSizeLabel(photo.size)}</span> : null}
      </header>
      {photo ? (
        <>
          <p>{photo.name}</p>
          <div className="scorecard-photo-actions">
            <button type="button" disabled={busy} onClick={() => void openPhoto()}>
              {busy ? 'Loading…' : photoUrl ? 'Hide photo' : 'View photo'}
            </button>
            {canManage ? (
              <label className="scorecard-photo-upload">
                Replace photo
                <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void upload(event)} />
              </label>
            ) : null}
            {canManage ? <button className="is-remove" type="button" disabled={busy} onClick={() => void removePhoto()}>Remove</button> : null}
          </div>
        </>
      ) : (
        <>
          <p>Add an optional photo of the signed card. It supports your record but never changes the saved scores automatically.</p>
          {canManage ? (
            <label className="scorecard-photo-upload">
              Add scorecard photo
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={busy} onChange={(event) => void upload(event)} />
            </label>
          ) : null}
        </>
      )}
      {photoUrl ? <img src={photoUrl} alt={`Scorecard photo ${photo?.name ?? ''}`} /> : null}
      {error ? <p className="scorecard-photo-error" role="alert">{error}</p> : null}
      {message ? <p className="scorecard-photo-message" role="status">{message}</p> : null}
    </section>
  )
}

export default ScorecardPhoto
