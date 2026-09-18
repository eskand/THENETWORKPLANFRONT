import { useNavigate } from 'react-router-dom'
import { RISK_COLOUR } from './FlightWatchList'

/**
 * Le tiroir de droite : `#emptystate` puis `#detailpane`.
 *
 * Référence NETPLUS_FLIGHT_FOLLOWING index.html l. 196-201 (état vide) et
 * js/06 renderDetailPane l. 1520-1610 : en-tête (indicatif, exploitant — type
 * · immat, pastille « LEVEL · INDEX n »), grille de six cellules, TIMES · UTC
 * (fwOpsBlockHtml l. 1341-1370), AIRCRAFT STATUS quand une MEL est ouverte
 * (fwAcBlockHtml l. 1400-1406), FLIGHT PROGRESS, DISPATCHER NOTES, OPEN THIS
 * FLIGHT IN (fwLinksHtml l. 1409-1417) et le bouton FOLLOW.
 *
 * Ce que la référence lisait d'autres modules et que le tableau ne porte pas
 * encore n'est pas rendu plutôt qu'inventé : DESTINATION (dégagement OM-C et
 * METAR — F04d), PUBLISHED ROSTER CREW (F04e), FIR CROSSINGS (F04b). Les
 * heures viennent de l'étape (std, sta, etaRevised) : sans ETD révisée ni
 * heures réelles dans FollowedFlightDto, ETD = STD et le retard se lit sur la
 * seule révision connue, celle de l'ETA (Q22).
 */

const R_EARTH_NM = 3440.065

