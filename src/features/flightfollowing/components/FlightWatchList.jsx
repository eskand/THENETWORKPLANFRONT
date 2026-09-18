/**
 * La liste des vols suivis — `#flightlist` et ses `.fcard`.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING js/06 renderList l. 1114-1160 : deux
 * tris (risque — le plus grave d'abord, puis l'indice — ou indicatif), une
 * carte par vol : indicatif, pastille « LEVEL · index » colorée par le niveau,
 * route, FL / vitesse sol / type / immatriculation, exploitant.
 *
 * Le tri est local — il ne change pas ce qui est affiché, seulement l'ordre.
 * « FL — » et « — KT » disent qu'aucune position n'a donné la valeur : la
 * référence affichait un niveau et une vitesse de croisière simulés (A-D14).
 */

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

/** Les couleurs de computeRisk (js/06 l. 225-228). */
export const RISK_COLOUR = {
  LOW: '#27AE60',
  MEDIUM: '#E0C22A',
  HIGH: '#E67E22',
  CRITICAL: '#C0392B',
}

export default function FlightWatchList({ flights, sort, selectedId, onSelect }) {
  const rows = [...flights].sort((a, b) => {
    if (sort === 'callsign') return a.flightNo.localeCompare(b.flightNo)
    const byRisk = (RISK_ORDER[a.risk?.level] ?? 9) - (RISK_ORDER[b.risk?.level] ?? 9)
    if (byRisk !== 0) return byRisk
    return (b.risk?.index ?? 0) - (a.risk?.index ?? 0)
  })

  return (
    <div id="flightlist">
      {rows.length === 0 ? <div className="fwl__empty">No leg on the board for this day.</div> : null}
      {rows.map((flight) => {
        const position = flight.lastPosition
        const level = flight.risk?.level ?? 'LOW'
        const colour = RISK_COLOUR[level] ?? RISK_COLOUR.LOW
        return (
          <div
            key={flight.legId}
            className={`fcard${flight.legId === selectedId ? ' selected' : ''}`}
            onClick={() => onSelect?.(flight.legId)}
          >
            <div className="fcard-top">
              <span className="fcard-call">{flight.flightNo}</span>
              <span
                className="risk-chip"
                style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}` }}
              >
                {level} · {flight.risk?.index ?? '—'}
              </span>
            </div>
            <div className="fcard-route">
              {flight.depIcao} → {flight.arrIcao}
            </div>
            <div className="fcard-meta">
              <span>
                {flight.flightLevel === null || flight.flightLevel === undefined ? 'FL —' : `FL${flight.flightLevel}`}
              </span>
              <span>{position?.groundSpeedKt ? `${position.groundSpeedKt} KT` : '— KT'}</span>
              <span>{flight.icaoType}</span>
              {flight.registration ? <span>{flight.registration}</span> : null}
            </div>
            <div className="fcard-op">{flight.operator}</div>
          </div>
        )
      })}
    </div>
  )
}
