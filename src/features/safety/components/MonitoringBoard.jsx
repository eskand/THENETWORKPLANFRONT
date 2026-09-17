import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { AlertCircle, AlertTriangle, Activity, Check, RefreshCw } from 'lucide-react'
import { Empty, FTag, KpiCard, RiskBadge, SevDot, SEV_COLOUR } from './SafeOps'
import { useFollowingBoard } from '../../../hooks/useOperations'
import { EMPTY } from '../../../lib/format'

const SEVERITY_ORDER = { critical: 0, high: 1, medium: 2, low: 3 }

/** The nine modules the annexe watches, in its order, with where each opens. */
const MODULES = [
  ['CAMO', 'CAMO / Airworthiness', 'ARC validity, ADs, AOG', '/camo'],
  ['TECHLOG', 'Tech Log / MEL', 'Deferred defects, intervals, repeats', '/tech-log'],
  ['CREW', 'Crew', 'Licences, medicals, fitness', '/crew-management'],
  ['TRAINING', 'Training', 'Recurrent items, OPC/LPC currency', '/training'],
  ['OPS', 'Flight Operations', 'Flight risk index per sector', '/flight-timeline'],
  ['OCC', 'OCC / Dispatch', 'Delays, disruption, planning errors', '/dispatch'],
  ['FLTWATCH', 'Flight Watch', 'Live tracking and in-flight risk', '/flight-following'],
  ['AIRPORTS', 'Aerodromes', 'Categorisation and field notes', '/airports'],
  ['GROUND', 'Ground Operations', 'Handling, fuelling, permits', '/netplus-services'],
]

/**
 * Operational Monitoring.
 *
 * <b>Nothing on this page is stored.</b> Every finding is produced when the
 * scan runs, by asking the module that owns the answer: crew documents and
 * qualifications, airworthiness review certificates, maintenance tasks past a
 * limit, MEL deferrals beyond their interval, life-limited parts near the end.
 * A stored finding would keep asserting an expired licence renewed yesterday.
 *
 * <b>Every module is listed, including the quiet ones.</b> A tile that reports
 * <em>clear</em> is telling you it looked — which is not the same as a module
 * missing from the list because nobody wired it up, and an auditor is looking
 * for exactly that difference.
 */