/** HH:MMZ — fwZ js/06 l. 1264-1267. */
export function zTime(iso) {
  if (!iso) return null
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return null
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}Z`
}

/** « 2h15 » — fwDur js/06 l. 1273-1278. */
export function fwDur(minutes) {
  let min = Math.round(minutes)
  const sign = min < 0 ? '-' : ''
  min = Math.abs(min)
  return `${sign}${Math.floor(min / 60)}h${String(min % 60).padStart(2, '0')}`
}

/** Distance orthodromique en NM entre deux aérodromes connus (totalDistNm de la référence). */
function distanceNm(from, to) {
  if (!from || !to) return null
  const rad = (deg) => (deg * Math.PI) / 180
  const dLat = rad(to.lat - from.lat)
  const dLon = rad(to.lon - from.lon)
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(rad(from.lat)) * Math.cos(rad(to.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R_EARTH_NM * Math.asin(Math.sqrt(a))
}

function coordinatesOf(entry) {
  const airport = entry?.airport ?? entry
  if (!airport || airport.latitude == null || airport.longitude == null) return null
  return { icao: airport.icao, lat: Number(airport.latitude), lon: Number(airport.longitude) }
}

/** Les heures du vol — fwTimes js/06 l. 1288-1316, sur ce que l'étape porte. */
export function timesOf(flight, now) {
  if (!flight.std || !flight.sta) return null
  const std = new Date(flight.std)
  const sta = new Date(flight.sta)
  const eta = flight.etaRevised ? new Date(flight.etaRevised) : sta
  const delayMin = Math.round((eta - sta) / 60000)
  const parti = flight.status === 'DEPARTED' || flight.status === 'ARRIVED' || flight.status === 'CLOSED'
  const pose = flight.status === 'ARRIVED' || flight.status === 'CLOSED'
  return {
    stdTxt: zTime(flight.std),
    staTxt: zTime(flight.sta),
    etdTxt: zTime(flight.std),
    etaTxt: zTime(eta.toISOString()),
    revise: Math.abs(delayMin) >= 1,
    delayMin,
    blockTxt: fwDur((sta - std) / 60000),
    resteMin: pose
      ? null
      : flight.minutesToDestination ?? Math.round((eta - now) / 60000),
    avantMin: parti ? null : Math.round((std - now) / 60000),
    parti,
    pose,
  }
}

function TimesBlock({ flight }) {
  const T = timesOf(flight, new Date())
  if (!T) {
    return (
      <div className="detail-sect">
        <h4>TIMES · UTC</h4>
        <div className="route-line">No schedule on file for this flight — times unavailable.</div>
      </div>
    )
  }
  const delay =
    T.delayMin === 0 ? (
      <span className="fw-ok">On schedule</span>
    ) : (
      <span className={T.delayMin > 0 ? 'fw-late' : 'fw-early'}>
        {T.delayMin > 0 ? '+' : '−'}
        {Math.abs(T.delayMin)} min
      </span>
    )
  const remaining = T.pose ? 'Landed' : T.parti ? `${fwDur(T.resteMin)} to run` : `Departs in ${fwDur(T.avantMin)}`
  return (
    <div className="detail-sect">
      <h4>TIMES · UTC</h4>
      <div className="fw-times">
        <span className="l">STD</span>
        <b>{T.stdTxt || '—'}</b>
        <span className="l">ETD</span>
        <b className={T.revise ? 'fw-rev' : undefined}>{T.etdTxt || '—'}</b>
        <span className="l">STA</span>
        <b>{T.staTxt || '—'}</b>
        <span className="l">ETA</span>
        <b className={T.revise ? 'fw-rev' : undefined}>{T.etaTxt || '—'}</b>
        <span className="l">Block</span>
        <b>{T.blockTxt}</b>
        <span className="l">Delay</span>
        <b>{delay}</b>
      </div>
      <div className="fw-eta">{remaining}</div>
    </div>
  )
}

export default function FlightWatchDetail({ flight, airports, following = false, onToggleFollow }) {
  const navigate = useNavigate()

  const empty = (
    <div className="empty-state" id="emptystate" style={flight ? { display: 'none' } : undefined}>
      <div className="ico">✈</div>
      {'Select a flight from the list'}
      <br />
      {'or click an aircraft on the map to view tracking details and run'}
      <br />
      {'the proactive SMS risk assessment.'}
    </div>
  )

  if (!flight) {
    return (
      <>
        {empty}
        <div id="detailpane" style={{ display: 'none' }} />
      </>
    )
  }

  const position = flight.lastPosition
  const risk = flight.risk
  const level = risk?.level ?? 'LOW'
  const colour = RISK_COLOUR[level] ?? RISK_COLOUR.LOW
  const progress = flight.progressPercent ?? 0

  const byIcao = new Map()
  ;(airports ?? []).forEach((entry) => {
    const point = coordinatesOf(entry)
    if (point) byIcao.set(point.icao, point)
  })
  const distance = distanceNm(byIcao.get(flight.depIcao), byIcao.get(flight.arrIcao))

  const note = flight.melReference
    ? `Active MEL ${flight.melReference} — monitor.`
    : 'Routine flight — standard monitoring.'

  const links = [
    ['label', 'Flight label', `/dispatch?leg=${flight.legId}`],
    ['dispatch', 'Dispatch', '/dispatch'],
    ['timeline', 'Timeline', '/flight-timeline'],
    ...(flight.melReference ? [['techlog', 'Tech Log', '/tech-log']] : []),
    ['roster', 'Roster', '/roster'],
  ]

  return (
    <>
      {empty}
      <div id="detailpane">
        <div className="detail-head">
          <div className="detail-head-main">
            <div className="detail-call">{flight.flightNo}</div>
            <div className="detail-op">
              {flight.operator} — {flight.icaoType}
              {flight.registration ? ` · ${flight.registration}` : ''}
            </div>
          </div>
          <span
            className="detail-badge"
            id="detail-risk-badge"
            style={{ background: `${colour}22`, color: colour, border: `1px solid ${colour}` }}
          >
            {level} · INDEX {risk?.index ?? '—'}
          </span>
        </div>

        <div className="detail-grid">
          <div className="dg-item">
            <div className="dg-label">Route</div>
            <div className="dg-val small">
              {flight.depIcao} – {flight.arrIcao}
            </div>
          </div>
          <div className="dg-item">
            <div className="dg-label">Cruise level</div>
            <div className="dg-val">
              {flight.flightLevel === null || flight.flightLevel === undefined ? 'FL —' : `FL${flight.flightLevel}`}
            </div>
          </div>
          <div className="dg-item">
            <div className="dg-label">Ground speed</div>
            <div className="dg-val">{position?.groundSpeedKt ? `${position.groundSpeedKt} KT` : '— KT'}</div>
          </div>
          <div className="dg-item">
            <div className="dg-label">Total distance</div>
            <div className="dg-val">{distance == null ? '— NM' : `${Math.round(distance)} NM`}</div>
          </div>
          <div className="dg-item">
            <div className="dg-label">Heading</div>
            <div className="dg-val" id="dg-hdg">
              {position?.trackDeg === null || position?.trackDeg === undefined ? '--' : Math.round(position.trackDeg)}°
            </div>
          </div>
          <div className="dg-item">
            <div className="dg-label">Progress</div>
            <div className="dg-val" id="dg-prog">
              {progress}%
            </div>
          </div>
        </div>

        <TimesBlock flight={flight} />

        {flight.melReference ? (
          <div className="detail-sect">
            <h4>AIRCRAFT STATUS</h4>
            <div className="route-line">
              Deferred defect <b>{flight.melReference}</b>
              {flight.melBlocking ? ' · blocks dispatch' : ''}
            </div>
          </div>
        ) : null}

        <div className="detail-sect">
          <h4>FLIGHT PROGRESS</h4>
          <div className="progressbar">
            <div className="progressbar-fill" id="progressfill" style={{ width: `${progress}%` }} />
          </div>
        </div>

        <div className="detail-sect">
          <h4>DISPATCHER NOTES</h4>
          <div className="route-line">{note}</div>
        </div>

        <div className="detail-sect">
          <h4>OPEN THIS FLIGHT IN</h4>
          <div className="fw-links">
            {links.map(([key, label, to]) => (
              <button className="fw-link" type="button" key={key} data-fwgo={key} onClick={() => navigate(to)}>
                {label}
              </button>
            ))}
          </div>
        </div>

        <button className="followbtn" id="followbtn" type="button" onClick={() => onToggleFollow?.()}>
          {following ? '⏸ STOP FOLLOWING' : '📍 FOLLOW THIS FLIGHT ON MAP'}
        </button>
      </div>
    </>
  )
}
