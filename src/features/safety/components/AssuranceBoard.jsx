import Badge from '../../../components/Badge'
import { EMPTY, dayMonthYear } from '../../../lib/format'

const TONE = { CLOSED: 'READY', IN_PROGRESS: 'PENDING', PLANNED: 'INFO', CANCELLED: 'NEUTRAL' }

const COLUMNS = ['Reference', 'Audit', 'Standard', 'Scope', 'Auditor', 'Planned', 'Conducted',
  'Conformity', 'Findings', 'Open', 'Status']

/**
 * Assurance — le programme d'audit.
 *
 * <b>Le score reste vide tant que l'audit n'a pas eu lieu.</b> Le prototype y
 * met zéro, ce qui se lit « tout est non conforme » — le contraire de « on ne
 * sait pas encore ». Le tiret dit la vérité, et la moyenne de conformité ne
 * porte que sur les audits réellement conduits.
 */
export default function AssuranceBoard({ audits }) {
  const open = audits.reduce((total, audit) => total + audit.openFindings, 0)
  const planned = audits.filter((audit) => audit.status === 'PLANNED').length
  const conducted = audits.filter((audit) => audit.scorePercent != null)
  const meanScore = conducted.length === 0
    ? null
    : Math.round(conducted.reduce((sum, audit) => sum + audit.scorePercent, 0) / conducted.length)

  const tiles = [
    ['Audits', audits.length, `${planned} planned`, 'var(--info-fg)', false],
    ['Open findings', open, 'awaiting closure', 'var(--pending-fg)', open > 0],
    ['Mean conformity', meanScore == null ? EMPTY : `${meanScore}%`,
      `${conducted.length} conducted`, 'var(--ready-fg)', false],
  ]

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Safety assurance</h1>
          <p>ICAO Annex 19 component 3 — the audit programme and what it found</p>
        </div>
      </div>

      <div className="kpi-strip">
        {tiles.map(([label, value, hint, accent, alert]) => (
          <div className="kpi" key={label}
               style={{ '--kpi-accent': accent, '--kpi-value': alert ? accent : undefined }}>
            <span className="kpi__corners" />
            <div className="eyebrow">{label}</div>
            <div className="kpi__value">{value}</div>
            <div className="kpi__hint">{hint}</div>
          </div>
        ))}
      </div>

      <div className="board" style={{ marginTop: 14 }}>
        <table>
          <thead><tr>{COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead>
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
    </>
  )
}
