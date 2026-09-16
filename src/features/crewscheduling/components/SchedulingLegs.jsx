import Badge from '../../../components/Badge'
import { hhmm } from '../../../lib/format'

const SEATS = ['CPT', 'FO', 'CABIN_1', 'CABIN_2']

/**
 * The legs of the day and the seats they still need.
 *
 * The seat buttons are the write path: pick a person in the pool, then a seat
 * here. The server refuses a blocking finding, so an impossible assignment
 * fails loudly instead of being drawn.
 */
export default function SchedulingLegs({ legs = [], picked, onAssign, onUnassign, pending }) {
  return (
    <section className="sched-panel">
      <div className="sched-panel__head">
        <span>Legs of the day</span>
        <span>{legs.length}</span>
      </div>
      <div className="sched-panel__body">
        {legs.length === 0 ? (
          <div className="state">
            <h3>No leg on this date</h3>
            <p>Nothing is programmed for the day selected.</p>
          </div>
        ) : null}

        {legs.map((leg) => {
          const filledSeats = new Set(leg.crew.map((member) => member.seat))
          return (
            <div className="sched-row" key={leg.legId}>
              <div className="sched-row__main">
                <span className="sched-row__name">
                  {leg.flightNo} · {leg.depIcao}–{leg.arrIcao}
                </span>
                <span className="sched-row__meta">
                  {hhmm(leg.std)}Z → {hhmm(leg.sta)}Z · {leg.registration} ({leg.icaoType}) ·{' '}
                  {leg.seatsFilled}/{leg.minimumSeats} flight deck
                </span>
                <span className="badge-group">
                  {leg.crew.map((member) => (
                    <Badge
                      key={member.assignmentId}
                      tone={member.documentStatus === 'EXPIRED' ? 'ATTENTION' : 'INFO'}
                      title={`${member.fullName} · FTL ${member.ftlVerdict}`}
                    >
                      {member.seat} {member.fullName.split(' ').pop()}
                      <button
                        type="button"
                        className="drawer__close"
                        style={{ marginLeft: 4 }}
                        onClick={() => onUnassign(member.assignmentId)}
                        aria-label={`Remove ${member.fullName}`}
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </span>
              </div>

              <span className="badge-group">
                {leg.complete ? (
                  <Badge tone="READY">Crewed</Badge>
                ) : (
                  <Badge tone="ATTENTION" warn>
                    Incomplete
                  </Badge>
                )}
                {SEATS.filter((seat) => !filledSeats.has(seat)).slice(0, 2).map((seat) => (
                  <button
                    key={seat}
                    type="button"
                    className="toolbar__button"
                    disabled={!picked || pending}
                    title={picked ? `Assign ${picked.fullName} as ${seat}` : 'Pick a crew member first'}
                    onClick={() => onAssign(leg, seat)}
                  >
                    + {seat}
                  </button>
                ))}
              </span>
            </div>
          )
        })}
      </div>
    </section>
  )
}
