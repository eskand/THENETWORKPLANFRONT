import { Fragment } from 'react'
import { X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { usePersonTraining } from '../../../hooks/useTraining'
import { dayMonth, dayMonthYear, titleCase } from '../../../lib/format'

const STATUS_TONE = {
  VALID: 'READY',
  EXPIRING: 'PENDING',
  EXPIRED: 'ATTENTION',
  UNKNOWN: 'INFO',
}

/** The training file of the crew member whose row was clicked. */
export default function TrainingDrawer({ row, onClose }) {
  const file = usePersonTraining(row?.personId)

  if (!row) return null

  const data = file.data
  const blocked = row.worstStatus === 'EXPIRED' || row.worstStatus === 'MISSING'

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <div>
            <h2>{row.fullName}</h2>
            <p>
              {row.staffNo} · {titleCase(row.mainRole)}
            </p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div
          className={
            blocked ? 'drawer__verdict drawer__verdict--blocked' : 'drawer__verdict drawer__verdict--ok'
          }
        >
          {row.worstStatus === 'MISSING'
            ? 'A mandatory course has never been recorded for this crew member'
            : row.worstStatus === 'EXPIRED'
              ? 'A mandatory certificate has expired'
              : `Training ${titleCase(row.worstStatus)}`}
        </div>

        <div className="drawer__body">
          {file.isLoading ? <LoadingState label="Loading the training file…" /> : null}

          {data ? (
            <>
              <h3>Certificates held</h3>
              {data.records.length === 0 ? (
                <p className="finding__message">No training record on file.</p>
              ) : (
                <div className="finding-group">
                  {data.records.map((record) => (
                    <div
                      className={
                        record.status === 'EXPIRED'
                          ? 'finding finding--blocking'
                          : record.status === 'EXPIRING'
                            ? 'finding finding--derogable'
                            : 'finding finding--info'
                      }
                      key={record.id}
                    >
                      <div className="finding__check">
                        {record.courseCode} · {record.courseTitle}
                      </div>
                      <div className="finding__message">
                        Completed {dayMonthYear(record.completedOn)} · valid to{' '}
                        {dayMonthYear(record.validTo)}{' '}
                        <Badge tone={STATUS_TONE[record.status] ?? 'NEUTRAL'}>
                          {titleCase(record.status)}
                        </Badge>
                      </div>
                      <div className="finding__rule">
                        {record.instructorName ? `Instructor ${record.instructorName} · ` : ''}
                        {record.reference ?? ''}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <h3>Booked sessions</h3>
              {data.enrolments.length === 0 ? (
                <p className="finding__message">Nothing booked.</p>
              ) : (
                <div className="finding-group">
                  {data.enrolments.map((enrolment) => (
                    <div className="finding finding--info" key={enrolment.id}>
                      <div className="finding__check">{titleCase(enrolment.status)}</div>
                      <div className="finding__message">Session {enrolment.sessionId.slice(0, 8)}</div>
                    </div>
                  ))}
                </div>
              )}

              <h3>Cells of this row</h3>
              <div className="detail-grid">
                {row.cells.map((cell) => (
                  <Fragment key={cell.courseCode}>
                    <span>{cell.courseCode}</span>
                    <span>
                      {cell.status === 'MISSING'
                        ? 'never recorded'
                        : `${titleCase(cell.status)} · ${dayMonth(cell.validTo)}`}
                    </span>
                  </Fragment>
                ))}
              </div>
              <p className="finding__rule">
                A cell is the newest record for that course. MISSING means no record exists,
                which is not the same finding as an expired one.
              </p>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
