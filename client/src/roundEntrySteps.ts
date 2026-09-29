export function roundDetailsDateErrors(datePlayed: string, timePlayed: string, today: string) {
  return {
    datePlayed: !datePlayed || datePlayed > today ? 'Choose a date on or before today' : undefined,
    timePlayed: !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(timePlayed) ? 'Choose the time played' : undefined,
  }
}

/** Return the step containing the first actionable validation failure. */
export function roundEntryErrorStep(errors: Partial<Record<string, string | undefined>>): number {
  if (errors.teeId) return 0
  if (['datePlayed', 'timePlayed', 'competitionName', 'competitionFormat', 'numberOfPlayers', 'gameFormat', 'playingPartners', 'playingHandicap'].some((key) => errors[key])) return 1
  if (errors.matchPlay && /^(Select|Choose)/.test(errors.matchPlay)) return 1
  if (errors.grossScore || errors.scorecard || errors.teamCompetition || errors.matchPlay) return 2
  return 3
}
