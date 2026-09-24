export const GOLF_CLUB_TYPES = ['DRIVER', 'FAIRWAY_WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER', 'OTHER'] as const
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
export type GolfClubTypeValue = typeof GOLF_CLUB_TYPES[number]

export class GolfBagValidationError extends Error {
  constructor(message: string) { super(message); this.name = 'GolfBagValidationError' }
}

export type GolfClubInput = { type: GolfClubTypeValue; brand: string | null; model: string | null; nickname: string | null; loft: number | null; shaftFlex: string | null; carryDistanceYards: number | null }

function optionalText(value: unknown, label: string, maxLength: number): string | null {
  if (value === undefined || value === null || value === '') return null
  if (typeof value !== 'string') throw new GolfBagValidationError(`Enter a valid ${label}`)
  const normalized = value.trim().replace(/\s+/g, ' ')
  if (!normalized) return null
  if (normalized.length > maxLength) throw new GolfBagValidationError(`Keep ${label} to ${maxLength} characters or fewer`)
  return normalized
}

export function parseGolfClubInput(value: unknown): GolfClubInput {
  if (typeof value !== 'object' || value === null) throw new GolfBagValidationError('Enter valid club details')
  const input = value as Record<string, unknown>
  if (typeof input.type !== 'string' || !GOLF_CLUB_TYPES.includes(input.type as GolfClubTypeValue)) throw new GolfBagValidationError('Choose a valid club type')
  const loft = input.loft === undefined || input.loft === null || input.loft === '' ? null : Number(input.loft)
  if (loft !== null && (!Number.isFinite(loft) || loft < 0 || loft > 90 || Math.round(loft * 10) !== loft * 10)) throw new GolfBagValidationError('Enter a loft between 0 and 90 degrees using at most one decimal place')
  const carryDistanceYards = input.carryDistanceYards === undefined || input.carryDistanceYards === null || input.carryDistanceYards === '' ? null : Number(input.carryDistanceYards)
  if (carryDistanceYards !== null && (!Number.isInteger(carryDistanceYards) || carryDistanceYards < 1 || carryDistanceYards > 400)) throw new GolfBagValidationError('Enter a carry distance between 1 and 400 yards')
  return { type: input.type as GolfClubTypeValue, brand: optionalText(input.brand, 'brand', 80), model: optionalText(input.model, 'model', 100), nickname: optionalText(input.nickname, 'nickname', 80), loft, shaftFlex: optionalText(input.shaftFlex, 'shaft flex', 30), carryDistanceYards }
}

export function parseGolfBagOrder(value: unknown): string[] {
  if (!Array.isArray(value) || value.length < 1 || value.length > 14 || value.some((id) => typeof id !== 'string' || !UUID_PATTERN.test(id)) || new Set(value).size !== value.length) throw new GolfBagValidationError('Submit every active club once in the preferred order')
  return value as string[]
}
