export const ROUND_NOTES_MAX_LENGTH = 2000

export type RoundNotesResponse = {
  roundId: string
  notes: string | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function buildRoundNotesPath(roundId: string): string {
  return `/api/users/me/rounds/${encodeURIComponent(roundId)}/notes`
}

export function isRoundNotesResponse(value: unknown): value is RoundNotesResponse {
  return (
    isRecord(value) &&
    typeof value.roundId === 'string' &&
    (value.notes === null ||
      (typeof value.notes === 'string' &&
        value.notes.length <= ROUND_NOTES_MAX_LENGTH))
  )
}
