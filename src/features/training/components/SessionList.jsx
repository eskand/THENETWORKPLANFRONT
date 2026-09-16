import { CalendarDays, MapPin, User } from 'lucide-react'
import Badge from '../../../components/Badge'
import { dayMonth, hhmm } from '../../../lib/format'

/**
 * The booked sessions of the horizon.
 *
 * The seat count is the server's: it is the number of live enrolments the
 * database returned with the session, not a figure the browser maintains — two
 * planners booking at the same time is exactly where a client-side count lies.
 */
export default function SessionList({ sessions = [], loading }) {
  if (loading && sessions.length === 0) {
    return <div className="state"><div className="spinner" /><p>Loading the training calendar…</p></div>
  }

  if (sessions.length === 0) {
    return (
      <div className="state">
        <h3>No session in this window</h3>
        <p>Nothing is scheduled between the two dates.</p>
      </div>
    )
  }

  return (
    <div className="session-list">
      {sessions.map((session) => (
        <article className="session-card" key={session.id}>
          <div className="session-card__head">
            <span className="session-card__code">{session.courseCode}</span>
            <Badge tone={session.seatsLeft === 0 ? 'ATTENTION' : 'READY'}>
              <span className="session-card__seats">
                {session.booked}/{session.capacity}
              </span>
            </Badge>
          </div>

          <div className="session-card__title">{session.courseTitle}</div>

          <div className="session-card__meta">
            <span>
              <CalendarDays size={12} /> {dayMonth(session.startsAt)} · {hhmm(session.startsAt)}–
              {hhmm(session.endsAt)}Z
            </span>
            {session.location ? (
              <span>
                <MapPin size={12} /> {session.location}
              </span>
            ) : null}
            {session.instructorName ? (
              <span>
                <User size={12} /> {session.instructorName}
              </span>
            ) : null}
          </div>
        </article>
      ))}
    </div>
  )
}
