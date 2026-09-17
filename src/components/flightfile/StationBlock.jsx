/**
 * Le bandeau d'escale de l'onglet SERVICES — stationBlockHtml() de l'annexe
 * (prototype l. 72252).
 *
 * Depart et arrivee ne doivent jamais se confondre : le filet de gauche est
 * bleu sur le depart et vert sur l'arrivee, et le mot « Departure » /
 * « Arrival » est ecrit, pas seulement suggere par la couleur.
 */
export default function StationBlock({ kind, iata, icao, name }) {
  const code = iata || icao
  return (
    <div className={`fd-stn ${kind === 'arr' ? 'arr' : 'dep'}`}>
      <span className="fd-stn-dir">{kind === 'arr' ? 'Arrival' : 'Departure'}</span>
      <span className="fd-stn-code">
        {code}
        {icao && icao !== code ? <span className="fd-stn-icao">/ {icao}</span> : null}
      </span>
      {name ? <span className="fd-stn-name">{name}</span> : null}
    </div>
  )
}
