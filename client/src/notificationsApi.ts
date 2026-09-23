import { fetchWithAccessToken } from './api.ts'

export const notificationCategories = ['SOCIAL', 'SUPPORT', 'ROUND', 'GROUP', 'ACHIEVEMENT'] as const
export type NotificationCategory = (typeof notificationCategories)[number]
export type NotificationAction = 'FRIENDS' | 'SUPPORT' | 'HISTORY' | 'GROUPS' | 'ACHIEVEMENTS'

export type PlayerNotification = {
  id: string
  category: NotificationCategory
  eventType: string
  title: string
  message: string
  action: NotificationAction
  actionTargetId: string | null
  readAt: string | null
  createdAt: string
}

export type NotificationsResponse = {
  notifications: PlayerNotification[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  unreadCount: number
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function isNotificationUnreadCount(value: unknown): value is { count: number } {
  return isRecord(value) && typeof value.count === 'number' && Number.isInteger(value.count) && value.count >= 0
}

export function isNotificationsResponse(value: unknown): value is NotificationsResponse {
  if (!isRecord(value) || !Array.isArray(value.notifications) || !isRecord(value.pagination) || !isNotificationUnreadCount({ count: value.unreadCount })) return false
  const validActions: NotificationAction[] = ['FRIENDS', 'SUPPORT', 'HISTORY', 'GROUPS', 'ACHIEVEMENTS']
  return value.notifications.every((item) => isRecord(item) &&
    typeof item.id === 'string' && notificationCategories.includes(item.category as NotificationCategory) &&
    typeof item.eventType === 'string' && typeof item.title === 'string' && typeof item.message === 'string' &&
    validActions.includes(item.action as NotificationAction) &&
    (item.actionTargetId === null || typeof item.actionTargetId === 'string') &&
    (item.readAt === null || typeof item.readAt === 'string') && typeof item.createdAt === 'string') &&
    typeof value.pagination.page === 'number' && typeof value.pagination.pageSize === 'number' &&
    typeof value.pagination.total === 'number' && typeof value.pagination.totalPages === 'number'
}

export async function fetchNotifications(
  accessToken: string,
  options: { category: NotificationCategory | ''; unreadOnly: boolean; page: number },
  signal?: AbortSignal,
): Promise<NotificationsResponse> {
  const search = new URLSearchParams({ page: String(options.page), pageSize: '20' })
  if (options.category) search.set('category', options.category)
  if (options.unreadOnly) search.set('unread', 'true')
  const response = await fetchWithAccessToken(accessToken, `/api/users/me/notifications?${search}`, { signal })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok || !isNotificationsResponse(body)) throw new Error('We could not load your notifications.')
  return body
}

export async function markNotificationRead(accessToken: string, notificationId: string): Promise<void> {
  const response = await fetchWithAccessToken(accessToken, `/api/users/me/notifications/${notificationId}/read`, { method: 'PATCH' })
  if (!response.ok) throw new Error('We could not update that notification.')
}

export async function markAllNotificationsRead(accessToken: string): Promise<void> {
  const response = await fetchWithAccessToken(accessToken, '/api/users/me/notifications/read-all', { method: 'POST' })
  if (!response.ok) throw new Error('We could not mark your notifications as read.')
}
