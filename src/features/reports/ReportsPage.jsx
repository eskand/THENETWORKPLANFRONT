import { useEffect, useMemo, useState } from 'react'
import { Download, Play } from 'lucide-react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import { useReportCatalogue, useRunReport } from '../../hooks/usePlatform'
import ReportChart from './components/ReportChart'
import { EMPTY, dayMonthYear, hhmm } from '../../lib/format'
import '../../styles/reports.css'

/**
 * Reports.
 *
 * <b>A report is a question, and the answer carries the instant it was
 * computed.</b> Nothing is cached: quoting a figure without knowing when it was
 * produced is how an operator ends up defending a number it cannot reproduce.
 *
 * <b>The catalogue is grouped by module, not listed flat.</b> Twenty-seven
 * reports in one column is a list nobody reads to the end of — the prototype
 * groups them the way the operator's departments are organised, and so does
 * this.
 *
 * <b>A definition with no runner says so.</b> It appears in the menu, greyed,
 * rather than running and returning an empty table that looks like an answer.
 */

/** L'ordre des modules dans le menu, celui du prototype. */
const MODULE_ORDER = ['Flights', 'Crew', 'Sales', 'Maintenance', 'Safety (SMS)',
  'Trip support']

const PERIODS = [
  ['7', 'Last 7 days'],
  ['30', 'Last 30 days'],
  ['90', 'Last 90 days'],
  ['180', 'Last 180 days'],
  ['365', 'Last 12 months'],
]

