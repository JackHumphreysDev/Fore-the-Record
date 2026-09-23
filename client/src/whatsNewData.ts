export type WhatsNewEntry = {
  id: string
  publishedAt: string
  title: string
  summary: string
  highlights: readonly string[]
}

export const WHATS_NEW_ENTRIES: readonly WhatsNewEntry[] = [
  {
    id: 'notification-centre',
    publishedAt: '2026-09-23',
    title: 'Keep every update in one place',
    summary: 'Open your private notification centre to catch up on friends, support, scorecards, groups, challenges, shared rounds, and achievements.',
    highlights: [
      'See an unread total in the main navigation and filter updates by category or unread state.',
      'Open an update to go directly to the relevant Friends, Support, History, Groups, or Profile area.',
      'Mark individual updates as you open them or clear the full unread list together.',
      'Your read state follows your signed-in account across devices.',
    ],
  },
  {
    id: 'achievements-badges',
    publishedAt: '2026-09-23',
    title: 'Build your golfing honours board',
    summary: 'Unlock badges naturally as your rounds, scores, courses, and Handicap Index tell more of your story.',
    highlights: [
      'Follow 37 achievements across playing progress, scoring, competitions, social games, exploration, and consistency.',
      'Filter badges by category or see what is earned, in progress, and still waiting to begin.',
      'See the date each badge was earned and open its qualifying round in History when available.',
      'Badge progress comes directly from verified rounds and never changes a score or your Handicap Index.',
    ],
  },
  {
    id: 'season-year-reviews',
    publishedAt: '2026-09-23',
    title: 'Revisit every season of your golf',
    summary: 'Choose any year in your record and see the rounds, scores, courses, and moments that shaped it.',
    highlights: [
      'Review a full calendar year or filter it into Winter, Spring, Summer, and Autumn.',
      'Compare rounds, holes, shots, yardage, eagles, birdies, pars, and bogeys with the same period a year earlier.',
      'Follow your Handicap Index movement and see the course you played most often.',
      'Open your lowest gross, highest Stableford, and best differential rounds directly in History.',
    ],
  },
  {
    id: 'playing-partners-history',
    publishedAt: '2026-09-23',
    title: 'Remember every playing partner',
    summary: 'Revisit the friends and guests you have shared a round with, together with when and where you played.',
    highlights: [
      'See rounds played, wins, losses, ties, first and latest dates, shared courses, and formats for each partner.',
      'Search by partner, club, or course and switch between linked friends and named guests.',
      'Open rounds you recorded directly in your private Round History.',
      'Incoming friend rounds show only limited context; private scores, notes, photos, and hole details stay private.',
    ],
  },
  {
    id: 'round-comparison',
    publishedAt: '2026-09-23',
    title: 'Put two rounds side by side',
    summary: 'Choose two rounds from the same course and see where the scores and playing details changed from one card to the other.',
    highlights: [
      'Compare gross score, score to par, score differential, Handicap Index outcome, and Front 9 and Back 9 totals.',
      'Compare rounds from different tees on the same course when they cover the same 18-hole, Front 9, or Back 9 layout.',
      'See every hole marked as gained, lost, the same, or unavailable, with pickups kept honestly scoreless.',
      'Compare recorded putting, driving, approach, short-game, penalty, and bunker figures, then open either complete round in History.',
    ],
  },
  {
    id: 'advanced-statistics-insights',
    publishedAt: '2026-09-23',
    title: 'See where your game is moving',
    summary: 'Compare recent playing statistics with your earlier rounds and see how those figures change across courses and tees.',
    highlights: [
      'Compare your latest five recorded rounds with the five before them across putting, driving, approach, short-game, and discipline figures.',
      'See your clearest recent gain, an area to watch, and greens in regulation split across par 3, par 4, and par 5 holes.',
      'Compare course-and-tee results once you have two matching rounds with the chosen statistic recorded.',
      'Use the existing date, course, tee, round-type, and round-length filters, with exact sample sizes and clear more-data-needed states.',
    ],
  },
  {
    id: 'detailed-round-statistics',
    publishedAt: '2026-09-23',
    title: 'See more than the final score',
    summary: 'Optionally record the details behind every hole and turn them into a private picture of where your game gains and loses shots.',
    highlights: [
      'Add putts, fairway result, green in regulation, penalties, bunker visits, and up-and-down results in standard or Live Round entry.',
      'Compare putting, driving, approach, scrambling, penalty, and bunker figures with filters and clear sample sizes.',
      'Expand a saved round in History to revisit every statistic and its complete round summary.',
      'Leave any detail blank when you do not have it; optional statistics never alter your score or Handicap Index.',
    ],
  },
  {
    id: 'live-round-mode',
    publishedAt: '2026-09-23',
    title: 'Take your scorecard onto the course',
    summary: 'Record an individual round one hole at a time and safely return to an unfinished card whenever you need to.',
    highlights: [
      'See par, stroke index, yardage, running totals, score to par, and Stableford points while you play.',
      'Refresh, sign in again, or move to another device and resume the one live round saved to your account.',
      'Review the complete card before it enters History and your usual Handicap Index calculation.',
      'Abandon an unfinished card with confirmation when the round will not be completed.',
    ],
  },
  {
    id: 'team-game-scoring',
    publishedAt: '2026-09-23',
    title: 'Keep the complete team competition',
    summary: 'Record every team across all 18 holes and see the full finishing order without changing anyone’s Handicap Index.',
    highlights: [
      'Name your team, link accepted friends or add guests, and list every opposing team and player.',
      'Choose Gross Strokes or Stableford Points and enter one score for each team on every hole.',
      'See automatic Front 9, Back 9, total, tied position, and full-field leaderboard results.',
      'Review the complete card later in History or an accepted friend’s profile.',
    ],
  },
  {
    id: 'performance-insights',
    publishedAt: '2026-09-22',
    title: 'Follow the patterns in your game',
    summary: 'See whether your recent scoring is improving and revisit how you have played any recorded hole over time.',
    highlights: [
      'Compare your latest five rounds with the previous five, with Stroke Play and Stableford kept separate.',
      'See scoring consistency, stronger and weaker par types, Front 9 and Back 9 form, and your strongest course and tee.',
      'Choose an exact course, tee, and hole to plot every score against par and your own average.',
      'Open any plotted score in Round History, while picked-up holes remain clearly marked and never receive a made-up score.',
    ],
  },
  {
    id: 'friend-groups-leaderboards',
    publishedAt: '2026-09-22',
    title: 'Bring your golf group together',
    summary: 'Create a named private group or league with accepted friends, compare verified play, and keep the conversation in one place.',
    highlights: [
      'Add a description and group image, then compare numbered positions and results over a chosen period.',
      'Rank rounds played, Stableford points, 18-hole gross scoring, or Handicap Index improvement.',
      'Post a general leaderboard message or attach a comment to a recent verified group round.',
      'Group owners manage membership and moderation, while private notes and full scorecards stay out of the group.',
    ],
  },
  {
    id: 'match-play-scoring',
    publishedAt: '2026-09-22',
    title: 'Keep the full story of a Match Play round',
    summary: 'Record each hole against one friend or guest and let Fore the Record calculate how the match finished.',
    highlights: [
      'Enter both scores for an automatic hole result, or record a concession or net decision directly.',
      'See running results and familiar final scores such as 3 & 2, 1 up, or All square.',
      'Review the opponent, every played hole, and the final result later in Round History.',
    ],
  },
  {
    id: 'course-personal-bests',
    publishedAt: '2026-09-22',
    title: 'See your best at every course',
    summary: 'Open Rounds to see the personal records you have set from each course and tee you have played.',
    highlights: [
      'See your lowest 18-hole gross score and highest 18-hole Stableford points total.',
      'Compare your best Front 9, Back 9, and completed score on every individual hole.',
      'Each record includes the date it was first set, while pickups and cards awaiting review are handled fairly.',
    ],
  },
  {
    id: 'account-security-centre',
    publishedAt: '2026-09-22',
    title: 'Keep an eye on your account security',
    summary: 'Review your latest sign-in details and close sessions you no longer want to keep active.',
    highlights: [
      'See whether your sign-in email is verified and when your account last signed in successfully.',
      'Sign out other devices while keeping the browser in front of you active.',
      'Use an exact confirmation when you need to sign out everywhere, including the current device.',
    ],
  },
  {
    id: 'shared-rounds',
    publishedAt: '2026-09-22',
    title: 'Share a round with a friend',
    summary: 'Open an accepted friend’s profile to view their rounds automatically, or privately share one completed round directly.',
    highlights: [
      'Accepted friends can see every round on each other’s friend profiles without enabling activity sharing.',
      'Course details, score summaries, hole-by-hole cards, and attached scorecard photos are available.',
      'Notes, email addresses, and account details remain private.',
      'The owner can revoke access and the recipient can remove the share at any time.',
    ],
  },
  {
    id: 'challenges-and-leaderboards',
    publishedAt: '2026-09-18',
    title: 'Challenge a friend',
    summary: 'Invite an accepted friend to a private, date-limited golf challenge and follow the live standings together.',
    highlights: [
      'Compete for most rounds, most Stableford points, or the lowest average gross score.',
      'Accept, decline, or cancel challenges without exposing private scorecard detail.',
      'Only verified individual rounds played during the challenge count.',
    ],
  },
  {
    id: 'competition-and-social-games',
    publishedAt: '2026-09-17',
    title: 'Record the way you played',
    summary:
      'Choose a recognised competition format or keep a game with friends such as Wolf, Sixes, Skins, or Nassau on your record.',
    highlights: [
      'Record the format, field size, and an optional Won, Lost, or Tied result.',
      'Link accepted friends or add guest names so your history remembers who joined you.',
      'A friend can remove their own tag, and tagging never copies your score or changes their handicap.',
    ],
  },
  {
    id: 'deeper-performance-analysis',
    publishedAt: '2026-09-17',
    title: 'See what is shaping your scores',
    summary:
      'Open Rounds to compare your scoring across courses, tees, different holes, and types of play.',
    highlights: [
      'Choose the last 30 days, 90 days, 12 months, all time, or your own dates.',
      'Filter by course, tee, casual rounds, or competitions and see each sample beside its average.',
      'Compare gross and score-to-par averages for par 3s, par 4s, par 5s, the Front 9, and the Back 9.',
    ],
  },
  {
    id: 'scorecard-photo',
    publishedAt: '2026-09-16',
    title: 'Keep the card behind the score',
    summary:
      'Attach a private photo of your signed scorecard to any saved individual round.',
    highlights: [
      'Add, view, replace, or remove one scorecard photo from Round History.',
      'Use JPEG, PNG, or WebP images up to 10 MB.',
      'Your photo stays private to you and the administrator and never changes your saved scores automatically.',
    ],
  },
  {
    id: 'friends-activity-feed',
    publishedAt: '2026-09-16',
    title: 'Follow your friends’ latest rounds',
    summary:
      'See a simple feed of the verified rounds your accepted friends choose to share.',
    highlights: [
      'See the course, tee, date, round type, and headline result without opening anyone’s private scorecard.',
      'Keep Handicap Index visibility under its existing separate privacy choice.',
      'Turn off round activity sharing in Account Settings whenever you want to hide every past and future feed entry.',
    ],
  },
  {
    id: 'nine-hole-rounds',
    publishedAt: '2026-09-16',
    title: 'Make nine holes part of your record',
    summary:
      'Record a Front 9 or Back 9 with the same hole-by-hole detail as a full round.',
    highlights: [
      'Choose 9 holes in Round Entry and see only the selected Front 9 or Back 9.',
      'Follow automatic gross and Stableford totals for the nine you played.',
      'Open the round in History to revisit every score while its Handicap Index status stays clear.',
    ],
  },
  {
    id: 'stableford-scoring',
    publishedAt: '2026-09-15',
    title: 'Count every Stableford point',
    summary:
      'Record a Stableford round with the Playing Handicap from your card and see every point calculated for you.',
    highlights: [
      'See gross score, net score, and points for each hole as you complete the card.',
      'Follow your Front 9, Back 9, and full-round Stableford totals automatically.',
      'Mark a hole as Picked up for zero points without adding a made-up score to your record.',
    ],
  },
  {
    id: 'installable-mobile-app',
    publishedAt: '2026-09-12',
    title: 'Take your record with you',
    summary:
      'Add Fore the Record to your phone’s Home Screen and open it like an app whenever you are ready to play.',
    highlights: [
      'Use Install app when your browser offers it, or add the site from Safari’s Share menu on iPhone and iPad.',
      'Launch straight into your usual Fore the Record experience.',
      'Your rounds and account details still need an internet connection.',
    ],
  },
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
