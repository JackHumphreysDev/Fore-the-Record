export type WhatsNewEntry = {
  id: string
  publishedAt: string
  title: string
  summary: string
  highlights: readonly string[]
}

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: 'privacy-account-controls',
    publishedAt: '2026-09-10',
    title: 'Put your account choices in your hands',
    summary:
      'Account Settings now gives you clearer control over how other players find you and what happens to your information.',
    highlights: [
      'Choose whether you appear in player search, accept friend requests, or show your Handicap Index.',
      'Download a copy of your profile, rounds, goals, favourites, and support conversations.',
      'Permanently delete your account with password and email confirmation when you decide to leave.',
    ],
  },
  {
    id: 'round-notes',
    publishedAt: '2026-09-10',
    title: 'Remember the story behind the score',
    summary:
      'Add your own private thoughts to every round and return to them whenever you review your playing history.',
    highlights: [
      'Write an optional note while recording an individual or team round.',
      'Add, edit, or clear notes later from Round History.',
      'Search your notes alongside clubs, courses, tees, and competitions.',
    ],
  },
  {
    id: 'round-history-filters',
    publishedAt: '2026-09-10',
    title: 'Find the round you are looking for',
    summary:
      'Round History now lets you narrow your record without losing the details behind each score.',
    highlights: [
      'Search by club, course, tee, competition name, or competition format.',
      'Combine round type, handicap status, scorecard status, and date filters.',
      'See the matching total immediately and clear every filter in one action.',
    ],
  },
  {
    id: 'player-goals',
    publishedAt: '2026-09-10',
    title: 'Set your next golfing target',
    summary:
      'Player Goals turns the scores already in your record into clear progress towards what you want to achieve next.',
    highlights: [
      'Set targets for your Handicap Index, lowest gross score, rounds played, birdies, or pars.',
      'Add an optional target date and see your progress update automatically from verified rounds.',
      'Replace a target whenever your ambitions change or remove a goal you no longer need.',
    ],
  },
  {
    id: 'friends-and-player-connections',
    publishedAt: '2026-09-10',
    title: 'Connect with your golfing friends',
    summary:
      'Find other Fore the Record players by name and send them a friend request.',
    highlights: [
      'Use a player’s home club to identify the right account when names are similar.',
      'See an accepted friend’s current Handicap Index or whether they are still awaiting one.',
      'Accept, decline, cancel, or remove connections while emails, rounds, and private statistics stay hidden.',
    ],
  },
  {
    id: 'account-settings',
    publishedAt: '2026-09-10',
    title: 'Keep your account details up to date',
    summary:
      'A new Account Settings screen gives you a secure place to update your name, sign-in email, and password.',
    highlights: [
      'Open Account Settings directly from your Profile.',
      'Confirm a new email address before it replaces your current sign-in email.',
      'Verify your current password before changing sensitive sign-in details.',
    ],
  },
  {
    id: 'personal-milestones',
    publishedAt: '2026-09-09',
    title: 'Celebrate every step of your golfing story',
    summary:
      'Your Profile now turns verified rounds into lifetime totals, personal bests, and achievements.',
    highlights: [
      'Follow total holes, shots, recorded yards, eagles, birdies, pars, and bogeys.',
      'See your lowest gross score, best differential, and lowest Handicap Index.',
      'Earn dated milestones for rounds, competitions, counting scores, and breaking scoring barriers.',
    ],
  },
  {
    id: 'favourite-courses-default-tees',
    publishedAt: '2026-09-09',
    title: 'Keep your regular courses close',
    summary:
      'Save the courses you play most often and choose the tee you normally use.',
    highlights: [
      'Manage favourite courses and their default tees above catalogue search.',
      'See favourite courses first when recording a round.',
      'Start each matching round with your default tee already selected, while keeping the freedom to change it.',
    ],
  },
  {
    id: 'round-insights',
    publishedAt: '2026-09-09',
    title: 'See the story behind every round',
    summary:
      'Round Entry and History now give you a clearer view of how each score contributes to your record.',
    highlights: [
      'Follow your score with automatic Front 9, Back 9, and full-round totals as you enter each hole.',
      'Open any saved round in History to review its complete hole-by-hole scorecard.',
      'Use the Handicap Index journey chart to compare differentials with the index produced after each eligible round.',
    ],
  },
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
