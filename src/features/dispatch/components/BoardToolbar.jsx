import { Plus } from 'lucide-react'

const TABS = [
  { id: 'ALL_FLIGHTS', label: 'All Flights' },
  { id: 'NEEDS_ACTION', label: 'Needs Action' },
  { id: 'SCHEDULED', label: 'Scheduled' },
  { id: 'EN_ROUTE', label: 'En Route' },
  { id: 'DELAYED', label: 'Delayed' },
  { id: 'AOG_MAINTENANCE', label: 'AOG / Maintenance' },
]

/**
 * Tabs and selectors. The counts come from the server, which knows how many
 * rows each tab holds for the current selectors — the browser never has to
 * re-filter the day to label a tab.
 */
export default function BoardToolbar({
  tab,
  onTabChange,
  fleet,
  onFleetChange,
  base,
  onBaseChange,
  fleetTypes = [],
  bases = [],
  tabCounts = {},
  onAddFlight,
}) {
  return (
    <div className="toolbar">
      <div className="tabs">
        {TABS.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={id === tab ? 'tab tab--active' : 'tab'}
            onClick={() => onTabChange(id)}
          >
            {label}
            {tabCounts[id] !== undefined ? (
              <span className="tab__count">{tabCounts[id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      <label className="select-field select-field--wide">
        <span>Fleet:</span>
        <select value={fleet} onChange={(event) => onFleetChange(event.target.value)}>
          <option value="">All</option>
          {fleetTypes.map((type) => (
            <option key={type} value={type}>
              {type}
            </option>
          ))}
        </select>
      </label>

      <label className="select-field">
        <span>Base:</span>
        <select value={base} onChange={(event) => onBaseChange(event.target.value)}>
          <option value="">All</option>
          {bases.map((icao) => (
            <option key={icao} value={icao}>
              {icao}
            </option>
          ))}
        </select>
      </label>

      <button type="button" className="toolbar__button" onClick={onAddFlight}>
        <Plus size={14} />
        Add Flight
      </button>

      <div className="legend">
        <span>
          <i style={{ background: 'var(--ready-fg)' }} />
          Ready
        </span>
        <span>
          <i style={{ background: 'var(--pending-fg)' }} />
          Pending
        </span>
        <span>
          <i style={{ background: 'var(--attention-fg)' }} />
          Attention
        </span>
      </div>
    </div>
  )
}
