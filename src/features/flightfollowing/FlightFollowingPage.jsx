import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
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

/** La famille de flotte d'un type — fwFamille js/06 l. 662-669, sur « modèle + code OACI ». */
export function fwFamille(actype) {
  const t = String(actype || '')
  if (/7X|900|2000|Falcon/i.test(t)) return 'FALCON'
  if (/Citation|525/i.test(t)) return 'CITATION'
  if (/Legacy/i.test(t)) return 'LEGACY'
  if (/Lineage|E190/i.test(t)) return 'E190'
  return 'OTHER'
}

/** Le libellé d'une famille dans le sélecteur — fwRemplirFiltres js/06 l. 716-719. */
function familleLabel(k) {
  return k === 'E190' ? 'Lineage / E190' : k.charAt(0) + k.slice(1).toLowerCase()
}

/** La phase se lit de l'horaire (fwPhase js/06 l. 675-695) : ici du statut de l'étape. */
function fwPhase(flight) {
  if (flight.status === 'DEPARTED') return 'air'
  return 'ground'
}

const FW_RANG = { LOW: 1, MEDIUM: 2, HIGH: 3, CRITICAL: 4 }
const NO_FILTER = { fleet: 'ALL', phase: 'ALL', risk: 'ALL', op: 'ALL' }

