import type { PerformanceAnalysisData } from './performanceAnalysisApi.ts'
import type { StatisticsDashboardCard } from './statisticsDashboardApi.ts'

export type StatisticsDashboardCardView = { label: string; value: string; sample: string; area: string }

function decimal(value: number | null): string { return value === null ? '—' : value.toFixed(1) }
function percentage(value: number | null): string { return value === null ? '—' : `${value.toFixed(1)}%` }
function toPar(value: number | null): string { return value === null ? '—' : value === 0 ? 'E' : value > 0 ? `+${value.toFixed(1)}` : value.toFixed(1) }

export const STATISTICS_DASHBOARD_CARD_LABELS: Record<StatisticsDashboardCard, string> = {
  ROUNDS_PLAYED: 'Rounds played',
  AVERAGE_GROSS: 'Average gross',
  AVERAGE_TO_PAR: 'Average to par',
  CURRENT_HANDICAP: 'Current Handicap Index',
  PUTTS_PER_ROUND: 'Putts per round',
  THREE_PUTT_PERCENTAGE: 'Three-putt frequency',
  FAIRWAYS_HIT: 'Fairways hit',
  GREENS_IN_REGULATION: 'Greens in regulation',
  SCRAMBLING: 'Scrambling',
  PENALTIES_PER_ROUND: 'Penalties per round',
  BUNKER_VISITS_PER_ROUND: 'Bunker visits per round',
}

export function buildStatisticsDashboardCard(card: StatisticsDashboardCard, analysis: PerformanceAnalysisData, handicapIndex: number | null): StatisticsDashboardCardView {
  const detailed = analysis.detailedStatistics
  switch (card) {
    case 'ROUNDS_PLAYED': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: String(analysis.overall.rounds), sample: 'Verified individual rounds', area: 'Scoring' }
    case 'AVERAGE_GROSS': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: decimal(analysis.overall.averageGrossScore), sample: `${analysis.overall.scoredRounds} completed scored rounds`, area: 'Scoring' }
    case 'AVERAGE_TO_PAR': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: toPar(analysis.overall.averageToPar), sample: `${analysis.overall.relativeToParRounds} rounds with known par`, area: 'Scoring' }
    case 'CURRENT_HANDICAP': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: decimal(handicapIndex), sample: 'Current record; dashboard filters do not alter it', area: 'Handicap' }
    case 'PUTTS_PER_ROUND': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: decimal(detailed.putts.averagePerRound), sample: `${detailed.putts.completeRounds} complete recorded rounds`, area: 'Putting' }
    case 'THREE_PUTT_PERCENTAGE': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: percentage(detailed.putts.threePuttPercentage), sample: `${detailed.putts.threePutts} of ${detailed.putts.holes} recorded holes`, area: 'Putting' }
    case 'FAIRWAYS_HIT': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: percentage(detailed.fairways.hitPercentage), sample: `${detailed.fairways.hits} of ${detailed.fairways.holes} applicable holes`, area: 'Driving' }
    case 'GREENS_IN_REGULATION': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: percentage(detailed.greens.percentage), sample: `${detailed.greens.hits} of ${detailed.greens.holes} recorded holes`, area: 'Approach' }
    case 'SCRAMBLING': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: percentage(detailed.scrambling.percentage), sample: `${detailed.scrambling.successful} of ${detailed.scrambling.attempts} attempts`, area: 'Short game' }
    case 'PENALTIES_PER_ROUND': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: decimal(detailed.penalties.averagePerRound), sample: `${detailed.penalties.completeRounds} complete recorded rounds`, area: 'Discipline' }
    case 'BUNKER_VISITS_PER_ROUND': return { label: STATISTICS_DASHBOARD_CARD_LABELS[card], value: decimal(detailed.bunkers.averagePerRound), sample: `${detailed.bunkers.completeRounds} complete recorded rounds`, area: 'Bunkers' }
  }
}