export default function ReportsPage() {
  const [selected, setSelected] = useState(null)
  const [windowDays, setWindowDays] = useState('30')

  const catalogue = useReportCatalogue()
  const run = useRunReport()

  /* Le serveur renvoie deja les definitions dans l ordre du menu ; on ne
     regroupe que par module, sans retrier — l ordre a l interieur d un module
     est celui du prototype, et il ne se deduit d aucun champ. */
  const grouped = useMemo(() => {
    const out = new Map()
    ;(catalogue.data ?? []).forEach((report) => {
      const module = report.module ?? 'Other'
      if (!out.has(module)) out.set(module, [])
      out.get(module).push(report)
    })
    return [...out.entries()].sort(
      (a, b) => order(a[0]) - order(b[0]),
    )
  }, [catalogue.data])

  const definition = (catalogue.data ?? []).find((report) => report.code === selected) ?? null

  /* Le premier rapport du menu s'ouvre tout seul : un ecran de rapports qui
     s'ouvre vide demande un clic pour ne rien apprendre. C'est le premier du
     MENU, pas le premier du catalogue — l'API renvoie les definitions triees
     par code, et « COM-PIPE » ouvrirait sur la seule question que personne ne
     pose en arrivant. */
  useEffect(() => {
    if (selected || !grouped.length) return
    const first = grouped
      .flatMap(([, reports]) => reports)
      .find((report) => report.runnable)
    if (first) setSelected(first.code)
  }, [grouped, selected])

  /* On depend du CODE, pas de l objet : chaque execution invalide le
     catalogue, qui se recharge, ce qui donne un nouvel objet `definition`.
     Depender de l objet relancerait le rapport en boucle. */
  const runMutate = run.mutate
  const runnable = definition?.runnable ?? false
  const code = definition?.code ?? null
  useEffect(() => {
    if (!code || !runnable) return
    runMutate({ code, windowDays: Number(windowDays) })
  }, [code, runnable, windowDays, runMutate])

  const result = run.data

  const exportCsv = () => {
    if (!result) return
    const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
    const csv = [result.columns.map(escape).join(','),
      ...result.rows.map((row) => row.map(escape).join(','))].join('\n')
    // The browser writes what the server computed; it recomputes nothing.
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `${result.code}-${result.windowFrom}-${result.windowTo}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      <TopBar
        title="Reports"
        subtitle="Operational reporting · every answer is recomputed and stamped"
      />

      <div className="shell__scroll">
        {catalogue.isError ? (
          <main className="page">
            <ErrorState error={catalogue.error} onRetry={() => catalogue.refetch()} />
          </main>
        ) : !catalogue.data ? (
          <main className="page">
            <LoadingState label="Loading the catalogue…" />
          </main>
        ) : (
          <div className="rp">
            <aside className="rp__nav">
              {grouped.map(([module, reports]) => (
                <section key={module}>
                  <h3>{module}</h3>
                  {reports.map((report) => (
                    <button
                      key={report.code}
                      type="button"
                      className={`rp__item${selected === report.code ? ' is-on' : ''}${
                        report.runnable ? '' : ' is-off'}`}
                      disabled={!report.runnable}
                      title={report.runnable
                        ? report.subtitle ?? report.description
                        : 'No runner answers this report yet'}
                      onClick={() => setSelected(report.code)}
                    >
                      {report.title}
                      {report.runnable ? null : <span className="rp__soon">—</span>}
                    </button>
                  ))}
                </section>
              ))}
            </aside>

            <main className="rp__main">
              {!definition ? (
                <div className="rp__empty">Select a report.</div>
              ) : (
                <>
                  <header className="rp__head">
                    <div>
                      <h1>{definition.title}</h1>
                      <p>{definition.subtitle ?? definition.description}</p>
                      {definition.scope ? (
                        <p className="rp__scope">Scope — {definition.scope}</p>
                      ) : null}
                    </div>
                    <div className="rp__actions">
                      <label className="rp__period">
                        <span>Period</span>
                        <select
                          value={windowDays}
                          onChange={(event) => setWindowDays(event.target.value)}
                        >
                          {PERIODS.map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </label>
                      <button
                        type="button"
                        className="btn btn--ghost"
                        disabled={run.isPending}
                        onClick={() => run.mutate({
                          code: definition.code, windowDays: Number(windowDays),
                        })}
                      >
                        <Play size={13} /> Run again
                      </button>
                      <button
                        type="button"
                        className="btn"
                        disabled={!result}
                        onClick={exportCsv}
                      >
                        <Download size={13} /> CSV
                      </button>
                    </div>
                  </header>

                  {!definition.runnable ? (
                    <div className="rp__empty">
                      This report is in the catalogue but no runner answers it yet. It is shown
                      rather than hidden so the catalogue stays honest about what it can and
                      cannot produce.
                    </div>
                  ) : run.isError ? (
                    <ErrorState error={run.error} onRetry={() => run.mutate({
                      code: definition.code, windowDays: Number(windowDays),
                    })} />
                  ) : run.isPending || !result ? (
                    <LoadingState label="Computing…" />
                  ) : (
                    <>
                      {result.kpis?.length ? (
                        <div className="rp__kpis">
                          {result.kpis.map((kpi) => (
                            <div className={`rp__kpi t-${kpi.tone ?? 'neutral'}`} key={kpi.label}>
                              <div className="rp__kl">{kpi.label}</div>
                              <div className="rp__kv">{kpi.value}</div>
                              <div className="rp__ks">{kpi.sub}</div>
                              {kpi.bar != null ? (
                                <div className="rp__kb"><i style={{ width: `${kpi.bar}%` }} /></div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      ) : null}

                      {result.charts?.length ? (
                        <div className="rp__charts">
                          {result.charts.map((chart) => (
                            <ReportChart chart={chart} key={chart.id} />
                          ))}
                        </div>
                      ) : null}

                      <div className="rp__tablewrap">
                        <table className="rp__table">
                          <thead>
                            <tr>
                              {result.columns.map((column, index) => (
                                /* La cle est la position : « Crew Currency »
                                   porte trois colonnes « Days », et une cle
                                   tiree du libelle en ferait disparaitre deux. */
                                <th key={`${column}-${index}`}>{column}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {result.rows.map((row, index) => (
                              <tr key={`${result.code}-${index}`}>
                                {row.map((cell, cellIndex) => (
                                  <td
                                    key={`${result.columns[cellIndex]}-${cellIndex}`}
                                    className={numeric(cell) ? 'is-num' : undefined}
                                  >
                                    {cell || EMPTY}
                                  </td>
                                ))}
                              </tr>
                            ))}
                            {!result.rows.length ? (
                              <tr>
                                <td colSpan={result.columns.length} className="rp__norows">
                                  Nothing in this period. An empty report is an answer, not a
                                  failure.
                                </td>
                              </tr>
                            ) : null}
                          </tbody>
                        </table>
                      </div>

                      <footer className="rp__foot">
                        {result.note ? <p className="rp__note">{result.note}</p> : null}
                        <p className="rp__stamp">
                          {result.rowCount} row{result.rowCount === 1 ? '' : 's'} ·{' '}
                          {dayMonthYear(result.windowFrom)} to {dayMonthYear(result.windowTo)} ·
                          computed {hhmm(result.computedAt)} UTC in {result.durationMs} ms
                        </p>
                      </footer>
                    </>
                  )}
                </>
              )}
            </main>
          </div>
        )}
      </div>
    </>
  )
}

/**
 * Whether a cell is a figure.
 *
 * <p>The prototype declares an alignment per column; here it is derived from
 * the value, which reaches the same place with no extra field to keep in step:
 * a count, a percentage and an h:mm duration all right-align, a registration
 * and a status do not.
 */
function numeric(cell) {
  return typeof cell === 'string' && /^[+-]?[\d.,:]+\s*(%|min|h|d)?$/.test(cell.trim())
}

function order(module) {
  const index = MODULE_ORDER.indexOf(module)
  return index < 0 ? MODULE_ORDER.length : index
}
