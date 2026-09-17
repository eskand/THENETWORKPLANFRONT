import { LoadingState } from '../../../components/States'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useSafetyNotifications,
} from '../../../hooks/useCommercial'
import { Empty } from './SafeOps'
import { hhmm } from '../../../lib/format'

/**
 * The notification centre.
 *
 * <b>Read is a time, not a flag.</b> The question asked after an event is
 * <em>when</em> somebody saw the critical finding, not merely whether they did,
 * and a boolean cannot answer it.
 *
 * <b>Marking one read does not make the condition go away.</b> The feed is
 * written by the module that found the condition, never by this screen — which
 * is why an acknowledged notification and a closed finding are two different
 * records.
 */

const SEVERITY_COLOUR = {
  critical: '#C0392B',
  high: '#E67E22',
  medium: '#E0C22A',
  info: '#00b4d8',
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
    return <Empty>{centre.error?.message}</Empty>
  }
  if (!centre.data) {
    return <LoadingState label="Reading the notification centre…" />
  }

  const { notifications, unread } = centre.data

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Safety Notifications</div>
          <div className="page-sub">
            Escalations raised automatically by the cross-module scan and by the occurrence register
          </div>
        </div>
        <div className="btn-row">
          <button className="btn-o" disabled={!unread || markAll.isPending}
                  onClick={() => markAll.mutate()}>
            Mark all read
          </button>
        </div>
      </div>

      <div className="row-wide" style={{ gridTemplateColumns: '1.9fr 1fr' }}>
        <div className="card">
          <div className="card-hdr">
            <div className="card-title">Notifications</div>
            <div style={{ fontSize: 9, color: 'var(--muted)' }}>{unread} unread</div>
          </div>

          {notifications.length === 0 ? <Empty>No notifications.</Empty> : null}

          {notifications.map((notification) => (
            <div key={notification.id}
                 className={`notif-item${notification.read ? '' : ' unread'}`}
                 onClick={() => { if (!notification.read) markRead.mutate(notification.id) }}
                 role="button" tabIndex={0}
                 onKeyDown={(event) => {
                   if (event.key === 'Enter' && !notification.read) markRead.mutate(notification.id)
                 }}>
              <div className="ni-hdr">
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6 }}>
                  <div className="ni-dot"
                       style={{ background: SEVERITY_COLOUR[notification.severity] ?? '#64748b' }} />
                  <div className="ni-tit">{notification.title}</div>
                </div>
                <div className="ni-time">{hhmm(notification.at)}</div>
              </div>
              <div className="ni-txt">{notification.body}</div>
            </div>
          ))}
        </div>

        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-hdr">
              <div className="card-title">Escalation rules</div>
            </div>
            {RULES.map(([event, when, effect]) => (
              <div className="acc-row" key={event}>
                <span>{event}</span>
                <b style={{ fontSize: 9, textAlign: 'right' }}>
                  {when}
                  <br />
                  <span style={{ fontWeight: 400, color: 'var(--muted)' }}>{effect}</span>
                </b>
              </div>
            ))}
            <div className="mtx-note">
              The feed is written by the module itself, never by the screen. A notification exists
              because something in the record changed — which is why marking one read does not make
              the condition behind it go away.
            </div>
          </div>

          <div className="card">
            <div className="card-hdr">
              <div className="card-title">Record store</div>
            </div>
            {/* L'annexe garde ses enregistrements dans le navigateur et affiche
                la place occupee. Ici ils sont dans safety.notifications : la
                question « ou sont mes enregistrements » a une reponse
                differente, et la donner franchement vaut mieux que de recopier
                une mesure qui ne veut plus rien dire. */}
            <div className="acc-row">
              <span>Persistence</span>
              <b style={{ color: 'var(--green)' }}>PostgreSQL</b>
            </div>
            <div className="acc-row">
              <span>Records held</span>
              <b>{notifications.length}</b>
            </div>
            <div className="acc-row">
              <span>Unread</span>
              <b>{unread}</b>
            </div>
            <div className="mtx-note">
              Held in <code>safety.notifications</code>, not in the browser: closing the tab loses
              nothing, and a notification raised on one workstation is on every other immediately.
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
