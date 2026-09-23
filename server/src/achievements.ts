import { calculateHandicap } from './handicap.js'

export type AchievementCategory = 'PROGRESS' | 'SCORING' | 'COMPETITION' | 'EXPLORATION' | 'CONSISTENCY'
export type AchievementRound = {
  id: string
  datePlayed: Date
  createdAt: Date
  category: 'CASUAL' | 'COMPETITION' | 'SOCIAL_GAME'
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  holeCount: number
  grossScore: number | null
  stablefordPoints: number | null
  scoreDifferential: number | null
  isAcceptable: boolean
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  tee: { course: { id: string } }
  holeScores: Array<{ par: number; strokesTaken: number; pickedUp: boolean }>
}

type Achievement = {
  id: string
  title: string
  description: string
  category: AchievementCategory
  icon: string
  achievedAt: string | null
  qualifyingRoundId: string | null
  current: number
  target: number
  direction: 'UP' | 'DOWN'
}

function chronological(rounds: readonly AchievementRound[]) {
  return [...rounds].sort((left, right) => left.datePlayed.getTime() - right.datePlayed.getTime() ||
    left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id))
}

function makeAchievement(
  definition: Omit<Achievement, 'achievedAt' | 'qualifyingRoundId' | 'current'>,
  current: number,
  round?: AchievementRound,
): Achievement {
  return {
    ...definition,
    current,
    achievedAt: round?.datePlayed.toISOString() ?? null,
    qualifyingRoundId: round?.id ?? null,
  }
}

function thresholdRound(
  rounds: readonly AchievementRound[],
  target: number,
  amount: (round: AchievementRound) => number,
) {
  let total = 0
  return rounds.find((round) => {
    total += amount(round)
    return total >= target
  })
}

function firstBelow(rounds: readonly AchievementRound[], target: number) {
  return rounds.find((round) => round.holeCount === 18 && round.holeScores.length === 18 &&
    !round.holeScores.some((hole) => hole.pickedUp) && round.grossScore !== null && round.grossScore < target)
}

function firstPoints(rounds: readonly AchievementRound[], target: number) {
  return rounds.find((round) => round.holeCount === 18 && round.scoringFormat === 'STABLEFORD' &&
    round.stablefordPoints !== null && round.stablefordPoints >= target)
}

function firstUniqueCourses(rounds: readonly AchievementRound[], target: number) {
  const courses = new Set<string>()
  return rounds.find((round) => {
    courses.add(round.tee.course.id)
    return courses.size >= target
  })
}

function monthNumber(date: Date): number {
  return date.getUTCFullYear() * 12 + date.getUTCMonth()
}

function streaks(rounds: readonly AchievementRound[]) {
  const months = [...new Map(rounds.map((round) => [monthNumber(round.datePlayed), round])).entries()]
    .sort(([left], [right]) => left - right)
  let current = 0
  let longest = 0
  let previous: number | null = null
  const firstByTarget = new Map<number, AchievementRound>()
  for (const [month, round] of months) {
    current = previous !== null && month === previous + 1 ? current + 1 : 1
    previous = month
    longest = Math.max(longest, current)
    for (const target of [3, 6, 12]) if (current >= target && !firstByTarget.has(target)) firstByTarget.set(target, round)
  }
  return { longest, firstByTarget }
}

function handicapImprovement(rounds: readonly AchievementRound[]) {
  const eligible = rounds.filter((round) => round.isAcceptable && round.scoreDifferential !== null)
  let startingIndex: number | null = null
  let bestImprovement = 0
  const firstByTarget = new Map<number, AchievementRound>()
  eligible.forEach((round, index) => {
    const window = eligible.slice(Math.max(0, index - 19), index + 1).map((item) => ({
      id: item.id, datePlayed: item.datePlayed, scoreDifferential: item.scoreDifferential!, isAcceptable: true,
    }))
    const value = calculateHandicap(window).handicapIndex
    if (value === null) return
    if (startingIndex === null) startingIndex = value
    const improvement = Math.max(0, Math.round((startingIndex - value) * 10) / 10)
    bestImprovement = Math.max(bestImprovement, improvement)
    for (const target of [1, 3, 5, 10]) if (improvement >= target && !firstByTarget.has(target)) firstByTarget.set(target, round)
  })
  return { bestImprovement, firstByTarget }
}

