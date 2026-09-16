import { LoadingState } from '../../../components/States'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useSafetyNotifications,
} from '../../../hooks/useCommercial'
import { dayMonthYear, hhmm } from '../../../lib/format'

/**
 * The notification centre.
 *
 * <b>Read is a time, not a flag.</b> The question asked after an event is
 * <em>when</em> somebody saw the critical finding, not merely whether they did,
 * and a boolean cannot answer it.
 */

const SEVERITY_COLOUR = {
  critical: 'var(--attention-fg)',
  high: 'var(--accent-orange)',
  medium: 'var(--pending-fg)',
  info: 'var(--info-fg)',
}

/** What raises a notification, and how fast. Shown so the feed is predictable. */
const RULES = [
  ['Critical finding', 'Immediate', 'Notification + overview banner'],
  ['High finding', 'Immediate', 'Notification'],
  ['New occurrence', 'Immediate', 'Notification'],
  ['Question to a reporter', 'Immediate', 'Notification'],
  ['Overdue action', 'On scan', 'Overview banner'],
  ['MOR not filed', 'On scan', 'Overview banner (72 h window)'],
]

export default function NotificationsBoard() {
  const centre = useSafetyNotifications()
  const markRead = useMarkNotificationRead()
  const markAll = useMarkAllNotificationsRead()

  if (centre.isError) {
    return <div className="sms-empty">{centre.error?.message}</div>
  }
  if (!centre.data) {
    return <LoadingState label="Reading the notification centre…" />
  }

  const { notifications, unread } = centre.data

  return (
    <div className="sms-split">
      <section className="panel">
        <header className="panel__head">
          <h2>Notifications</h2>
          <span className="panel__count">{unread} unread</span>
          <button
            type="button"
            className="btn btn--ghost"
            disabled={!unread || markAll.isPending}
            onClick={() => markAll.mutate()}
          >
            Mark all read
          </button>
        </header>

        <div className="notif-feed">
          {notifications.length ? (
            notifications.map((notification) => (
              <div
                key={notification.id}
                className={`notif${notification.read ? '' : ' is-unread'}`}
                onClick={() => {
                  if (!notification.read) markRead.mutate(notification.id)
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !notification.read) markRead.mutate(notification.id)
                }}
              >
                <header>
                  <span
                    className="notif__dot"
                    style={{ background: SEVERITY_COLOUR[notification.severity] }}
                  />
                  <b>{notification.title}</b>
                  <time>
                    {hhmm(notification.at)}
                    <i>{dayMonthYear(notification.at)}</i>
                  </time>
                </header>
                <p>{notification.body}</p>
                {notification.entityRef ? (
                  <span className="notif__ref">{notification.entityRef}</span>
                ) : null}
              </div>
            ))
          ) : (
            <div className="sms-empty">No notifications.</div>
          )}
        </div>
      </section>

      <aside className="panel">
        <header className="panel__head">
          <h2>What raises a notification</h2>
        </header>
        {RULES.map(([event, when, effect]) => (
          <div className="sms-acc" key={event}>
            <span>{event}</span>
            <b>
              {when}
              <i>{effect}</i>
            </b>
          </div>
        ))}
        <p className="sms-note">
          The feed is written by the module itself, never by the screen. A notification exists
          because something in the record changed — which is why marking one read does not make
          the condition behind it go away.
        </p>
      </aside>
    </div>
  )
}
