import { TriangleAlert } from 'lucide-react'

/**
 * Le bandeau « SMS PROACTIVE RISK OVERVIEW » et les quatre compteurs.
 *
 * Les quatre chiffres sont ceux du serveur (`riskLow` … `riskCritical`),
 * comptes par SmsRiskRule sur les memes faits que le Dispatch et la Timeline
 * lisent. Le navigateur ne re-evalue rien : il affiche.
 *
 * Le bandeau ne montre que ce qui merite une action — MEDIUM et au-dessus.
 * Une liste qui remonterait aussi les vols LOW ne serait plus une alerte,
 * seulement un inventaire.
 */

const ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

export default function RiskPanel({ board, flights, onSelect }) {
  const notable = flights
    .filter((flight) => flight.risk && flight.risk.level !== 'LOW')
    .sort((a, b) => (ORDER[a.risk.level] ?? 9) - (ORDER[b.risk.level] ?? 9))

  const counters = [
    ['LOW', board.riskLow, 'low'],
    ['MEDIUM', board.riskMedium, 'medium'],
    ['HIGH', board.riskHigh, 'high'],
    ['CRITICAL', board.riskCritical, 'critical'],
  ]

  return (
    <div className="fwr">
      <div className="fwr__title">SMS proactive risk overview</div>

      <div className="fwr__box">
        {notable.length === 0 ? (
          <div className="fwr__none">
            No flight above the low band. {board.withoutSource} of{' '}
            {board.riskLow + board.riskMedium + board.riskHigh + board.riskCritical} legs
            have no position source.
          </div>
        ) : (
          notable.slice(0, 4).map((flight) => {
            const driver = flight.risk.factors
              .filter((factor) => factor.level !== 'NONE' && factor.level !== 'UNKNOWN')
              .map((factor) => factor.detail)
              .join(' · ')
            return (
              <button
                type="button"
                key={flight.legId}
                className={`fwr__line fwr__line--${flight.risk.level.toLowerCase()}`}
                onClick={() => onSelect?.(flight.legId)}
              >
                <TriangleAlert size={11} />
                <span>
                  <b>{flight.flightNo}</b> ({flight.depIcao}→{flight.arrIcao}) —{' '}
                  {flight.risk.level} RISK · {driver || 'no active factor'}
                </span>
              </button>
            )
          })
        )}
      </div>

      <div className="fwr__counters">
        {counters.map(([label, value, tone]) => (
          <div className={`fwr__count fwr__count--${tone}`} key={label}>
            <b>{value}</b>
            <span>{label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
