import { useNavigate } from 'react-router-dom'
import { hhmm } from '../../../lib/format'

const STATUS_LABEL = {
  AOG: 'AOG',
  DELAYED: 'Delayed',
  MAINTENANCE: 'Maintenance',
}

/** "NOW" au-dela de l'heure de depart, sinon les minutes restantes. */
function countdown(at) {
  const minutes = Math.round((at - Date.now()) / 60000)
  if (minutes <= 0) return { text: 'NOW', tone: 'soon' }
  if (minutes < 60) return { text: `${minutes}m`, tone: minutes <= 15 ? 'soon' : 'normal' }
  const hours = Math.floor(minutes / 60)
  return { text: `${hours}h${String(minutes % 60).padStart(2, '0')}`, tone: 'normal' }
}

export default function DeparturesPanel({ occ, onSelect }) {
  const navigate = useNavigate()
  const upcoming = occ.upcoming.slice(0, 6)
  const disruptions = occ.disruptions

  return (
    <div className="dash-card dash-card-perf">
      <div className="dash-card-head">
        <h3>Upcoming departures</h3>
        <span className="dash-link" onClick={() => navigate('/dispatch')}>
          Dispatch desk →
        </span>
      </div>

      {upcoming.length === 0 ? (
        <div className="dash-empty">No departure left on the board today</div>
      ) : (
        upcoming.map(({ row, at }) => {
          const cd = countdown(at)
          return (
            <div
              className="dash-upcoming-row"
              key={`${row.kind}-${row.rowId}`}
              onClick={() => onSelect?.(row)}
            >
              <span className={`countdown ${cd.tone}`}>{cd.text}</span>
              <span className="info">
                <span className="fn">
                  {row.flightNo} · {row.registration}
                </span>
                <span className="rt">{row.routeLabel}</span>
              </span>
              <span className="std">{hhmm(row.etd ?? row.std)}Z</span>
            </div>
          )
        })
      )}

      <div className="dash-card-head dash-subhead">
        <h3>Delays &amp; AOG — today</h3>
        <span className="cnt">
          {disruptions.length} item{disruptions.length === 1 ? '' : 's'}
        </span>
      </div>

      {disruptions.length === 0 ? (
        <div className="dash-empty">Nothing disrupted on the board</div>
      ) : (
        disruptions.map((row) => (
          <div className="dash-alert-row" key={`d-${row.kind}-${row.rowId}`}>
            <span
              className={`flag ${row.statusTone === 'AOG' ? 'crit' : 'warn'}`}
            />
            <span className="info">
              <span className="ttl">
                {row.kind === 'GROUND' ? row.label : row.flightNo}
              </span>
              <span className="sub">
                {row.registration} · {row.icaoType}
              </span>
            </span>
            <span
              className={`side ${row.statusTone === 'AOG' ? 'crit' : 'warn'}`}
            >
              {STATUS_LABEL[row.statusTone] ?? row.statusTone}
            </span>
          </div>
        ))
      )}
    </div>
  )
}
