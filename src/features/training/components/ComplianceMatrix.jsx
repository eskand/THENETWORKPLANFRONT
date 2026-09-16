import { dayMonthYear } from '../../../lib/format'

/**
 * Crew on the rows, mandatory courses on the columns, one cell per pair.
 *
 * The five states are distinguished on purpose. MISSING is not EXPIRED: one
 * needs a first course, the other a renewal, and the audit found the prototype
 * showing neither — 15 files carried a record, the other 86 showed nothing at
 * all and nobody could tell which was which.
 */
const CELL_CLASS = {
  VALID: 'tcell tcell--valid',
  EXPIRING: 'tcell tcell--expiring',
  EXPIRED: 'tcell tcell--expired',
  UNKNOWN: 'tcell tcell--unknown',
  MISSING: 'tcell tcell--missing',
}

const CELL_MARK = {
  VALID: '✓',
  EXPIRING: '!',
  EXPIRED: '✕',
  UNKNOWN: '?',
  MISSING: '–',
}

function Cell({ cell }) {
  const title = cell.validTo
    ? `${cell.courseCode} · completed ${dayMonthYear(cell.completedOn)} · valid to ${dayMonthYear(cell.validTo)}`
    : `${cell.courseCode} · ${cell.status === 'MISSING' ? 'never recorded' : 'no expiry on file'}`
  return (
    <td className="cell--time">
      <span className={CELL_CLASS[cell.status] ?? CELL_CLASS.UNKNOWN} title={title}>
        {CELL_MARK[cell.status] ?? '?'}
      </span>
    </td>
  )
}

function SkeletonRows({ columns }) {
  return Array.from({ length: 8 }).map((_, index) => (
    <tr className="skeleton-row" key={index}>
      {Array.from({ length: columns }).map((__, cell) => (
        <td key={cell}>
          <div className="skeleton-bar" />
        </td>
      ))}
    </tr>
  ))
}

export default function ComplianceMatrix({ compliance, loading, onSelect, selectedId }) {
  const courses = compliance?.courses ?? []
  const rows = compliance?.rows ?? []

  return (
    <div className="board">
      <table>
        <thead>
          <tr>
            <th>Staff</th>
            <th>Name</th>
            <th>Role</th>
            {courses.map((course) => (
              <th key={course.code} title={`${course.title} · ${course.authorityRef ?? ''}`}>
                {course.code}
              </th>
            ))}
            <th>Next expiry</th>
          </tr>
        </thead>
        <tbody>
          {loading && rows.length === 0 ? <SkeletonRows columns={courses.length + 4} /> : null}
          {rows.map((row) => (
            <tr
              key={row.personId}
              className={row.personId === selectedId ? 'row--selected' : undefined}
              onClick={() => onSelect(row)}
            >
              <td>
                <span className="flight-cell__no">{row.staffNo}</span>
              </td>
              <td>
                <span className="tail-cell__reg">{row.fullName}</span>
              </td>
              <td className="tail-cell__type">{row.mainRole.replace('_', ' ').toLowerCase()}</td>
              {row.cells.map((cell) => (
                <Cell key={cell.courseCode} cell={cell} />
              ))}
              <td className="cell--time">{dayMonthYear(row.nextExpiry)}</td>
            </tr>
          ))}
          {!loading && rows.length === 0 ? (
            <tr>
              <td colSpan={courses.length + 4}>
                <div className="state">
                  <h3>No active crew member</h3>
                  <p>The matrix covers active crew only.</p>
                </div>
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  )
}
