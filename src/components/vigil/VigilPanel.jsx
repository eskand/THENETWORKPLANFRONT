import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useAskVigil, useSetVigilAlertStatus, useVigilPanel } from '../../hooks/useVigil'
import VigilMark from '../VigilMark'
import { useVigil } from './VigilContext'
import VigilDashboard from './VigilDashboard'

/**
 * Le panneau VIGIL — {@code UI.ensure()} de l'annexe (prototype l. 99237).
 *
 * <b>Le DOM est le sien</b> : {@code #vigilPanel} fixe en haut a droite,
 * {@code .vp-head} avec la marque, le titre et le mot d'etat, quatre
 * {@code .vp-kpi}, la boite « Ask VIGIL », six raccourcis {@code .vp-quick .q},
 * la reponse en chasse fixe, puis « Active alerts (n) » et une carte
 * {@code .vgl-alert} par alerte avec ses quatre actions.
 *
 * <b>Ce qui change est ou vivent les alertes.</b> Chez elle, dans
 * {@code localStorage} : deux postes ne voyaient pas les memes, et un accuse
 * de reception disparaissait avec le cache. Ici elles sont en base, avec le
 * meme cycle de vie (OPEN, ACKNOWLEDGED, IN PROGRESS, RESOLVED, DISMISSED) et
 * la meme resolution automatique quand la condition n'est plus observee.
 *
 * <p>Le panneau se rend par un portail sur {@code document.body} — c'est la
 * ou {@code UI.ensure()} le posait — et il est monte une fois, a la racine
 * de l'application, ferme ou ouvert : la requete qui l'alimente est aussi
 * celle qui colore la pastille de l'en-tete.
 */
export default function VigilPanel() {
  const { panelOpen, closePanel, dashboardOpen, openDashboard } = useVigil()
  const panel = useVigilPanel()
  const setStatus = useSetVigilAlertStatus()
  const ask = useAskVigil()
  const [question, setQuestion] = useState('')
  const [answer, setAnswer] = useState(null)

  useEffect(() => {
    if (!panelOpen) return undefined
    function onKey(event) { if (event.key === 'Escape') closePanel() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [panelOpen, closePanel])

  function doAsk(text) {
    const q = (text ?? question).trim()
    if (!q) return
    setQuestion(q)
    setAnswer('VIGIL is analysing…')
    ask.mutate(q, {
      onSuccess: (reply) => setAnswer(reply.answer ?? '—'),
      onError: (failure) => setAnswer(`VIGIL: ${failure.message}`),
    })
  }

  const data = panel.data
  const counts = data?.counts ?? { critical: 0, high: 0, warning: 0, info: 0 }
  const state = data?.state ?? 'ACTIVE'
  const stateColor = state === 'CRITICAL' ? '#f85149' : state === 'WARNING' ? '#F0A500' : '#22c88a'
  const stateWord = state === 'CRITICAL' ? '● CRITICAL' : state === 'WARNING' ? '● WARNING' : '● ACTIVE'
  const alerts = [...(data?.alerts ?? [])].sort((a, b) => (SEV_RANK[b.severity] ?? 0) - (SEV_RANK[a.severity] ?? 0))

  return createPortal(
    <>
      {panelOpen ? (
        <div id="vigilPanel">
          <div className="vp-head">
            <VigilMark size={34} id="vgl-panel" />
            <div className="vp-grow">
              <div className="vp-title">
                <b>V</b>IGIL{' '}
                <span style={{ fontSize: 10, color: stateColor }}>{stateWord}</span>
              </div>
              <div className="vp-sub">Operational Intelligence — always watching, always ahead</div>
            </div>
            <button type="button" className="vgl-btn" onClick={openDashboard}>DASHBOARD</button>
            <button type="button" className="vgl-btn" title="Close" onClick={closePanel}>✕</button>
          </div>

          <div className="vp-kpis">
            <div className="vp-kpi"><div className="n" style={{ color: '#f85149' }}>{counts.critical}</div><div className="l">Critical</div></div>
            <div className="vp-kpi"><div className="n" style={{ color: '#F0A500' }}>{counts.high}</div><div className="l">High risk</div></div>
            <div className="vp-kpi"><div className="n" style={{ color: '#d9c04a' }}>{counts.warning}</div><div className="l">Warnings</div></div>
            <div className="vp-kpi"><div className="n" style={{ color: '#39c1ff' }}>{data?.monitored ?? 0}</div><div className="l">Monitored</div></div>
          </div>

          <div className="vp-ask">
            <input
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              onKeyDown={(event) => { if (event.key === 'Enter') doAsk() }}
              placeholder="Ask VIGIL… (e.g. « analyse TNP794 », « vols à risque ? », « analyse la flotte »)"
            />
            <button type="button" onClick={() => doAsk()}>ASK</button>
          </div>

          {/* Les six raccourcis de l'annexe, dans son ordre et avec ses questions. */}
          <div className="vp-quick">
            {QUICK.map(([label, q]) => (
              <span className="q" key={label} onClick={() => doAsk(q)}>{label}</span>
            ))}
          </div>

          {answer !== null ? <div className="vp-answer">{answer}</div> : null}

          <div className="vp-sec">Active alerts <span>({alerts.length})</span></div>
          {panel.isLoading ? <div className="vp-empty">VIGIL is scanning…</div> : null}
          {panel.isError ? <div className="vp-empty">VIGIL scan failed — {panel.error.message}</div> : null}
          {data && alerts.length === 0 ? (
            <div className="vp-empty">No active alert. VIGIL is watching.</div>
          ) : null}
          {alerts.slice(0, 30).map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              busy={setStatus.isPending}
              onStatus={(status) => setStatus.mutate({ alertId: alert.id, status })}
            />
          ))}
          <div style={{ height: 10 }} />
        </div>
      ) : null}

      {dashboardOpen ? <VigilDashboard data={data} /> : null}
    </>,
    document.body,
  )
}

