import { TriangleAlert, X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { useSalesRequest } from '../../../hooks/useCommercial'
import { EMPTY, dayMonthYear, hhmm, titleCase } from '../../../lib/format'

const money = (value, currency) =>
  value === null || value === undefined
    ? EMPTY
    : `${Number(value).toLocaleString('en-GB', { minimumFractionDigits: 2 })} ${currency ?? ''}`

/** One request: its feasibility, its quotes and every line of them. */
export default function SalesDrawer({ request, onClose }) {
  const detail = useSalesRequest(request?.id)
  if (!request) return null

  const data = detail.data
  const blocked = request.feasibility === 'NOT_FEASIBLE'

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer__head">
          <div>
            <h2>{request.reference}</h2>
            <p>{request.clientName} · {request.depIcao}–{request.arrIcao}</p>
          </div>
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
        </div>

        <div className={blocked ? 'drawer__verdict drawer__verdict--blocked' : 'drawer__verdict drawer__verdict--ok'}>
          {request.feasibility === 'UNKNOWN'
            ? 'Feasibility has not been assessed: this request cannot be quoted yet'
            : request.feasibilityNote ?? `Feasibility ${titleCase(request.feasibility)}`}
        </div>

        <div className="drawer__body">
          {detail.isLoading ? <LoadingState label="Loading the request…" /> : null}

          {data ? (
            <>
              <h3>Request</h3>
              <div className="detail-grid">
                <span>Client</span><span>{data.clientName} ({titleCase(data.clientKind)})</span>
                <span>Received</span><span>{dayMonthYear(data.receivedAt)}</span>
                <span>Departure</span>
                <span>{dayMonthYear(data.departureAt)} {hhmm(data.departureAt)}Z</span>
                <span>Return</span>
                <span>{data.returnAt ? `${dayMonthYear(data.returnAt)} ${hhmm(data.returnAt)}Z` : 'one way'}</span>
                <span>Passengers</span><span>{data.paxCount}</span>
                <span>Aircraft type</span><span>{data.icaoType ?? 'not specified'}</span>
                <span>Status</span><span>{titleCase(data.status)}</span>
              </div>

              <h3>Quotes</h3>
              {data.quotes.length === 0 ? (
                <p className="finding__message">No quote issued yet.</p>
              ) : (
                data.quotes.map((quote) => (
                  <div key={quote.id} style={{ marginBottom: 18 }}>
                    <div className="finding__check">
                      {quote.reference} v{quote.version} ·{' '}
                      <Badge tone={
                        quote.status === 'ACCEPTED' ? 'READY'
                          : quote.status === 'REFUSED' ? 'NEUTRAL'
                            : quote.status === 'SENT' ? 'PENDING' : 'INFO'
                      }>
                        {titleCase(quote.status)}
                      </Badge>
                    </div>

                    <div className="board" style={{ marginTop: 8 }}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th><th>Charge</th><th>Qty</th><th>Unit</th>
                            <th>Currency</th><th>Rate</th><th>Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {quote.lines.map((line) => (
                            <tr key={line.id}>
                              <td className="cell--time">{line.lineNo}</td>
                              <td>{line.label}<br />
                                <span className="tail-cell__type">{titleCase(line.kind)}</span>
                              </td>
                              <td className="cell--time">{line.quantity} {line.unit ?? ''}</td>
                              <td className="cell--time">{Number(line.unitPrice).toLocaleString('en-GB')}</td>
                              <td className="cell--time">{line.currency}</td>
                              <td className="cell--time">
                                {Number(line.fxRate).toFixed(4)}
                                {line.fxRateAt ? <><br /><span className="tail-cell__type">{dayMonthYear(line.fxRateAt)}</span></> : null}
                              </td>
                              <td className="cell--time">
                                <span className="money">{money(line.amount, quote.currency)}</span>
                              </td>
                            </tr>
                          ))}
                          <tr>
                            <td colSpan={6} style={{ textAlign: 'right' }}>Net total</td>
                            <td className="cell--time">
                              <span className="money">{money(quote.netTotal, quote.currency)}</span>
                            </td>
                          </tr>
                        </tbody>
                      </table>
                    </div>

                    {quote.warnings.length > 0 ? (
                      <div className="finding finding--blocking" style={{ marginTop: 8 }}>
                        <div className="finding__check">
                          <TriangleAlert size={12} /> This total cannot be trusted
                        </div>
                        {quote.warnings.map((warning) => (
                          <div className="finding__message" key={warning}>{warning}</div>
                        ))}
                        <div className="finding__rule">
                          The server refuses to send a quote while a warning stands.
                        </div>
                      </div>
                    ) : null}

                    <p className="finding__rule">
                      Currencies used: {quote.currenciesUsed.join(', ')}. {quote.taxNote}
                    </p>
                  </div>
                ))
              )}
            </>
          ) : null}
        </div>
      </aside>
    </>
  )
}
