import { describe, expect, it } from 'vitest'
import {
  buildScorecardPhotoPath,
  buildScorecardPhotoUploadPath,
  isScorecardPhoto,
  isScorecardPhotoUploadTicket,
  readScorecardPhotoUrl,
} from './scorecardPhotoApi.ts'

describe('scorecard photo API contracts', () => {
  const photo = {
    name: 'signed-card.jpg',
    mimeType: 'image/jpeg',
    size: 2048,
    uploadedAt: '2026-09-16T19:30:00.000Z',
  }

  it('validates photo metadata and signed upload tickets', () => {
    expect(isScorecardPhoto(photo)).toBe(true)
    expect(isScorecardPhoto({ ...photo, mimeType: 'image/svg+xml' })).toBe(false)
    expect(isScorecardPhotoUploadTicket({
      path: 'player/round/photo.jpg',
      token: 'token',
      expiresInSeconds: 7200,
    })).toBe(true)
  })

  it('accepts only HTTPS private view links', () => {
    expect(readScorecardPhotoUrl({ url: 'https://example.supabase.co/signed' }))
      .toBe('https://example.supabase.co/signed')
    expect(readScorecardPhotoUrl({ url: 'javascript:alert(1)' })).toBeNull()
  })

  it('builds owner, administrator, and upload routes', () => {
    expect(buildScorecardPhotoPath('round/id')).toBe(
      '/api/users/me/rounds/round%2Fid/photo',
    )
    expect(buildScorecardPhotoPath('round/id', true)).toBe(
      '/api/admin/rounds/round%2Fid/photo',
    )
    expect(buildScorecardPhotoUploadPath('round/id')).toBe(
      '/api/users/me/rounds/round%2Fid/photo/upload',
    )
  })
})
