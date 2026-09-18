import { useEffect } from 'react'
import VigilMark from '../VigilMark'
import { useVigil } from './VigilContext'

/**
 * Le tableau de bord VIGIL — {@code renderDash()} de l'annexe (l. 99333).
 *
 * <b>Les cartes que nos donnees portent sont la, dans son ordre</b> : le
 * risque operationnel global, les vols a risque avec leur barre et leurs
 * contributeurs, la flotte (utilisation par type, AOG, maintenance, au sol,
 * capacite sur 18 h), l'interface agent.
 *
 * <b>Les cartes qui manquent sont NOMMEES, pas simulees.</b> « Predicted
 * delays (ML) », « Shift handover check », « Fleet optimization » et « Last
 * VIGIL report » lisaient chez elle un modele entraine sur ses propres
 * donnees de demonstration, une note tenue dans le navigateur, des positions
 * d'appareils calculees en memoire et un rapport toutes les six heures.
 * Aucune de ces sources n'existe en base : chaque carte le dit en une ligne,
 * a l'emplacement ou l'annexe la met. Une carte « 0 predicted delays » se
 * lirait comme « pas de retard prevu » — ce n'est pas ce qu'on sait.
 */
export default function VigilDashboard({ data }) {
  const { closeDashboard } = useVigil()

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') closeDashboard() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [closeDashboard])

  const counts = data?.counts ?? { critical: 0, high: 0, warning: 0, info: 0 }
  const load = counts.critical * 3 + counts.high * 2 + counts.warning
  const overall = counts.critical ? 'CRITICAL' : counts.high ? 'HIGH' : counts.warning ? 'MODERATE' : 'LOW'
  const overallColor = { CRITICAL: '#f85149', HIGH: '#F0A500', MODERATE: '#d9c04a', LOW: '#22c88a' }[overall]
  const flights = data?.flights ?? []
  const atRisk = flights.filter((f) => f.riskScore >= 25).sort((a, b) => b.riskScore - a.riskScore)
  const fleet = data?.fleet

  return (
    <div id="vigilDash" onClick={(event) => { if (event.target === event.currentTarget) closeDashboard() }}>
      <div className="vd-box">
        <div className="vd-head">
          <VigilMark size={38} id="vgl-dash" />
          <div className="vp-grow">
            <div className="vp-title" style={{ fontSize: 16 }}><b>V</b>IGIL — OPERATIONAL INTELLIGENCE</div>
            <div className="vp-sub">Rules · risk · fleet intelligence — NetPlus AOC</div>
          </div>
          <button type="button" className="vgl-btn" onClick={closeDashboard}>✕ CLOSE</button>
        </div>

        <div className="vd-body">
          <div className="vd-grid">
            <div className="vd-card">
              <h4>Overall operational risk</h4>
              <div className="vd-risk" style={{ color: overallColor }}>{overall}</div>
              <div className="vd-row"><span>Active alerts</span><span>{counts.critical + counts.high + counts.warning + counts.info}</span></div>
              <div className="vd-row"><span>Flights monitored</span><span>{flights.length}</span></div>
              <div className="vd-row"><span>Last scan</span><span>{data?.scannedAt ? `${new Date(data.scannedAt).toISOString().slice(11, 19)}Z` : '—'}</span></div>
              <div className="vd-row"><span>Risk load index</span><span>{load}</span></div>
            </div>

            <div className="vd-card">
              <h4>Flights at risk</h4>
              {atRisk.length === 0 ? <div className="vd-row"><span className="vd-none">none</span></div> : null}
              {atRisk.slice(0, 7).map((f) => (
                <div key={f.legId}>
                  <div className="vd-row">
                    <span>{f.flightNo} <span className="vd-none">{f.registration}</span></span>
                    <span style={{ color: { CRITICAL: '#f85149', HIGH: '#F0A500', MODERATE: '#d9c04a' }[f.riskLevel] ?? '#22c88a' }}>
                      {f.riskScore} · {f.riskLevel}
                    </span>
                  </div>
                  <div className="vgl-bar"><i style={{ width: `${f.riskScore}%` }} /></div>
                  <div className="vd-sub">{f.contributors.map((c) => `${c.category} ${c.share}%`).join(' · ')}</div>
                </div>
              ))}
            </div>

            <div className="vd-card">
              <h4>Predicted delays (ML)</h4>
              <div className="vd-row"><span className="vd-none">No delay model is trained server-side — the annexe trained on its own demo history. No probability is claimed.</span></div>
            </div>

            <div className="vd-card">
              <h4>Shift handover check</h4>
              <div className="vd-row"><span className="vd-none">No handover note on file</span></div>
            </div>

            <div className="vd-card">
              <h4>Fleet intelligence</h4>
              {(fleet?.utilisation ?? []).map((u) => (
                <div key={u.fleet}>
                  <div className="vd-row"><span>{u.fleet}</span><span>{u.blockHours}h · {u.percentOfCapacity}%</span></div>
                  <div className="vgl-bar"><i style={{ width: `${Math.min(100, u.percentOfCapacity)}%` }} /></div>
                </div>
              ))}
              <div className="vd-row"><span>AOG</span><span style={{ color: fleet?.aog?.length ? '#f85149' : '#22c88a' }}>{fleet?.aog?.length ? fleet.aog.join(', ') : 'none'}</span></div>
              <div className="vd-row"><span>Maintenance</span><span>{fleet?.maintenance?.length ? fleet.maintenance.join(', ') : 'none'}</span></div>
              <div className="vd-row"><span>Idle today</span><span>{fleet?.idle?.length ? fleet.idle.join(', ') : 'none'}</span></div>
              {fleet ? (
                <div className="vd-row">
                  <span>Capacity next {fleet.horizonHours}h</span>
                  <span style={{ color: { HIGH: '#f85149', MODERATE: '#F0A500', LOW: '#22c88a' }[fleet.capacityLevel] }}>
                    {fleet.capacityLevel} ({fleet.demandSectors} sect / {fleet.availableTails} tails)
                  </span>
                </div>
              ) : null}
            </div>

            <div className="vd-card">
              <h4>Fleet optimization</h4>
              <div className="vd-row"><span className="vd-none">Tail positions through the day are not computed server-side yet — no opportunity is claimed.</span></div>
            </div>

            <div className="vd-card">
              <h4>Last VIGIL report</h4>
              <div className="vd-row"><span className="vd-none">No report yet — the 6-hourly report engine is not ported.</span></div>
            </div>

            <div className="vd-card">
              <h4>AI agent interface</h4>
              <div className="vd-row"><span>Local intelligence</span><span style={{ color: '#22c88a' }}>ACTIVE</span></div>
              <div className="vd-row"><span>Claude API</span><span className="vd-none">NOT CONFIGURED (optional)</span></div>
              <div className="vd-sub">
                VIGIL answers from the server-side scan only. It never changes an aircraft, a route, a crew or a
                release — every recommendation requires an OCC decision.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