/** fwPasseFiltres js/06 l. 697-703. */
function passesFilters(flight, filters) {
  if (filters.fleet !== 'ALL' && fwFamille(`${flight.model ?? ''} ${flight.icaoType ?? ''}`) !== filters.fleet) return false
  if (filters.phase !== 'ALL' && fwPhase(flight) !== filters.phase) return false
  if (filters.risk !== 'ALL' && (FW_RANG[flight.risk?.level] || 0) < (FW_RANG[filters.risk] || 0)) return false
  if (filters.op !== 'ALL' && flight.operator !== filters.op) return false
  return true
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
  const [rv, setRv] = useState(null)
  const [frameIdx, setFrameIdx] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [opacity, setOpacity] = useState(70)
  const [wxTime, setWxTime] = useState('LIVE')

  useEffect(() => {
    if (!enabled || rv) return undefined
    let cancelled = false
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((response) => response.json())
      .then((data) => {
        if (!cancelled) setRv(data ?? { failed: true })
      })
      .catch(() => {
        if (!cancelled) setRv({ failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, rv])

  const past = useMemo(() => rv?.radar?.past ?? [], [rv])
  const infraredFrames = rv?.satellite?.infrared ?? []
  const idx = frameIdx == null ? past.length - 1 : frameIdx

  /* ▶ : une trame toutes les 600 ms, son heure dans #wx-time (js/06 l. 1669-1685). */
  useEffect(() => {
    if (!playing || past.length === 0) return undefined
    const timer = setInterval(() => {
      setFrameIdx((current) => {
        const next = ((current == null ? past.length - 1 : current) + 1) % past.length
        const d = new Date(past[next].time * 1000)
        const pad = (n) => String(n).padStart(2, '0')
        setWxTime(`${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}Z`)
        return next
      })
    }, 600)
    return () => clearInterval(timer)
  }, [playing, past])

  const radar = past[idx]
  const infrared = infraredFrames[infraredFrames.length - 1]
  return {
    frame: rv
      ? {
          radar: radar ? `${rv.host}${radar.path}/256/{z}/{x}/{y}/2/1_1.png` : null,
          infrared: infrared ? `${rv.host}${infrared.path}/256/{z}/{x}/{y}/0/0_0.png` : null,
          failed: !!rv.failed,
        }
      : null,
    opacity,
    setOpacity,
    playing,
    /* stopWxAnim js/06 l. 1687-1691 : la pause garde l'heure affichée. */
    togglePlaying: () => setPlaying((current) => !current),
    wxTime,
    /* ly-radar coché ou décoché : trame vivante, « LIVE » (l. 1640-1650). */
    reset: () => {
      setPlaying(false)
      setFrameIdx(null)
      setWxTime('LIVE')
    },
  }
}

/** L'horloge UTC du bandeau — js/06 l. 546-552 : HH:MM:SS<small>UTC</small>. */
function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/** « 12 s ago » / « 3 min ago » / « 2 h ago » — fwAgeTxt js/06 l. 749-755. */
function fwAgeTxt(ms) {
  const s = Math.max(0, Math.round(ms / 1000))
  if (s < 90) return `${s} s ago`
  const m = Math.round(s / 60)
  if (m < 90) return `${m} min ago`
  return `${Math.round(m / 60)} h ago`
}

/** ok < 2 min, warn < 10 min, stale au-delà — fwAgeClasse js/06 l. 756-761. */
function fwAgeClasse(ms) {
  const m = ms / 60000
  if (m < 2) return 'ok'
  if (m < 10) return 'warn'
  return 'stale'
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
  const now = useUtcClock()
  const clock = now.toISOString().slice(11, 19)
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
  const [filters, setFilters] = useState(NO_FILTER)
  const [detailOpen, setDetailOpen] = useState(false)
  // « FOLLOW THIS FLIGHT ON MAP » — followSelected js/06 l. 1604-1608.
  const [following, setFollowing] = useState(false)
  // LIVE (js/09 l. 175-186) : éteint au départ, comme NP.adsb._on.
  const [live, setLive] = useState(false)
  const showTraffic = live && layers.adsb
  const radar = useRadarFrame(layers.radar || layers.ir)
  const radarFrame = radar.frame

  const interval = REFRESH.find((entry) => entry.id === refresh)?.ms ?? 15_000
  const board = useFollowingBoard(date, interval)
  const data = board.data

  /* Le réseau dessiné sous les appareils : les aérodromes que l'exploitant
     dessert (usedOnly), depuis refdata.airports. */
  const airports = useAirports(USED_STATIONS)
  const traffic = useLiveTraffic(showTraffic, interval || 30_000)

  /* Tous les vols du tableau : la carte et les compteurs les voient tous. */
  const all = useMemo(() => (data ? [...data.airborne, ...data.upcoming, ...data.arrived] : []), [data])

  /* La liste : le texte cherche d'abord, les filtres retranchent ensuite
     (renderList js/06 l. 1118-1125). */
  const flights = useMemo(() => {
    const needle = query.trim().toUpperCase()
    return all.filter(
      (flight) =>
        (!needle ||
          [flight.flightNo, flight.registration, flight.icaoType, flight.depIcao, flight.arrIcao, flight.operator]
            .filter(Boolean)
            .some((field) => field.toUpperCase().includes(needle))) &&
        passesFilters(flight, filters),
    )
  }, [all, query, filters])

  /* Les options se déduisent de ce qui est suivi (fwRemplirFiltres js/06 l. 706-739). */
  const families = useMemo(
    () => [...new Set(all.map((flight) => fwFamille(`${flight.model ?? ''} ${flight.icaoType ?? ''}`)))].sort(),
    [all],
  )
  const operators = useMemo(() => [...new Set(all.map((flight) => flight.operator).filter(Boolean))].sort(), [all])

  const selected = all.find((flight) => flight.legId === selectedId) ?? null
  const plotted = all.filter((flight) => flight.lastPosition)

  /* Un seul point d'entrée pour choisir un vol — liste ou carte — qui ouvre
     le détail (js/07 : selectFlight → openDetail). */
  const selectFlight = useCallback((legId) => {
    setSelectedId(legId)
    setFollowing(false)
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

  const toggleLayer = (key) => (event) => {
    setLayers((current) => ({ ...current, [key]: event.target.checked }))
    if (key === 'radar') radar.reset()
  }

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

            <RiskPanel board={data} flights={all} onSelect={selectFlight} />

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

            <div className="fw-filters">
              <select
                id="fwFleet"
                title="Filter by fleet"
                value={filters.fleet}
                onChange={(event) => setFilters((current) => ({ ...current, fleet: event.target.value }))}
              >
                <option value="ALL">Fleet: All</option>
                {families.map((k) => (
                  <option value={k} key={k}>
                    Fleet: {familleLabel(k)}
                  </option>
                ))}
              </select>
              <select
                id="fwPhase"
                title="Filter by flight phase"
                value={filters.phase}
                onChange={(event) => setFilters((current) => ({ ...current, phase: event.target.value }))}
              >
                <option value="ALL">Phase: All</option>
                <option value="air">Airborne</option>
                <option value="ground">On ground</option>
                <option value="divert">Diverting</option>
              </select>
              <select
                id="fwRisk"
                title="Show this risk level and above"
                value={filters.risk}
                onChange={(event) => setFilters((current) => ({ ...current, risk: event.target.value }))}
              >
                <option value="ALL">Risk: All</option>
                <option value="MEDIUM">Risk: Medium +</option>
                <option value="HIGH">Risk: High +</option>
                <option value="CRITICAL">Risk: Critical</option>
              </select>
              <select
                id="fwOp"
                title="Filter by operator"
                style={operators.length > 1 ? undefined : { display: 'none' }}
                value={filters.op}
                onChange={(event) => setFilters((current) => ({ ...current, op: event.target.value }))}
              >
                <option value="ALL">Operator: All</option>
                {operators.length > 1
                  ? operators.map((k) => (
                      <option value={k} key={k}>
                        Operator: {k}
                      </option>
                    ))
                  : null}
              </select>
              <button id="fwClear" type="button" title="Clear every filter" onClick={() => setFilters(NO_FILTER)}>
                Clear
              </button>
            </div>

            <div className="panel-head">
              <h3>ACTIVE FLIGHTS</h3>
              {/* Le compteur dit ce qu'il montre ET sur combien, dès qu'un filtre agit (js/06 l. 1131-1133). */}
              <span className="count" id="flightcount">
                {flights.length === all.length ? flights.length : `${flights.length} / ${all.length}`}
              </span>
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
              flights={all}
              airports={airports.data?.rows ?? []}
              traffic={traffic.data ?? []}
              showTraffic={showTraffic}
              basemap={BASEMAPS.find(([id]) => id === basemap)?.[2] ?? 'SATELLITE'}
              layers={layers}
              radarFrame={radarFrame}
              radarOpacity={radar.opacity}
              selectedId={selectedId}
              onSelect={selectFlight}
              following={following}
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
                    <Fragment key={key}>
                      <div className="lc-item">
                        <label htmlFor={`ly-${key}`}>
                          <span className="lc-icon">{icon}</span> {label}
                        </label>
                        <label className="switch">
                          <input type="checkbox" id={`ly-${key}`} checked={!!layers[key]} onChange={toggleLayer(key)} />
                          <span className="slider" />
                        </label>
                      </div>
                      {key === 'radar' ? (
                        /* « Radar opacity » — index.html l. 136-139, js/06 l. 1638, 1652-1655. */
                        <div className="lc-sub" id="radar-opacity-wrap" style={{ display: layers.radar ? 'block' : 'none' }}>
                          <div className="lc-sub-label">
                            <span>Radar opacity</span>
                            <span id="radar-op-val">{radar.opacity}%</span>
                          </div>
                          <input
                            type="range"
                            id="radar-opacity"
                            min="10"
                            max="100"
                            value={radar.opacity}
                            onChange={(event) => radar.setOpacity(Number(event.target.value))}
                          />
                        </div>
                      ) : null}
                    </Fragment>
                  ))}
                  {(layers.radar || layers.ir) && radarFrame?.failed ? (
                    <div className="lc-sub">
                      <div className="lc-sub-label">
                        <span>Weather imagery unavailable — the provider did not answer.</span>
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

            {/* ▶ / heure de la trame — index.html l. 184-187, js/06 l. 1639, 1669-1691. */}
            <div id="wx-anim-ctl" className={layers.radar ? 'show' : undefined}>
              <button id="wx-play" type="button" onClick={() => radar.togglePlaying()}>
                {radar.playing ? '⏸' : '▶'}
              </button>
              <span className="wxtime" id="wx-time">
                {radar.wxTime}
              </span>
            </div>

            {/* La source et l'âge de la position — fwRefreshFeedAge js/06 l. 763-780.
                La référence dit « Simulated — computed continuously » hors ADS-B
                (A-D14) ; ici la position est toujours reçue, jamais calculée. */}
            {(() => {
              const adsb = data?.adsb
              const ranAt = adsb?.ranAt ? new Date(adsb.ranAt) : null
              const ms = adsb?.state === 'LIVE' && ranAt ? now - ranAt : null
              const cls = ms == null ? null : fwAgeClasse(ms)
              return (
                <div id="fw-feed-age" className={cls ? `fw-feed ${cls}` : 'fw-feed'}>
                  <b>POSITION SOURCE</b>
                  {ms == null ? (
                    <>
                      {adsb?.provider ?? 'ADS-B'} · {(adsb?.state ?? 'NOT_RUN').replace('_', ' ')} — received fixes only.
                      Press LIVE for ADS-B traffic.
                    </>
                  ) : (
                    <>
                      ADS-B ({adsb.provider}) · last sweep <b className="age">{fwAgeTxt(ms)}</b>
                      {cls === 'stale' ? ' — treat these positions as out of date' : ''}
                    </>
                  )}
                </div>
              )
            })()}

            {/* L'encart du trafic — fwSetAdsb js/06 l. 1731-1733, posé quand LIVE est allumé. */}
            {live && traffic.data ? (
              <div
                id="fw-adsb-status"
                style={{
                  position: 'absolute', bottom: 10, left: 10, zIndex: 600, background: 'rgba(10,22,40,.85)',
                  border: '1px solid #24406b', color: '#cfe0f5', font: '11px/1.4 system-ui', padding: '6px 9px',
                  borderRadius: 6, pointerEvents: 'none',
                }}
              >
                <span style={{ color: '#4DA3FF' }}>✈</span> ADS-B live: {traffic.data.length} traffic ·{' '}
                <span style={{ color: '#2ECC71' }}>✈</span> {data?.adsb?.matched ?? 0} fleet
                {data?.adsb?.ranAt ? ` · ${new Date(data.adsb.ranAt).toLocaleTimeString()}` : ''}
              </div>
            ) : null}

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
                {plotted.length} of {all.length} legs plotted · {data.withoutSource} with no position ever
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
            <FlightWatchDetail
              flight={selected}
              airports={airports.data?.rows ?? []}
              following={following}
              onToggleFollow={() => setFollowing((current) => !current)}
            />
          </div>
        </div>
      </div>
    </>
  )
}
