import { useState } from 'react'
import Badge from '../../../components/Badge'
import { FTag } from './SafeOps'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const TONE = { CLOSED: 'READY', IN_PROGRESS: 'PENDING', PLANNED: 'INFO', CANCELLED: 'NEUTRAL' }

const AUDIT_COLUMNS = ['Reference', 'Audit', 'Standard', 'Scope', 'Auditor', 'Planned',
  'Conducted', 'Conformity', 'Findings', 'Open', 'Status']

const SPI_COLUMNS = ['Ref', 'Indicator', 'Domain', 'Current', 'Target', 'Alert level', 'Status']

const ACTION_COLUMNS = ['Reference', 'Action', 'Source', 'Owner', 'Due', 'Status']

const CHANGE_COLUMNS = ['Reference', 'Change', 'Domain', 'Owner', 'Raised', 'Effective',
  'Initial', 'Residual', 'Status']

/**
 * Safety Assurance — ICAO Annex 19 component 3.
 *
 * <b>Four things, four sub-tabs.</b> Performance measurement, the audit
 * programme, what the audits found, and the changes being assessed. The
 * prototype separates them because they are read by different people at
 * different moments, and one page holding all four is a page nobody finishes.
 *
 * <b>A score stays empty until the audit has happened.</b> Writing zero reads
 * as « everything is non-conformant », which is the opposite of « we do not
 * know yet ». The dash tells the truth, and the mean conformity is taken only
 * over audits actually conducted.
 */
