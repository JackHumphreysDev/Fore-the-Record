export type AchievementCategory = 'PROGRESS' | 'SCORING' | 'COMPETITION' | 'EXPLORATION' | 'CONSISTENCY'
export type Achievement = {
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
export type AchievementsResponse = {
  summary: { total: number; earned: number; inProgress: number }
  achievements: Achievement[]
}

function record(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function count(value: unknown): value is number {
  return Number.isInteger(value) && Number(value) >= 0
}

function achievement(value: unknown): value is Achievement {
  return record(value) && typeof value.id === 'string' && typeof value.title === 'string' &&
    typeof value.description === 'string' && ['PROGRESS', 'SCORING', 'COMPETITION', 'EXPLORATION', 'CONSISTENCY'].includes(String(value.category)) &&
    typeof value.icon === 'string' && (value.achievedAt === null || typeof value.achievedAt === 'string' && !Number.isNaN(Date.parse(value.achievedAt))) &&
    (value.qualifyingRoundId === null || typeof value.qualifyingRoundId === 'string') &&
    typeof value.current === 'number' && Number.isFinite(value.current) && value.current >= 0 &&
    typeof value.target === 'number' && Number.isFinite(value.target) && value.target > 0 &&
    (value.direction === 'UP' || value.direction === 'DOWN')
}

export function isAchievementsResponse(value: unknown): value is AchievementsResponse {
  if (!record(value) || !record(value.summary) || !Array.isArray(value.achievements) || !value.achievements.every(achievement)) return false
  if (!count(value.summary.total) || !count(value.summary.earned) || !count(value.summary.inProgress)) return false
  return value.summary.total === value.achievements.length &&
    value.summary.earned === value.achievements.filter((item) => item.achievedAt !== null).length &&
    value.summary.inProgress === value.achievements.filter((item) => item.achievedAt === null && item.current > 0).length
}
