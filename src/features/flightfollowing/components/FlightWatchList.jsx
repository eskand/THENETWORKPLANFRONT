/**
 * La liste des vols suivis, sous le bandeau de risque.
 *
 * Deux tris, comme le prototype : par risque (le plus grave d'abord) ou par
 * indicatif. Le tri est local — il ne change pas ce qui est affiche, seulement
 * l'ordre, donc il n'a rien a demander au serveur.
 *
 * Une fiche dit d'ou vient sa position. « NO SOURCE » n'est pas une erreur
 * d'affichage : c'est l'etat d'un vol dont aucun signal n'est arrive, et il
 * doit se lire aussi clairement qu'un niveau de vol.
 */

const RISK_ORDER = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 }

const TRACKING_LABEL = {
  LIVE: null,
  STALE: 'STALE',
  NO_SOURCE: 'NO SOURCE',
}

export default function FlightWatchList({ flights, sort, selectedId, onSelect }) {
  const rows = [...flights].sort((a, b) => {
    if (sort === 'callsign') return a.flightNo.localeCompare(b.flightNo)
    const byRisk =
      (RISK_ORDER[a.risk?.level] ?? 9) - (RISK_ORDER[b.risk?.level] ?? 9)
    if (byRisk !== 0) return byRisk
    return (b.risk?.index ?? 0) - (a.risk?.index ?? 0)
  })

  if (rows.length === 0) {
    return <div className="fwl__empty">No leg on the board for this day.</div>
  }

  return (
    <div className="fwl">
      {rows.map((flight) => {
        const position = flight.lastPosition
        const level = flight.risk?.level ?? 'LOW'
        const tracking = TRACKING_LABEL[flight.tracking]
        return (
          <button
            type="button"
            key={flight.legId}
            className={`fwl__card${flight.legId === selectedId ? ' is-on' : ''}`}
            onClick={() => onSelect?.(flight.legId)}
          >
            <div className="fwl__head">
              <b>{flight.flightNo}</b>
              <span className={`fwl__risk fwl__risk--${level.toLowerCase()}`}>
                {level} · {flight.risk?.index ?? '—'}
              </span>
            </div>

            <div className="fwl__route">
              {flight.depIcao} <i>→</i> {flight.arrIcao}
            </div>

            <div className="fwl__grid">
              <span>{flight.flightLevel === null || flight.flightLevel === undefined ? 'FL —' : `FL${flight.flightLevel}`}</span>
              <span>
                {position?.groundSpeedKt ? `${position.groundSpeedKt} KT` : '— KT'}
              </span>
              <span>{flight.icaoType}</span>
              <span>{flight.registration}</span>
            </div>

            <div className="fwl__op">{flight.operator}</div>

            <div className="fwl__chips">
              {flight.melReference ? (
                <span className={`fwl__chip${flight.melBlocking ? ' fwl__chip--stop' : ''}`}>
                  MEL
                </span>
              ) : null}
              {tracking ? <span className="fwl__chip fwl__chip--mute">{tracking}</span> : null}
            </div>
          </button>
        )
      })}
    </div>
  )
}
