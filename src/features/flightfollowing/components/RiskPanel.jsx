/**
 * « SMS PROACTIVE RISK OVERVIEW » — le haut du tiroir gauche.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING index.html l. 52-61 (DOM), js/06
 * updateDashboard l. 557-566 (compteurs) et updateAlertBanner l. 584-630
 * (pile d'alertes : une ligne .fw-al par vol MEDIUM ou plus, qui sélectionne
 * son vol au clic).
 *
 * Les quatre chiffres sont ceux du serveur (`riskLow` … `riskCritical`),
 * comptés par SmsRiskRule sur les mêmes faits que le Dispatch et la Timeline
 * lisent. Le navigateur ne ré-évalue rien : il affiche.
 */

const ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

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
    .filter((flight) => flight.risk && flight.risk.level !== 'LOW')
    .sort((a, b) => (ORDER[a.risk.level] ?? 9) - (ORDER[b.risk.level] ?? 9))
    .slice(0, 4)

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
          const driver = flight.risk.factors
            .filter((factor) => factor.level !== 'NONE' && factor.level !== 'UNKNOWN')
            .map((factor) => factor.detail)
            .join(' · ')
          return (
            <div
              className="fw-al"
              key={flight.legId}
              data-fwsel={flight.legId}
              title="Open this flight and centre the map on it"
              onClick={() => onSelect?.(flight.legId)}
            >
              <span className="fw-al-txt">
                ⚠ <b>{flight.flightNo}</b> — ({flight.depIcao}→{flight.arrIcao}) — {flight.risk.level} RISK ·{' '}
                {driver || 'no active factor'}
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
