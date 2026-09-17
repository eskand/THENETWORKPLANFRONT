import { useEffect, useMemo, useState } from 'react'
import { Layers, Radio, Search, TriangleAlert } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import { useAirports, useFollowingBoard, useLiveTraffic } from '../../hooks/useOperations'
import { isoDate } from '../../lib/format'
import FlightWatchDetail from './components/FlightWatchDetail'
import FlightWatchList from './components/FlightWatchList'
import FlightWatchMap from './components/FlightWatchMap'
import RiskPanel from './components/RiskPanel'

/**
 * Flight Following — TNP Flight Watch.
 *
 * Une carte, une liste triable, une evaluation SMS par vol. Tout vient d'un
 * seul appel, GET /v1/flight-following/board.
 *
 * Deux ecarts assumes avec le prototype, tous deux du meme ordre :
 *
 * 1. **Le prototype simule.** Son bandeau de pied dit « flight data simulated »
 *    et « Simulation active », et ses multiplicateurs 60x / 300x / 1200x font
 *    avancer des avions inventes. Ici les symboles viennent de
 *    `ops.position_reports`. Un vol sans position n'apparait pas sur la carte,
 *    et la liste le dit — « NO SOURCE » — au lieu de le faire voler.
 * 2. **Le rythme remplace la vitesse.** Les quatre boutons restent, mais ils
 *    reglent la frequence de rafraichissement du tableau, pas la vitesse d'une
 *    horloge fictive. Accelerer le temps sur des positions reelles n'a pas de
 *    sens : il n'y a rien a accelerer.
 */

const REFRESH = [
  { id: 'LIVE', label: 'LIVE', ms: 15_000 },
  { id: 'M1', label: '1 min', ms: 60_000 },
  { id: 'M5', label: '5 min', ms: 300_000 },
  { id: 'OFF', label: 'HOLD', ms: false },
]

/** Objet stable : recree a chaque rendu, il changerait la cle de requete
 *  de TanStack Query a chaque passage et relancerait la lecture sans fin. */
const USED_STATIONS = { usedOnly: true }

const BASEMAPS = [
  ['SATELLITE', 'Satellite'],
  ['DARK', 'Dark ops'],
  ['STREET', 'Street'],
]

/** Les couches de la carte, dans l'ordre du prototype. */
const OVERLAYS = [
  ['flights', '✈', 'Flights & active routes'],
  ['adsb', '📡', 'Live ADS-B traffic'],
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

/**
 * Les trames RainViewer : radar de precipitations et infrarouge.
 *
 * Chargees une seule fois, et seulement quand une des deux couches est
 * allumee. L'heure de la trame revient avec elle : une image radar dont on
 * ignore l'heure ne dit pas si elle date de cinq minutes ou d'une heure, et
 * une image d'il y a une heure lue comme une image du moment est pire que pas
 * d'image du tout.
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
        // The weather is context. Losing it must not take the flights with it,
        // and the chip says "unavailable" rather than showing a stale image.
        if (!cancelled) setFrame({ radar: null, infrared: null, at: null, failed: true })
      })
    return () => {
      cancelled = true
    }
  }, [enabled, frame])

  return frame
}

/** L'horloge UTC de l'en-tete, comme celle du prototype. */
function useUtcClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])
  return now.toISOString().slice(11, 19)
}

