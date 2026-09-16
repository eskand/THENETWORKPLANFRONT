import { CircleCheck, TriangleAlert, X } from 'lucide-react'
import Badge from '../../../components/Badge'
import { LoadingState } from '../../../components/States'
import { useLegReadiness } from '../../../hooks/useDispatchBoard'
import { EMPTY, hhmm, titleCase } from '../../../lib/format'

/**
 * Readiness panel for the selected row.
 *
 * This is where the readiness engine becomes visible: each finding names the
 * check, what is missing and the rule behind it, and the split between blocking
 * and derogable is the one the release endpoint enforces.
 */
function FindingGroup({ title, items, variant }) {
  if (!items || items.length === 0) return null
  return (
    <div className="finding-group">
      <span className="eyebrow">
        {title} ({items.length})
      </span>
      {items.map((item) => (
        <div className={`finding finding--${variant}`} key={`${item.check}-${item.message}`}>
          <div className="finding__check">{item.check}</div>
          <p className="finding__message">{item.message}</p>
          <div className="finding__rule">{item.rule}</div>
        </div>
      ))}
    </div>
  )
}

function GroundBody({ row }) {
  return (
    <>
      <div className="drawer__verdict drawer__verdict--blocked">
        <TriangleAlert size={16} />
        {row.registration} is not released to service
      </div>
      <dl className="detail-grid">
        <div>
          <dt className="eyebrow">Status</dt>
          <dd>{titleCase(row.status)}</dd>
        </div>
        <div>
          <dt className="eyebrow">Station</dt>
          <dd>
            {row.depCode} ({row.depIcao})
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Type</dt>
          <dd>
            {row.icaoType} — {row.model}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">MEL blocks dispatch</dt>
          <dd>{row.melBlocking ? 'Yes' : 'No'}</dd>
        </div>
      </dl>
      {row.note ? (
        <div className="finding finding--blocking">
          <div className="finding__check">CAMO REASON</div>
          <p className="finding__message">{row.note}</p>
          <div className="finding__rule">Part-M / release to service</div>
        </div>
      ) : null}
    </>
  )
}

function FlightBody({ row }) {
  const { data, isLoading, error } = useLegReadiness(row.legId)

  return (
    <>
      <dl className="detail-grid">
        <div>
          <dt className="eyebrow">Aircraft</dt>
          <dd>
            {row.registration} — {row.icaoType}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Status</dt>
          <dd>{titleCase(row.status)}</dd>
        </div>
        <div>
          <dt className="eyebrow">STD / ETD</dt>
          <dd className="mono">
            {hhmm(row.std)} / {row.etd ? hhmm(row.etd) : EMPTY}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">STA / ETA</dt>
          <dd className="mono">
            {hhmm(row.sta)} / {row.eta ? hhmm(row.eta) : EMPTY}
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Ground services</dt>
          <dd>
            {row.servicesConfirmed} of {row.servicesTotal} confirmed
          </dd>
        </div>
        <div>
          <dt className="eyebrow">Crew</dt>
          <dd>
            {row.crewSeatsFilled} of {row.crewMinimumSeats} seats · FTL {titleCase(row.crewFtlStatus)}
          </dd>
        </div>
      </dl>

      {isLoading ? <LoadingState label="Running the readiness checks…" /> : null}

      {error ? (
        <div className="finding finding--blocking">
          <div className="finding__check">READINESS UNAVAILABLE</div>
          <p className="finding__message">{error.message}</p>
        </div>
      ) : null}

      {data ? (
        <>
          <div
            className={
              data.releasable
                ? 'drawer__verdict drawer__verdict--ok'
                : 'drawer__verdict drawer__verdict--blocked'
            }
          >
            {data.releasable ? <CircleCheck size={16} /> : <TriangleAlert size={16} />}
            {data.releasable
              ? 'No blocking finding: this leg can be released'
              : `${data.blocking.length} blocking finding${data.blocking.length === 1 ? '' : 's'}`}
          </div>

          <FindingGroup title="Blocking" items={data.blocking} variant="blocking" />
          <FindingGroup title="Derogable" items={data.derogable} variant="derogable" />
          <FindingGroup title="For information" items={data.info} variant="info" />

          {data.blocking.length === 0 &&
          data.derogable.length === 0 &&
          data.info.length === 0 ? (
            <p style={{ color: 'var(--ink-500)' }}>
              Every check passed on real data: airworthiness, MEL, crew legality and documents,
              permits, ground services and runway aptitude.
            </p>
          ) : null}
        </>
      ) : null}
    </>
  )
}

export default function LegDrawer({ row, onClose }) {
  if (!row) return null

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} />
      <aside className="drawer" role="dialog" aria-label="Leg readiness">
        <div className="drawer__head">
          <div>
            <h2>{row.kind === 'GROUND' ? row.registration : row.flightNo}</h2>
            <p>{row.routeLabel}</p>
          </div>
          {row.riskLevel === 'CRITICAL' ? <Badge tone="CRITICAL">Critical</Badge> : null}
          {row.riskLevel === 'MEDIUM' ? <Badge tone="MEDIUM">Medium</Badge> : null}
          <button type="button" className="drawer__close" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>
        <div className="drawer__body">
          {row.kind === 'GROUND' ? <GroundBody row={row} /> : <FlightBody row={row} />}
        </div>
      </aside>
    </>
  )
}
