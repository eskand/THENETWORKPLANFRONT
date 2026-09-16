import { useState } from 'react'
import { LoadingState } from '../../../components/States'
import { useCamoAuditTrail } from '../../../hooks/useMaintenance'
import { EMPTY, dayMonthYear, hhmm } from '../../../lib/format'

/**
 * The audit trail.
 *
 * <b>The previous value is what makes this an audit trail.</b> Without it the
 * table is a list of events: it can say someone touched the ARC expiry on
 * Tuesday, but not what it used to say — which is the only question ever asked
 * of it. Append-only: rows are added, never edited.
 */
export default function AdminAudit() {
  const [search, setSearch] = useState('')
  const trail = useCamoAuditTrail(200)
  const all = trail.data ?? []

  const rows = search.trim()
    ? all.filter((row) =>
        [row.entity, row.entityLabel, row.action, row.field, row.oldValue, row.newValue,
          row.actorName, row.reason]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(search.trim().toLowerCase()),
      )
    : all

  return (
    <div className="ca-page">
      <div className="ca-head">
        <div>
          <div className="ca-h1">Audit trail</div>
          <div className="ca-h2">
            Who changed what, when, and what it said before. Append-only: a row here is never
            edited and never deleted, because a trail that can be rewritten is not a trail.
          </div>
        </div>
        <div className="ca-hact">
          <input
            className="ca-search"
            value={search}
            placeholder="Search the trail…"
            onChange={(event) => setSearch(event.target.value)}
          />
          <span className="ca-stamp">{rows.length} entries</span>
        </div>
      </div>

      <div className="ca-card">
        {trail.isLoading ? (
          <LoadingState label="Loading the audit trail…" />
        ) : rows.length ? (
          <table className="ca-tbl">
            <thead>
              <tr>
                <th>When</th>
                <th>Who</th>
                <th>Record</th>
                <th>Action</th>
                <th>Field</th>
                <th>Was</th>
                <th>Became</th>
                <th>Reason</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="mono">
                    {dayMonthYear(row.at)} {hhmm(row.at)}
                  </td>
                  <td>
                    {row.actorName ?? EMPTY}
                    {row.actorRole ? <div className="ca-sub">{row.actorRole}</div> : null}
                  </td>
                  <td>
                    <b>{row.entityLabel ?? row.entityId ?? EMPTY}</b>
                    <div className="ca-sub">{row.entity}</div>
                  </td>
                  <td>
                    <span className={`ca-pill ${row.action === 'DELETE' ? 'bad' : ''}`}>
                      {row.action.toLowerCase()}
                    </span>
                  </td>
                  <td>{row.field ?? EMPTY}</td>
                  <td>{row.oldValue ?? EMPTY}</td>
                  <td>{row.newValue ?? EMPTY}</td>
                  <td>{row.reason ?? EMPTY}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="ca-empty">
            The trail is empty. It fills as the record is changed — nothing is written to it in
            advance.
          </div>
        )}
      </div>
    </div>
  )
}
