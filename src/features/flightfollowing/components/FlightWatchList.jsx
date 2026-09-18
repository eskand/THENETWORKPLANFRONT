/**
 * La liste des vols suivis — `#flightlist` et ses `.fcard`.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING js/06 renderList l. 1114-1160 : deux
 * tris (risque — le plus grave d'abord, puis l'indice — ou indicatif), une
 * carte par vol : indicatif, pastille « LEVEL · index » colorée par le niveau,
 * route, FL / vitesse sol / type / immatriculation, exploitant, et un tag par
 * facteur de risque actif (.factor-tag .warm / .hot).
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

/** Clé courte du facteur — RISK_FACTOR_DEFS js/06 l. 156-186 (wx, notam, ftl, mel, crew). */
const FACTOR_TAG = { WEATHER: 'WX', NOTAM: 'NOTAM', FTL: 'FTL', MEL: 'MEL', CREW: 'CREW' }
const SEVERITY = { MINOR: 2, MODERATE: 3, MAJOR: 4, SEVERE: 5 }

/** Les tags d'une carte : un facteur actif par tag, .hot dès 4, .warm dès 2 — renderList js/06 l. 1135-1145. */
function factorTags(risk) {
  return (risk?.factors ?? [])
    .filter((factor) => (SEVERITY[factor.level] ?? 0) > 0)
    .map((factor) => {
      const sev = SEVERITY[factor.level]
      const cls = sev >= 4 ? 'hot' : sev >= 2 ? 'warm' : ''
      return { key: factor.factor, label: FACTOR_TAG[factor.factor] ?? factor.factor, cls }
    })
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
        const tags = factorTags(flight.risk)
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
            {tags.length ? (
              <div className="fcard-factors">
                {tags.map((tag) => (
                  <span className={`factor-tag${tag.cls ? ` ${tag.cls}` : ''}`} key={tag.key}>
                    {tag.label}
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}
