export const GOLF_CLUB_TYPES = ['DRIVER', 'FAIRWAY_WOOD', 'HYBRID', 'IRON', 'WEDGE', 'PUTTER', 'OTHER'] as const
export type GolfClubType = typeof GOLF_CLUB_TYPES[number]
export type GolfClub = { id: string; type: GolfClubType; brand: string | null; model: string | null; nickname: string | null; loft: number | null; shaftFlex: string | null; carryDistanceYards: number | null; sortOrder: number; archivedAt: string | null; createdAt: string; updatedAt: string }
export type GolfBagResponse = { clubs: GolfClub[]; activeCount: number; maximumActive: 14 }

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null }
function nullableString(value: unknown): boolean { return value === null || typeof value === 'string' }
function nullableNumber(value: unknown): boolean { return value === null || typeof value === 'number' && Number.isFinite(value) }
function isGolfClub(value: unknown): value is GolfClub { return isRecord(value) && typeof value.id === 'string' && GOLF_CLUB_TYPES.includes(value.type as GolfClubType) && nullableString(value.brand) && nullableString(value.model) && nullableString(value.nickname) && nullableNumber(value.loft) && nullableString(value.shaftFlex) && nullableNumber(value.carryDistanceYards) && Number.isInteger(value.sortOrder) && nullableString(value.archivedAt) && typeof value.createdAt === 'string' && typeof value.updatedAt === 'string' }
export function isGolfBagResponse(value: unknown): value is GolfBagResponse { return isRecord(value) && Array.isArray(value.clubs) && value.clubs.every(isGolfClub) && Number.isInteger(value.activeCount) && value.maximumActive === 14 }

export const GOLF_CLUB_TYPE_LABELS: Record<GolfClubType, string> = { DRIVER: 'Driver', FAIRWAY_WOOD: 'Fairway wood', HYBRID: 'Hybrid', IRON: 'Iron', WEDGE: 'Wedge', PUTTER: 'Putter', OTHER: 'Other' }
export function golfClubDisplayName(club: Pick<GolfClub, 'type' | 'brand' | 'model' | 'nickname'>): string { return club.nickname ?? ([club.brand, club.model].filter(Boolean).join(' ') || GOLF_CLUB_TYPE_LABELS[club.type]) }
