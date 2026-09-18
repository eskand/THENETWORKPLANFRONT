import { Plane } from 'lucide-react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonth, hhmm, titleCase } from '../../../lib/format'

const COLUMNS = [
  'Flight', 'Aircraft', 'Route', 'Date', 'ETD', 'ATD', 'ETA', 'ATA',
  'CTOT', 'Services', 'Crew', 'Status',
]

const STATUS_TONE = {
  SCHEDULED: 'INFO',
  ENROUTE: 'READY',
  DELAYED: 'PENDING',
  AOG: 'ATTENTION',
  CLOSED: 'NEUTRAL',
  CANCELLED: 'NEUTRAL',
}

const STATUS_LABEL = {
  SCHEDULED: 'Scheduled',
  ENROUTE: 'En route',
  DELAYED: 'Delayed',
  AOG: 'AOG',
  MAINTENANCE: 'Maintenance',
  CLOSED: 'Closed',
  CANCELLED: 'Cancelled',
}

function Cell({ value }) {
  const empty = value === EMPTY || value === null || value === undefined
  return <td className={empty ? 'cell--time cell--empty' : 'cell--time'}>{empty ? EMPTY : value}</td>
}

function ServicesCell({ row }) {
  if (row.servicesTotal === 0) {
    return (
      <td>
        <Badge tone="ATTENTION" title="No ground service requested yet">
          Attention
        </Badge>
      </td>
    )
  }
  const tone = row.servicesReadiness
  return (
    <td>
      <Badge tone={tone} title={`${row.servicesConfirmed} of ${row.servicesTotal} confirmed`}>
        {titleCase(tone)}
      </Badge>
      {row.permitsOutstanding > 0 ? (
        <>
          {' '}
          <Badge tone="PENDING" warn title={`${row.permitsOutstanding} permit(s) not confirmed`}>
            Permit
          </Badge>
        </>
      ) : null}
    </td>
  )
}

function CrewCell({ row }) {
  if (row.kind === 'GROUND') {
    return <td className="cell--time cell--empty">{EMPTY}</td>
  }
  const ftlWarn = row.crewFtlStatus !== 'OK'
  return (
    <td>
      <span className="badge-group">
        <Badge
          tone={row.crewAssigned ? 'READY' : 'ATTENTION'}
          title={`${row.crewSeatsFilled} of ${row.crewMinimumSeats} flight-deck seats`}
        >
          {row.crewAssigned ? 'Assigned' : `${row.crewSeatsFilled}/${row.crewMinimumSeats}`}
        </Badge>
        {ftlWarn ? (
          <Badge
            tone={row.crewFtlStatus === 'BREACH' ? 'ATTENTION' : 'PENDING'}
            warn
            title={`Flight-time limitation: ${row.crewFtlStatus}`}
          >
            FTL
          </Badge>
        ) : null}
      </span>
    </td>
  )
}

function StatusCell({ row }) {
  const tone = STATUS_TONE[row.statusTone]
  const label = STATUS_LABEL[row.statusTone] ?? titleCase(row.status)

  // Maintenance is shown as plain text, like on the approved mock-up: it is a
  // planned state, not something to act on right now.
  if (row.statusTone === 'MAINTENANCE') {
    return (
      <td>
        <span className="status-text">{label}</span>
      </td>
    )
  }
  return (
    <td>
      <Badge tone={tone ?? 'NEUTRAL'} title={row.note ?? undefined}>
        {label}
      </Badge>
    </td>
  )
}

function BoardRow({ row, selected, onSelect }) {
  return (
    <tr
      className={selected ? 'row--selected' : undefined}
      onClick={() => onSelect(row)}
      title={row.note ?? undefined}
    >
      <td>
        <span className="flight-cell">
          <span className={row.kind === 'GROUND' ? 'flight-cell__label' : 'flight-cell__no'}>
            {row.kind === 'GROUND' ? row.label : row.flightNo}
          </span>
          {row.riskLevel === 'CRITICAL' ? <Badge tone="CRITICAL">Critical</Badge> : null}
          {row.riskLevel === 'MEDIUM' ? <Badge tone="MEDIUM">Medium</Badge> : null}
        </span>
      </td>

      <td>
        <span className="tail-cell">
          <span className="tail-cell__icon">
            <Plane size={13} strokeWidth={1.9} />
          </span>
          <span>
            <span className="tail-cell__reg">{row.registration}</span>
            <br />
            <span className="tail-cell__type">{row.icaoType}</span>
          </span>
        </span>
      </td>

      <td>
        <span className="route-cell">{row.routeLabel}</span>
      </td>

      <Cell value={dayMonth(row.std)} />
      <Cell value={row.etd ? hhmm(row.etd) : EMPTY} />
      <Cell value={row.atd ? hhmm(row.atd) : EMPTY} />
      <Cell value={row.eta ? hhmm(row.eta) : EMPTY} />
      <Cell value={row.ata ? hhmm(row.ata) : EMPTY} />
      <Cell value={row.ctot ? hhmm(row.ctot) : EMPTY} />

      <ServicesCell row={row} />
      <CrewCell row={row} />
      <StatusCell row={row} />
    </tr>
  )
}

function SkeletonRows() {
  return Array.from({ length: 8 }).map((_, index) => (
    <tr className="skeleton-row" key={index}>
      {COLUMNS.map((column) => (
        <td key={column}>
          <div className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ))
}

export default function FlightTable({ rows, loading, selectedId, onSelect }) {
  return (
    <div className="board">
      <table>
        <thead>
          <tr>
            {COLUMNS.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? <SkeletonRows /> : null}
          {rows.map((row) => (
            <BoardRow
              key={`${row.kind}-${row.rowId}`}
              row={row}
              selected={row.rowId === selectedId}
              onSelect={onSelect}
            />
          ))}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length}>
                <div className="state">
                  <h3>No row matches this filter</h3>
                  <p>Change the tab, the fleet or the base to widen the view.</p>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
