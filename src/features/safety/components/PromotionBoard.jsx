import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { usePromotionBoard } from '../../../hooks/useCommercial'
import { EMPTY, dayMonthYear } from '../../../lib/format'

/**
 * Promotion, from the Safety Manager's side.
 *
 * <b>The number that matters is reach, not publication.</b> A safety alert that
 * nobody acknowledged has not been communicated, whatever the publication date
 * says — so every bar here is acknowledgements over audience, and the alert
 * with the worst reach is the one the Safety Review Board has to explain.
 *
 * The crew's own bulletin board is the Safety Promotion module in the sidebar.
 * Same records, the other audience.
 */

const KIND_TONE = {
  ALERT: 'ATTENTION', BULLETIN: 'INFO', LESSON: 'PENDING', POLICY: 'READY',
}

export default function PromotionBoard() {
  const board = usePromotionBoard()

  if (board.isError) {
    return <div className="sms-empty">{board.error?.message}</div>
  }
  if (!board.data) {
    return <LoadingState label="Reading the promotion record…" />
  }

  const items = board.data.campaigns ?? []
  const needingAck = items.filter((item) => item.acknowledgementRequired)
  const worst = needingAck.length
    ? Math.min(...needingAck.map((item) => item.reachPercent ?? 0))
    : null

  return (
    <>
      <div className="kpi-strip">
        <Kpi label="Published" value={items.length} hint="alerts, bulletins and lessons" />
        <Kpi label="Requiring acknowledgement" value={needingAck.length}
             hint="tracked to the individual" accent="var(--pending-fg)" />
        <Kpi
          label="Lowest reach"
          value={worst === null ? EMPTY : `${worst}%`}
          hint={worst === null ? 'nothing to acknowledge' : 'the one to explain'}
          accent="var(--attention-fg)"
          alarm={worst !== null && worst < 90}
        />
      </div>

      <section className="panel">
        <header className="panel__head">
          <h2>Published communications</h2>
          <span className="panel__count">{items.length}</span>
        </header>

        {items.length ? (
          items.map((item) => {
            const reach = item.reachPercent ?? 0
            const colour = reach >= 90 ? 'var(--ready-fg)'
              : reach >= 50 ? 'var(--accent-orange)' : 'var(--attention-fg)'
            return (
              <article className="promo-row" key={item.id}>
                <header>
                  <div>
                    <b>{item.title}</b>
                    <span>
                      {item.reference} · {dayMonthYear(item.publishedOn)}
                      {item.authorName ? ` · ${item.authorName}` : ''}
                    </span>
                  </div>
                  <Badge tone={KIND_TONE[item.kind] ?? 'NEUTRAL'}>{item.kind}</Badge>
                </header>

                {item.body ? <p>{item.body}</p> : null}

                <footer>
                  <span className="promo-row__aud">
                    Audience: <b>{item.audience ?? 'All personnel'}</b>
                  </span>
                  {item.acknowledgementRequired ? (
                    <>
                      <span className="promo-bar">
                        <i style={{ width: `${reach}%`, background: colour }} />
                      </span>
                      <span className="promo-row__ack">
                        {item.acknowledgements} / {item.audienceSize} acknowledged
                      </span>
                    </>
                  ) : (
                    <span className="promo-row__ack">No acknowledgement required</span>
                  )}
                </footer>
              </article>
            )
          })
        ) : (
          <div className="sms-empty">Nothing has been published.</div>
        )}
      </section>
    </>
  )
}

function Kpi({ label, value, hint, accent, alarm }) {
  return (
    <div className="kpi" style={{
      '--kpi-accent': accent ?? 'var(--accent-orange)',
      '--kpi-value': alarm ? accent : undefined,
    }}>
      <span className="kpi__corners" />
      <div className="eyebrow">{label}</div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__hint">{hint}</div>
    </div>
  )
}
