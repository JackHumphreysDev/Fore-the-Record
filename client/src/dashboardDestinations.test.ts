import { describe, expect, it } from 'vitest'
import { friendsNotificationDestination } from './dashboardDestinations.ts'

describe('dashboard notification destinations', () => {
  it.each([
    ['GROUPS', 'FRIEND_GROUP_MESSAGE', 'competitions', 'groups'],
    ['FRIENDS', 'CHALLENGE_RECEIVED', 'competitions', 'challenges'],
    ['FRIENDS', 'CHALLENGE_ACCEPTED', 'competitions', 'challenges'],
    ['FRIENDS', 'KNOCKOUT_INVITATION', 'competitions', 'knockouts'],
    ['FRIENDS', 'KNOCKOUT_RESULT', 'competitions', 'knockouts'],
    ['FRIENDS', 'TOURNAMENT_SERIES_INVITATION', 'competitions', 'series'],
    ['FRIENDS', 'FRIEND_REQUEST_RECEIVED', 'players', 'overview'],
    ['FRIENDS', 'ROUND_SHARED', 'shared', 'overview'],
    ['FRIENDS', 'UNKNOWN_EVENT', 'activity', 'overview'],
  ])('%s / %s opens its visible panel', (action, eventType, tab, competition) => {
    expect(friendsNotificationDestination(action, eventType)).toEqual({ tab, competition })
  })
})
