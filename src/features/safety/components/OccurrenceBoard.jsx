import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertTriangle, Download, Eye, Lock, Plus, Send } from 'lucide-react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useSafetyBoard } from '../../../hooks/useCommercial'
import { Empty, FTag, KpiCard, RiskBadge, StatusBadge, titleise } from './SafeOps'
import { EMPTY, dayMonthYear } from '../../../lib/format'
import OccurrenceDrawer from './OccurrenceDrawer'

/**
 * Occurrence Reporting.
 *
 * <b>The register, not a dashboard.</b> Reactive, proactive and predictive
 * reports in one list, with the filters an operator actually uses: where a
 * report has got to, and whether it is one the authority has to be told about.
 *
 * <b>A report with no risk assessment says so.</b> « Not assessed » is not a
 * low risk — it is the starting point of the assessment, and the annexe counts
 * those separately for exactly that reason.
 *
 * <b>The matrix is not on this page.</b> It lives in the Risk Register, where
 * hazards are plotted; repeating it here made the register look like two
 * different registers.
 */
export default function OccurrenceBoard() {
  const navigate = useNavigate()
  const [status, setStatus] = useState('')
  const [query, setQuery] = useState('')
  const [morOnly, setMorOnly] = useState(false)
  const [selected, setSelected] = useState(null)

  const board = useSafetyBoard({ status: '', windowDays: 365 })
  const data = board.data

  const rows = useMemo(() => {
    const all = data?.occurrences ?? []
    const needle = query.trim().toLowerCase()
    return all.filter((row) => {
      if (status && row.status !== status) return false
      if (morOnly && !isMandatory(row)) return false
      if (!needle) return true
      return [row.reference, row.title, row.category, row.registration, row.stationIcao,
        row.reportedByName]
        .some((value) => value && String(value).toLowerCase().includes(needle))
    })
  }, [data?.occurrences, status, query, morOnly])

  if (board.isError) {
    return <ErrorState error={board.error} onRetry={() => board.refetch()} />
  }
  if (!data) {
    return <LoadingState label="Loading the occurrence register…" />
  }

  const all = data.occurrences ?? []
  const mandatory = all.filter(isMandatory)
  const filed = mandatory.filter((row) => row.eccairsExportedAt).length

  const filters = [
    ['', 'All'],
    ['REPORTED', 'Reported'],
    ['UNDER_REVIEW', 'Under review'],
    ['RISK_ASSESSED', 'Risk assessed'],
    ['ACTIONS_OPEN', 'Actions open'],
    ['CLOSED', 'Closed'],
  ]

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Occurrence Reporting</div>
          <div className="page-sub">
            Reactive, proactive and predictive reports · mandatory reporting under
            Regulation (EU) 376/2014
          </div>
        </div>
        <div className="btn-row">
          <button className="btn-o" onClick={() => exportCsv(rows)}>
            <Download size={11} style={{ verticalAlign: '-1px', marginRight: 4 }} /> Export CSV
          </button>
          <button className="btn-p" onClick={() => navigate('/safety-reports')}>
            <Plus size={12} strokeWidth={2.4} /> Record occurrence
          </button>
        </div>
      </div>

      <div className="kpi-row">
        <KpiCard tone="c1" ico="ic-b" icon={AlertTriangle} label="Total recorded"
                 value={all.length} sub="all classes" />
        <KpiCard tone="c2" ico="ic-r" icon={Eye} label="Open"
                 value={all.filter((row) => row.status !== 'CLOSED').length}
                 sub="awaiting closure" />
        <KpiCard tone="c5" ico="ic-o" icon={AlertTriangle} label="High / intolerable"
                 value={data.unacceptable} sub="index ≥ 15" />
        <KpiCard tone="c3" ico="ic-s" icon={Send} label="Mandatory reports"
                 value={mandatory.length} sub={`${filed} filed with the authority`} />
        <KpiCard tone="c4" ico="ic-g" icon={Lock} label="Confidential"
                 value={all.filter((row) => row.anonymous).length}
                 sub="de-identified under Just Culture" />
      </div>

      <div className="filter-bar">
        {filters.map(([key, label]) => {
          const count = key ? all.filter((row) => row.status === key).length : all.length
          return (
            <FTag key={key || 'ALL'} active={status === key} onClick={() => setStatus(key)}>
              {label} ({count})
            </FTag>
          )
        })}
        {/* 376/2014 : la notification obligatoire est une categorie a part, pas
            un etat du flux. On la filtre separement. */}
        <FTag active={morOnly} onClick={() => setMorOnly((current) => !current)}>
          MOR only ({mandatory.length})
        </FTag>
        <input className="searchbox" value={query}
               onChange={(event) => setQuery(event.target.value)}
               placeholder="Search reference, title, tail, aerodrome…" />
      </div>

      <div className="card">
        <table className="tbl">
          <thead>
            <tr>
              <th>Reference</th><th>Occurrence</th><th>Class</th><th>Domain</th>
              <th>Risk</th><th>Status</th><th>Reported by</th><th>Date</th><th />
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const index = row.riskSeverity && row.riskProbability
                ? severityValue(row.riskSeverity) * row.riskProbability : null
              return (
                <tr key={row.id} onClick={() => setSelected(row)} style={{ cursor: 'pointer' }}>
                  <td style={{ fontWeight: 600, color: 'var(--navy)' }}>{row.reference}</td>
                  <td>
                    {row.title}
                    <div className="chip-wrap">
                      {row.phaseOfFlight ? <span className="tag">{row.phaseOfFlight}</span> : null}
                      {row.registration ? <span className="tag">{row.registration}</span> : null}
                      {row.stationIcao ? <span className="tag">{row.stationIcao}</span> : null}
                      {isMandatory(row) ? (
                        <span className="tag mor">
                          {row.eccairsExportedAt ? 'filed' : 'MOR'}
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td style={{ fontSize: 10 }}>
                    {row.eccairsOccurrenceClass
                      ? titleise(row.eccairsOccurrenceClass) : 'Occurrence'}
                  </td>
                  <td style={{ fontSize: 10 }}>{titleise(row.category)}</td>
                  <td><RiskBadge index={index} /></td>
                  <td><StatusBadge status={row.status} /></td>
                  {/* Un rapport confidentiel est de-identifie : le declarant
                      n'est pas affiche, et c'est la raison pour laquelle il
                      existe. */}
                  <td style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {row.anonymous ? 'Confidential' : (row.reportedByName ?? EMPTY)}
                  </td>
                  <td style={{ fontSize: 10, color: 'var(--muted)' }}>
                    {dayMonthYear(row.occurredAt)}
                  </td>
                  <td>
                    <button className="btn-nav"
                            onClick={(event) => { event.stopPropagation(); setSelected(row) }}>
                      Open
                    </button>
                  </td>
                </tr>
              )
            })}
            {rows.length === 0 ? (
              <tr>
                <td colSpan={9}>
                  <Empty>
                    {all.length === 0
                      ? 'No occurrence has been recorded in the last twelve months.'
                      : 'Nothing matches — clear the filters, or widen the search.'}
                  </Empty>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <OccurrenceDrawer occurrence={selected} onClose={() => setSelected(null)} />
    </>
  )
}