export default function AssuranceBoard({ audits, changes, indicators, actions }) {
  const [tab, setTab] = useState('performance')

  const open = audits.reduce((total, audit) => total + audit.openFindings, 0)
  const planned = audits.filter((audit) => audit.status === 'PLANNED').length
  const conducted = audits.filter((audit) => audit.scorePercent != null)
  const meanScore = conducted.length === 0
    ? null
    : Math.round(conducted.reduce((sum, audit) => sum + audit.scorePercent, 0) / conducted.length)

  const spis = indicators ?? []
  const breaching = spis.filter((spi) => spi.breachesAlert).length

  const tiles = [
    ['Audits', audits.length, `${planned} planned`, 'c1'],
    ['Open findings', open, 'awaiting closure', 'c5'],
    ['Mean conformity', meanScore == null ? EMPTY : `${meanScore}%`,
      `${conducted.length} conducted`, 'c4'],
    ['Indicators at alert', breaching, `of ${spis.length} tracked`, 'c2'],
  ]

  const tabs = [
    ['performance', 'Safety performance', spis.length],
    ['audits', 'Audit programme', audits.length],
    ['actions', 'Corrective actions', (actions ?? []).length],
    ['changes', 'Management of change', (changes ?? []).length],
  ]

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Safety Assurance</div>
          <div className="page-sub">Performance monitoring · internal audit · findings and corrective actions ·
            management of change</div>
        </div>
      </div>

      <div className="kpi-row">
        {tiles.map(([label, value, hint, tone]) => (
          <div className={`kc ${tone}`} key={label}>
            <div className="kc-lbl">{label}</div>
            <div className="kc-val">{value}</div>
            <div className="kc-sub">{hint}</div>
          </div>
        ))}
      </div>

      <div className="filter-bar">
        {tabs.map(([key, label, count]) => (
          <FTag key={key} active={tab === key} onClick={() => setTab(key)}>
            {label} ({count})
          </FTag>
        ))}
      </div>

      {tab === 'performance' ? (
        <>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>{SPI_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {spis.map((spi) => (
                  <tr key={spi.code}>
                    <td><span className="flight-cell__no">{spi.code}</span></td>
                    <td>
                      {spi.name}
                      {spi.unit ? <div className="tail-cell__type">{spi.unit}</div> : null}
                    </td>
                    <td className="tail-cell__type">{spi.domain}</td>
                    {/* Null n'est pas zero : « pas mesurable » et « aucun
                        evenement » ne veulent pas dire la meme chose. */}
                    <td className="cell--time">
                      {spi.value == null ? (
                        <span className="sms-none" title="No exposure figure to measure against">
                          not measured
                        </span>
                      ) : (
                        <b className={spi.breachesAlert ? 'is-bad'
                          : spi.meetsTarget ? 'is-good' : undefined}>
                          {Number(spi.value)}
                        </b>
                      )}
                    </td>
                    <td className="cell--time">
                      {spi.direction === 'LOWER' ? '≤' : '≥'} {Number(spi.target)}
                    </td>
                    <td className="cell--time">
                      {spi.alert == null ? EMPTY
                        : `${spi.direction === 'LOWER' ? '>' : '<'} ${Number(spi.alert)}`}
                    </td>
                    <td>
                      {spi.value == null ? <Badge tone="NEUTRAL">Not measured</Badge>
                        : spi.breachesAlert ? <Badge tone="ATTENTION" warn>At alert</Badge>
                          : spi.meetsTarget ? <Badge tone="READY">On target</Badge>
                            : <Badge tone="PENDING">Below target</Badge>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mtx-note">
            Each indicator is recomputed from live data every time this page opens: the occurrence
            register for reporting rates, the corrective action list for overdue items, and the
            cross-module scan for crew currency, MEL exceedances and fleet airworthiness. Targets
            and alert levels are set in Settings. An indicator that breaches its alert level should
            be tabled at the next Safety Review Board.
          </p>
        </>
      ) : null}

      {tab === 'audits' ? (
        <div className="card">
          <table className="tbl">
            <thead>
              <tr>{AUDIT_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {audits.map((audit) => (
                <tr key={audit.id}>
                  <td><span className="flight-cell__no">{audit.reference}</span></td>
                  <td>{audit.name}</td>
                  <td className="tail-cell__type">{audit.standard}</td>
                  <td className="tail-cell__type">{audit.scope ?? EMPTY}</td>
                  <td>{audit.auditor ?? EMPTY}{audit.externalAudit ? ' (external)' : ''}</td>
                  <td className="cell--time">{dayMonthYear(audit.plannedOn)}</td>
                  <td className="cell--time">
                    {audit.conductedOn ? dayMonthYear(audit.conductedOn) : EMPTY}
                  </td>
                  <td className="cell--time">
                    {audit.scorePercent == null ? EMPTY : `${audit.scorePercent}%`}
                  </td>
                  <td className="cell--time">{audit.findings}</td>
                  <td className="cell--time">
                    {audit.openFindings === 0 ? EMPTY : (
                      <Badge tone="PENDING">{audit.openFindings}</Badge>
                    )}
                  </td>
                  <td>
                    <Badge tone={TONE[audit.status] ?? 'NEUTRAL'}>
                      {audit.status.replace('_', ' ').toLowerCase()}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {tab === 'actions' ? (
        <>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>{ACTION_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {(actions ?? []).map((action) => (
                  <tr key={action.id}>
                    <td><span className="flight-cell__no">{action.reference}</span></td>
                    <td>{action.title}</td>
                    <td className="tail-cell__type">{action.source ?? EMPTY}</td>
                    <td>{action.ownerName ?? EMPTY}</td>
                    <td className="cell--time">
                      {action.dueOn ? dayMonthYear(action.dueOn) : EMPTY}
                    </td>
                    <td>
                      {/* Un retard se compte, il ne se declare pas : le nombre
                          de jours vient de la date d echeance et d aujourd hui. */}
                      {action.overdue
                        ? <Badge tone="ATTENTION" warn>{action.daysLate} d late</Badge>
                        : <Badge tone={action.status === "CLOSED" ? "READY" : "PENDING"}>
                            {String(action.status ?? "").replace("_", " ").toLowerCase() || "open"}
                          </Badge>}
                    </td>
                  </tr>
                ))}
                {(actions ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={ACTION_COLUMNS.length}>
                      <div className="sms-empty">No corrective action outstanding — Actions are raised from occurrences, investigations and audit findings.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mtx-note">
            An action carries the record it came from. Closing it does not close the occurrence or
            the finding behind it — those are closed on their own evidence.
          </p>
        </>
      ) : null}

      {tab === 'changes' ? (
        <>
          <div className="card">
            <table className="tbl">
              <thead>
                <tr>{CHANGE_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
              </thead>
              <tbody>
                {(changes ?? []).map((change) => (
                  <tr key={change.id}>
                    <td><span className="flight-cell__no">{change.reference}</span></td>
                    <td>
                      {change.title}
                      {change.mitigation
                        ? <div className="tail-cell__type">{change.mitigation}</div> : null}
                    </td>
                    <td className="tail-cell__type">{change.domain ?? EMPTY}</td>
                    <td>{change.ownerName ?? EMPTY}</td>
                    <td className="cell--time">{dayMonthYear(change.raisedOn)}</td>
                    <td className="cell--time">
                      {change.effectiveOn ? dayMonthYear(change.effectiveOn) : EMPTY}
                    </td>
                    <td className="cell--time">{change.initialIndex ?? EMPTY}</td>
                    <td className="cell--time"><b>{change.residualIndex ?? EMPTY}</b></td>
                    <td>
                      <Badge tone={change.active ? 'PENDING' : 'READY'}>
                        {change.active ? 'Active' : 'Closed'}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {(changes ?? []).length === 0 ? (
                  <tr>
                    <td colSpan={CHANGE_COLUMNS.length}>
                      <div className="sms-empty">No change under assessment — A change to the operation — a new type, a new base, a new procedure —
                          is assessed before it takes effect, per ICAO Annex 19.</div>
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <p className="mtx-note">
            Initial and residual are the ICAO Doc 9859 index for the change itself. A change whose
            residual equals its initial has been assessed but not yet mitigated.
          </p>
        </>
      ) : null}
    </>
  )
}
