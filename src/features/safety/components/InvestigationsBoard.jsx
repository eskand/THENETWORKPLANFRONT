import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Investigations.
 *
 * <b>The contributing-factor chain is the point of the card.</b> Doc 9859 asks
 * an operator to work back from what happened to the organisational condition
 * that allowed it, and the chain is shown step by step with the last one marked
 * — that last step is the one a corrective action has to attack. A root cause
 * shown as a single sentence hides the reasoning that produced it.
 */

const STATUS_TONE = {
  OPEN: 'PENDING', IN_PROGRESS: 'PENDING', CLOSED: 'READY', SUSPENDED: 'INFO',
}

export default function InvestigationsBoard({ investigations }) {
  const rows = investigations ?? []

  if (!rows.length) {
    return <div className="sms-empty">No investigation is currently open.</div>
  }

  return (
    <div className="inv-list">
      {rows.map((investigation) => {
        const chain = (investigation.contributingFactors ?? '')
          .split(/\r?\n|\s*\|\s*/)
          .map((line) => line.trim())
          .filter(Boolean)

        return (
          <article className="inv-card" key={investigation.id}>
            <header className="inv-card__head">
              <div>
                <span className="inv-card__id">{investigation.reference}</span>
                <b>{investigation.title}</b>
                {investigation.occurrenceReference ? (
                  <span className="inv-card__tag">{investigation.occurrenceReference}</span>
                ) : null}
              </div>
              <Badge tone={STATUS_TONE[investigation.status] ?? 'NEUTRAL'}
                     warn={investigation.overdue}>
                {investigation.overdue ? 'Overdue' : investigation.status}
              </Badge>
            </header>

            <p className="inv-card__meta">
              Lead: <b>{investigation.investigatorName ?? EMPTY}</b> · opened{' '}
              {dayMonthYear(investigation.openedOn)}
              {investigation.targetOn ? ` · target ${dayMonthYear(investigation.targetOn)}` : ''}
              {investigation.closedOn ? ` · closed ${dayMonthYear(investigation.closedOn)}` : ''}
              {investigation.method ? ` · ${investigation.method}` : ''}
            </p>

            {chain.length ? (
              <>
                <h4 className="inv-card__sec">Contributing-factor analysis</h4>
                {chain.map((step, index) => (
                  <div className="inv-why" key={step}>
                    <span className={`inv-why__dot${index === chain.length - 1 ? ' is-last' : ''}`}>
                      {index + 1}
                    </span>
                    <span>{step}</span>
                  </div>
                ))}
              </>
            ) : null}

            {investigation.rootCause ? (
              <>
                <h4 className="inv-card__sec">Root cause</h4>
                <p className="inv-card__text">{investigation.rootCause}</p>
              </>
            ) : null}
          </article>
        )
      })}
    </div>
  )
}