/**
 * Whether the authority has to be told.
 *
 * <p>An ECCAIRS class other than the plain « occurrence » is reportable under
 * Regulation (EU) 376/2014 — an accident or a serious incident is never a
 * matter of internal record only.
 */
function isMandatory(row) {
  const kind = row.eccairsOccurrenceClass
  return Boolean(kind) && kind.toUpperCase() !== 'OCCURRENCE'
}

/** La valeur numerique d'une severite ICAO : A vaut 5, E vaut 1. */
function severityValue(severity) {
  return { A: 5, B: 4, C: 3, D: 2, E: 1 }[String(severity).toUpperCase()] ?? 3
}

function exportCsv(rows) {
  const escape = (value) => `"${String(value ?? '').replace(/"/g, '""')}"`
  const header = ['Reference', 'Occurred', 'Title', 'Class', 'Domain', 'Risk', 'Status',
    'Reported by', 'Aircraft', 'Aerodrome', 'Filed with authority']
  const body = rows.map((row) => [
    row.reference, row.occurredAt, row.title,
    row.eccairsOccurrenceClass ?? 'Occurrence', row.category,
    row.riskLevel ?? 'not assessed', row.status,
    row.anonymous ? 'confidential' : row.reportedByName,
    row.registration, row.stationIcao,
    row.eccairsExportedAt ? row.eccairsReference : 'not filed',
  ])
  const csv = [header, ...body].map((line) => line.map(escape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `occurrence-register-${new Date().toISOString().slice(0, 10)}.csv`
  link.click()
  URL.revokeObjectURL(url)
}
