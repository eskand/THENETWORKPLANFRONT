import { useMemo, useState } from 'react'
import { PenLine } from 'lucide-react'
import TopBar from '../../components/TopBar'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import { useSignTechLogPage, useTechLogBoard, useTechLogPages } from '../../hooks/useMaintenance'
import { EMPTY, dayMonthYear, hhmm, minutesToHhmm, titleCase } from '../../lib/format'
import DefectFile from './components/DefectFile'
import '../../styles/camo.css'

const PAGE_COLUMNS = ['Page', 'Tail', 'Date', 'Route', 'Block', 'Cycles', 'Fuel (l)', 'Commander', 'Defects', 'Status', '']

const TABS = [
  { k: 'all', l: 'All' },
  { k: 'OPEN', l: 'Open' },
  { k: 'DEFERRED', l: 'Deferred (MEL)' },
  { k: 'CLOSED', l: 'Closed' },
]

const DEFECT_TONE = { OPEN: 'ATTENTION', DEFERRED: 'PENDING', CLOSED: 'READY' }
const DEFECT_LABEL = { OPEN: 'Open', DEFERRED: 'Deferred (MEL)', CLOSED: 'Closed' }

/**
 * Tech Log.
 *
 * The defect board is the screen: what is open, what is carried under the MEL,
 * what was rectified. The journey log pages sit behind it, because signing a
 * page is the only event that advances TSN and CSN — the audit found counters
 * that never moved because nothing ever wrote them.
 */
