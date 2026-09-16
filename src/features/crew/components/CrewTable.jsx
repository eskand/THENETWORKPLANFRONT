import { User } from 'lucide-react'
import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear, daysUntil, minutesToHhmm, titleCase } from '../../../lib/format'

const COLUMNS = [
  'Staff', 'Name', 'Role', 'Base', 'Type ratings', 'Documents',
  'Licence', 'Medical', 'Training', 'Block 7d', 'Block 28d', 'Availability',
]

/** Same four states as a leg finding, so a badge means the same thing everywhere. */
const DOCUMENT_TONE = {
  VALID: 'READY',
  EXPIRING: 'PENDING',
  EXPIRED: 'ATTENTION',
  UNKNOWN: 'INFO',
}

const ROLE_LABEL = {
  CAPTAIN: 'Captain',
  FIRST_OFFICER: 'First officer',
  CABIN: 'Cabin',
  ENGINEER: 'Engineer',
}

/**
 * An expiry date is rendered with the number of days left, because that is the
 * figure a crew planner acts on. A missing date is not blank: it says so.
 */
function ExpiryCell({ date }) {
  if (!date) {
    return (
      <td className="cell--time">
        <Badge tone="INFO" title="No date in the crew file">
          Unknown
        </Badge>
      </td>
    )
  }
  const days = daysUntil(date)
  const tone = days < 0 ? 'ATTENTION' : days <= 30 ? 'PENDING' : undefined
  return (
    <td className="cell--time" title={dayMonthYear(date)}>
      {tone ? (
        <Badge tone={tone} warn={days < 0}>
          {days < 0 ? `${-days} d late` : `${days} d`}
        </Badge>
      ) : (
        `${days} d`
      )}
    </td>
  )
}

function CrewRow({ person, selected, onSelect }) {
  return (
    <tr className={selected ? 'row--selected' : undefined} onClick={() => onSelect(person)}>
      <td>
        <span className="flight-cell">
          <span className="flight-cell__no">{person.staffNo}</span>
        </span>
      </td>

      <td>
        <span className="tail-cell">
          <span className="tail-cell__icon">
            <User size={13} strokeWidth={1.9} />
          </span>
          <span>
            <span className="tail-cell__reg">{person.fullName}</span>
            <br />
            <span className="tail-cell__type">{person.active ? 'Active' : 'Inactive'}</span>
          </span>
        </span>
      </td>

      <td>{ROLE_LABEL[person.mainRole] ?? titleCase(person.mainRole)}</td>
      <td className="cell--time">{person.baseIcao ?? EMPTY}</td>

      <td>
        <span className="badge-group">
          {person.typeRatings.length === 0 ? (
            <Badge tone="ATTENTION" warn title="No type rating on file">
              None
            </Badge>
          ) : (
            person.typeRatings.map((type) => (
              <Badge key={type} tone="NEUTRAL">
                {type}
              </Badge>
            ))
          )}
        </span>
      </td>

      <td>
        <Badge tone={DOCUMENT_TONE[person.documentStatus] ?? 'NEUTRAL'} warn={person.documentStatus === 'EXPIRED'}>
          {titleCase(person.documentStatus)}
        </Badge>
      </td>

      <ExpiryCell date={person.licenceExpiry} />
      <ExpiryCell date={person.medicalExpiry} />
      <ExpiryCell date={person.trainingExpiry} />

      <td className="cell--time">{minutesToHhmm(person.blockMinutes7d)}</td>
      <td className="cell--time">{minutesToHhmm(person.blockMinutes28d)}</td>

      <td>
        {person.absentToday ? (
          <Badge tone="PENDING" title="Absence covering today">
            {titleCase(person.absentToday)}
          </Badge>
        ) : (
          <Badge tone="READY">Available</Badge>
        )}
      </td>
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

export default function CrewTable({ people, loading, selectedId, onSelect }) {
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
          {loading && people.length === 0 ? <SkeletonRows /> : null}
          {people.map((person) => (
            <CrewRow
              key={person.id}
              person={person}
              selected={person.id === selectedId}
              onSelect={onSelect}
            />
          ))}
          {!loading && people.length === 0 ? (
            <tr>
              <td colSpan={COLUMNS.length}>
                <div className="state">
                  <h3>No crew member matches this filter</h3>
                  <p>Clear the search, or widen the role.</p>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
