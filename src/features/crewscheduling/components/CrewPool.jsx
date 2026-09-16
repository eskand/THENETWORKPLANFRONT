import Badge from '../../../components/Badge'
import { EMPTY, minutesToHhmm, titleCase } from '../../../lib/format'

const TONE = {
  AVAILABLE: 'READY',
  REST_SHORT: 'PENDING',
  ALREADY_ASSIGNED: 'INFO',
  NOT_QUALIFIED: 'NEUTRAL',
  ABSENT: 'PENDING',
  DOCUMENTS_EXPIRED: 'ATTENTION',
}

/**
 * The pool.
 *
 * Everyone appears, including those who cannot be assigned, each with the fact
 * that decides it. A planner has to see that the only rated captain is on sick
 * leave — an empty list would hide the reason the seat cannot be filled.
 */
export default function CrewPool({ pool = [], onPick, picked, disabled }) {
  return (
    <section className="sched-panel">
      <div className="sched-panel__head">
        <span>Crew pool</span>
        <span>{pool.length} people</span>
      </div>
      <div className="sched-panel__body">
        {pool.length === 0 ? (
          <div className="state">
            <h3>No crew member in this filter</h3>
            <p>Widen the role.</p>
          </div>
        ) : null}

        {pool.map((candidate) => (
          <div className="sched-row" key={candidate.personId}>
            <div className="sched-row__main">
              <span className="sched-row__name">
                {candidate.fullName}{' '}
                <span className="tail-cell__type">{candidate.staffNo}</span>
              </span>
              <span className="sched-row__meta">
                {titleCase(candidate.mainRole)} · {candidate.baseIcao ?? EMPTY} ·{' '}
                {candidate.typeRatings.join(', ') || 'no rating'} · 28 d{' '}
                {minutesToHhmm(candidate.blockMinutes28d)}
                {candidate.restMinutes !== null && candidate.restMinutes !== undefined
                  ? ` · rest ${minutesToHhmm(candidate.restMinutes)}`
                  : ' · no recorded duty'}
              </span>
              {candidate.reason ? (
                <span className="sched-row__meta" title={candidate.reason}>
                  {candidate.reason}
                </span>
              ) : null}
            </div>

            <span className="badge-group">
              <Badge
                tone={TONE[candidate.availability] ?? 'NEUTRAL'}
                warn={candidate.availability === 'DOCUMENTS_EXPIRED'}
              >
                {titleCase(candidate.availability)}
              </Badge>
              <button
                type="button"
                className="toolbar__button"
                disabled={disabled || candidate.availability === 'DOCUMENTS_EXPIRED'
                  || candidate.availability === 'ABSENT'
                  || candidate.availability === 'NOT_QUALIFIED'
                  || candidate.availability === 'ALREADY_ASSIGNED'}
                onClick={() => onPick(candidate)}
              >
                {picked?.personId === candidate.personId ? 'Selected' : 'Assign'}
              </button>
            </span>
          </div>
        ))}
      </div>
    </section>
  )
}
