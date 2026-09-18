import { useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import { useAirports, useFollowingBoard, useLiveTraffic } from '../../hooks/useOperations'
import { isoDate } from '../../lib/format'
import FlightWatchDetail from './components/FlightWatchDetail'
import FlightWatchList from './components/FlightWatchList'
import FlightWatchMap from './components/FlightWatchMap'
import RiskPanel from './components/RiskPanel'

/**
 * Flight Following — TNP Flight Watch.
 *
 * Cadre de la référence NETPLUS_FLIGHT_FOLLOWING (module v226.174) :
 * `flight-following/index.html` l. 21-206 et `js/07` (TNP_FWUI) l. 20-121.
 *
 *   · la vue s'ouvre sur la CARTE SEULE ; la liste des vols et le détail d'un
 *     vol sont des TIROIRS (#left, #right), fermés au départ ;
 *   · le bouton « FLIGHT LIST » du bandeau ouvre et ferme la liste ;
 *   · choisir un vol — dans la liste OU sur la carte — ouvre le détail ;
 *   · Échap referme, du plus récent au plus ancien : le menu des calques,
 *     puis le détail, puis la liste ;
 *   · le bandeau du produit porte les commandes du module tant qu'on est
 *     dans la vue (classe body.fw-topbar, ancre #fwTopHost).
 *
 * Tout vient d'un seul appel, GET /v1/flight-following/board. Les positions
 * sont celles reçues (ops.position_reports) : un vol sans position n'apparaît
 * pas sur la carte, et la liste le dit — « NO SOURCE » — au lieu de le faire
 * voler (défaut A-D14 de la référence, non reproduit). Les quatre boutons du
 * groupe `.timemult` règlent la cadence de lecture du tableau, pas la vitesse
 * d'une horloge fictive.
 */

const REFRESH = [
  { id: 'LIVE', label: 'LIVE', ms: 15_000 },
  { id: 'M1', label: '1 min', ms: 60_000 },
  { id: 'M5', label: '5 min', ms: 300_000 },
  { id: 'OFF', label: 'HOLD', ms: false },
]

/** Objet stable : recréé à chaque rendu, il changerait la clé de requête
 *  de TanStack Query à chaque passage et relancerait la lecture sans fin. */
const USED_STATIONS = { usedOnly: true }

/** `data-base` de la référence (index.html l. 176-178) → fond de FlightWatchMap. */
const BASEMAPS = [
  ['sat', 'SATELLITE', 'SATELLITE'],
  ['dark', 'DARK OPS', 'DARK'],
  ['street', 'STREET', 'STREET'],
]

/** Les calques de la carte, dans l'ordre et avec les libellés de la référence
 *  (index.html l. 116-147). */
const OVERLAYS = [
  ['flights', '✈', 'Flights & active routes'],
  ['adsb', '📡', 'Live ADS-B traffic (OpenSky)'],
  ['airports', '🛬', 'Airports / waypoints'],
  ['fir', '▦', 'FIR/UIR boundaries'],
  ['radar', '🌧', 'Weather radar (live)'],
  ['ir', '☁', 'IR cloud satellite'],
  ['labels', '🗺', 'Labels / borders'],
]

const DEFAULT_LAYERS = {
  flights: true,
  adsb: true,
  airports: true,
  fir: false,
  radar: false,
  ir: false,
  labels: true,
}

/** Style en ligne du bouton ERP tel que js/10 l. 145 le pose. */
const ERP_STYLE = {
  marginLeft: 8,
  background: '#C8202F',
  color: '#fff',
  border: 'none',
  padding: '5px 10px',
  borderRadius: 6,
  font: '800 11px system-ui',
  cursor: 'pointer',
  letterSpacing: '.5px',
}

/**
 * Les trames RainViewer : radar de précipitations et infrarouge.
 *
 * Chargées une seule fois, et seulement quand une des deux couches est
 * allumée. L'heure de la trame revient avec elle : une image radar dont on
 * ignore l'heure ne dit pas si elle date de cinq minutes ou d'une heure.
 */
function useRadarFrame(enabled) {
  const [frame, setFrame] = useState(null)

  useEffect(() => {
    if (!enabled || frame) return undefined
    let cancelled = false
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((response) => response.json())
      .then((data) => {
        if (cancelled) return
        const radar = data?.radar?.past?.[data.radar.past.length - 1]
        const infrared = data?.satellite?.infrared?.[data.satellite.infrared.length - 1]
        setFrame({
          radar: radar ? `${data.host}${radar.path}/256/{z}/{x}/{y}/2/1_1.png` : null,
          infrared: infrared ? `${data.host}${infrared.path}/256/{z}/{x}/{y}/0/0_0.png` : null,
          at: radar ? new Date(radar.time * 1000).toISOString().slice(11, 16) : null,
        })
      })
      .catch(() => {
        if (!cancelled) setFrame({ radar: null, infrared: null, at: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, frame])

  return frame
}

/** L'horloge UTC du bandeau — js/06 l. 546-552 : HH:MM:SS<small>UTC</small>. */
function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now.toISOString().slice(11, 19)
}

/** La classe body.fw-topbar vit le temps de la vue (js/07 l. 78, js/12 l. 6). */
function useTopbarClass() {
  useEffect(() => {
    document.body.classList.add('fw-topbar')
    return () => document.body.classList.remove('fw-topbar')
  }, [])
}

export default function FlightFollowingPage() {
  const navigate = useNavigate()
  const clock = useUtcClock()
  useTopbarClass()

  const [date] = useState(() => isoDate(new Date()))
  const [sort, setSort] = useState('risk')
  const [basemap, setBasemap] = useState('sat')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [refresh, setRefresh] = useState('LIVE')
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [layersOpen, setLayersOpen] = useState(false)
  const [listOpen, setListOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  // LIVE (js/09 l. 175-186) : éteint au départ, comme NP.adsb._on.
  const [live, setLive] = useState(false)
  const showTraffic = live && layers.adsb
  const radarFrame = useRadarFrame(layers.radar || layers.ir)

  const interval = REFRESH.find((entry) => entry.id === refresh)?.ms ?? 15_000
  const board = useFollowingBoard(date, interval)
  const data = board.data

  /* Le réseau dessiné sous les appareils : les aérodromes que l'exploitant
     dessert (usedOnly), depuis refdata.airports. */
  const airports = useAirports(USED_STATIONS)
  const traffic = useLiveTraffic(showTraffic, interval || 30_000)

  const flights = useMemo(() => {
    if (!data) return []
    const all = [...data.airborne, ...data.upcoming, ...data.arrived]
    const needle = query.trim().toUpperCase()
    if (!needle) return all
    return all.filter((flight) =>
      [flight.flightNo, flight.registration, flight.icaoType, flight.depIcao, flight.arrIcao, flight.operator]
        .filter(Boolean)
        .some((field) => field.toUpperCase().includes(needle)),
    )
  }, [data, query])

  const selected = flights.find((flight) => flight.legId === selectedId) ?? null
  const plotted = flights.filter((flight) => flight.lastPosition)
  const bases = useMemo(
    () => [...new Set(flights.map((flight) => flight.depIcao))],
    [flights],
  )

  /* Un seul point d'entrée pour choisir un vol — liste ou carte — qui ouvre
     le détail (js/07 : selectFlight → openDetail). */
  const selectFlight = useCallback((legId) => {
    setSelectedId(legId)
    setDetailOpen(true)
  }, [])

  /* Échap : une couche à la fois, jamais deux (js/06 l. 311, js/07 l. 62-72). */
  useEffect(() => {
    function onKey(event) {
      if (event.key !== 'Escape') return
      if (layersOpen) {
        setLayersOpen(false)
        return
      }
      if (detailOpen) {
        setDetailOpen(false)
        event.stopPropagation()
        return
      }
      if (listOpen) {
        setListOpen(false)
        event.stopPropagation()
      }
    }
    document.addEventListener('keydown', onKey, true)
    return () => document.removeEventListener('keydown', onKey, true)
  }, [layersOpen, detailOpen, listOpen])

  /* Un clic hors du groupe LAYERS referme le menu (js/06 l. 307-310). */
  useEffect(() => {
    if (!layersOpen) return undefined
    function onClick(event) {
      const wrap = document.getElementById('layers-wrap')
      if (wrap && !wrap.contains(event.target)) setLayersOpen(false)
    }
    document.addEventListener('click', onClick)
    return () => document.removeEventListener('click', onClick)
  }, [layersOpen])

  const toggleLayer = (key) => (event) =>
    setLayers((current) => ({ ...current, [key]: event.target.checked }))

  const controls = (
    <>
      <button
        id="fw-live-btn"
        type="button"
        className={live ? 'on' : undefined}
        title="Live ADS-B traffic (OpenSky)"
        onClick={() => setLive((current) => !current)}
      >
        {live ? '📡 LIVE ●' : '📡 LIVE'}
      </button>
      <button id="fw-erp-btn" type="button" style={ERP_STYLE} onClick={() => navigate('/erp')}>
        ⚠ ACTIVATE ERP
      </button>
      <button
        id="fwListBtn"
        className={`fw-listbtn${listOpen ? ' on' : ''}`}
        type="button"
        aria-pressed={listOpen ? 'true' : 'false'}
        title={listOpen ? 'Hide the active flight list' : 'Show the active flight list'}
        onClick={() => setListOpen((current) => !current)}
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.9"
          strokeLinecap="round"
          aria-hidden="true"
        >
          <path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01" />
        </svg>
        FLIGHT LIST
      </button>
      <div id="utcclock">
        {clock}
        <small>UTC</small>
      </div>
    </>
  )

  if (board.isError) {
    return (
      <>
        <TopBar title="Flight Following — TNP Flight Watch" subtitle="Live ADS-B tracking" controls={controls} />
        <div className="shell__scroll">
          <main className="page">
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          </main>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar title="Flight Following — TNP Flight Watch" subtitle="Live ADS-B tracking" controls={controls} />

      <div
        id="viewFlightFollowing"
        style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
      >
        <div id="app" className={detailOpen ? 'fw-right-open' : undefined}>
          <div id="left" className={listOpen ? 'fw-open' : undefined} aria-hidden={listOpen ? 'false' : 'true'}>
            <div className="fw-head">
              <h3>FLIGHT LIST</h3>
              <button
                id="fwListClose"
                className="fw-x"
                type="button"
                aria-label="Close the flight list"
                title="Close the flight list"
                onClick={() => setListOpen(false)}
              >
                ×
              </button>
            </div>

            <RiskPanel board={data} flights={flights} onSelect={selectFlight} />

            <div className="sortbar">
              <button id="sort-risk" type="button" className={sort === 'risk' ? 'active' : undefined} onClick={() => setSort('risk')}>
                Sort: Risk
              </button>
              <button
                id="sort-callsign"
                type="button"
                className={sort === 'callsign' ? 'active' : undefined}
                onClick={() => setSort('callsign')}
              >
                Sort: Callsign
              </button>
            </div>

            <div className="panel-head">
              <h3>ACTIVE FLIGHTS</h3>
              <span className="count" id="flightcount">{flights.length}</span>
            </div>

            <FlightWatchList flights={flights} sort={sort} selectedId={selectedId} onSelect={selectFlight} />

            <div className="legend-box">
              <div style={{ fontSize: 9, color: 'var(--gold)', letterSpacing: '1.5px', marginBottom: 8 }}>
                RISK LEVEL LEGEND
              </div>
              <div className="legend-row"><span className="dot" style={{ background: '#27AE60' }} /> Low — acceptable, routine watch</div>
              <div className="legend-row"><span className="dot" style={{ background: '#E0C22A' }} /> Medium — monitor, review trend</div>
              <div className="legend-row"><span className="dot" style={{ background: '#E67E22' }} /> High — mitigation required</div>
              <div className="legend-row"><span className="dot" style={{ background: '#C0392B' }} /> Critical — immediate action</div>
            </div>
          </div>

          <div id="mapwrap">
            <FlightWatchMap
              flights={flights}
              airports={airports.data?.rows ?? []}
              bases={bases}
              traffic={traffic.data ?? []}
              showTraffic={showTraffic}
              basemap={BASEMAPS.find(([id]) => id === basemap)?.[2] ?? 'SATELLITE'}
              layers={layers}
              radarFrame={radarFrame}
              selectedId={selectedId}
              onSelect={selectFlight}
            />

            <div id="fwMapCtl">
              <input
                id="searchbox"
                placeholder="⌕ ICAO / CALLSIGN / OP"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
              />
              <div className="timemult">
                {REFRESH.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={refresh === entry.id ? 'active' : undefined}
                    title={
                      entry.ms
                        ? `Refresh the board every ${entry.ms / 1000} s`
                        : 'Stop refreshing — the board keeps what it last read'
                    }
                    onClick={() => setRefresh(entry.id)}
                  >
                    {entry.label}
                  </button>
                ))}
              </div>
              <div className="layers-wrap" id="layers-wrap">
                <button
                  className={`layers-btn${layersOpen ? ' open' : ''}`}
                  id="layers-btn"
                  type="button"
                  title="Map layers"
                  onClick={(event) => {
                    event.stopPropagation()
                    setLayersOpen((current) => !current)
                  }}
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <polygon points="12 2 22 8 12 14 2 8 12 2" />
                    <polyline points="2 14 12 20 22 14" />
                    <polyline points="2 11 12 17 22 11" />
                  </svg>
                  LAYERS
                </button>
                <div id="layerctl" className={layersOpen ? 'open' : undefined} onClick={(event) => event.stopPropagation()}>
                  <div className="lc-head">MAP LAYERS</div>
                  {OVERLAYS.map(([key, icon, label]) => (
                    <div className="lc-item" key={key}>
                      <label htmlFor={`ly-${key}`}>
                        <span className="lc-icon">{icon}</span> {label}
                      </label>
                      <label className="switch">
                        <input type="checkbox" id={`ly-${key}`} checked={!!layers[key]} onChange={toggleLayer(key)} />
                        <span className="slider" />
                      </label>
                    </div>
                  ))}
                  {layers.radar || layers.ir ? (
                    <div className="lc-sub">
                      <div className="lc-sub-label">
                        <span>
                          {radarFrame == null
                            ? 'Loading the weather imagery…'
                            : radarFrame.failed
                              ? 'Weather imagery unavailable — the provider did not answer.'
                              : `RainViewer · frame ${radarFrame.at} UTC`}
                        </span>
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="map-note">
              FIR/UIR boundaries: real ATC data, geometry simplified for display — verify against official
              AIP/eAIP for operational use.
            </div>

            <div id="basemap-switch">
              {BASEMAPS.map(([id, label]) => (
                <button
                  type="button"
                  key={id}
                  data-base={id}
                  className={basemap === id ? 'active' : undefined}
                  onClick={() => setBasemap(id)}
                >
                  {label}
                </button>
              ))}
            </div>

            {data ? (
              <div className="fw__mapfoot">
                <span className={`fw__live${board.isFetching ? ' is-on' : ''}`}>
                  {board.isFetching ? 'READING' : 'IDLE'}
                </span>{' '}
                <span className={`fw__src fw__src--${(data.adsb?.state ?? 'not_run').toLowerCase()}`}>
                  {data.adsb?.provider ?? 'ADS-B'} · {data.adsb?.state ?? 'NOT RUN'}
                </span>
                {data.adsb?.state === 'LIVE' ? (
                  <>
                    {' '}
                    {data.adsb.seen} aircraft seen in the box, {data.adsb.matched} ours
                    {data.adsb.withoutModeS?.length > 0 ? (
                      <>
                        {' · '}
                        <b title={data.adsb.withoutModeS.join(', ')}>
                          {data.adsb.withoutModeS.length} of our tails carry no Mode-S code
                        </b>
                        {' — they cannot be correlated until one is entered'}
                      </>
                    ) : null}
                  </>
                ) : data.adsb?.state === 'NO_ANSWER' ? (
                  ' — the feed did not answer; the last known positions stand, with their age'
                ) : data.adsb?.state === 'NO_SOURCE' ? (
                  ' — no live source configured'
                ) : null}
                {' · '}
                {plotted.length} of {flights.length} legs plotted · {data.withoutSource} with no position ever
                received · {data.trackedStale} stale beyond {data.staleThresholdMinutes} min
              </div>
            ) : null}
          </div>

          <div id="right" className={detailOpen ? 'fw-open' : undefined} aria-hidden={detailOpen ? 'false' : 'true'}>
            <div className="fw-head">
              <h3>FLIGHT DETAIL</h3>
              <button
                id="fwDetailClose"
                className="fw-x"
                type="button"
                aria-label="Close the flight detail"
                title="Close the flight detail"
                onClick={() => setDetailOpen(false)}
              >
                ×
              </button>
            </div>
            <FlightWatchDetail flight={selected} />
          </div>
        </div>
      </div>
    </>
  )
}
