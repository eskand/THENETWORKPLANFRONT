import { X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear, hhmm, titleCase } from '../../../lib/format'

const RISK_TONE = { ACCEPTABLE: 'READY', TOLERABLE: 'PENDING', UNACCEPTABLE: 'ATTENTION' }

/** One occurrence: narrative, risk, ECCAIRS filing and actions. */
export default function OccurrenceDrawer({ occurrence, onClose }) {
  if (!occurrence) return null

  const unassessed = occurrence.riskLevel === null || occurrence.riskLevel === undefined

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <div>
            <h2>{occurrence.reference}</h2>
            <p>{titleCase(occurrence.category)} · {dayMonthYear(occurrence.occurredAt)}</p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={
          occurrence.riskLevel === 'UNACCEPTABLE'
            ? 'drawer__verdict drawer__verdict--blocked'
            : 'drawer__verdict drawer__verdict--ok'
        }>
          {unassessed
            ? 'No risk assessment yet — the occurrence carries no level, and none is assumed'
            : `Risk ${titleCase(occurrence.riskLevel)} · severity ${occurrence.riskSeverity}, probability ${occurrence.riskProbability}`}
        </div>

        <div className="drawer__body">
          <h3>{occurrence.title}</h3>
          <p className="finding__message" style={{ whiteSpace: 'pre-line' }}>{occurrence.narrative}</p>

          <h3>Facts</h3>
          <div className="detail-grid">
            <span>Occurred</span>
            <span>{dayMonthYear(occurrence.occurredAt)} {hhmm(occurrence.occurredAt)}Z</span>
            <span>Reported</span>
            <span>{dayMonthYear(occurrence.reportedAt)} {hhmm(occurrence.reportedAt)}Z</span>
            <span>Reported by</span>
            <span>
              {occurrence.anonymous
                ? 'anonymous — the reporter is not disclosed by the API'
                : occurrence.reportedByName ?? EMPTY}
            </span>
            <span>Aircraft</span><span>{occurrence.registration ?? EMPTY}</span>
            <span>Station</span><span>{occurrence.stationIcao ?? EMPTY}</span>
            <span>Phase of flight</span><span>{occurrence.phaseOfFlight ?? EMPTY}</span>
          </div>

          <h3>Filing with the authority</h3>
          <div className="detail-grid">
            <span>ECCAIRS event type</span><span>{occurrence.eccairsEventType ?? EMPTY}</span>
            <span>Occurrence class</span><span>{occurrence.eccairsOccurrenceClass ?? EMPTY}</span>
            <span>Filed</span>
            <span>
              {occurrence.eccairsExportedAt
                ? `${dayMonthYear(occurrence.eccairsExportedAt)} · ${occurrence.eccairsReference}`
                : 'not filed yet'}
            </span>
          </div>

          <h3>Actions</h3>
          {occurrence.actions.length === 0 ? (
            <p className="finding__message">No action raised.</p>
          ) : (
            <div className="finding-group">
              {occurrence.actions.map((action) => (
                <div className={action.overdue ? 'finding finding--blocking' : 'finding finding--info'}
                     key={action.id}>
                  <div className="finding__check">
                    {action.reference} · {action.title}{' '}
                    <Badge tone={
                      action.status === 'COMPLETED' ? 'READY'
                        : action.overdue ? 'ATTENTION' : 'PENDING'
                    }>
                      {titleCase(action.status)}
                    </Badge>
                  </div>
                  <div className="finding__message">
                    Due {dayMonthYear(action.dueOn)}
                    {action.daysToDue !== null && action.daysToDue !== undefined
                      ? ` · ${action.daysToDue} days`
                      : ''}
                    {action.completedOn ? ` · completed ${dayMonthYear(action.completedOn)}` : ''}
                  </div>
                  <div className="finding__rule">
                    Effectiveness: {titleCase(action.effectiveness ?? 'NOT_ASSESSED')}
                    {action.detail ? ` · ${action.detail}` : ''}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="finding__rule">
            An occurrence cannot be closed while an action is outstanding — the server refuses it.
          </p>
        </div>
      </aside>
    </>
  )
}
