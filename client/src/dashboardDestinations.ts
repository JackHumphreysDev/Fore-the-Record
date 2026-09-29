export type FriendsDestination = {
  tab: 'activity' | 'players' | 'competitions' | 'shared'
  competition: 'overview' | 'challenges' | 'knockouts' | 'series' | 'groups'
}

// Notifications must open the panel containing the relevant action, not a hidden tab.
export function friendsNotificationDestination(action: string, eventType: string): FriendsDestination {
  if (action === 'GROUPS') return { tab: 'competitions', competition: 'groups' }
  if (eventType.startsWith('CHALLENGE_')) return { tab: 'competitions', competition: 'challenges' }
  if (eventType.startsWith('KNOCKOUT_')) return { tab: 'competitions', competition: 'knockouts' }
  if (eventType.startsWith('TOURNAMENT_SERIES_')) return { tab: 'competitions', competition: 'series' }
  if (eventType.startsWith('FRIEND_REQUEST_')) return { tab: 'players', competition: 'overview' }
  if (eventType === 'ROUND_SHARED') return { tab: 'shared', competition: 'overview' }
  return { tab: 'activity', competition: 'overview' }
}
