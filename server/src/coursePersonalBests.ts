export type CoursePersonalBestRound = {
  id: string
  datePlayed: Date
  participation: 'INDIVIDUAL' | 'TEAM'
  scoringFormat: 'STROKE_PLAY' | 'STABLEFORD'
  scorecardStatus: 'VERIFIED' | 'PENDING_REVIEW' | 'REJECTED' | 'NOT_REQUIRED'
  holeCount: number
  nineHoleSegment: 'FRONT_NINE' | 'BACK_NINE' | null
  grossScore: number | null
  stablefordPoints: number | null
  tee: {
    id: string
    teeName: string
    course: { id: string; name: string; club: { name: string } }
  }
  holeScores: Array<{
    holeNumber: number
    par: number
    strokesTaken: number
    pickedUp: boolean
  }>
}

type BestScore = {
  score: number
  toPar: number | null
  datePlayed: string
  roundId: string
}

type BestHoleScore = BestScore & { par: number }

type TeeBests = {
  teeId: string
  teeName: string
  courseId: string
  courseName: string
  clubName: string
  rounds: number
  lowestGross: BestScore | null
  highestStableford: BestScore | null
  frontNine: BestScore | null
  backNine: BestScore | null
  holes: Map<number, BestHoleScore>
}

function datePlayed(round: CoursePersonalBestRound): string {
  return round.datePlayed.toISOString().slice(0, 10)
}

function isEarlier(candidate: BestScore, current: BestScore): boolean {
  return candidate.datePlayed < current.datePlayed ||
    candidate.datePlayed === current.datePlayed && candidate.roundId < current.roundId
}

function chooseLower(current: BestScore | null, candidate: BestScore): BestScore {
  return !current || candidate.score < current.score ||
    candidate.score === current.score && isEarlier(candidate, current)
    ? candidate
    : current
}

function chooseHigher(current: BestScore | null, candidate: BestScore): BestScore {
  return !current || candidate.score > current.score ||
    candidate.score === current.score && isEarlier(candidate, current)
    ? candidate
    : current
}

function chooseLowerHole(
  current: BestHoleScore | null,
  candidate: BestHoleScore,
): BestHoleScore {
  const selected = chooseLower(current, candidate)
  return selected.roundId === candidate.roundId ? candidate : current!
}

function segmentBest(
  round: CoursePersonalBestRound,
  segment: 'FRONT_NINE' | 'BACK_NINE',
): BestScore | null {
  if (round.holeCount === 9 && round.nineHoleSegment !== segment) return null
  const holes = round.holeScores.filter((hole) =>
    segment === 'FRONT_NINE' ? hole.holeNumber <= 9 : hole.holeNumber >= 10,
  )
  if (holes.length !== 9 || holes.some((hole) => hole.pickedUp)) return null
  const score = holes.reduce((total, hole) => total + hole.strokesTaken, 0)
  const par = holes.reduce((total, hole) => total + hole.par, 0)
  return { score, toPar: score - par, datePlayed: datePlayed(round), roundId: round.id }
}

export function buildCoursePersonalBests(
  rounds: readonly CoursePersonalBestRound[],
) {
  const groups = new Map<string, TeeBests>()

  for (const round of rounds) {
    if (round.participation !== 'INDIVIDUAL' || round.scorecardStatus !== 'VERIFIED') continue
    let group = groups.get(round.tee.id)
    if (!group) {
      group = {
        teeId: round.tee.id,
        teeName: round.tee.teeName,
        courseId: round.tee.course.id,
        courseName: round.tee.course.name,
        clubName: round.tee.course.club.name,
        rounds: 0,
        lowestGross: null,
        highestStableford: null,
        frontNine: null,
        backNine: null,
        holes: new Map(),
      }
      groups.set(round.tee.id, group)
    }
    group.rounds += 1

    const hasPickup = round.holeScores.some((hole) => hole.pickedUp)
    if (round.holeCount === 18 && round.grossScore !== null && !hasPickup) {
      const par = round.holeScores.length === 18
        ? round.holeScores.reduce((total, hole) => total + hole.par, 0)
        : null
      group.lowestGross = chooseLower(group.lowestGross, {
        score: round.grossScore,
        toPar: par === null ? null : round.grossScore - par,
        datePlayed: datePlayed(round),
        roundId: round.id,
      })
    }
    if (round.holeCount === 18 && round.stablefordPoints !== null) {
      group.highestStableford = chooseHigher(group.highestStableford, {
        score: round.stablefordPoints,
        toPar: null,
        datePlayed: datePlayed(round),
        roundId: round.id,
      })
    }

    const frontNine = segmentBest(round, 'FRONT_NINE')
    const backNine = segmentBest(round, 'BACK_NINE')
    if (frontNine) group.frontNine = chooseLower(group.frontNine, frontNine)
    if (backNine) group.backNine = chooseLower(group.backNine, backNine)

    for (const hole of round.holeScores) {
      if (hole.pickedUp) continue
      const candidate = {
        score: hole.strokesTaken,
        toPar: hole.strokesTaken - hole.par,
        par: hole.par,
        datePlayed: datePlayed(round),
        roundId: round.id,
      }
      const current = group.holes.get(hole.holeNumber) ?? null
      group.holes.set(hole.holeNumber, chooseLowerHole(current, candidate))
    }
  }

  return {
    courses: [...groups.values()]
      .map((group) => ({
        teeId: group.teeId,
        teeName: group.teeName,
        courseId: group.courseId,
        courseName: group.courseName,
        clubName: group.clubName,
        rounds: group.rounds,
        lowestGross: group.lowestGross,
        highestStableford: group.highestStableford,
        frontNine: group.frontNine,
        backNine: group.backNine,
        holes: [...group.holes.entries()]
          .sort(([left], [right]) => left - right)
          .map(([holeNumber, best]) => ({ holeNumber, ...best })),
      }))
      .sort((left, right) =>
        `${left.clubName} ${left.courseName} ${left.teeName}`.localeCompare(
          `${right.clubName} ${right.courseName} ${right.teeName}`,
        ),
      ),
  }
}
