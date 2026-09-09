export type HandicapProgressionPoint = {
  roundId: string
  datePlayed: string
  clubName: string
  courseName: string
  teeName: string
  scoreDifferential: number
  handicapIndex: number
  countedAtTheTime: boolean
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isHandicapProgression(
  value: unknown,
): value is HandicapProgressionPoint[] {
  return (
    Array.isArray(value) &&
    value.length <= 20 &&
    value.every(
      (point) =>
        isRecord(point) &&
        typeof point.roundId === 'string' &&
        typeof point.datePlayed === 'string' &&
        !Number.isNaN(Date.parse(point.datePlayed)) &&
        typeof point.clubName === 'string' &&
        typeof point.courseName === 'string' &&
        typeof point.teeName === 'string' &&
        typeof point.scoreDifferential === 'number' &&
        Number.isFinite(point.scoreDifferential) &&
        typeof point.handicapIndex === 'number' &&
        Number.isFinite(point.handicapIndex) &&
        typeof point.countedAtTheTime === 'boolean',
    )
  )
}
