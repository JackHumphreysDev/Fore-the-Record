export const ROUND_NOTES_MAX_LENGTH = 2000

export class RoundNotesValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'RoundNotesValidationError'
  }
}

export function parseRoundNotes(value: unknown): string | null {
  if (value === undefined || value === null) {
    return null
  }

  if (typeof value !== 'string') {
    throw new RoundNotesValidationError('Round notes must be text')
  }

  const notes = value.trim()

  if (notes.length > ROUND_NOTES_MAX_LENGTH) {
    throw new RoundNotesValidationError(
      `Round notes must be ${ROUND_NOTES_MAX_LENGTH.toLocaleString('en-GB')} characters or fewer`,
    )
  }

  return notes === '' ? null : notes
}
