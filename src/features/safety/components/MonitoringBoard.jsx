import Badge from '../../../components/Badge'

const SEVERITY_TONE = { critical: 'ATTENTION', high: 'PENDING', medium: 'INFO', low: 'NEUTRAL' }
const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

const COLUMNS = ['Severity', 'Domain', 'Subject', 'Finding']

/**
 * Le balayage de sécurité.
 *
 * <b>Rien ici n'est stocké.</b> Chaque constat est produit au moment où on le
 * demande, en interrogeant les modules : documents et qualifications de
 * l'équipage, certificats d'examen de navigabilité, tâches de maintenance
 * dépassées, reports MEL au-delà de leur intervalle, pièces à vie limitée en
 * fin de vie. Un constat stocké continuerait d'affirmer une licence périmée
 * renouvelée hier.
 */
export default function MonitoringBoard({ monitoring, scanning, onScan }) {
  const findings = [...monitoring.findings].sort((a, b) =>
    (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
    || a.domain.localeCompare(b.domain))

  const scannedAt = new Date(monitoring.scannedAt).toISOString().slice(11, 16)

  const tiles = [
    ['Findings', monitoring.total, 'across every domain', 'var(--info-fg)', false],
    ['Critical', monitoring.critical, 'prevents safe operation', 'var(--attention-fg)', monitoring.critical > 0],
    ['High', monitoring.high, 'acts within days', 'var(--pending-fg)', monitoring.high > 0],
    ['Medium', monitoring.medium, 'on the plan', 'var(--accent-teal)', false],
  ]

  return (
    <>
      <div className="page__head">
        <div>
          <h1>Live monitoring</h1>
          <p>
            Read across crew, airworthiness and deferred defects when the scan runs. Nothing on
            this page is stored — it is true at {scannedAt} UTC and at no other moment.
          </p>
        </div>
        <button type="button" className="toolbar__button" disabled={scanning} onClick={onScan}>
          {scanning ? 'Scanning…' : 'Run safety scan'}
        </button>
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

      <div className="sms-card" style={{ marginTop: 14 }}>
        <div className="sms-card__head">
          <h3 className="sms-card__title">By domain</h3>
        </div>
        {monitoring.byDomain.map((domain) => (
          <div className="sms-domain" key={domain.domain}>
            <div className="sms-domain__name">{domain.label}</div>
            <div className="sms-domain__bar">
              {[['critical', domain.critical], ['high', domain.high],
                ['medium', domain.medium], ['low', domain.low]].map(([kind, count]) => (
                  count > 0 ? (
                    <div key={kind} className={`sms-domain__seg sms-domain__seg--${kind}`}
                         style={{ width: `${(count / domain.total) * 100}%` }}
                         title={`${count} ${kind}`} />
                  ) : null
                ))}
            </div>
            <div className="sms-domain__count">{domain.total}</div>
          </div>
        ))}
      </div>

      <div className="board" style={{ marginTop: 14 }}>
        <table>
          <thead><tr>{COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr></thead>
          <tbody>
            {findings.map((finding) => (
              <tr key={finding.id}>
                <td>
                  <Badge tone={SEVERITY_TONE[finding.severity] ?? 'NEUTRAL'}
                         warn={finding.severity === 'critical'}>
                    {finding.severity}
                  </Badge>
                </td>
                <td className="tail-cell__type">{finding.domain}</td>
                <td><span className="flight-cell__no">{finding.subject}</span></td>
                <td>{finding.detail}</td>
              </tr>
            ))}
            {findings.length === 0 ? (
              <tr>
                <td colSpan={COLUMNS.length}>
                  <div className="state">
                    <h3>The scan found nothing outstanding</h3>
                    <p>No crew document, certificate, maintenance limit or deferral is out.</p>
                  </div>
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  )
}
