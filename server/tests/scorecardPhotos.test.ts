import { describe, expect, it } from 'vitest'
import {
  isOwnedScorecardPhotoPath,
  parseScorecardPhotoInput,
  ScorecardPhotoError,
} from '../src/scorecardPhotos.js'

describe('scorecard photo validation', () => {
  it('accepts supported private photo metadata and strips browser paths', () => {
    expect(parseScorecardPhotoInput({
      fileName: 'C:\\fakepath\\signed-card.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
    })).toEqual({
      fileName: 'signed-card.jpg',
      mimeType: 'image/jpeg',
      size: 2048,
    })
  })

  it('rejects unsupported and oversized files', () => {
    expect(() => parseScorecardPhotoInput({
      fileName: 'card.heic',
      mimeType: 'image/heic',
      size: 2048,
    })).toThrow(ScorecardPhotoError)
    expect(() => parseScorecardPhotoInput({
      fileName: 'card.jpg',
      mimeType: 'image/jpeg',
      size: 10 * 1024 * 1024 + 1,
    })).toThrow('10 MB')
  })

  it('accepts only a generated path belonging to the player and round', () => {
    const userId = '11111111-1111-4111-8111-111111111111'
    const roundId = '22222222-2222-4222-8222-222222222222'
    expect(isOwnedScorecardPhotoPath(
      `${userId}/${roundId}/33333333-3333-4333-8333-333333333333.webp`,
      userId,
      roundId,
    )).toBe(true)
    expect(isOwnedScorecardPhotoPath(
      `44444444-4444-4444-8444-444444444444/${roundId}/33333333-3333-4333-8333-333333333333.webp`,
      userId,
      roundId,
    )).toBe(false)
  })
})
