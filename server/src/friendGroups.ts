import { calculateHandicap } from './handicap.js'

export const FRIEND_GROUP_MAX_MEMBERS = 20

export type FriendGroupPeriod = '30_DAYS' | '90_DAYS' | '12_MONTHS' | 'ALL_TIME'

export type FriendGroupRound = {
  id: string
  userId: string
  datePlayed: Date
  createdAt: Date
  grossScore: number | null
  stablefordPoints: number | null
  holeCount: number
  scoreDifferential: number | null
  isAcceptable: boolean
}

export type FriendGroupPlayer = {
  id: string
  name: string
  homeClub: { id: string; name: string } | null
}

export type FriendGroupStanding = {
  player: FriendGroupPlayer
  roundsPlayed: number
  stablefordPoints: number
  averageGross: number | null
  grossRounds: number
  bestGross: number | null
  handicapImprovement: number | null
}

export class FriendGroupValidationError extends Error {}

export function parseFriendGroupName(value: unknown): string {
  if (typeof value !== 'string') throw new FriendGroupValidationError('Enter a group name')
  const name = value.trim().replace(/\s+/g, ' ')
  if (name.length < 2 || name.length > 80) {
    throw new FriendGroupValidationError('Group names must be between 2 and 80 characters')
  }
  return name
}

export function parseFriendGroupMemberIds(value: unknown): string[] {
  if (!Array.isArray(value) || value.some((id) => typeof id !== 'string')) {
    throw new FriendGroupValidationError('Choose valid friends for this group')
  }
  const ids = [...new Set(value.map((id) => id.trim()).filter(Boolean))]
  if (ids.length > FRIEND_GROUP_MAX_MEMBERS) {
    throw new FriendGroupValidationError(`A group can contain up to ${FRIEND_GROUP_MAX_MEMBERS} friends`)
  }
  return ids
}

export function parseFriendGroupPeriod(value: unknown): FriendGroupPeriod | null {
  return value === '30_DAYS' || value === '90_DAYS' || value === '12_MONTHS' || value === 'ALL_TIME'
    ? value
    : null
}

export function parseFriendGroupMessage(value: unknown): string {
  if (typeof value !== 'string') throw new FriendGroupValidationError('Enter a message')
  const message = value.trim()
  if (message.length < 1 || message.length > 500) {
    throw new FriendGroupValidationError('Messages must be between 1 and 500 characters')
  }
  return message
}

export function friendGroupPeriodStart(period: FriendGroupPeriod, now = new Date()): Date | null {
  if (period === 'ALL_TIME') return null
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  if (period === '12_MONTHS') start.setUTCFullYear(start.getUTCFullYear() - 1)
  else start.setUTCDate(start.getUTCDate() - (period === '30_DAYS' ? 29 : 89))
  return start
}

function handicapAt(rounds: FriendGroupRound[], cutoff: Date | null): number | null {
  const eligible = rounds
    .filter((round) => round.isAcceptable && round.scoreDifferential !== null && (!cutoff || round.datePlayed < cutoff))
    .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() || left.createdAt.getTime() - right.createdAt.getTime())
    .slice(-20)
    .map((round) => ({
      id: round.id,
      datePlayed: round.datePlayed,
      scoreDifferential: round.scoreDifferential as number,
      isAcceptable: true,
    }))
  return calculateHandicap(eligible).handicapIndex
}

export function buildFriendGroupStandings(
  players: readonly FriendGroupPlayer[],
  rounds: readonly FriendGroupRound[],
  start: Date | null,
): FriendGroupStanding[] {
  return players.map((player) => {
    const allPlayerRounds = rounds
      .filter((round) => round.userId === player.id)
      .sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() || left.createdAt.getTime() - right.createdAt.getTime())
    const periodRounds = allPlayerRounds.filter((round) => !start || round.datePlayed >= start)
    const grossScores = periodRounds.flatMap((round) => round.holeCount !== 18 || round.grossScore === null ? [] : [round.grossScore])
    const firstEligibleIndex = allPlayerRounds.findIndex((round) => round.isAcceptable && round.scoreDifferential !== null)
    const startingHandicap = start
      ? handicapAt(allPlayerRounds, start)
      : firstEligibleIndex < 0
        ? null
        : handicapAt(allPlayerRounds.slice(0, firstEligibleIndex + 1), null)
    const endingHandicap = handicapAt(allPlayerRounds, null)
    return {
      player,
      roundsPlayed: periodRounds.length,
      stablefordPoints: periodRounds.reduce((total, round) => total + (round.stablefordPoints ?? 0), 0),
      averageGross: grossScores.length === 0 ? null : Number((grossScores.reduce((total, score) => total + score, 0) / grossScores.length).toFixed(1)),
      grossRounds: grossScores.length,
      bestGross: grossScores.length === 0 ? null : Math.min(...grossScores),
      handicapImprovement: startingHandicap === null || endingHandicap === null
        ? null
        : Number((startingHandicap - endingHandicap).toFixed(1)),
    }
  })
}
