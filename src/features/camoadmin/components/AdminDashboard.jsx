import { hhmm } from '../../../lib/format'

/**
 * The CAMO dashboard.
 *
 * Read only, and it says so. Every figure is recomputed from the record set;
 * nothing here can be typed into. Changes are made in the administration
 * screens, by import, or by synchronisation.
 */
export default function AdminDashboard({ board, onGo }) {
  const availability = board.aircraft
    ? Math.round((board.aircraftServiceable / board.aircraft) * 100)
    : 0
  const critical = board.alerts.filter((alert) => alert.severity === 'CRITICAL').length

  return (
    <div className="ca-page">
      <div className="ca-head">
        <div>
          <div className="ca-h1">CAMO Dashboard</div>
          <div className="ca-h2">
            Read only. Every figure is recomputed from the record set — nothing here can be typed
            into. Changes are made in the administration screens, by import, or by
            synchronisation.
          </div>
        </div>
        <div className="ca-hact">
          <span className="ca-stamp">computed {hhmm(board.computedAt)} UTC</span>
        </div>
      </div>

      <div className="ca-kpis">
        <Kpi label="Fleet managed" value={board.aircraft} sub="aircraft on the record" tone="neutral" />
        <Kpi
          label="Availability"
          value={`${availability}%`}
          sub={`${board.aircraftServiceable} of ${board.aircraft} serviceable`}
          tone={tone(100 - availability, 10, 25)}
        />
        <Kpi
          label="Aircraft grounded"
          value={board.aircraftAog}
          sub={board.aircraftAog ? 'withdrawn from the line' : 'none'}
          tone={tone(board.aircraftAog, 1, 3)}
        />
        <Kpi
          label="ARC expired"
          value={board.arcExpired}
          sub="not airworthy"
          tone={tone(board.arcExpired, 1, 2)}
        />
        <Kpi
          label="Documents expired"
          value={board.documentsExpired}
          sub={`${board.documentsExpiringWithin30Days} expiring within 30 days`}
          tone={tone(board.documentsExpired, 1, 3)}
        />
        <Kpi
          label="Critical alerts"
          value={critical}
          sub={`${board.alerts.length} total`}
          tone={tone(critical, 1, 3)}
        />
      </div>

      <div className="ca-grid3">
        <div className="ca-card">
          <div className="ca-ch">
            <span>Airworthiness</span>
          </div>
          <Row label="ARC in force" value={board.arcInForce} tone="good" />
          <Row
            label="ARC expiring within 30 days"
            value={board.arcExpiringWithin30Days}
            tone={board.arcExpiringWithin30Days ? 'warn' : 'good'}
          />
          <Row
            label="ARC expired"
            value={board.arcExpired}
            tone={board.arcExpired ? 'bad' : 'good'}
          />
          <Row label="Maintenance programme tasks" value={board.programmeTasks} tone="neutral" />
        </div>

        <div className="ca-card">
          <div className="ca-ch">
            <span>Due and overdue</span>
          </div>
          <Row
            label="Airworthiness directives open"
            value={board.directivesOpen}
            tone={board.directivesOpen ? 'warn' : 'good'}
          />
          <Row
            label="Directives overdue"
            value={board.directivesOverdue}
            tone={board.directivesOverdue ? 'bad' : 'good'}
          />
          <Row
            label="Documents expiring"
            value={board.documentsExpiringWithin30Days}
            tone={board.documentsExpiringWithin30Days ? 'warn' : 'good'}
          />
          <Row
            label="Components unserviceable"
            value={board.componentsUnserviceable}
            tone={board.componentsUnserviceable ? 'warn' : 'good'}
          />
        </div>

        <div className="ca-card">
          <div className="ca-ch">
            <span>Operations</span>
          </div>
          <Row
            label="Open defects"
            value={board.defectsOpen}
            tone={board.defectsOpen ? 'warn' : 'good'}
          />
          <Row
            label="Deferred (MEL)"
            value={board.deferralsInForce}
            tone={board.deferralsInForce ? 'warn' : 'good'}
          />
          <Row label="Open work orders" value={board.workOrdersOpen} tone="neutral" />
          <Row label="Components on the register" value={board.components} tone="neutral" />
        </div>
      </div>

      <div className="ca-card">
        <div className="ca-ch">
          <span>Provenance</span>
          <span className="ca-note-inline">
            Where the record came from — every row carries its own source
          </span>
        </div>
        <Row
          label="Aircraft imported or synchronised"
          value={`${board.recordsFromImport} of ${board.aircraft}`}
          tone="neutral"
        />
        <Row
          label="Documents on file"
          value={board.documents}
          tone={board.documents ? 'good' : 'warn'}
        />
        <div className="ca-note">
          A record with no provenance is a record nobody can defend. Each row keeps the source it
          arrived by — manual entry, an import file, or a connector — and the audit trail keeps what
          it said before.
        </div>
      </div>

      {board.alerts.length ? (
        <div className="ca-card">
          <div className="ca-ch">
            <span>What needs attention</span>
            <button type="button" className="ca-btn" onClick={() => onGo('alerts')}>
              All {board.alerts.length} alerts
            </button>
          </div>
          <table className="ca-tbl">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Area</th>
                <th>Subject</th>
                <th>Detail</th>
              </tr>
            </thead>
            <tbody>
              {board.alerts.slice(0, 8).map((alert, index) => (
                <tr key={`${alert.subject}-${index}`}>
                  <td>
                    <span className={`ca-pill ${alert.severity === 'CRITICAL' ? 'bad' : 'warn'}`}>
                      {alert.severity.toLowerCase()}
                    </span>
                  </td>
                  <td>{alert.area}</td>
                  <td>
                    <b>{alert.subject}</b>
                  </td>
                  <td>{alert.detail}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}

function Kpi({ label, value, sub, tone: t }) {
  return (
    <div className={`ca-kpi t-${t}`}>
      <div className="ca-kl">{label}</div>
      <div className="ca-kv">{value}</div>
      <div className="ca-ks">{sub}</div>
    </div>
  )
}

function Row({ label, value, tone: t }) {
  return (
    <div className={`ca-row t-${t}`}>
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

function tone(count, warnAt, badAt) {
  if (count >= badAt) return 'bad'
  if (count >= warnAt) return 'warn'
  return 'good'
}
