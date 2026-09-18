/**
 * « SMS PROACTIVE RISK OVERVIEW » — le haut du tiroir gauche.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING index.html l. 52-61 (DOM), js/06
 * updateDashboard l. 557-566 (compteurs) et updateAlertBanner l. 584-630
 * (pile d'alertes : une ligne .fw-al par vol MEDIUM ou plus — huit au plus,
 * par indice décroissant, facteur dominant et consigne FW_MITIG — qui
 * sélectionne son vol au clic).
 *
 * Les quatre chiffres sont ceux du serveur (`riskLow` … `riskCritical`),
 * comptés par SmsRiskRule sur les mêmes faits que le Dispatch et la Timeline
 * lisent. Le navigateur ne ré-évalue rien : il affiche.
 */

/** La consigne par facteur dominant — js/06 FW_MITIG l. 568-574. */
const FW_MITIG = {
  WEATHER: 'select an alternate above minima, delay or reroute',
  NOTAM: 'confirm alternate, brief crew on the restriction',
  FTL: 'check FDP/rest, plan augmented crew or delay departure',
  MEL: 'apply MEL (O)/(M) procedure, revalidate performance',
  CREW: 'assign qualified/rested crew, CAT C briefing',
}

/** Le libellé de chaque facteur — RISK_FACTOR_DEFS js/06 l. 156-186. */
const FACTOR_LABEL = {
  WEATHER: 'Weather vs. minima',
  NOTAM: 'NOTAM impact',
  FTL: 'Flight Time Limitation (FTL)',
  MEL: 'Aircraft performance / MEL',
  CREW: 'Crew risk',
}

const SEVERITY = { MINOR: 2, MODERATE: 3, MAJOR: 4, SEVERE: 5 }

/** Le facteur actif le plus sévère, le premier en cas d'égalité — fwTopFactor js/06 l. 575-583. */
export function topFactor(risk) {
  let best = null
  let bestSev = 0
  ;(risk?.factors ?? []).forEach((factor) => {
    const sev = SEVERITY[factor.level] ?? 0
    if (sev > bestSev) {
      bestSev = sev
      best = factor
    }
  })
  return best
}

/** Une ligne de la pile — fwAlertList js/06 l. 1478-1487. */
function alertText(flight) {
  const factor = topFactor(flight.risk)
  const cause = factor ? ` · ${FACTOR_LABEL[factor.factor] ?? factor.factor}: ${factor.detail}` : ''
  const mitigation = factor ? ` — Mitigation: ${FW_MITIG[factor.factor] || flight.risk.action}` : ''
  return `(${flight.depIcao}→${flight.arrIcao}) — ${flight.risk.level} RISK${cause}${mitigation}`
}

const COUNTERS = [
  ['cnt-low', 'Low', '#27AE60', (board) => board?.riskLow],
  ['cnt-medium', 'Medium', '#E0C22A', (board) => board?.riskMedium],
  ['cnt-high', 'High', '#E67E22', (board) => board?.riskHigh],
  ['cnt-critical', 'Critical', '#C0392B', (board) => board?.riskCritical],
]

/* Style en ligne du bandeau tel que la référence le porte (index.html l. 54),
   complété à l'ouverture comme updateAlertBanner l. 614-615. */
const BANNER_STYLE = {
  background: 'rgba(192,57,43,.12)',
  border: '1px solid rgba(192,57,43,.4)',
  borderRadius: 6,
  padding: '8px 10px',
  marginBottom: 8,
  fontSize: 11,
  color: '#ff9d90',
}

export default function RiskPanel({ board, flights, onSelect }) {
  const notable = (flights ?? [])
    .filter((flight) => ['MEDIUM', 'HIGH', 'CRITICAL'].includes(flight.risk?.level))
    .sort((a, b) => b.risk.index - a.risk.index)
    .slice(0, 8)

  return (
    <div id="sms-dashboard">
      <div className="dash-title">SMS PROACTIVE RISK OVERVIEW</div>
      <div
        id="fwAlertBanner"
        style={
          notable.length
            ? { ...BANNER_STYLE, display: 'block', whiteSpace: 'normal', lineHeight: 1.5 }
            : { ...BANNER_STYLE, display: 'none' }
        }
      >
        {notable.map((flight) => {
          return (
            <div
              className="fw-al"
              key={flight.legId}
              data-fwsel={flight.legId}
              title="Open this flight and centre the map on it"
              onClick={() => onSelect?.(flight.legId)}
            >
              <span className="fw-al-txt">
                ⚠ <b>{flight.flightNo}</b> — {alertText(flight)}
              </span>
            </div>
          )
        })}
      </div>
      <div className="dash-grid">
        {COUNTERS.map(([id, label, colour, read]) => (
          <div className="dash-cell" style={{ borderColor: colour }} key={id}>
            <div className="n" id={id} style={{ color: colour }}>
              {read(board) ?? 0}
            </div>
            <div className="l">{label}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
