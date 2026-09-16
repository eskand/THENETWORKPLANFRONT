import { useState } from 'react'
import Badge from '../../../components/Badge'
import { ErrorState, LoadingState } from '../../../components/States'
import { useSafetyBoard } from '../../../hooks/useCommercial'
import { dayMonthYear, titleCase } from '../../../lib/format'
import RiskMatrix from './RiskMatrix'
import OccurrenceDrawer from './OccurrenceDrawer'

const COLUMNS = ['Reference', 'Occurred', 'Category', 'Title', 'Tail', 'Risk', 'Actions', 'Status']

const RISK_TONE = { ACCEPTABLE: 'READY', TOLERABLE: 'PENDING', UNACCEPTABLE: 'ATTENTION' }
const STATUS_TONE = {
  REPORTED: 'INFO',
  UNDER_REVIEW: 'INFO',
  RISK_ASSESSED: 'PENDING',
  ACTIONS_OPEN: 'PENDING',
  CLOSED: 'READY',
}

/**
 * Safety Manager.
 *
 * The matrix is the operator's own, read from safety.risk_matrix, and each
 * cell shows how many open occurrences sit in it — a count of rows, not a
 * colour someone chose. An occurrence with no assessment shows "Not assessed"
 * rather than a green tick.
 */
export default function OccurrenceBoard() {
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)

  const board = useSafetyBoard({ status, windowDays: 365 })
  const data = board.data

  return (
    <>
          {board.isError ? (
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          ) : !data ? (
            <LoadingState label="Loading the safety picture…" />
          ) : (
            <>
              <div className="kpi-strip">
                <div className="kpi" style={{ '--kpi-accent': 'var(--accent-orange)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Occurrences, 12 months</div>
                  <div className="kpi__value">{data.total}</div>
                  <div className="kpi__hint">{data.closed} closed</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--attention-fg)', '--kpi-value': data.unacceptable > 0 ? 'var(--attention-fg)' : undefined }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Unacceptable risk</div>
                  <div className="kpi__value">{data.unacceptable}</div>
                  <div className="kpi__hint">mitigation required</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--info-fg)', '--kpi-value': data.notAssessed > 0 ? 'var(--info-fg)' : undefined }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Not assessed</div>
                  <div className="kpi__value">{data.notAssessed}</div>
                  <div className="kpi__hint">no risk verdict yet</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--pending-fg)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Open actions</div>
                  <div className="kpi__value">{data.openActions}</div>
                  <div className="kpi__hint">{data.overdueActions} overdue</div>
                </div>
              </div>

              <div className="toolbar">
                <div className="tabs">
                  {[['', 'All'], ['REPORTED', 'Reported'], ['UNDER_REVIEW', 'Under review'],
                    ['ACTIONS_OPEN', 'Actions open'], ['CLOSED', 'Closed']].map(([id, label]) => (
                    <button key={id || 'ALL'} type="button"
                            className={id === status ? 'tab tab--active' : 'tab'}
                            onClick={() => setStatus(id)}>
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <RiskMatrix cells={data.matrix} />

              <div className="board" style={{ marginTop: 14 }}>
                <table>
                  <thead><tr>{COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {data.occurrences.map((row) => (
                      <tr key={row.id}
                          className={selected?.id === row.id ? 'row--selected' : undefined}
                          onClick={() => setSelected(row)}>
                        <td><span className="flight-cell__no">{row.reference}</span></td>
                        <td className="cell--time">{dayMonthYear(row.occurredAt)}</td>
                        <td className="tail-cell__type">{titleCase(row.category)}</td>
                        <td>
                          {row.title}
                          {row.anonymous ? <><br /><span className="tail-cell__type">anonymous report</span></> : null}
                        </td>
                        <td className="cell--time">{row.registration ?? ''}</td>
                        <td>
                          {row.riskLevel ? (
                            <Badge tone={RISK_TONE[row.riskLevel] ?? 'NEUTRAL'}
                                   warn={row.riskLevel === 'UNACCEPTABLE'}
                                   title={`Severity ${row.riskSeverity}, probability ${row.riskProbability}`}>
                              {titleCase(row.riskLevel)}
                            </Badge>
                          ) : (
                            <Badge tone="INFO">Not assessed</Badge>
                          )}
                        </td>
                        <td className="cell--time">
                          {row.openActions === 0 ? '—' : (
                            <Badge tone="PENDING">{row.openActions}</Badge>
                          )}
                        </td>
                        <td>
                          <Badge tone={STATUS_TONE[row.status] ?? 'NEUTRAL'}>
                            {titleCase(row.status)}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
      <OccurrenceDrawer occurrence={selected} onClose={() => setSelected(null)} />
    </>
  )
}