export default function TechLogPage() {
  const [view, setView] = useState('DEFECTS')
  const [tab, setTab] = useState('all')
  const [selectedId, setSelectedId] = useState(null)

  const board = useTechLogBoard()
  const pages = useTechLogPages({ from: '2020-01-01' })
  const sign = useSignTechLogPage()

  const data = board.data
  const defects = useMemo(() => data?.defects ?? [], [data])
  const rows = tab === 'all' ? defects : defects.filter((row) => row.status === tab)
  const selected = defects.find((row) => row.id === selectedId) ?? null
  const pageRows = pages.data ?? []

  return (
    <>
      <TopBar
        title="Tech Log — Aircraft Technical Log"
        subtitle="Defects, deferrals (MEL) and rectifications · all fleets"
      />

      <div className="shell__scroll">
        <main className="page">
          {board.isError ? (
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          ) : !data ? (
            <LoadingState label="Loading the technical log…" />
          ) : (
            <>
              <div className="kpi-strip">
                <Kpi
                  label="Open defects"
                  value={data.open}
                  hint={`${data.openAircraft} aircraft`}
                  accent="var(--attention-fg)"
                  alarm={data.open > 0}
                />
                <Kpi
                  label="Deferred (MEL)"
                  value={data.deferred}
                  hint={
                    data.deferredRegistrations.length
                      ? data.deferredRegistrations.join(', ')
                      : 'none'
                  }
                  accent="var(--pending-fg)"
                />
                <Kpi
                  label="Closed (7 days)"
                  value={data.closedLastSevenDays}
                  hint="rectified & signed off"
                  accent="var(--ready-fg)"
                />
                <Kpi
                  label="Aircraft affected"
                  value={`${data.aircraftAffected} / ${data.fleetSize}`}
                  hint="with open/deferred items"
                />
                <Kpi
                  label="Repeat defects"
                  value={data.repeatDefects}
                  hint="same ATA, < 30 days"
                  accent="var(--pending-fg)"
                  alarm={data.repeatDefects > 0}
                />
                <Kpi
                  label="Avg time to close"
                  value={data.averageDaysToClose == null ? EMPTY : `${data.averageDaysToClose} days`}
                  hint="open → rectified"
                  accent="var(--accent-orange)"
                />
              </div>

              <div className="toolbar">
                <div className="seg">
                  {TABS.map((entry) => (
                    <button
                      key={entry.k}
                      type="button"
                      className={tab === entry.k ? 'is-active' : undefined}
                      onClick={() => setTab(entry.k)}
                    >
                      {entry.l}
                    </button>
                  ))}
                </div>
                <div className="seg" style={{ marginLeft: 'auto' }}>
                  <button
                    type="button"
                    className={view === 'DEFECTS' ? 'is-active' : undefined}
                    onClick={() => setView('DEFECTS')}
                  >
                    Defects
                  </button>
                  <button
                    type="button"
                    className={view === 'PAGES' ? 'is-active' : undefined}
                    onClick={() => setView('PAGES')}
                  >
                    Journey log pages
                  </button>
                </div>
              </div>

              {view === 'DEFECTS' ? (
                <div className="camo-split">
                  <div className="panel">
                    <table className="table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Aircraft</th>
                          <th>ATA</th>
                          <th>Defect</th>
                          <th>Reported by</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr
                            key={row.id}
                            className={row.id === selectedId ? 'is-selected' : undefined}
                            onClick={() => setSelectedId(row.id)}
                          >
                            <td className="mono">{dayMonthYear(row.reportedAt)}</td>
                            <td>
                              <div className="tail">
                                <b>{row.registration}</b>
                                <span title={row.aircraftType}>{row.icaoType ?? EMPTY}</span>
                              </div>
                            </td>
                            <td className="mono">ATA {row.ataChapter ?? EMPTY}</td>
                            <td>{row.description}</td>
                            <td>{row.reportedByName ?? EMPTY}</td>
                            <td>
                              <Badge tone={DEFECT_TONE[row.status]}>
                                {DEFECT_LABEL[row.status] ?? titleCase(row.status)}
                              </Badge>
                            </td>
                          </tr>
                        ))}
                        {!rows.length ? (
                          <tr>
                            <td colSpan={6} className="table__empty">
                              Nothing in this state.
                            </td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>

                  <DefectFile defect={selected} />
                </div>
              ) : (
                <div className="panel">
                  <table className="table">
                    <thead>
                      <tr>
                        {PAGE_COLUMNS.map((column) => (
                          <th key={column}>{column}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {pageRows.map((page) => (
                        <tr key={page.id}>
                          <td className="mono">{page.pageRef}</td>
                          <td>{page.registration}</td>
                          <td>{dayMonthYear(page.flownOn)}</td>
                          <td className="mono">
                            {page.depIcao ?? EMPTY} → {page.arrIcao ?? EMPTY}
                          </td>
                          <td className="mono">{minutesToHhmm(page.blockMinutes)}</td>
                          <td className="mono">{page.cycles}</td>
                          <td className="mono">{page.fuelUpliftLitres ?? EMPTY}</td>
                          <td>{page.commanderName ?? EMPTY}</td>
                          <td className="mono">{page.defects?.length ?? 0}</td>
                          <td>
                            <Badge tone={page.status === 'SIGNED' ? 'READY' : 'PENDING'}>
                              {titleCase(page.status)}
                              {page.signedAt ? ` · ${hhmm(page.signedAt)}` : ''}
                            </Badge>
                          </td>
                          <td>
                            {page.status === 'OPEN' ? (
                              <button
                                type="button"
                                className="btn btn--ghost"
                                disabled={sign.isPending}
                                onClick={() => sign.mutate(page.id)}
                                title="Signing is what advances TSN and CSN"
                              >
                                <PenLine size={13} /> Sign
                              </button>
                            ) : null}
                          </td>
                        </tr>
                      ))}
                      {!pageRows.length ? (
                        <tr>
                          <td colSpan={PAGE_COLUMNS.length} className="table__empty">
                            No pages recorded.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  )
}

function Kpi({ label, value, hint, accent, alarm }) {
  return (
    <div
      className="kpi"
      style={{
        '--kpi-accent': accent ?? 'var(--accent-orange)',
        '--kpi-value': alarm ? accent : undefined,
      }}
    >
      <span className="kpi__corners" />
      <div className="eyebrow">{label}</div>
      <div className="kpi__value">{value}</div>
      <div className="kpi__hint">{hint}</div>
    </div>
  )
}
