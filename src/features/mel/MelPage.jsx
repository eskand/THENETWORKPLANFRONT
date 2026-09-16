import { useMemo, useState } from 'react'
import TopBar from '../../components/TopBar'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { useMelItems, useMelLibrary } from '../../hooks/useMaintenance'
import { EMPTY, dayMonthYear } from '../../lib/format'
import '../../styles/camo.css'

/**
 * MEL / CDL / HIL — the Hold Item List.
 *
 * Two tables that say different things, and the order matters. First what IS
 * deferred, grouped by aircraft, because the question asked at the aircraft is
 * "what is this tail carrying". Then the MEL/CDL catalogue by type — what MAY
 * be deferred and for how long.
 *
 * The rectification interval is the audit finding made visible: a deferral
 * rests on a library line, so it has a real date. Where the category leaves the
 * interval to the MEL remark, the row says so rather than showing a dash and
 * hoping nobody asks.
 */
export default function MelPage() {
  const [registration, setRegistration] = useState('all')
  const [scope, setScope] = useState('active')

  const items = useMelItems()
  const library = useMelLibrary({})

  const itemRows = useMemo(() => items.data ?? [], [items.data])
  const libraryRows = library.data ?? []

  const registrations = useMemo(
    () => [...new Set(itemRows.map((row) => row.registration))].sort(),
    [itemRows],
  )

  const shown = itemRows.filter((row) => {
    if (registration !== 'all' && row.registration !== registration) return false
    if (scope === 'active' && row.dueStatus === 'CLOSED') return false
    return true
  })

  const active = itemRows.filter((row) => row.dueStatus !== 'CLOSED')
  const soon = active.filter((row) => row.dueStatus === 'DUE_SOON').length
  const overdue = active.filter((row) => row.dueStatus === 'OVERDUE').length

  const byRegistration = groupBy(shown, (row) => row.registration)
  const byType = groupBy(libraryRows, (row) => row.icaoType ?? 'Unassigned type')

  return (
    <>
      <TopBar
        title="MEL / CDL / HIL — Hold Item List"
        subtitle="Deferred defects (MEL/CDL) per aircraft · rectification intervals · Part-M / MEL preamble"
      />

      <div className="shell__scroll">
        <main className="page">
          {items.isError ? (
            <ErrorState error={items.error} onRetry={() => items.refetch()} />
          ) : (
            <>
              <div className="hil-bar">
                <select
                  value={registration}
                  onChange={(event) => setRegistration(event.target.value)}
                  aria-label="Aircraft"
                >
                  <option value="all">All aircraft</option>
                  {registrations.map((reg) => (
                    <option key={reg} value={reg}>
                      {reg}
                    </option>
                  ))}
                </select>

                <select
                  value={scope}
                  onChange={(event) => setScope(event.target.value)}
                  aria-label="Scope"
                >
                  <option value="active">Active HIL items (deferred)</option>
                  <option value="all">All defect entries</option>
                </select>

                <div className="hil-kpis">
                  <div className="hil-kpi">
                    <b>{active.length}</b>
                    <span>Active HIL items</span>
                  </div>
                  <div
                    className="hil-kpi"
                    style={{ '--kpi-colour': soon ? 'var(--pending-fg)' : undefined }}
                  >
                    <b>{soon}</b>
                    <span>Due ≤ 48 h</span>
                  </div>
                  <div
                    className="hil-kpi"
                    style={{ '--kpi-colour': overdue ? 'var(--attention-fg)' : undefined }}
                  >
                    <b>{overdue}</b>
                    <span>Overdue</span>
                  </div>
                </div>
              </div>

              {items.isLoading ? <LoadingState label="Loading the Hold Item List…" /> : null}

              {!items.isLoading && !shown.length ? (
                <div className="state">
                  <p>
                    No MEL/CDL items match the current filters — the Hold Item List is clear.
                  </p>
                </div>
              ) : null}

              {[...byRegistration.keys()].sort().map((reg) => {
                const rows = byRegistration.get(reg)
                return (
                  <section key={reg}>
                    <div className="hil-section">
                      ✈ {reg}{' '}
                      <em>
                        {rows[0].icaoType ?? EMPTY} · {rows.length} item
                        {rows.length > 1 ? 's' : ''}
                      </em>
                    </div>
                    <table className="hil-table">
                      <thead>
                        <tr>
                          <th>MEL/CDL Ref</th>
                          <th>ATA</th>
                          <th>System</th>
                          <th>Item / Defect</th>
                          <th>Cat</th>
                          <th>Deferred</th>
                          <th>Rectification due</th>
                          <th>Status</th>
                          <th>Source</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={row.id}>
                            <td className="ref">{row.reference ?? EMPTY}</td>
                            <td className="mono">{row.ataChapter ?? EMPTY}</td>
                            <td>{row.systemName ?? EMPTY}</td>
                            <td className="wide">{row.title}</td>
                            <td>
                              <CategoryBadge category={row.melCategory} />
                            </td>
                            <td className="mono">{dayMonthYear(row.raisedAt)}</td>
                            <td className="mono">
                              {row.dueAt ? dayMonthYear(row.dueAt) : 'per MEL remark'}
                              {row.daysRemaining != null ? (
                                <span className={`hil-left ${leftClass(row)}`}>
                                  {' '}
                                  (
                                  {row.daysRemaining < 0
                                    ? `${-row.daysRemaining} d over`
                                    : `${row.daysRemaining} d left`}
                                  )
                                </span>
                              ) : null}
                            </td>
                            <td>
                              <StatusBadge row={row} />
                            </td>
                            <td className="hil-src">{row.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                )
              })}

              {libraryRows.length ? (
                <section>
                  <div className="hil-section" style={{ marginTop: '26px' }}>
                    📖 MEL / CDL reference catalogue — per aircraft type
                  </div>
                  <div className="hil-cat-note">
                    The master list. Items here define what <b>may</b> be deferred and for how
                    long; the tables above are what <b>is</b> currently deferred.
                  </div>

                  {[...byType.keys()].sort().map((type) => {
                    const rows = byType.get(type)
                    return (
                      <div key={type}>
                        <div className="hil-type-head">
                          {type}{' '}
                          <span>
                            {rows.length} item{rows.length > 1 ? 's' : ''}
                          </span>
                        </div>
                        <table className="hil-table">
                          <thead>
                            <tr>
                              <th>Ref</th>
                              <th>ATA</th>
                              <th>Item</th>
                              <th>Cat</th>
                              <th>Interval</th>
                              <th>Installed / Required</th>
                              <th>Restrictions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {rows.map((row) => (
                              <tr key={row.id}>
                                <td className="ref">{row.itemRef ?? EMPTY}</td>
                                <td className="mono">{row.ataChapter ?? EMPTY}</td>
                                <td>{row.title}</td>
                                <td>
                                  <CategoryBadge category={row.melCategory} />
                                </td>
                                <td>{interval(row)}</td>
                                <td className="mono">
                                  {row.installedQuantity ?? EMPTY} / {row.requiredQuantity ?? EMPTY}
                                </td>
                                <td className="wide">
                                  {row.limitation || row.operationalProcedure || EMPTY}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )
                  })}
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </>
  )
}

/**
 * The rectification interval.
 *
 * Category A has no fixed number of days — the MEL remark carries it. Showing
 * "0 days" there, or an em dash, both mislead; the category's own wording does
 * not.
 */
const CATEGORY_LABEL = {
  A: 'A — as specified',
  B: 'B — 3 days',
  C: 'C — 10 days',
  D: 'D — 120 days',
}

const CATEGORY_TONE = { A: 'ATTENTION', B: 'ATTENTION', C: 'PENDING', D: 'INFO' }

function CategoryBadge({ category }) {
  if (!category) return EMPTY
  return (
    <Badge tone={CATEGORY_TONE[category] ?? 'INFO'} title="MEL rectification interval category">
      {CATEGORY_LABEL[category] ?? category}
    </Badge>
  )
}

function StatusBadge({ row }) {
  if (row.dueStatus === 'OVERDUE') {
    return <Badge tone="ATTENTION">OVERDUE {Math.abs(row.daysRemaining)} d</Badge>
  }
  if (row.dueStatus === 'DUE_SOON') {
    return <Badge tone="ATTENTION">Due in {row.daysRemaining} d</Badge>
  }
  if (row.dueStatus === 'UNKNOWN') {
    return <Badge tone="INFO">Interval per MEL remark</Badge>
  }
  return <Badge tone="PENDING">Deferred (HIL)</Badge>
}

function interval(row) {
  if (row.melCategory === 'A') return 'As specified in the MEL remark'
  if (row.rectificationDays == null) return EMPTY
  return `${row.rectificationDays} day${row.rectificationDays > 1 ? 's' : ''}`
}

function leftClass(row) {
  if (row.daysRemaining < 0) return 'over'
  if (row.daysRemaining <= 2) return 'soon'
  return ''
}

function groupBy(rows, key) {
  const out = new Map()
  rows.forEach((row) => {
    const value = key(row)
    if (!out.has(value)) out.set(value, [])
    out.get(value).push(row)
  })
  return out
}
