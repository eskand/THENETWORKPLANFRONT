import { useState } from 'react'
import { TriangleAlert } from 'lucide-react'
import TopBar from '../../components/TopBar'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { useSalesBoard } from '../../hooks/useCommercial'
import { EMPTY, dayMonthYear, titleCase } from '../../lib/format'
import SalesDrawer from './components/SalesDrawer'

const COLUMNS = ['Reference', 'Client', 'Route', 'Departure', 'Pax', 'Type', 'Feasibility', 'Status', 'Best quote']

const STATUS_TONE = { NEW: 'INFO', QUOTED: 'PENDING', WON: 'READY', LOST: 'NEUTRAL', CANCELLED: 'NEUTRAL' }
const FEASIBILITY_TONE = {
  FEASIBLE: 'READY',
  CONDITIONAL: 'PENDING',
  NOT_FEASIBLE: 'ATTENTION',
  UNKNOWN: 'INFO',
}

const money = (value, currency) =>
  value === null || value === undefined
    ? EMPTY
    : `${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })} ${currency ?? ''}`

/**
 * Sales & CRM.
 *
 * Two audit findings are visible on this screen. Feasibility starts UNKNOWN
 * and is counted in its own tile, because quoting a trip nobody checked is how
 * an operator cancels on the morning of departure. And the pipeline figure
 * names its currency: it is a sum of converted amounts, not of raw ones.
 */
export default function SalesPage() {
  const [status, setStatus] = useState('')
  const [selected, setSelected] = useState(null)

  const board = useSalesBoard(status)
  const data = board.data

  return (
    <>
      <TopBar
        title="Sales & CRM"
        subtitle="Requests, feasibility and quotes · every total is converted, never added raw"
      />

      <div className="shell__scroll">
        <main className="page">
          {board.isError ? (
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          ) : !data ? (
            <LoadingState label="Loading the sales board…" />
          ) : (
            <>
              <div className="kpi-strip">
                <div className="kpi" style={{ '--kpi-accent': 'var(--accent-orange)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Requests</div>
                  <div className="kpi__value">{data.total}</div>
                  <div className="kpi__hint">{data.newRequests} new · {data.quoted} quoted</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--pending-fg)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Pipeline</div>
                  <div className="kpi__value">
                    {Number(data.pipelineValue).toLocaleString('en-GB')}
                  </div>
                  <div className="kpi__hint">quoted, in {data.currency}</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--ready-fg)', '--kpi-value': 'var(--ready-fg)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Won</div>
                  <div className="kpi__value">{Number(data.wonValue).toLocaleString('en-GB')}</div>
                  <div className="kpi__hint">{data.won} trips, in {data.currency}</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--info-fg)', '--kpi-value': data.feasibilityUnknown > 0 ? 'var(--info-fg)' : undefined }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Feasibility unknown</div>
                  <div className="kpi__value">{data.feasibilityUnknown}</div>
                  <div className="kpi__hint">nobody has looked yet</div>
                </div>
                <div className="kpi" style={{ '--kpi-accent': 'var(--neutral-fg)' }}>
                  <span className="kpi__corners" />
                  <div className="eyebrow">Lost</div>
                  <div className="kpi__value">{data.lost}</div>
                  <div className="kpi__hint">refused or expired</div>
                </div>
              </div>

              <div className="toolbar">
                <div className="tabs">
                  {[['', 'All'], ['NEW', 'New'], ['QUOTED', 'Quoted'], ['WON', 'Won'], ['LOST', 'Lost']].map(
                    ([id, label]) => (
                      <button key={id || 'ALL'} type="button"
                              className={id === status ? 'tab tab--active' : 'tab'}
                              onClick={() => setStatus(id)}>
                        {label}
                      </button>
                    ),
                  )}
                </div>
                <span className="status-text">
                  Totals in {data.currency}; a quote in another currency is excluded from the tiles
                  and shown on its own row.
                </span>
              </div>

              <div className="board">
                <table>
                  <thead><tr>{COLUMNS.map((c) => <th key={c}>{c}</th>)}</tr></thead>
                  <tbody>
                    {data.requests.map((row) => (
                      <tr key={row.id}
                          className={selected?.id === row.id ? 'row--selected' : undefined}
                          onClick={() => setSelected(row)}>
                        <td><span className="flight-cell__no">{row.reference}</span></td>
                        <td>
                          {row.clientName}
                          <br />
                          <span className="tail-cell__type">{titleCase(row.clientKind)}</span>
                        </td>
                        <td><span className="route-cell">{row.depIcao}–{row.arrIcao}</span></td>
                        <td className="cell--time">{dayMonthYear(row.departureAt)}</td>
                        <td className="cell--time">{row.paxCount}</td>
                        <td className="tail-cell__type">{row.icaoType ?? titleCase(row.flightType)}</td>
                        <td>
                          <Badge tone={FEASIBILITY_TONE[row.feasibility] ?? 'NEUTRAL'}
                                 warn={row.feasibility === 'NOT_FEASIBLE'}
                                 title={row.feasibilityNote ?? undefined}>
                            {titleCase(row.feasibility)}
                          </Badge>
                        </td>
                        <td>
                          <Badge tone={STATUS_TONE[row.status] ?? 'NEUTRAL'}>{titleCase(row.status)}</Badge>
                        </td>
                        <td>
                          <span className="money">{money(row.bestQuoteTotal, row.bestQuoteCurrency)}</span>
                          {row.quotes.some((quote) => quote.warnings.length > 0) ? (
                            <span className="fx-warning">
                              <TriangleAlert size={11} /> exchange rate not set on a line
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </main>
      </div>

      <SalesDrawer request={selected} onClose={() => setSelected(null)} />
    </>
  )
}
