import { cityOf, flagSvg, placeSvg } from '../../lib/flabelPlaces'

/**
 * Le bandeau de route du dossier de vol — le heros que
 * {@code TNPFL.decorate('flight', …)} injectait en tete de l'onglet FLIGHT
 * (annexe A4, l. 77340-77362).
 *
 * <b>Le DOM est celui de l'annexe, pas un equivalent.</b> {@code .fl-hero},
 * {@code .fl-hero-wash}, {@code .fl-place}, {@code .fl-dot}, {@code .fl-rline},
 * {@code .fl-plane}, {@code .fl-nat}, {@code .fl-side}, {@code .fl-flagrow} :
 * la feuille {@code flightpanel.css} a ete copiee sans retouche, et elle ne
 * dessine que ces classes-la. Redessiner le bandeau avec mes propres noms
 * reviendrait a refaire la maquette a l'oeil.
 *
 * <b>Rien n'est code en dur.</b> Les silhouettes viennent du registre de
 * villes de l'annexe (indexe par OACI/IATA), les drapeaux de son jeu de
 * drapeaux nationaux, et un terrain sans repere curate n'affiche que la tour
 * de controle et l'aerogare — jamais le monument d'une autre ville.
 */

/**
 * La nature du vol — {@code FL.nature()} de l'annexe (l. 77291), avec ses
 * libelles mot pour mot.
 *
 * <b>Ce qui a change, et pourquoi la pastille disait « PAX ».</b> L'annexe lit
 * un champ libre, {@code flight.optype}, ou la nature commerciale et la charge
 * sont melangees (« Non-scheduled Charter (Pax) »). Nous n'avions que
 * {@code flight_type} — ce que l'etape transporte — et aucune de ses branches
 * ne parle de PAX : la fonction retombait sur son cas par defaut et ressortait
 * le mot tel quel. La nature COMMERCIALE est desormais une colonne
 * ({@code ops.legs.commercial_type}, migration V60), et les deux axes composent
 * le libelle comme chez elle.
 *
 * <b>L'ordre des branches est le sien</b> : ce que l'etape transporte l'emporte
 * sur la facon dont elle est vendue. Un transport sanitaire affrete se lit
 * MEDEVAC, pas CHARTER.
 */
export function nature(flightType, commercialType) {
  const type = String(flightType ?? '').toUpperCase()
  const commercial = String(commercialType ?? '').toUpperCase()

  if (!type && !commercial) return 'TYPE OF FLIGHT NOT SET'
  if (type === 'AMBULANCE') return 'MEDEVAC'
  if (type === 'FERRY' || type === 'POSITIONING') return 'POSITIONING / FERRY'
  if (type === 'TRAINING') return 'TRAINING'
  if (type === 'MAINTENANCE') return 'MAINTENANCE'

  switch (commercial) {
    case 'NON_SCHEDULED': return type === 'PAX' ? 'CHARTER · PAX' : 'CHARTER'
    case 'SCHEDULED': return 'SCHEDULED COMMERCIAL'
    case 'PRIVATE': return 'PRIVATE / GA'
    case 'STATE': return 'STATE FLIGHT'
    default: return type || 'TYPE OF FLIGHT NOT SET'
  }
}

/**
 * Le nom du terrain, tel qu'il est enregistre, simplement lisible —
 * {@code FL.cleanName()} de l'annexe (l. 77269), repris tel quel.
 *
 * <p>INTL devient Int'l, un mot repete du registre disparait, et la ville
 * initiale est retiree quand elle double celle qui est deja affichee
 * au-dessus : « Paris Charles de Gaulle » sous « Paris » se lit
 * « Charles de Gaulle », parce que la petite ligne du bandeau ne tient pas sur
 * deux lignes et que repeter la ville n'apprend rien. <b>Rien n'est ajoute</b> :
 * la fonction ne fait que retirer et re-capitaliser, jamais completer.
 */
