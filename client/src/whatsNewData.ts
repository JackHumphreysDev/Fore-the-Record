export type WhatsNewEntry = {
  id: string
  publishedAt: string
  title: string
  summary: string
  highlights: readonly string[]
}

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: 'player-performance-summary',
    publishedAt: '2026-09-09',
    title: 'See your game at a glance',
    summary:
      'Your Profile now brings together the key figures from your playing record in one clear summary.',
    highlights: [
      'Compare your current Handicap Index with your best and average verified score differentials.',
      'See your casual, individual competition, team, scored, and counting-round totals.',
      'Follow your five most recent verified differentials and see which are currently counting.',
    ],
  },
  {
    id: 'support-unread-indicators',
    publishedAt: '2026-09-07',
    title: 'See when a support reply is waiting',
    summary:
      'Support now shows when the administrator has added a reply you have not opened yet.',
    highlights: [
      'An unread count appears beside Support in the main navigation.',
      'Opening the conversation clears its new-reply marker automatically.',
    ],
  },
  {
    id: 'linked-round-corrections',
    publishedAt: '2026-09-07',
    title: 'Point us to the round that needs correcting',
    summary:
      'When you report incorrect round information, you can now select the affected round from your playing history.',
    highlights: [
      'The administrator can open the correct record directly from your request.',
      'Your private conversation stays available even if the round is later removed.',
    ],
  },
  {
    id: 'provider-scorecards-restored',
    publishedAt: '2026-09-07',
    title: 'Scorecards for newly added courses',
    summary:
      'Newly found provider courses now load the hole-by-hole card for the exact tee you choose in Round Entry.',
    highlights: [
      'Par, stroke index, and available yardage are brought into all 18 holes automatically.',
      'Manual scorecard entry remains available when a course genuinely has no complete card.',
    ],
  },
  {
    id: 'updates-in-one-place',
    publishedAt: '2026-09-07',
    title: 'Keep up with what’s new',
    summary:
      'You now have one place to see the latest improvements to Fore the Record, written with players in mind.',
    highlights: [
      'Updates are listed with the newest first.',
      'Only changes that are useful to players appear here.',
    ],
  },
  {
    id: 'round-corrections',
    publishedAt: '2026-09-07',
    title: 'Help when a round needs correcting',
    summary:
      'If you report an incorrect round, the administrator can now correct its details or remove it for you.',
    highlights: [
      'Corrected hole scores must still match the signed total.',
      'Your Handicap Index and counting rounds are refreshed after a correction.',
    ],
  },
  {
    id: 'round-types',
    publishedAt: '2026-09-02',
    title: 'Record every kind of round',
    summary:
      'Choose whether you played a casual round, an individual competition, or a team competition.',
    highlights: [
      'Competition names, formats, player numbers, dates, and times stay with your record.',
      'Team competitions can be saved without a scorecard and will not change your Handicap Index.',
    ],
  },
  {
    id: 'hole-by-hole-scorecards',
    publishedAt: '2026-09-01',
    title: 'Add your score hole by hole',
    summary:
      'Round Entry now shows a complete 18-hole card alongside your signed total, so you can preserve the detail behind every score.',
    highlights: [
      'A running total warns you if the hole scores and signed total do not match.',
      'If course details are missing, you can add par and stroke index for administrator review.',
      'Your round history shows when a player-entered scorecard is awaiting review.',
    ],
  },
  {
    id: 'course-search',
    publishedAt: '2026-09-01',
    title: 'Find clubs and courses faster',
    summary:
      'Search by all or part of a club or course name, then choose from the matching courses and rated tees.',
    highlights: [
      'Home-club selection uses the same quick partial-name search.',
      'Newly found course details are saved so everyone can reuse them.',
      'If something is still missing, you can send the details through Support.',
    ],
  },
  {
    id: 'support-conversations',
    publishedAt: '2026-08-31',
    title: 'Follow your support requests',
    summary:
      'Share ideas, report problems, request corrections, or tell us about a missing course without leaving your account.',
    highlights: [
      'Every request has a private conversation and visible progress status.',
      'You can reply when the administrator asks for more information.',
    ],
  },
  {
    id: 'personal-golf-record',
    publishedAt: '2026-08-31',
    title: 'Your personal golf record begins',
    summary:
      'Create a secure profile, save your home club, record rounds, and follow the scores shaping your Handicap Index.',
    highlights: [
      'Sign in with email and password to keep your record connected to you.',
      'Round history identifies the scores currently counting towards your Handicap Index.',
    ],
  },
]

export function formatWhatsNewDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${value}T00:00:00Z`))
}
