import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { randomUUID } from 'node:crypto'

export const SCORECARD_PHOTO_BUCKET = 'scorecard-photos'
export const SCORECARD_PHOTO_MAX_BYTES = 10 * 1024 * 1024
export const SCORECARD_PHOTO_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

type ScorecardPhotoMimeType = (typeof SCORECARD_PHOTO_MIME_TYPES)[number]

export type ScorecardPhotoInput = {
  fileName: string
  mimeType: ScorecardPhotoMimeType
  size: number
}

export class ScorecardPhotoError extends Error {
  constructor(
    readonly reason: 'validation' | 'configuration' | 'provider',
    message: string,
  ) {
    super(message)
    this.name = 'ScorecardPhotoError'
  }
}

let storageClient: SupabaseClient | null = null
let bucketReady: Promise<void> | null = null

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function getStorageClient(): SupabaseClient {
  if (storageClient) return storageClient

  const supabaseUrl = process.env.VITE_SUPABASE_URL
  const secretKey = process.env.SUPABASE_SECRET_KEY
  if (!supabaseUrl || !secretKey) {
    throw new ScorecardPhotoError(
      'configuration',
      'Private scorecard photo storage is not configured.',
    )
  }

  storageClient = createClient(supabaseUrl, secretKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  })
  return storageClient
}

function storageFailure(message: string): ScorecardPhotoError {
  return new ScorecardPhotoError('provider', message)
}

async function ensurePrivateBucket(): Promise<void> {
  if (bucketReady) return bucketReady

  bucketReady = (async () => {
    const client = getStorageClient()
    const existing = await client.storage.getBucket(SCORECARD_PHOTO_BUCKET)
    if (!existing.error) {
      const secured = await client.storage.updateBucket(SCORECARD_PHOTO_BUCKET, {
        public: false,
        fileSizeLimit: SCORECARD_PHOTO_MAX_BYTES,
        allowedMimeTypes: [...SCORECARD_PHOTO_MIME_TYPES],
      })
      if (secured.error) {
        throw storageFailure('We could not secure private scorecard photo storage.')
      }
      return
    }

    const status = 'status' in existing.error ? existing.error.status : undefined
    if (status !== 404) {
      throw storageFailure('We could not prepare private scorecard photo storage.')
    }

    const created = await client.storage.createBucket(SCORECARD_PHOTO_BUCKET, {
      public: false,
      fileSizeLimit: SCORECARD_PHOTO_MAX_BYTES,
      allowedMimeTypes: [...SCORECARD_PHOTO_MIME_TYPES],
    })
    if (created.error) {
      throw storageFailure('We could not prepare private scorecard photo storage.')
    }
  })().catch((error: unknown) => {
    bucketReady = null
    throw error
  })

  return bucketReady
}

export function parseScorecardPhotoInput(value: unknown): ScorecardPhotoInput {
  if (!isRecord(value)) {
    throw new ScorecardPhotoError('validation', 'Choose a scorecard photo to upload.')
  }

  const rawName = typeof value.fileName === 'string' ? value.fileName.trim() : ''
  const fileName = rawName.split(/[\\/]/).pop()?.trim() ?? ''
  const mimeType = value.mimeType
  const size = value.size

  const hasControlCharacter = Array.from(fileName).some((character) => {
    const code = character.charCodeAt(0)
    return code <= 31 || code === 127
  })
  if (!fileName || fileName.length > 255 || hasControlCharacter) {
    throw new ScorecardPhotoError('validation', 'Use a valid photo file name.')
  }
  if (
    typeof mimeType !== 'string' ||
    !SCORECARD_PHOTO_MIME_TYPES.includes(mimeType as ScorecardPhotoMimeType)
  ) {
    throw new ScorecardPhotoError(
      'validation',
      'Use a JPEG, PNG, or WebP scorecard photo.',
    )
  }
  if (!Number.isInteger(size) || Number(size) <= 0 || Number(size) > SCORECARD_PHOTO_MAX_BYTES) {
    throw new ScorecardPhotoError(
      'validation',
      'Keep the scorecard photo at 10 MB or smaller.',
    )
  }

  return { fileName, mimeType: mimeType as ScorecardPhotoMimeType, size: Number(size) }
}

export function isOwnedScorecardPhotoPath(
  path: string,
  userId: string,
  roundId: string,
): boolean {
  const escapedUserId = userId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const escapedRoundId = roundId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return new RegExp(
    `^${escapedUserId}/${escapedRoundId}/[0-9a-f-]{36}\\.(?:jpg|png|webp)$`,
    'i',
  ).test(path)
}

export async function createScorecardPhotoUpload(input: {
  userId: string
  roundId: string
  mimeType: ScorecardPhotoMimeType
}): Promise<{ path: string; token: string }> {
  await ensurePrivateBucket()
  const extension = input.mimeType === 'image/jpeg'
    ? 'jpg'
    : input.mimeType === 'image/png'
      ? 'png'
      : 'webp'
  const path = `${input.userId}/${input.roundId}/${randomUUID()}.${extension}`
  const result = await getStorageClient().storage
    .from(SCORECARD_PHOTO_BUCKET)
    .createSignedUploadUrl(path)

  if (result.error || !result.data?.token) {
    throw storageFailure('We could not start the scorecard photo upload.')
  }
  return { path, token: result.data.token }
}

export async function verifyScorecardPhotoUpload(input: {
  path: string
  expectedMimeType: ScorecardPhotoMimeType
  expectedSize: number
}): Promise<void> {
  const result = await getStorageClient().storage
    .from(SCORECARD_PHOTO_BUCKET)
    .info(input.path)

  if (
    result.error ||
    !result.data ||
    result.data.contentType !== input.expectedMimeType ||
    result.data.size !== input.expectedSize
  ) {
    throw storageFailure('The uploaded scorecard photo could not be verified.')
  }
}

export async function createScorecardPhotoViewUrl(path: string): Promise<string> {
  const result = await getStorageClient().storage
    .from(SCORECARD_PHOTO_BUCKET)
    .createSignedUrl(path, 5 * 60)
  if (result.error || !result.data?.signedUrl) {
    throw storageFailure('We could not open the private scorecard photo.')
  }
  return result.data.signedUrl
}

export async function deleteScorecardPhotos(paths: string[]): Promise<void> {
  const uniquePaths = [...new Set(paths.filter(Boolean))]
  if (uniquePaths.length === 0) return

  const result = await getStorageClient().storage
    .from(SCORECARD_PHOTO_BUCKET)
    .remove(uniquePaths)
  if (result.error) {
    throw storageFailure('We could not remove the private scorecard photo.')
  }
}
