export type PersonalBestScore = {
  score: number
  toPar: number | null
  datePlayed: string
  roundId: string
}

export type CoursePersonalBest = {
  teeId: string
  teeName: string
  courseId: string
  courseName: string
  clubName: string
  rounds: number
  lowestGross: PersonalBestScore | null
  highestStableford: PersonalBestScore | null
  frontNine: PersonalBestScore | null
  backNine: PersonalBestScore | null
  holes: Array<PersonalBestScore & { holeNumber: number; par: number }>
}

export type CoursePersonalBestsData = { courses: CoursePersonalBest[] }

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isBestScore(value: unknown): value is PersonalBestScore {
  return isRecord(value) &&
    typeof value.score === 'number' && Number.isFinite(value.score) &&
    (value.toPar === null || typeof value.toPar === 'number' && Number.isFinite(value.toPar)) &&
    typeof value.datePlayed === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.datePlayed) &&
    typeof value.roundId === 'string'
}

function isNullableBestScore(value: unknown): value is PersonalBestScore | null {
  return value === null || isBestScore(value)
}

function isHoleBestScore(
  value: unknown,
): value is PersonalBestScore & { holeNumber: number; par: number } {
  return isRecord(value) &&
    Number.isInteger(value.holeNumber) && Number(value.holeNumber) >= 1 &&
    Number.isInteger(value.par) && Number(value.par) >= 1 &&
    isBestScore(value)
}

export function isCoursePersonalBestsData(
  value: unknown,
): value is CoursePersonalBestsData {
  return isRecord(value) && Array.isArray(value.courses) && value.courses.every((course) =>
    isRecord(course) &&
    typeof course.teeId === 'string' && typeof course.teeName === 'string' &&
    typeof course.courseId === 'string' && typeof course.courseName === 'string' &&
    typeof course.clubName === 'string' && Number.isInteger(course.rounds) &&
    Number(course.rounds) >= 0 && isNullableBestScore(course.lowestGross) &&
    isNullableBestScore(course.highestStableford) && isNullableBestScore(course.frontNine) &&
    isNullableBestScore(course.backNine) && Array.isArray(course.holes) &&
    course.holes.every(isHoleBestScore),
  )
}