export default function MonitoringBoard({ monitoring, scanning, onScan }) {
  const navigate = useNavigate()
  const [filter, setFilter] = useState('all')
  /* Le meme moteur que le registre des risques et Flight Watch — c'est ce que
     dit la legende de l'annexe, et la seule facon que les trois ecrans
     annoncent le meme indice pour le meme secteur. */
  const board = useFollowingBoard()

  const byDomain = useMemo(() => {
    const map = new Map()
    monitoring.byDomain.forEach((domain) => map.set(domain.domain, domain))
    return map
  }, [monitoring.byDomain])

  const findings = useMemo(() => [...monitoring.findings]
    .sort((a, b) => (SEVERITY_ORDER[a.severity] ?? 9) - (SEVERITY_ORDER[b.severity] ?? 9)
      || a.domain.localeCompare(b.domain))
    .filter((finding) => filter === 'all' || finding.severity === filter),
  [monitoring.findings, filter])

  const scannedAt = monitoring.scannedAt
    ? `last scan ${new Date(monitoring.scannedAt).toISOString().slice(11, 19)} UTC · ${
      monitoring.total} findings`
    : 'not yet scanned'

  const counts = {
    all: monitoring.total,
    critical: monitoring.critical,
    high: monitoring.high,
    medium: monitoring.medium,
    low: monitoring.low,
  }

  return (
    <>
      <div className="page-hdr">
        <div>
          <div className="page-title">Operational Monitoring</div>
          <div className="page-sub">
            Continuous surveillance of every operational module — hazards surfaced before they
            are reported
          </div>
        </div>
        <div className="btn-row">
          <span className="sms-scanmeta">{scannedAt}</span>
          <button className="btn-p" disabled={scanning} onClick={onScan}>
            <RefreshCw size={12} strokeWidth={2.2} /> {scanning ? 'Scanning…' : 'Rescan now'}
          </button>
        </div>
      </div>

      <div className="kpi-row" style={{ gridTemplateColumns: 'repeat(4,1fr)' }}>
        <KpiCard tone="c2" ico="ic-r" icon={AlertCircle} label="Critical"
                 value={monitoring.critical} sub="operation must not continue" />
        <KpiCard tone="c5" ico="ic-o" icon={AlertTriangle} label="High"
                 value={monitoring.high} sub="mitigation required" />
        <KpiCard tone="c3" ico="ic-s" icon={Activity} label="Medium"
                 value={monitoring.medium} sub="monitor the trend" />
        <KpiCard tone="c4" ico="ic-g" icon={Check} label="Low"
                 value={monitoring.low} sub="routine monitoring" />
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-hdr">
          <div className="card-title">Module surveillance status</div>
          <div style={{ fontSize: 9, color: 'var(--muted)' }}>Click a module to open it</div>
        </div>
        <div className="mon-grid">
          {MODULES.map(([key, name, scope, route]) => {
            const domain = byDomain.get(key)
            const total = domain?.total ?? 0
            const state = !domain || total === 0 ? 'low'
              : domain.critical ? 'critical' : domain.high ? 'high' : 'medium'
            const colour = total === 0 ? '#27AE60' : SEV_COLOUR[state]
            return (
              <div className="montile" key={key} style={{ borderLeftColor: colour }}
                   onClick={() => navigate(route)} role="button" tabIndex={0}
                   onKeyDown={(event) => { if (event.key === 'Enter') navigate(route) }}>
                <div className="montile-h">
                  <span className="montile-n">{name}</span>
                  <span className="montile-b"
                        style={{ background: `${colour}1a`, color: colour }}>
                    {total || 'clear'}
                  </span>
                </div>
                <div className="montile-m">{scope}</div>
                {total ? (
                  <div className="montile-s">
                    {domain.critical ? `${domain.critical} critical · ` : ''}
                    {domain.high ? `${domain.high} high` : 'monitored'}
                  </div>
                ) : (
                  <div className="montile-s ok">No condition detected</div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="filter-bar">
        {['all', 'critical', 'high', 'medium', 'low'].map((key) => (
          <FTag key={key} active={filter === key} onClick={() => setFilter(key)}>
            {key.charAt(0).toUpperCase() + key.slice(1)} ({counts[key] ?? 0})
          </FTag>
        ))}
      </div>

      <div className="card">
        {findings.length === 0 ? <Empty>No findings at this severity.</Empty> : null}
        {findings.map((finding) => (
          <div className="find-row" key={finding.id}>
            <div className="find-sev"><SevDot sev={finding.severity} /></div>
            <div className="find-main">
              <div className="find-t">
                {finding.subject} <span className="find-dom">{finding.domain}</span>
              </div>
              <div className="find-d">{finding.detail}</div>
              {/* L'action requise est en italique sous le constat : une page qui
                  ne nomme que des problemes laisse le lecteur inventer le
                  remede. */}
              {finding.requiredAction ? (
                <div className="find-a">Required action — {finding.requiredAction}</div>
              ) : null}
            </div>
            <div className="find-act">
              {finding.route ? (
                <button className="btn-nav" onClick={() => navigate(finding.route)}>
                  Open module
                </button>
              ) : null}
              {/* Un constat de surveillance n'est pas une occurrence : c'est une
                  condition trouvee avant que quiconque la declare. Le bouton
                  ouvre la declaration, il ne la depose pas a la place du
                  declarant. */}
              <button className="btn-p" onClick={() => navigate('/safety-reports')}>
                Raise occurrence
              </button>
            </div>
          </div>
        ))}
      </div>

      <FlightRisk flights={board.data?.flights ?? []} loading={board.isLoading} />
    </>
  )
}

/**
 * L'evaluation du risque des secteurs du jour.
 *
 * <b>Le meme moteur que Flight Watch, pas une deuxieme lecture.</b> L'indice
 * vient de {@code SmsRiskRule}, qui note les memes faits pour les trois ecrans
 * qui l'affichent. Une note recalculee ici donnerait au Safety Manager un
 * chiffre que le dispatcher ne verrait pas, et c'est exactement le desaccord
 * qu'un SMS ne doit pas produire.
 */
function FlightRisk({ flights, loading }) {
  const rows = [...flights]
    .filter((flight) => flight.risk)
    .sort((a, b) => (b.risk?.index ?? 0) - (a.risk?.index ?? 0))
    .slice(0, 25)

  return (
    <div className="card" style={{ marginTop: 14 }}>
      <div className="card-hdr">
        <div className="card-title">Flight risk assessment — today&rsquo;s sectors</div>
        <div style={{ fontSize: 9, color: 'var(--muted)' }}>
          Same engine as the Risk Register and Flight Watch
        </div>
      </div>

      {loading ? (
        <Empty>Reading the operating picture…</Empty>
      ) : rows.length === 0 ? (
        <Empty>No sectors currently scheduled.</Empty>
      ) : (
        <table className="tbl">
          <thead>
            <tr>
              <th>Flight</th><th>Tail</th><th>Sector</th><th>Severity</th>
              <th>Likelihood</th><th>Index</th><th>Principal factors</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((flight) => (
              <tr key={flight.legId}>
                <td style={{ fontWeight: 600, color: 'var(--navy)' }}>
                  {flight.flightNo ?? EMPTY}
                </td>
                <td style={{ fontSize: 10, color: 'var(--muted)' }}>{flight.registration}</td>
                <td style={{ fontSize: 10 }}>{flight.depIcao}–{flight.arrIcao}</td>
                <td>{flight.risk.severity}</td>
                <td style={{ fontSize: 10, color: 'var(--muted)' }}>{flight.risk.likelihood}</td>
                <td><RiskBadge index={flight.risk.index} /></td>
                <td style={{ fontSize: 10, color: 'var(--muted)' }}>
                  {(flight.risk.factors ?? []).slice(0, 2)
                    .map((factor) => factor.label ?? factor.name).filter(Boolean)
                    .join(' · ') || 'none active'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Un facteur inconnu n'est pas un facteur nul : le dire evite qu'un
          indice bas se lise comme une absence de risque. */}
      {rows.some((flight) => (flight.risk.unknown ?? []).length > 0) ? (
        <div className="mtx-note">
          Some sectors carry factors that could not be evaluated. They are counted as unknown,
          never as zero — an index computed on partial inputs is an indication, not a clearance.
        </div>
      ) : null}
    </div>
  )
}