export default function FlightFollowingPage() {
  const navigate = useNavigate()
  const clock = useUtcClock()
  const [date] = useState(() => isoDate(new Date()))
  const [sort, setSort] = useState('risk')
  const [basemap, setBasemap] = useState('SATELLITE')
  const [query, setQuery] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [refresh, setRefresh] = useState('LIVE')
  const [layers, setLayers] = useState(DEFAULT_LAYERS)
  const [layersOpen, setLayersOpen] = useState(false)
  const showTraffic = layers.adsb
  const setShowTraffic = (next) =>
    setLayers((current) => ({
      ...current,
      adsb: typeof next === 'function' ? next(current.adsb) : next,
    }))
  const radarFrame = useRadarFrame(layers.radar || layers.ir)

  const interval = REFRESH.find((entry) => entry.id === refresh)?.ms ?? 15_000
  const board = useFollowingBoard(date, interval)
  const data = board.data

  /* Le reseau dessine sous les appareils : les aerodromes que l'exploitant
     CONNAIT, avec leurs coordonnees, depuis refdata.airports. Sans eux la
     carte n'est qu'une photo satellite.

     « Connait » veut dire « ou il va » : usedOnly. Le filtre etait inutile tant
     que refdata.airports tenait vingt-six lignes, parce que les deux voulaient
     dire la meme chose. V51 en a pose 9 584, et la couche est devenue neuf
     mille marqueurs Leaflet sur une carte qui en montre trente. */
  const airports = useAirports(USED_STATIONS)

  // Le trafic tiers reellement entendu dans la boite de l exploitant. Une
  // couche a part : ce ne sont pas nos vols, et la carte ne doit pas laisser
  // croire le contraire.
  const traffic = useLiveTraffic(showTraffic, interval || 30_000)

  const flights = useMemo(() => {
    if (!data) return []
    const all = [...data.airborne, ...data.upcoming, ...data.arrived]
    const needle = query.trim().toUpperCase()
    if (!needle) return all
    return all.filter((flight) =>
      [flight.flightNo, flight.registration, flight.icaoType, flight.depIcao, flight.arrIcao]
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

  return (
    <>
      <TopBar title="Flight Following — TNP Flight Watch" subtitle="Live ADS-B tracking" />

      <div className="shell__scroll">
        {board.isError ? (
          <main className="page">
            <ErrorState error={board.error} onRetry={() => board.refetch()} />
          </main>
        ) : !data ? (
          <main className="page">
            <LoadingState label="Loading the flight watch…" />
          </main>
        ) : (
          <div className="fw">
            <div className="fw__bar">
              <span className="fw__eyebrow">Live map &amp; SMS risk monitor</span>

              <label className="fw__search">
                <Search size={12} />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ICAO / CALLSIGN / OP"
                />
              </label>

              <div className="fw__seg">
                {REFRESH.map((entry) => (
                  <button
                    type="button"
                    key={entry.id}
                    className={refresh === entry.id ? 'is-on' : ''}
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

              <span className={`fw__live${board.isFetching ? ' is-on' : ''}`}>
                <Radio size={12} />
                {board.isFetching ? 'READING' : 'IDLE'}
              </span>

              <button type="button" className="fw__erp" onClick={() => navigate('/erp')}>
                <TriangleAlert size={12} />
                ACTIVATE ERP
              </button>

              <button
                type="button"
                className={showTraffic ? `fw__traffic is-on` : `fw__traffic`}
                title="Show other operators' aircraft heard by the ADS-B feed"
                onClick={() => setShowTraffic((current) => !current)}
              >
                TRAFFIC {traffic.data?.length ? `· ${traffic.data.length}` : ''}
              </button>

              <div className="fw__seg fw__seg--layers">
                {BASEMAPS.map(([id, label]) => (
                  <button
                    type="button"
                    key={id}
                    className={basemap === id ? 'is-on' : ''}
                    onClick={() => setBasemap(id)}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="fw__layers">
                <button
                  type="button"
                  className={`fw__layersbtn${layersOpen ? ' is-on' : ''}`}
                  title="Map layers"
                  onClick={() => setLayersOpen((current) => !current)}
                >
                  <Layers size={12} />
                  LAYERS
                </button>

                {layersOpen ? (
                  <div className="fw__layersmenu">
                    {OVERLAYS.map(([key, icon, label]) => (
                      <label className="fw__layerrow" key={key}>
                        <span className="fw__layerico">{icon}</span>
                        <span className="fw__layerlbl">{label}</span>
                        <input
                          type="checkbox"
                          checked={!!layers[key]}
                          onChange={(event) =>
                            setLayers((current) => ({ ...current, [key]: event.target.checked }))
                          }
                        />
                        <span className="fw__switch" />
                      </label>
                    ))}

                    {layers.radar || layers.ir ? (
                      <div className="fw__layernote">
                        {radarFrame == null
                          ? 'Loading the weather imagery…'
                          : radarFrame.failed
                            ? 'Weather imagery unavailable — the provider did not answer.'
                            : `RainViewer · frame ${radarFrame.at} UTC`}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </div>

              <span className="fw__clock">
                {clock}
                <i>UTC</i>
              </span>
            </div>

            <div className="fw__body">
              <div className="fw__left">
                <RiskPanel board={data} flights={flights} onSelect={setSelectedId} />

                <div className="fw__sorts">
                  <button
                    type="button"
                    className={sort === 'risk' ? 'is-on' : ''}
                    onClick={() => setSort('risk')}
                  >
                    Sort: Risk
                  </button>
                  <button
                    type="button"
                    className={sort === 'callsign' ? 'is-on' : ''}
                    onClick={() => setSort('callsign')}
                  >
                    Sort: Callsign
                  </button>
                </div>

                <div className="fw__listhead">
                  <span>Active flights</span>
                  <b>{flights.length}</b>
                </div>

                <FlightWatchList
                  flights={flights}
                  sort={sort}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
              </div>

              <div className="fw__map">
                <FlightWatchMap
                  flights={flights}
                  airports={airports.data?.rows ?? []}
                  bases={bases}
                  traffic={traffic.data ?? []}
                  showTraffic={showTraffic}
                  basemap={basemap}
                  layers={layers}
                  radarFrame={radarFrame}
                  selectedId={selectedId}
                  onSelect={setSelectedId}
                />
                {/* La legende du risque : quatre bandes, et ce qu'on attend
                    de l'operateur pour chacune. Une couleur sans sa consigne
                    est une couleur qu'on interprete. */}
                <div className="fw__risklegend">
                  <span><i style={{ background: '#27AE60' }} />Low — acceptable, routine watch</span>
                  <span><i style={{ background: '#E0C22A' }} />Medium — monitor, review trend</span>
                  <span><i style={{ background: '#E67E22' }} />High — mitigation required</span>
                  <span><i style={{ background: '#C0392B' }} />Critical — immediate action</span>
                </div>

                <div className="fw__mapfoot">
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
                  {plotted.length} of {flights.length} legs plotted · {data.withoutSource} with no
                  position ever received · {data.trackedStale} stale beyond{' '}
                  {data.staleThresholdMinutes} min
                </div>
              </div>

              <FlightWatchDetail flight={selected} />
            </div>
          </div>
        )}
      </div>
    </>
  )
}
