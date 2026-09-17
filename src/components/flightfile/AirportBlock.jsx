import { Clock, Cloud, Sun } from 'lucide-react'
import { flagSvg } from '../../lib/flabelPlaces'

/**
 * L'identite d'un terrain et sa meteo — {@code airportBlockHtml()} de l'annexe
 * (l. 77366), que {@code TNPFL.decorate('airport', …)} inserait sous chaque
 * en-tete de section de l'onglet AIRPORT INFO.
 *
 * <b>Le DOM est celui de l'annexe</b> : {@code .fl-apt}, {@code .veil},
 * {@code .id}, {@code .wx} avec ses quatre blocs {@code .t}, {@code .now},
 * {@code .g}, {@code .src}. La feuille master les dessine deja ; il n'y a rien
 * a redessiner.
 *
 * <b>Ce qui n'est PAS repris.</b> L'annexe posait derriere la carte une
 * photographie du terrain, cherchee chez Unsplash, Pexels ou Wikimedia au
 * moment de l'ouverture, avec une cle d'API saisie dans le navigateur. Aller
 * chercher une image sur trois services tiers pour illustrer une fiche
 * d'exploitation n'est pas une dependance qu'un AOC prend : la carte garde son
 * verre clair, qui est l'apparence que l'annexe donne elle-meme a un terrain
 * sans photographie verifiee.
 *
 * <b>Et la meteo est celle du serveur.</b> Le meme METAR que la Flight Timeline
 * et le tableau OCC lisent — jamais un deuxieme decodage dans le navigateur.
 */
export default function AirportBlock({ icao, iata, name, city, iso2, at, observation, state }) {
  const flag = iso2 ? flagSvg(iso2) : null
  const dateText = at
    ? new Date(at).toLocaleDateString('en-GB', {
      weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
    }).toUpperCase()
    : ''
  const time = at
    ? new Date(at).toLocaleTimeString('en-GB', {
      hour: '2-digit', minute: '2-digit', timeZone: 'UTC', hour12: false,
    })
    : '—:—'

  return (
    <div className="fl-apt" data-fl-apt={icao}>
      <i className="veil" />

      <div className="id">
        {flag
          ? <i className="flag" title={iso2} dangerouslySetInnerHTML={{ __html: flag }} />
          : (iso2 ? <i className="flag iso">{iso2}</i> : null)}
        <div style={{ minWidth: 0 }}>
          <b>{iata || icao}</b>
          <span>{name || '—'}</span>
          <small>
            {icao || '—'}<i>|</i>{[city, iso2].filter(Boolean).join(', ') || '—'}
          </small>
        </div>
      </div>

      <div className="wx">
        <div className="t">
          <Clock size={16} />
          <div><small>{dateText}</small><b>{time} UTC</b></div>
        </div>
        {observation
          ? <Observation observation={observation} icao={icao} />
          : (
            <div className="na">
              {/* L'annexe ecrit la meme phrase, et c'est la bonne : un terrain
                  sans observation n'est pas un terrain par beau temps. */}
              Weather unavailable — no METAR received for {icao}
              {state === 'STALE' ? ' within the freshness window' : ''}.
            </div>
          )}
      </div>
    </div>
  )
}

/** Le bloc meteo : temperature, phenomene, puis QNH / vent / visibilite. */
function Observation({ observation, icao }) {
  const clear = observation.cavok || /clear|few/i.test(conditions(observation))
  return (
    <>
      <div className="now">
        {clear ? <Sun size={22} /> : <Cloud size={22} />}
        <div>
          <b>{observation.temperatureC != null ? `${observation.temperatureC}°C` : '—'}</b>
          <span>{conditions(observation)}</span>
        </div>
      </div>
      <div className="g">
        <span>QNH</span>
        <em>{observation.qnhHpa != null ? `${observation.qnhHpa} hPa` : '—'}</em>
        <span>WIND</span>
        <em>{wind(observation)}</em>
        <span>VIS</span>
        <em>{visibility(observation)}</em>
      </div>
      <div className="src">
        METAR {icao} {observation.observedAt
          ? new Date(observation.observedAt).toISOString().slice(11, 16).replace(':', '') + 'Z'
          : ''} · {observation.provider ?? '—'}
      </div>
    </>
  )
}

/** « CAVOK », sinon ce que la couche la plus basse dit du ciel. */
function conditions(observation) {
  if (observation.cavok) return 'CAVOK'
  if (observation.flightCategory) return observation.flightCategory
  return 'Reported'
}

function wind(observation) {
  if (observation.windSpeedKt == null) return '—'
  const direction = observation.windVariable
    ? 'VRB'
    : (observation.windDirDeg != null ? `${String(observation.windDirDeg).padStart(3, '0')}°` : '—')
  const gust = observation.windGustKt ? ` G${observation.windGustKt}` : ''
  return `${direction} / ${observation.windSpeedKt} kt${gust}`
}

/**
 * « 9999 » n'est pas une distance, c'est un code.
 *
 * <p>L'OACI (Annexe 3, appendice 3) reserve 9999 dans un METAR pour « visibilite
 * de 10 km ou plus » ; la valeur ne veut pas dire neuf mille neuf cent
 * quatre-vingt-dix-neuf metres. L'ecrire telle quelle ferait lire au dispatcher
 * une visibilite mesuree juste sous les 10 km, ce qui est exactement l'inverse
 * de ce que le message annonce.
 */
function visibility(observation) {
  if (observation.visibilityM == null) return '—'
  return observation.visibilityM >= 9999 ? '> 10 km' : `${observation.visibilityM} m`
}
