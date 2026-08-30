import type { CourseData, CourseTeeData } from './courseRatings.js'

export type CourseSearchTee = CourseTeeData & {
  isSaved: boolean
}

export type CourseSearchData = Omit<CourseData, 'tees'> & {
  tees: CourseSearchTee[]
}

function normalizeLabel(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

function getTeeKey(tee: CourseTeeData, clubName: string): string {
  const courseName = tee.courseName?.trim() || clubName

  return `${normalizeLabel(courseName)}::${normalizeLabel(tee.teeName)}`
}

export function mergeCourseSearchData(
  lookupData: CourseData | null,
  savedData: CourseData | null,
): CourseSearchData | null {
  const resultData = lookupData ?? savedData

  if (!resultData) {
    return null
  }

  const lookupClubName = lookupData?.clubName ?? resultData.clubName
  const savedClubName = savedData?.clubName ?? resultData.clubName
  const savedTeeKeys = new Set(
    savedData?.tees.map((tee) => getTeeKey(tee, savedClubName)) ?? [],
  )
  const lookupTeeKeys = new Set(
    lookupData?.tees.map((tee) => getTeeKey(tee, lookupClubName)) ?? [],
  )
  const tees = (lookupData?.tees ?? []).map((tee) => ({
    ...tee,
    isSaved: savedTeeKeys.has(getTeeKey(tee, lookupClubName)),
  }))

  for (const tee of savedData?.tees ?? []) {
    if (!lookupTeeKeys.has(getTeeKey(tee, savedClubName))) {
      tees.push({ ...tee, isSaved: true })
    }
  }

  return {
    clubName: resultData.clubName,
    source: resultData.source,
    tees,
  }
}