/** {@code alertHtml()} de l'annexe (l. 99312) — la carte et ses quatre actions. */
function AlertCard({ alert, busy, onStatus }) {
  const sev = String(alert.severity).toLowerCase()
  return (
    <div className={`vgl-alert ${sev}`}>
      <div className="t">
        <span>{alert.name}{alert.flightNo ? ` — ${alert.flightNo}` : ''}</span>
        <span style={{ color: SEV_COLOR[sev] ?? '#39c1ff', fontSize: 9, letterSpacing: '.1em' }}>
          {String(alert.severity).toUpperCase()}
        </span>
      </div>
      <div className="w">{alert.why}</div>
      {alert.action ? <div className="a">→ {alert.action}</div> : null}
      <div className="meta">
        <span>{alert.signature}</span>
        <span>{alert.method}</span>
        {alert.risk != null ? <span>risk {alert.risk}/100</span> : null}
        <span>{alert.status}</span>
        <span>{hhmmZ(alert.createdAt)}</span>
      </div>
      <div className="acts" aria-busy={busy}>
        {alert.status === 'OPEN' ? <span onClick={() => onStatus('ACKNOWLEDGED')}>Acknowledge</span> : null}
        {alert.status !== 'IN PROGRESS' ? <span onClick={() => onStatus('IN_PROGRESS')}>In progress</span> : null}
        <span onClick={() => onStatus('RESOLVED')}>Resolve</span>
        <span onClick={() => onStatus('DISMISSED')}>Dismiss</span>
      </div>
    </div>
  )
}

const SEV_RANK = { CRITICAL: 4, HIGH: 3, WARNING: 2, INFO: 1 }
const SEV_COLOR = { critical: '#f85149', high: '#F0A500', warning: '#d9c04a', info: '#39c1ff' }

/* Les six raccourcis, libelle et question, tels que l'annexe les pose (l. 99242). */
const QUICK = [
  ['Current Situation', 'Analyse la situation actuelle'],
  ['Flights at Risk', 'Quels sont les vols à risque ?'],
  ['Fleet Optimization', "Trouve les possibilités d'optimisation de la flotte"],
  ['Handover Check', 'Compare le dernier shift handover avec la situation actuelle'],
  ['Latest Report', 'Montre le dernier rapport'],
  ['Next 12h', 'Quels sont les risques pour les prochaines 12 heures ?'],
]

function hhmmZ(iso) {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}Z`
}
