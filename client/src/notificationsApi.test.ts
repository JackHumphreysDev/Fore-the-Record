import { describe, expect, it } from 'vitest'
import { isNotificationsResponse } from './notificationsApi.ts'

describe('notification response validation', () => {
  it('accepts a complete notification page', () => {
    expect(isNotificationsResponse({
      notifications: [{
        id: 'notification-1', category: 'SOCIAL', eventType: 'FRIEND_REQUEST_RECEIVED',
        title: 'New friend request', message: 'Alex sent you a friend request.',
        action: 'FRIENDS', actionTargetId: 'friendship-1', readAt: null,
        createdAt: '2026-09-23T12:00:00.000Z',
      }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }, unreadCount: 1,
    })).toBe(true)
  })

  it('rejects an unknown action', () => {
    expect(isNotificationsResponse({
      notifications: [{ id: '1', category: 'SOCIAL', eventType: 'x', title: 'x', message: 'x', action: 'DELETE', actionTargetId: null, readAt: null, createdAt: 'now' }],
      pagination: { page: 1, pageSize: 20, total: 1, totalPages: 1 }, unreadCount: 1,
    })).toBe(false)
  })
})
