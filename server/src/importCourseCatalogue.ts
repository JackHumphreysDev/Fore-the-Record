import { runCourseCatalogueImport } from './courseCatalogue.js'
import {
  createPrismaCatalogueStore,
  createRapidApiCatalogueClient,
  parseCatalogueImportCommandOptions,
} from './courseCatalogueImport.js'
import { prisma } from './database.js'

const EXPECTED_CLUBS = 2668
const EXPECTED_COURSES = 3083
const EXPECTED_TEE_SETS = 14223

async function main() {
  const apiKey = process.env.RAPIDAPI_KEY
  const apiHost = process.env.RAPIDAPI_HOST
  const clubsPath = process.env.RAPIDAPI_SEARCH_PATH

  if (!apiKey || !apiHost || !clubsPath) {
    throw new Error(
      'RAPIDAPI_KEY, RAPIDAPI_HOST, and RAPIDAPI_SEARCH_PATH are required',
    )
  }

  const options = parseCatalogueImportCommandOptions(process.argv.slice(2))
  const client = createRapidApiCatalogueClient({
    apiKey,
    apiHost,
    clubsPath,
  })
  const store = createPrismaCatalogueStore()

  console.log(
    options.dryRun
      ? 'Starting course catalogue dry run; no database records will change.'
      : 'Starting resumable course catalogue import.',
  )

  const result = await runCourseCatalogueImport(client, store, {
    ...options,
    onClubProcessed: (club, progress) => {
      if (progress.clubs === 1 || progress.clubs % 25 === 0) {
        console.log(
          `${progress.clubs} clubs processed; ${progress.courses} courses; ${progress.teeSets} tee sets. Latest: ${club.name}`,
        )
      }
    },
  })

  console.log('Course catalogue run complete.')
  console.log(
    `Processed ${result.processedClubs} clubs, ${result.processedCourses} courses, and ${result.processedTeeSets} tee sets across ${result.pagesRead} pages.`,
  )
  console.log(
    `Reference snapshot: ${EXPECTED_CLUBS} clubs, ${EXPECTED_COURSES} courses, ${EXPECTED_TEE_SETS} tee sets. RapidAPI currently reports ${result.availableClubs} clubs.`,
  )

  if (!options.dryRun) {
    const [storedClubs, storedCourses, storedTeeSets] = await Promise.all([
      prisma.club.count(),
      prisma.course.count(),
      prisma.tee.count(),
    ])

    console.log(
      `Database now contains ${storedClubs} clubs, ${storedCourses} courses, and ${storedTeeSets} tee sets.`,
    )
  }
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : 'Unknown error'
    console.error(`Course catalogue import failed: ${message}`)
    process.exitCode = 1
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
