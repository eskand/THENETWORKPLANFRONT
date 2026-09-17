import { Plus } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Investigations.
 *
 * <b>The chain is the report.</b> ICAO Doc 9859 asks an investigation to work
 * back from what happened to the organisational condition that allowed it, one
 * link at a time — and the last link is the one a corrective action has to
 * attack. A screen that showed only the root cause would hide the reasoning
 * that got there, which is the part an auditor reads.
 *
 * <b>Progress is declared, not counted from the calendar.</b> An investigation
 * three weeks into a four-week target is not seventy-five per cent done; the
 * bar shows what the investigator reported and nothing else.
 */
export default function InvestigationsBoard({ investigations }) {
  const navigate = useNavigate()
  const rows = investigations ?? []

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Investigations</div>
          <div className="page-sub">
            Contributing-factor analysis to ICAO Doc 9859 — findings feed the risk register and
            corrective actions
          </div>
        </div>
        <div className="btn-row">
          <button type="button" className="btn-p"
                  onClick={() => navigate('/safety-reports')}>
            <Plus size={13} /> Open investigation
          </button>
        </div>
      </div>

      {rows.length === 0 ? (
        <div className="sms-empty">No investigation is currently open — An occurrence under review can be escalated to a full contributing-factor analysis.</div>
      ) : null}

      {rows.map((investigation) => {
        const closed = Boolean(investigation.closedOn)
        const progress = Math.max(0, Math.min(100, investigation.progressPercent ?? 0))
        const factors = (investigation.contributingFactors ?? '')
          .split('·').map((factor) => factor.trim()).filter(Boolean)

        return (
          <section className="inv-card" key={investigation.id}>
            <header className="inv-hdr">
              <div style={{ display: 'flex', alignItems: 'center', gap: 9, flexWrap: 'wrap' }}>
                <span className="inv-id">{investigation.reference}</span>
                <b>{investigation.title}</b>
                {investigation.occurrenceReference ? (
                  <span className="tag">{investigation.occurrenceReference}</span>
                ) : null}
              </div>
              {closed ? (
                <Badge tone="READY">Closed</Badge>
              ) : investigation.overdue ? (
                <Badge tone="ATTENTION" warn>Overdue</Badge>
              ) : (
                <Badge tone="INFO">Investigation</Badge>
              )}
            </header>

            <div className="inv-meta">
              Lead: <b>{investigation.investigatorName ?? EMPTY}</b>
              {' · opened '}{dayMonthYear(investigation.openedOn)}
              {investigation.targetOn ? ` · target ${dayMonthYear(investigation.targetOn)}` : ''}
              {investigation.method ? ` · ${investigation.method}` : ''}
            </div>

            <div className="inv-prog">
              <div className="inv-pb">
                <span className="inv-pf"
                      style={{ width: `${progress}%` }} />
              </div>
              <span className="inv-pct">
                {progress}%
              </span>
            </div>

            {investigation.steps?.length ? (
              <>
                <div className="inv-sec">Contributing-factor analysis</div>
                {investigation.steps.map((step, index) => (
                  <div className="why-row" key={index}>
                    {/* Le dernier maillon est rouge : c'est la condition
                        organisationnelle, celle sur laquelle une action
                        corrective doit porter. Les precedents sont le chemin
                        qui y mene. */}
                    <span className="why-dot" style={{ background: index === investigation.steps.length - 1 ? '#C0392B' : '#00b4d8' }}>
                      {index + 1}
                    </span>
                    <span style={{ fontSize: 10, color: 'var(--text)' }}>{step}</span>
                  </div>
                ))}
              </>
            ) : null}

            {factors.length ? (
              <>
                <div className="inv-sec">Contributing factors</div>
                <div className="chip-wrap">
                  {factors.map((factor) => (
                    <span className="chip" key={factor}>{factor}</span>
                  ))}
                </div>
              </>
            ) : null}

            {investigation.rootCause ? (
              <>
                <div className="inv-sec">Root cause</div>
                <p className="mtx-note">{investigation.rootCause}</p>
              </>
            ) : null}

            {investigation.recommendations?.length ? (
              <>
                <div className="inv-sec">Safety recommendations</div>
                <ul className="mlist">
                  {investigation.recommendations.map((recommendation, index) => (
                    <li key={index}>{recommendation}</li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>
        )
      })}
    </>
  )
}
