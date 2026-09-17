import { X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { useCrewMember } from '../../../hooks/useCrew'
import { EMPTY, dayMonthYear, hhmm, minutesToHhmm, titleCase } from '../../../lib/format'

const STATUS_TONE = {
  VALID: 'READY',
  EXPIRING: 'PENDING',
  EXPIRED: 'ATTENTION',
  UNKNOWN: 'INFO',
}

/**
 * The crew file, opened from the list.
 *
 * Structurally the same drawer as the flight file: a head with the verdict, then the
 * findings grouped by what they mean. Here the "verdict" is the document state
 * of the file, and the groups are qualifications, duty and absences.
 */
export default function CrewDrawer({ person, onClose }) {
  const detail = useCrewMember(person?.id)

  if (!person) return null

  const data = detail.data
  const counters = data?.counters
  const blocked = person.documentStatus === 'EXPIRED'

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <div>
            <h2>{person.fullName}</h2>
            <p>
              {person.staffNo} · {titleCase(person.mainRole)} · {person.baseIcao ?? EMPTY}
            </p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={blocked ? 'drawer__verdict drawer__verdict--blocked' : 'drawer__verdict drawer__verdict--ok'}>
          {blocked
            ? 'A document has expired: this crew member cannot be rostered'
            : `Documents ${titleCase(person.documentStatus)}`}
        </div>

        <div className="drawer__body">
          {detail.isLoading ? <LoadingState label="Loading the crew file…" /> : null}

          {data ? (
            <>
              <h3>Documents</h3>
              <div className="detail-grid">
                <span>Licence</span>
                <span>{dayMonthYear(data.person.licenceExpiry)}</span>
                <span>Medical</span>
                <span>{dayMonthYear(data.person.medicalExpiry)}</span>
                <span>Recurrent training</span>
                <span>{dayMonthYear(data.person.trainingExpiry)}</span>
              </div>

              <h3>Qualifications</h3>
              {data.qualifications.length === 0 ? (
                <p className="finding__message">No qualification on file.</p>
              ) : (
                <div className="finding-group">
                  {data.qualifications.map((qualification) => (
                    <div className="finding finding--info" key={qualification.id}>
                      <div className="finding__check">
                        {qualification.kind.replace(/_/g, ' ')}
                        {qualification.icaoType ? ` · ${qualification.icaoType}` : ''}
                        {qualification.level ? ` · ${qualification.level}` : ''}
                      </div>
                      <div className="finding__message">
                        Valid to {dayMonthYear(qualification.validTo)}{' '}
                        <Badge tone={STATUS_TONE[qualification.status] ?? 'NEUTRAL'}>
                          {titleCase(qualification.status)}
                        </Badge>
                      </div>
                      {qualification.reference ? (
                        <div className="finding__rule">{qualification.reference}</div>
                      ) : null}
                    </div>
                  ))}
                </div>
              )}

              <h3>Flight and duty time</h3>
              <div className="detail-grid">
                <span>Block, last 7 days</span>
                <span>{minutesToHhmm(counters?.blockMinutes7d)}</span>
                <span>Block, last 28 days</span>
                <span>{minutesToHhmm(counters?.blockMinutes28d)}</span>
                <span>Block, last 365 days</span>
                <span>{minutesToHhmm(counters?.blockMinutes365d)}</span>
                <span>Duty, last 7 days</span>
                <span>{minutesToHhmm(counters?.dutyMinutes7d)}</span>
                <span>Duty, last 28 days</span>
                <span>{minutesToHhmm(counters?.dutyMinutes28d)}</span>
                <span>Last off duty</span>
                <span>{counters?.lastOffDutyAt ? `${hhmm(counters.lastOffDutyAt)}Z` : EMPTY}</span>
              </div>
              <p className="finding__rule">
                Counted from crew.duty_periods. These are totals, not a legality verdict:
                the FTL engine of the next sprint is what compares them to ORO.FTL.210.
              </p>

              <h3>Absences</h3>
              {data.absences.length === 0 ? (
                <p className="finding__message">No absence recorded.</p>
              ) : (
                <div className="finding-group">
                  {data.absences.map((absence) => (
                    <div className="finding finding--derogable" key={absence.id}>
                      <div className="finding__check">{titleCase(absence.kind)}</div>
                      <div className="finding__message">
                        {dayMonthYear(absence.startsOn)} → {dayMonthYear(absence.endsOn)}
                      </div>
                      {absence.reason ? <div className="finding__rule">{absence.reason}</div> : null}
                    </div>
                  ))}
                </div>
              )}

              <h3>Duty periods, last 28 days</h3>
              <div className="finding-group">
                {data.recentDuties.slice(-12).reverse().map((duty) => (
                  <div className="finding finding--info" key={duty.id}>
                    <div className="finding__check">
                      {duty.rosterCode} · {dayMonthYear(duty.reportAt)}
                    </div>
                    <div className="finding__message">
                      {hhmm(duty.reportAt)}Z → {hhmm(duty.offDutyAt)}Z · duty{' '}
                      {minutesToHhmm(duty.dutyMinutes)}
                      {duty.blockMinutes ? ` · block ${minutesToHhmm(duty.blockMinutes)}` : ''}
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
