import { useEffect, useState } from 'react'
import { getSupabaseClient } from './supabase.ts'
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  notificationCategories,
  type NotificationAction,
  type NotificationCategory,
  type NotificationsResponse,
} from './notificationsApi.ts'
import './NotificationCentre.css'

const labels: Record<NotificationCategory, string> = {
  SOCIAL: 'Social', SUPPORT: 'Support', ROUND: 'Rounds', GROUP: 'Groups', ACHIEVEMENT: 'Achievements',
}

type Props = {
  profileId: string
  onNavigate: (action: NotificationAction, targetId: string | null) => void
  onUnreadChanged: () => void
}

export default function NotificationCentre({ profileId, onNavigate, onUnreadChanged }: Props) {
  const [category, setCategory] = useState<NotificationCategory | ''>('')
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<NotificationsResponse | null>(null)
  const [error, setError] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)

  useEffect(() => {
    const controller = new AbortController()
    void getSupabaseClient().auth.getSession().then(({ data: sessionData }) => {
      const token = sessionData.session?.access_token
      if (!token) throw new Error('Sign in again to view notifications.')
      return fetchNotifications(token, { category, unreadOnly, page }, controller.signal)
    }).then(setData).catch((reason: unknown) => {
      if (!controller.signal.aborted) setError(reason instanceof Error ? reason.message : 'We could not load your notifications.')
    }).finally(() => { if (!controller.signal.aborted) setIsLoading(false) })
    return () => controller.abort()
  }, [category, page, profileId, refresh, unreadOnly])

  async function accessToken() {
    const { data: sessionData } = await getSupabaseClient().auth.getSession()
    const token = sessionData.session?.access_token
    if (!token) throw new Error('Sign in again to update notifications.')
    return token
  }

  async function openNotification(id: string, action: NotificationAction, targetId: string | null) {
    try {
      await markNotificationRead(await accessToken(), id)
      onUnreadChanged()
      onNavigate(action, targetId)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'We could not update that notification.')
    }
  }

  async function markAllRead() {
    try {
      await markAllNotificationsRead(await accessToken())
      onUnreadChanged()
      setRefresh((value) => value + 1)
    } catch (reason: unknown) {
      setError(reason instanceof Error ? reason.message : 'We could not update your notifications.')
    }
  }

  function changeCategory(nextCategory: NotificationCategory | '') {
    setIsLoading(true)
    setError('')
    setCategory(nextCategory)
    setPage(1)
  }

  function changeUnreadOnly(nextUnreadOnly: boolean) {
    setIsLoading(true)
    setError('')
    setUnreadOnly(nextUnreadOnly)
    setPage(1)
  }

  function changePage(nextPage: number) {
    setIsLoading(true)
    setError('')
    setPage(nextPage)
  }

  return (
    <section className="notification-page" aria-labelledby="notification-title">
      <header className="notification-hero">
        <div>
          <p className="form-kicker">Your clubhouse updates</p>
          <h1 id="notification-title">Notification centre.</h1>
          <p>Friend activity, support replies, scorecard decisions, group messages and earned achievements—all in one place.</p>
        </div>
        <button className="secondary-button" type="button" onClick={() => void markAllRead()} disabled={!data?.unreadCount}>
          Mark all as read
        </button>
      </header>

      <div className="notification-filters" aria-label="Notification filters">
        <button type="button" className={category === '' ? 'active' : ''} onClick={() => changeCategory('')}>All</button>
        {notificationCategories.map((item) => (
          <button type="button" key={item} className={category === item ? 'active' : ''} onClick={() => changeCategory(item)}>{labels[item]}</button>
        ))}
        <label><input type="checkbox" checked={unreadOnly} onChange={(event) => changeUnreadOnly(event.target.checked)} /> Unread only</label>
      </div>

      {error ? <p className="notification-state error" role="alert">{error}</p> : null}
      {isLoading ? <p className="notification-state" role="status">Loading notifications…</p> : null}
      {!isLoading && data?.notifications.length === 0 ? <p className="notification-state">No notifications match this view.</p> : null}

      <div className="notification-list">
        {data?.notifications.map((notification) => (
          <article className={`notification-card ${notification.readAt ? '' : 'unread'}`} key={notification.id}>
            <div>
              <p className="notification-meta"><span>{labels[notification.category]}</span><time dateTime={notification.createdAt}>{new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.createdAt))}</time></p>
              <h2>{notification.title}</h2>
              <p>{notification.message}</p>
            </div>
            <button type="button" onClick={() => void openNotification(notification.id, notification.action, notification.actionTargetId)}>
              Open <span aria-hidden="true">→</span>
            </button>
          </article>
        ))}
      </div>

      {data && data.pagination.totalPages > 1 ? (
        <nav className="notification-pagination" aria-label="Notification pages">
          <button type="button" disabled={page === 1} onClick={() => changePage(page - 1)}>Previous</button>
          <span>Page {page} of {data.pagination.totalPages}</span>
          <button type="button" disabled={page === data.pagination.totalPages} onClick={() => changePage(page + 1)}>Next</button>
        </nav>
      ) : null}
    </section>
  )
}
