const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export class KnockoutCompetitionError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'KnockoutCompetitionError'
  }
}

export type KnockoutBracketMatch = {
  roundNumber: number
  position: number
  playerOneId: string | null
  playerTwoId: string | null
  winnerId: string | null
  status: 'WAITING' | 'READY' | 'COMPLETED'
  resultLabel: string | null
}

export function parseKnockoutName(value: unknown): string {
  if (typeof value !== 'string') throw new KnockoutCompetitionError('Enter a competition name')
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 3 || name.length > 100) throw new KnockoutCompetitionError('Use a competition name between 3 and 100 characters')
  return name
}

export function parseKnockoutInvitees(value: unknown): string[] {
  if (!Array.isArray(value)) throw new KnockoutCompetitionError('Choose the friends taking part')
  const ids = value.filter((id): id is string => typeof id === 'string')
  if (ids.length !== value.length || ids.some((id) => !UUID_PATTERN.test(id)) || new Set(ids).size !== ids.length) {
    throw new KnockoutCompetitionError('Choose valid competitors without duplicates')
  }
  if (ids.length < 1 || ids.length > 15) throw new KnockoutCompetitionError('Choose between 1 and 15 friends')
  return ids
}

export function buildKnockoutBracket(playerIds: string[]): KnockoutBracketMatch[] {
  if (playerIds.length < 2 || playerIds.length > 16 || new Set(playerIds).size !== playerIds.length) {
    throw new KnockoutCompetitionError('A knockout draw needs between 2 and 16 different players')
  }
  const bracketSize = 2 ** Math.ceil(Math.log2(playerIds.length))
  const byeCount = bracketSize - playerIds.length
  const slots: Array<string | null> = []
  playerIds.forEach((playerId, index) => {
    slots.push(playerId)
    if (index < byeCount) slots.push(null)
  })

  const rounds: KnockoutBracketMatch[][] = []
  const firstRound: KnockoutBracketMatch[] = []
  for (let index = 0; index < slots.length; index += 2) {
    const playerOneId = slots[index] ?? null
    const playerTwoId = slots[index + 1] ?? null
    const byeWinner = playerOneId && !playerTwoId ? playerOneId : playerTwoId && !playerOneId ? playerTwoId : null
    firstRound.push({
      roundNumber: 1,
      position: index / 2 + 1,
      playerOneId,
      playerTwoId,
      winnerId: byeWinner,
      status: byeWinner ? 'COMPLETED' : 'READY',
      resultLabel: byeWinner ? 'Bye' : null,
    })
  }
  rounds.push(firstRound)

  const roundCount = Math.log2(bracketSize)
  for (let roundNumber = 2; roundNumber <= roundCount; roundNumber += 1) {
    const previous = rounds[roundNumber - 2]!
    const matches: KnockoutBracketMatch[] = []
    for (let index = 0; index < previous.length; index += 2) {
      const playerOneId = previous[index]?.winnerId ?? null
      const playerTwoId = previous[index + 1]?.winnerId ?? null
      matches.push({
        roundNumber,
        position: index / 2 + 1,
        playerOneId,
        playerTwoId,
        winnerId: null,
        status: playerOneId && playerTwoId ? 'READY' : 'WAITING',
        resultLabel: null,
      })
    }
    rounds.push(matches)
  }
  return rounds.flat()
}

export function parseKnockoutResult(value: unknown): { winnerId: string; winningMargin: number; holesRemaining: number; resultLabel: string } {
  if (typeof value !== 'object' || value === null) throw new KnockoutCompetitionError('Enter a valid match result')
  const result = value as Record<string, unknown>
  const winnerId = result.winnerId
  const winningMargin = result.winningMargin
  const holesRemaining = result.holesRemaining
  if (typeof winnerId !== 'string' || !UUID_PATTERN.test(winnerId) || !Number.isInteger(winningMargin) || !Number.isInteger(holesRemaining)) {
    throw new KnockoutCompetitionError('Enter a valid match winner and margin')
  }
  const margin = winningMargin as number
  const remaining = holesRemaining as number
  if (remaining < 0 || remaining > 8 || margin < 1 || margin > 10 || margin <= remaining || margin > remaining + 2) {
    throw new KnockoutCompetitionError('Use a valid Match Play result such as 1 up or 3 & 2')
  }
  return { winnerId, winningMargin: margin, holesRemaining: remaining, resultLabel: remaining === 0 ? `${margin} up` : `${margin} & ${remaining}` }
}