export function buildAchievements(input: readonly AchievementRound[]) {
  const rounds = chronological(input.filter((round) => round.participation === 'INDIVIDUAL' && round.scorecardStatus === 'VERIFIED'))
  const scoredHoles = rounds.flatMap((round) => round.holeScores.filter((hole) => !hole.pickedUp))
  const holesPlayed = rounds.reduce((total, round) => total + round.holeScores.length, 0)
  const birdies = scoredHoles.filter((hole) => hole.strokesTaken - hole.par === -1).length
  const eagles = scoredHoles.filter((hole) => hole.strokesTaken - hole.par <= -2).length
  const bestGross = rounds.reduce<number | null>((best, round) => {
    if (round.holeCount !== 18 || round.holeScores.length !== 18 || round.holeScores.some((hole) => hole.pickedUp) || round.grossScore === null) return best
    return best === null ? round.grossScore : Math.min(best, round.grossScore)
  }, null)
  const bestPoints = rounds.reduce<number>((best, round) => Math.max(best, round.stablefordPoints ?? 0), 0)
  const uniqueCourses = new Set(rounds.map((round) => round.tee.course.id)).size
  const monthStreak = streaks(rounds)
  const handicap = handicapImprovement(rounds)
  const achievements: Achievement[] = []

  for (const target of [1, 5, 10, 25, 50, 100]) achievements.push(makeAchievement({
    id: `rounds-${target}`, title: target === 1 ? 'First card signed' : `${target} rounds recorded`,
    description: target === 1 ? 'Complete your first verified individual round.' : `Complete ${target} verified individual rounds.`,
    category: 'PROGRESS', icon: 'rounds', target, direction: 'UP',
  }, rounds.length, rounds[target - 1]))
  for (const target of [100, 250, 500, 1000]) achievements.push(makeAchievement({
    id: `holes-${target}`, title: `${target.toLocaleString('en-GB')} holes played`, description: `Play ${target.toLocaleString('en-GB')} verified holes.`,
    category: 'PROGRESS', icon: 'holes', target, direction: 'UP',
  }, holesPlayed, thresholdRound(rounds, target, (round) => round.holeScores.length)))
  achievements.push(makeAchievement({ id: 'first-competition', title: 'Competition debut', description: 'Complete a verified individual competition round.', category: 'COMPETITION', icon: 'competition', target: 1, direction: 'UP' }, rounds.some((round) => round.category === 'COMPETITION') ? 1 : 0, rounds.find((round) => round.category === 'COMPETITION')))
  achievements.push(makeAchievement({ id: 'first-social-game', title: 'Game with friends', description: 'Complete a verified social-game round.', category: 'COMPETITION', icon: 'friends', target: 1, direction: 'UP' }, rounds.some((round) => round.category === 'SOCIAL_GAME') ? 1 : 0, rounds.find((round) => round.category === 'SOCIAL_GAME')))
  for (const target of [100, 90, 80, 70]) achievements.push(makeAchievement({
    id: `gross-below-${target}`, title: `Break ${target}`, description: `Record a complete 18-hole gross score below ${target}.`,
    category: 'SCORING', icon: 'score', target, direction: 'DOWN',
  }, bestGross ?? 0, firstBelow(rounds, target)))
  for (const target of [1, 10, 50, 100]) achievements.push(makeAchievement({
    id: `birdies-${target}`, title: target === 1 ? 'First birdie' : `${target} birdies`, description: `Record ${target} birdie${target === 1 ? '' : 's'} across verified scorecards.`,
    category: 'SCORING', icon: 'birdie', target, direction: 'UP',
  }, birdies, thresholdRound(rounds, target, (round) => round.holeScores.filter((hole) => !hole.pickedUp && hole.strokesTaken - hole.par === -1).length)))
  for (const target of [1, 5, 10]) achievements.push(makeAchievement({
    id: `eagles-${target}`, title: target === 1 ? 'First eagle' : `${target} eagles`, description: `Record ${target} eagle${target === 1 ? '' : 's'} across verified scorecards.`,
    category: 'SCORING', icon: 'eagle', target, direction: 'UP',
  }, eagles, thresholdRound(rounds, target, (round) => round.holeScores.filter((hole) => !hole.pickedUp && hole.strokesTaken - hole.par <= -2).length)))
  for (const target of [30, 36, 40]) achievements.push(makeAchievement({
    id: `stableford-${target}`, title: `${target} Stableford points`, description: `Score at least ${target} points over a verified 18-hole Stableford round.`,
    category: 'SCORING', icon: 'stableford', target, direction: 'UP',
  }, bestPoints, firstPoints(rounds, target)))
  for (const target of [3, 5, 10, 25]) achievements.push(makeAchievement({
    id: `courses-${target}`, title: `${target} courses explored`, description: `Complete verified rounds across ${target} different courses.`,
    category: 'EXPLORATION', icon: 'courses', target, direction: 'UP',
  }, uniqueCourses, firstUniqueCourses(rounds, target)))
  for (const target of [3, 6, 12]) achievements.push(makeAchievement({
    id: `monthly-streak-${target}`, title: `${target}-month playing streak`, description: `Record a verified round in ${target} consecutive calendar months.`,
    category: 'CONSISTENCY', icon: 'streak', target, direction: 'UP',
  }, monthStreak.longest, monthStreak.firstByTarget.get(target)))
  for (const target of [1, 3, 5, 10]) achievements.push(makeAchievement({
    id: `handicap-improvement-${target}`, title: `${target}-shot Handicap Index gain`, description: `Improve your calculated Handicap Index by at least ${target.toFixed(1)} from its first value.`,
    category: 'CONSISTENCY', icon: 'handicap', target, direction: 'UP',
  }, handicap.bestImprovement, handicap.firstByTarget.get(target)))

  return {
    summary: {
      total: achievements.length,
      earned: achievements.filter((achievement) => achievement.achievedAt !== null).length,
      inProgress: achievements.filter((achievement) => achievement.achievedAt === null && achievement.current > 0).length,
    },
    achievements,
  }
}
