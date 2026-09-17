import { useEffect } from 'react'

/**
 * Le panneau « Open LVP » du bandeau de faible visibilite.
 *
 * <b>Pourquoi il existe.</b> Chez l'annexe, le bouton du bandeau ouvre le module
 * LVP — une scene plein ecran avec la carte du reseau, les minima par piste et
 * les approbations d'exploitant. Ce module n'est pas porte. Mais un bouton qui
 * porte son libelle sans rien ouvrir est pire que pas de bouton : ce panneau
 * montre donc ce que le produit sait REELLEMENT de la faible visibilite sur
 * cette etape — les deux aerodromes, la mesure, d'ou elle sort, et le verdict.
 *
 * <b>Et surtout ce qu'il ne sait pas.</b> La derniere ligne de chaque
 * aerodrome nomme les trois sources absentes : minima approuves, balisage de
 * piste, fenetre TAF. Sans elle, un panneau tout vert se lirait comme une
 * autorisation de partir, ce qu'il n'est pas.
 */
export default function LvpModal({ verdict, onClose }) {
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const stations = verdict?.stations ?? []

  return (
    <div className="tnp-modal-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tnp-modal-box">
        <div className="tnp-modal-close" role="button" tabIndex={0} onClick={onClose}>✕</div>
        <div className="tnp-modal-title">Low visibility procedures</div>
        {/* Le sous-titre suit ce que le panneau montre : sur un appareil
            immobilise il n'y a qu'une escale, et annoncer « departure and
            destination » au-dessus d'une seule ligne serait faux. */}
        <div className="tnp-modal-sub">
          {stations.length === 1
            ? `${stations[0].icao}, read against the SPA.LVO.100 thresholds`
            : 'Departure and destination, read against the SPA.LVO.100 thresholds'}
        </div>

        {stations.length === 0 ? (
          <div className="fd-banner warn">
            The assessment has not come back yet. It reads the current observation of both
            aerodromes; if this persists, the weather source is not answering.
          </div>
        ) : null}

        {stations.map((station) => (
          <div className={`lvp-stn sev-${String(station.severity).toLowerCase()}`} key={station.role}>
            <div className="lvp-stn-hd">
              <span className="lvp-stn-role">{station.role}</span>
              <span className="lvp-stn-icao">{station.icao}</span>
              <span className={`fd-badge ${badge(station.severity)}`}>
                {String(station.operationalStatus).replace(/_/g, ' ')}
              </span>
            </div>

            <div className="lvp-stn-grid">
              <span>Visibility</span>
              <em>{station.cavok
                ? 'CAVOK'
                : station.visibilityM != null
                  ? `${station.visibilityM >= 9999 ? '> 10 km' : `${station.visibilityM} m`}`
                  : 'not reported'}</em>
              <span>Ceiling</span>
              <em>{station.ceilingFt != null ? `${station.ceilingFt} ft` : 'not reported'}</em>
              <span>Report</span>
              <em>
                {station.state === 'NO_OBSERVATION'
                  ? 'none received'
                  : `${station.state === 'STALE' ? 'STALE · ' : ''}${
                    station.ageMinutes != null ? `${station.ageMinutes} min old` : '—'}`}
              </em>
            </div>

            <p className="lvp-stn-verdict">{station.assessed}</p>

            {station.rawText ? <pre className="lvp-stn-raw">{station.rawText}</pre> : null}

            {/* LA LIGNE QUI EMPECHE DE LIRE CE PANNEAU COMME UNE AUTORISATION. */}
            <p className="lvp-stn-gap">{station.notAssessed}</p>
          </div>
        ))}

        {/* Les trois paliers, ecrits : ils sont la raison des couleurs ci-dessus
            et ils ne dependent ni de l'aerodrome ni de l'exploitant. */}
        <div className="lvp-thresholds">
          <b>SPA.LVO.100</b> — below 550 m: low visibility take-off · below 400 m: specific
          approval required · below 125 m: LVP must be in force.
        </div>

        <div className="tnp-modal-actions">
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Close</div>
        </div>
      </div>
    </div>
  )
}

function badge(severity) {
  switch (severity) {
    case 'RED': return 'red'
    case 'AMBER': return 'amber'
    case 'GREEN': return 'green'
    default: return 'gray'
  }
}