function cleanName(name, city) {
  const words = String(name ?? '').replace(/\s+/g, ' ').trim().split(' ').filter(Boolean)
  const out = []
  for (const word of words) {
    let token = word
    if (out.length && out[out.length - 1].toUpperCase() === token.toUpperCase()) continue
    if (/^(INTL|INTERNATIONAL|INT'L)$/i.test(token)) token = "Int'l"
    else if (/^(DE|DU|DES|DA|DEL|LA|LE|LES|AL|EL|VAN|BIN)$/i.test(token)) token = token.toLowerCase()
    else if (/^[A-Z][A-Z'-]+$/.test(token)) {
      token = token.toLowerCase()
        .replace(/(^|['\-\s])([a-z])/g, (whole, lead, letter) => lead + letter.toUpperCase())
        .replace(/(^|\s)(D|L)'([A-Z])/g, (whole, lead, particle, letter) =>
          `${lead}${particle.toLowerCase()}'${letter}`)
    }
    out.push(token)
  }
  if (out.length > 2 && city && out[out.length - 1].toLowerCase() !== city.toLowerCase()
      && /^[A-Z][a-z]+$/.test(out[out.length - 1])
      && out.indexOf("Int'l") >= 0 && out.indexOf("Int'l") < out.length - 1) {
    out.pop()
  }
  let full = out.join(' ')
  if (city) {
    const cityWords = city.split(' ').length
    if (full.toLowerCase().indexOf(`${city.toLowerCase()} `) === 0 && out.length - cityWords >= 2) {
      full = out.slice(cityWords).join(' ')
    }
  }
  return full
}

/** Un cote du bandeau — {@code sideHtml(st, right)} de l'annexe, l. 77340. */
function Side({ station, right }) {
  const flag = station.iso2 ? flagSvg(station.iso2) : null
  const badge = station.iso2 ? <em>{station.iso2}</em> : null
  const flagIcon = flag
    ? <i className="fl-flag" title={station.country ?? station.iso2}
         dangerouslySetInnerHTML={{ __html: flag }} />
    : null
  /* La ville telle que l'annexe la nomme : son repertoire d'abord (LFPO →
     « Paris »), puis ce qui precede la premiere virgule du registre. Sans cela
     le bandeau ecrit « Paris (Orly, Val-de-Marne) » — l'adresse administrative
     du terrain, pas la ville que le vol dessert. */
  const city = cityOf(station) || station.city
  const name = cleanName(station.name, city)

  return (
    <div className={`fl-side ${right ? 'r' : 'l'}`}>
      <b>{station.iata || station.given}</b>
      <span>{city || name || station.given}</span>
      {/* L'infobulle garde le nom du registre en entier : la petite ligne en
          raccourcit l'affichage, elle ne remplace pas l'enregistrement. */}
      <small title={station.name + (station.country ? ` · ${station.country}` : '')}>
        {name || '—'}{station.icao ? ` (${station.icao})` : ''}
      </small>
      {/* Le drapeau se place vers l'exterieur du bandeau : a gauche du sigle a
          gauche, a droite du sigle a droite. L'annexe inverse la paire, elle
          ne la met pas en ligne dans les deux sens. */}
      <div className="fl-flagrow">
        {right ? <>{badge}{flagIcon}</> : <>{flagIcon}{badge}</>}
      </div>
    </div>
  )
}

export default function FlightHero({ from, to, flightType, commercialType }) {
  const left = placeSvg(from, 'l')
  const right = placeSvg(to, 'r')
  const label = nature(flightType, commercialType)

  return (
    <div className="fl-hero">
      <div className="fl-hero-wash" />
      {left?.svg ? (
        <div className="fl-place l"
             title={[from.city, left.label].filter(Boolean).join(' — ')}
             dangerouslySetInnerHTML={{ __html: left.svg }} />
      ) : null}
      {right?.svg ? (
        <div className="fl-place r"
             title={[to.city, right.label].filter(Boolean).join(' — ')}
             dangerouslySetInnerHTML={{ __html: right.svg }} />
      ) : null}
      <i className="fl-dot l" />
      <i className="fl-rline" />
      <i className="fl-dot r" />
      <img className="fl-plane" src="/flabel/aircraft.png" alt="" />
      <span className="fl-nat" title={flightType ?? 'Type of flight not set from Sales'}>
        {label}
      </span>
      <Side station={from} right={false} />
      <Side station={to} right />
    </div>
  )
}
