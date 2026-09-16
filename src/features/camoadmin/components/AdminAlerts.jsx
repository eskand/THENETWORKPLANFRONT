/**
 * Alerts.
 *
 * Generated from the record set against the thresholds the module holds.
 * Nothing here is stored: it is what the records say right now. An ARC that
 * expired overnight is on this list this morning, and one that was renewed
 * yesterday is gone from it — neither needed anyone to write or close a row.
 */
export default function AdminAlerts({ board, onGo }) {
  const alerts = board.alerts

  return (
    <div className="ca-page">
      <div className="ca-head">
        <div>
          <div className="ca-h1">Alerts</div>
          <div className="ca-h2">
            Generated from the record set against the thresholds the module holds. Nothing here is
            stored: it is what the records say right now.
          </div>
        </div>
      </div>

      <div className="ca-card">
        {alerts.length ? (
          <table className="ca-tbl">
            <thead>
              <tr>
                <th>Severity</th>
                <th>Area</th>
                <th>Subject</th>
                <th>Detail</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {alerts.map((alert, index) => (
                <tr key={`${alert.area}-${alert.subject}-${index}`}>
                  <td>
                    <span
                      className={`ca-pill ${
                        alert.severity === 'CRITICAL'
                          ? 'bad'
                          : alert.severity === 'WARNING'
                            ? 'warn'
                            : ''
                      }`}
                    >
                      {alert.severity.toLowerCase()}
                    </span>
                  </td>
                  <td>{alert.area}</td>
                  <td>
                    <b>{alert.subject}</b>
                  </td>
                  <td>{alert.detail}</td>
                  <td>
                    {alert.destination ? (
                      <button
                        type="button"
                        className="ca-btn"
                        onClick={() => onGo(alert.destination)}
                      >
                        Open
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ca-empty">No alert. Every record is within its limits.</div>
        )}
      </div>
    </div>
  )
}
