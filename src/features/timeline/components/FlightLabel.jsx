import { useEffect, useState } from 'react'
import {
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardList,
  Clock,
  FileText,
  Fuel,
  Globe,
  Plane,
  PlaneLanding,
  PlaneTakeoff,
  MoreVertical,
  Send,
  Settings,
  TriangleAlert,
  Users,
  Wrench,
  X,
} from 'lucide-react'
import { useLegReadiness } from '../../../hooks/useDispatchBoard'
import { useAirportDetail, useLeg, useSendMvt } from '../../../hooks/useOperations'
import { useSchedulingBoard } from '../../../hooks/useCrewScheduling'
import { useStationWeather } from '../../../hooks/useWeather'
import { EMPTY, hhmm, isoDate, titleCase } from '../../../lib/format'
import { flagSvg, placeSvg } from '../../../lib/flabelPlaces'
import '../../../styles/flightlabel.css'

/**
 * L'etiquette de vol — le panneau `TNPFL` du prototype (l. 76614-77627),
 * ouvert en cliquant une barre de la Flight Timeline.
 *
 * On en reprend la mise en page a l'identique : l'en-tete avec le numero, le
 * statut et le fil « date · immatriculation · type · route », la barre des huit
 * onglets, la carte de route ville a ville, le bloc des heures avec ATD/ATA et
 * « Send MVT », puis les quatre acces documentaires et « Open Flight Data ».
 *
 * <b>Chaque onglet montre ce que le serveur tient, et le dit quand il ne tient
 * rien.</b> Le prototype remplissait ses huit onglets de valeurs fabriquees —
 * l'audit A3 le releve pour les pax et les references broker, tires au hasard.
 * Ici FLIGHT, AIRPORT INFO et CREW sont servis par des endpoints reels
 * (GET /legs/{id}, /airports/{icao}, /crew/scheduling/board), SERVICES et OVF
 * PERMIT par les constats de GET /legs/{id}/readiness, et FUEL comme TRIP
 * FOLDER annoncent franchement qu'aucune source ne les alimente encore. Un
 * onglet vide qui dit pourquoi vaut mieux qu'un onglet plein qui invente.
 *
 * <b>« Send MVT » envoie vraiment.</b> Il appelle POST /legs/{id}/mvt, qui
 * horodate l'envoi sur l'etape ; le bouton se desactive ensuite et porte
 * l'heure. Dans le prototype il ne faisait rien.
 */

const TABS = [
  { id: 'FLIGHT', label: 'Flight', Icon: Plane },
  { id: 'AIRPORT', label: 'Airport info', Icon: Building2 },
  { id: 'SERVICES', label: 'Services', Icon: ClipboardList },
  { id: 'PERMIT', label: 'Ovf permit', Icon: Globe },
  { id: 'FUEL', label: 'Fuel', Icon: Fuel },
  { id: 'CREW', label: 'Crew', Icon: Users },
  { id: 'PAX', label: 'Pax', Icon: Users },
  { id: 'FOLDER', label: 'Trip folder', Icon: FileText },
]

/**
 * Le bandeau photographique de chaque onglet — les recadrages de la maquette
 * (flabel_assets.js : banner_airport, banner_services, banner_ovf, banner_fuel,
 * banner_crew, banner_pax, banner_trip).
 *
 * L'onglet FLIGHT n'en a pas : sa carte de route EST son visuel.
 */
const TAB_BANNER = {
  AIRPORT: 'banner-airport',
  SERVICES: 'banner-services',
  PERMIT: 'banner-ovf',
  FUEL: 'banner-fuel',
  CREW: 'banner-crew',
  PAX: 'banner-pax',
  FOLDER: 'banner-trip',
}

const STATUS_TONE = {
  PLANNED: 'fl__status--planned',
  PREPARED: 'fl__status--planned',
  RELEASED: 'fl__status--ready',
  DEPARTED: 'fl__status--live',
  ARRIVED: 'fl__status--done',
  CLOSED: 'fl__status--done',
  CANCELLED: 'fl__status--bad',
}

/**
 * « 15 Sept 2026 » dans la carte, « Tue, 15 Sept 2026 » dans le fil.
 *
 * La maquette ne met le jour de la semaine QUE dans le fil du haut : dans la
 * carte, la place sert au chiffre.
 */
function longDay(iso, withWeekday = false) {
  if (!iso) return EMPTY
  return new Date(iso).toLocaleDateString('en-GB', {
    ...(withWeekday ? { weekday: 'short' } : {}),
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
}

/** « 2h10 » — la duree bloc telle que le prototype l'ecrit. */
function blockTime(from, to) {
  if (!from || !to) return EMPTY
  const minutes = Math.round((new Date(to) - new Date(from)) / 60000)
  if (minutes <= 0) return EMPTY
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}

/**
 * Un cote du bandeau de route.
 *
 * Le decor — tour de controle, aerogare, trame urbaine et le repere de la ville
 * quand elle en a un — vient du dessin vectoriel du prototype, appele avec le
 * code du terrain. Une ville sans repere curate n'affiche que la tour et
 * l'aerogare : jamais le monument d'une autre ville.
 */
function Station({ icao, iata, role, side }) {
  const detail = useAirportDetail(icao)
  const airport = detail.data?.airport
  const code = airport?.iata ?? iata ?? icao
  // placeSvg rend { svg, label } : le label nomme le repere dessine
  // (« Eiffel Tower »), et sert d'alternative textuelle au decor.
  const art = placeSvg({ icao, iata: code, given: code }, side)
  const flag = flagSvg(airport?.countryIso2)
  return (
    <div className={`fl__station fl__station--${side === 'r' ? 'r' : 'l'}`}>
      {art?.svg ? (
        <span
          className="fl__place"
          title={art.label ?? undefined}
          dangerouslySetInnerHTML={{ __html: art.svg }}
        />
      ) : null}
      <span className="fl__stationtext">
        <b>{code ?? EMPTY}</b>
        <span>{airport?.city ?? (detail.isLoading ? '…' : '—')}</span>
        <i>{airport?.name ? `${airport.name} (${icao})` : icao}</i>
        <em>
          {flag ? (
            <span className="fl__flag" dangerouslySetInnerHTML={{ __html: flag }} />
          ) : null}
          {role}
        </em>
      </span>
    </div>
  )
}

export default function FlightLabel({ legId, onClose }) {
  const [tab, setTab] = useState('FLIGHT')
  const leg = useLeg(legId)
  const readiness = useLegReadiness(legId)
  const mvt = useSendMvt()
  const data = leg.data

  const board = useSchedulingBoard(data?.std ? { date: isoDate(new Date(data.std)), role: '' } : undefined)
  const crew = (board.data?.legs ?? []).find((row) => row.legId === legId)?.crew ?? []

  // La visibilite des deux terrains de l'etape, evaluee par le serveur.
  const stations = [data?.depIcao, data?.arrIcao].filter(Boolean)
  const weather = useStationWeather(stations)

  useEffect(() => {
    function onKey(event) {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!legId) return null

  const findings = [
    ...(readiness.data?.blocking ?? []),
    ...(readiness.data?.derogable ?? []),
    ...(readiness.data?.info ?? []),
  ]
  const of = (words) =>
    findings.filter((item) => words.some((word) => item.check?.toUpperCase().includes(word)))

  return (
    <>
      <div className="fl__backdrop" onClick={onClose} />
      <aside className="fl" role="dialog" aria-label="Flight label">
        <div className="fl__head">
          <button type="button" className="fl__close" onClick={onClose} aria-label="Close">
            <X size={16} />
          </button>
          <h2>{data?.flightNo ?? (leg.isLoading ? '…' : 'Flight')}</h2>
          <span className="fl__chip">
            <Clock size={11} /> OCC Dispatch
          </span>
          <span className={`fl__status ${STATUS_TONE[data?.status] ?? ''}`}>
            {titleCase(data?.status ?? 'unknown')}
          </span>
          <button
            type="button"
            className="fl__kebab"
            disabled
            title="Leg actions — cancel, re-time, re-assign — belong to Dispatch for now"
            aria-label="Leg actions"
          >
            <MoreVertical size={15} />
          </button>
        </div>

        <div className="fl__thread">
          {longDay(data?.std, true)} · {data?.registration ?? EMPTY} · {data?.model ?? data?.icaoType ?? EMPTY}{' '}
          · {data?.depIcao ?? '—'} → {data?.arrIcao ?? '—'}
        </div>

        <div className="fl__tabs">
          {TABS.map(({ id, label, Icon }) => (
            <button
              key={id}
              type="button"
              className={id === tab ? 'fl__tab fl__tab--on' : 'fl__tab'}
              onClick={() => setTab(id)}
            >
              <Icon size={15} />
              {label}
              {id === 'CREW' && crew.length > 0 ? <i>{crew.length}</i> : null}
            </button>
          ))}
        </div>

        <div className="fl__body">
          {TAB_BANNER[tab] ? (
            <div
              className="fl__banner"
              style={{ backgroundImage: `url(/flabel/${TAB_BANNER[tab]}.jpg)` }}
              role="presentation"
            />
          ) : null}

          {leg.isError ? <div className="fl__note">{leg.error?.message}</div> : null}

          {tab === 'FLIGHT' ? (
            <>
              {/* Le bandeau d'information du prototype : ici ce sont les
                  constats que le moteur de readiness classe en INFO. */}
              <LowVisibility board={weather.data} loading={weather.isLoading} stations={stations} />

              {(readiness.data?.info ?? []).slice(0, 1).map((item) => (
                <div className="fl__info" key={item.check}>
                  <span>
                    <b>{item.check}</b> — {item.message}
                  </span>
                </div>
              ))}

              <div className="fl__route">
                <Station icao={data?.depIcao} role="Departure" side="l" />
                <div className="fl__routemid">
                  {/* L'avion de la maquette (flabel_assets.mid), traverse par
                      la ligne de route pointillee, un point a chaque bout. */}
                  <span className="fl__line" aria-hidden="true">
                    <i />
                    <img src="/flabel/aircraft.png" alt="" />
                    <i />
                  </span>
                  <span className="fl__kind">
                    {(data?.flightType ?? 'PAX').toUpperCase()} · {data?.paxCount ?? 0} PAX
                  </span>
                </div>
                <Station icao={data?.arrIcao} role="Arrival" side="r" />
              </div>

              {/* L'heure reste en AMBRE tant qu'aucune heure reelle n'est
                  tombee : c'est une prevision. Elle passe au noir quand l'ATD
                  ou l'ATA est enregistree — le planifie et le constate ne se
                  lisent pas de la meme couleur. */}
              <div className="fl__card">
                <div className="fl__times">
                <div>
                  <span>
                    <PlaneTakeoff size={13} /> Departure
                  </span>
                  <b className={data?.outAt ? '' : 'fl__planned'}>
                    {hhmm(data?.std)} UTC
                    {data?.outAt ? null : <TriangleAlert size={13} />}
                  </b>
                  <em>
                    ATD
                    <i>{data?.outAt ? hhmm(data.outAt).slice(0, 2) : '--'}</i>:
                    <i>{data?.outAt ? hhmm(data.outAt).slice(3, 5) : '--'}</i>
                  </em>
                </div>
                <div>
                  <span>
                    <PlaneLanding size={13} /> Arrival
                  </span>
                  <b className={data?.inAt ? '' : 'fl__planned'}>
                    {hhmm(data?.sta)} UTC
                    {data?.inAt ? null : <TriangleAlert size={13} />}
                  </b>
                  <em>
                    ATA
                    <i>{data?.inAt ? hhmm(data.inAt).slice(0, 2) : '--'}</i>:
                    <i>{data?.inAt ? hhmm(data.inAt).slice(3, 5) : '--'}</i>
                    <button
                      type="button"
                      className="fl__mvt"
                      disabled={!legId || mvt.isPending || Boolean(data?.mvtSentAt)}
                      title={
                        data?.mvtSentAt
                          ? `Movement message sent ${hhmm(data.mvtSentAt)} UTC`
                          : 'Mark the movement message as sent on this leg'
                      }
                      onClick={() => mvt.mutate(legId)}
                    >
                      <Send size={12} />
                      {data?.mvtSentAt
                        ? `MVT ${hhmm(data.mvtSentAt)}Z`
                        : mvt.isPending
                          ? 'Sending…'
                          : 'Send MVT'}
                    </button>
                  </em>
                </div>
                </div>

                {/* Les quatre faits partagent le cadre des heures : la maquette
                    n'en fait pas des tuiles separees, elle les range en deux
                    rangees dans la meme carte, separees d'un filet. */}
                <div className="fl__quad">
                <div>
                  <span>
                    <Clock size={12} /> Flight time
                  </span>
                  <b>{blockTime(data?.std, data?.sta)}</b>
                </div>
                <div>
                  <span>
                    <CalendarDays size={12} /> Date
                  </span>
                  <b>{longDay(data?.std)}</b>
                </div>
                <div>
                  <span>
                    <FileText size={12} /> Registration
                  </span>
                  <b>{data?.registration ?? EMPTY}</b>
                </div>
                  <div>
                    <span>
                      <Settings size={12} /> Type of flight
                    </span>
                    <b>{data?.flightType ?? EMPTY}</b>
                  </div>
                </div>
              </div>
              {mvt.isError ? <div className="fl__note">{mvt.error?.message}</div> : null}

              {/* Les quatre acces du prototype. Aucun endpoint ne les sert
                  encore : ils restent visibles et inertes, avec la raison, au
                  lieu d'ouvrir un document fabrique. */}
              <div className="fl__docs">
                {[
                  ['OFP', 'ofp', 'The operational flight plan needs the flight-planning module'],
                  ['NOTAMs', 'notams', 'NOTAM retrieval needs the AVWX / Eurocontrol B2B source'],
                  ['Weather', 'weather', 'METAR / TAF retrieval needs the weather source'],
                  ['GENDEC', 'gendec', 'The general declaration needs the trip-folder module'],
                ].map(([label, image, why]) => (
                  <button
                    key={label}
                    type="button"
                    disabled
                    title={why}
                    aria-label={label}
                    style={{ backgroundImage: `url(/flabel/${image}.jpg)` }}
                  >
                    {/* Pas de libelle en surimpression : les visuels du
                        prototype portent deja le mot, et l'ecrire par-dessus
                        l'affichait deux fois. Le nom reste pour les lecteurs
                        d'ecran (aria-label) et dans l'infobulle. */}
                    <ChevronRight size={13} />
                  </button>
                ))}
              </div>
            </>
          ) : null}

          {tab === 'AIRPORT' ? (
            <div className="fl__pair">
              <AirportCard icao={data?.depIcao} role="Departure" />
              <AirportCard icao={data?.arrIcao} role="Arrival" />
            </div>
          ) : null}

          {tab === 'SERVICES' ? (
            <FindingList
              items={of(['SERVICE', 'HANDLING', 'CATERING', 'SLOT'])}
              empty="No ground-service finding on this leg."
            />
          ) : null}

          {tab === 'PERMIT' ? (
            <FindingList
              items={of(['PERMIT', 'OVERFLIGHT', 'CLEARANCE'])}
              empty="No permit finding on this leg."
            />
          ) : null}

          {tab === 'FUEL' ? (
            <div className="fl__note">
              <b>No fuel source yet.</b> Uplift, price and release figures need the fuel module;
              the prototype filled this tab with generated numbers, which is what audit A3 §6.3
              asks to stop.
            </div>
          ) : null}

          {tab === 'CREW' ? (
            crew.length === 0 ? (
              <div className="fl__note">
                <b>No seat filled on this leg.</b> Crew is assigned in Crew Scheduling, or from a
                Roster cell.
              </div>
            ) : (
              <div className="fl__crew">
                {crew.map((member) => (
                  <div key={member.assignmentId ?? member.personId}>
                    <b>{member.seat}</b>
                    <span>{member.fullName}</span>
                    <em>
                      {member.staffNo} · FTL {titleCase(member.ftlVerdict ?? 'unknown')}
                    </em>
                  </div>
                ))}
              </div>
            )
          ) : null}

          {tab === 'PAX' ? (
            <div className="fl__facts">
              <span>
                <Users size={12} /> Passengers
              </span>
              <b>{data?.paxCount ?? 0}</b>
              <span>
                <Plane size={12} /> Type of flight
              </span>
              <b>{data?.flightType ?? EMPTY}</b>
              <span>
                <FileText size={12} /> Client reference
              </span>
              <b>{data?.clientRef ?? EMPTY}</b>
            </div>
          ) : null}

          {tab === 'FLIGHT' ? (
            <>
              <button
                type="button"
                className="fl__open"
                disabled
                title="The full flight file is the Dispatch board for now"
              >
                <Wrench size={15} /> Open flight data <ChevronRight size={15} />
              </button>

              {/* La bande VIGIL de la maquette. Elle ne porte PAS de score :
                  celui du prototype (« Risk 98/100 ») sort du meme moteur que
                  l'optimiseur, que l'audit A3 declare aleatoire. Le visuel
                  reste, le chiffre attendra un moteur qui le calcule. */}
              {/* Le visuel de la maquette porte DEJA « VIGIL · Operations
                  assistant » : on ne le reecrit pas par-dessus, on lui laisse
                  sa moitie gauche et on pose l'evaluation a droite. */}
              <div className="fl__vigil">
                <span className="fl__vigilcard">
                  No risk score on this leg
                  <em>
                    The SMS scoring engine is not wired yet. The prototype shows one; it comes
                    from the engine audit A3 §6.2 calls random.
                  </em>
                </span>
              </div>
            </>
          ) : null}

          {tab === 'FOLDER' ? (
            <div className="fl__note">
              <b>No trip folder yet.</b> The folder assembles OFP, GENDEC, permits and handling
              confirmations into one document — none of those sources is wired.
            </div>
          ) : null}
        </div>


      </aside>
    </>
  )
}

/**
 * Le bandeau de basse visibilite — celui du prototype, mais servi par la regle
 * du serveur (LowVisibilityRule) plutot que par une lecture de METAR dans le
 * navigateur.
 *
 * <b>Quatre etats, et pas un de plus.</b> ACTIVE quand au moins un des deux
 * terrains est au niveau ou sous les minima ; CLEAR quand tous les terrains
 * evalues sont au-dessus ; NO_OBSERVATION quand rien n'a pu etre evalue ;
 * INSUFFICIENT DATA quand un message existe mais ne dit ni la visibilite ni le
 * plafond. Il n'existe pas de cinquieme valeur voulant dire « sans doute bon » :
 * l'habitude du prototype de lire une valeur absente comme une bonne valeur est
 * exactement ce qui mettait « Weather feed unavailable » a cote d'une pastille
 * verte.
 */
function LowVisibility({ board, loading, stations }) {
  if (loading) {
    return (
      <div className="fl__info">
        <span>Reading the aerodrome observations…</span>
      </div>
    )
  }

  const lvp = board?.lvp
  const missing = (board?.stations ?? [])
    .filter((station) => station.state === 'NO_OBSERVATION')
    .map((station) => station.icao)
  const known = stations.filter((icao) => !missing.includes(icao))

  let tone = 'fl__info'
  let headline
  let detail

  if (!lvp || lvp.state === 'NO_OBSERVATION') {
    headline = 'INSUFFICIENT DATA'
    detail = `no METAR/SPECI for ${(missing.length ? missing : stations).join(' and ')}`
  } else if (lvp.state === 'ACTIVE') {
    tone = 'fl__info fl__info--bad'
    headline = 'LVP ACTIVE'
    detail = `${lvp.stations.join(', ')} at or below ${lvp.visibilityMinimaM} m / ${lvp.ceilingMinimaFt} ft`
  } else if (lvp.notAssessable > 0) {
    headline = 'INSUFFICIENT DATA'
    detail = `${lvp.notAssessable} station(s) report neither visibility nor ceiling`
  } else {
    // Pas de vert. Le bandeau reste neutre quand tout va bien : il n a rien a
    // annoncer. Seul LVP ACTIVE se colore, parce que lui seul demande une
    // decision. Un bandeau vert permanent apprend a ne plus regarder le
    // bandeau — et c est le jour ou il passe au rouge qu on ne le voit pas.
    headline = 'ABOVE MINIMA'
    detail = `${known.join(' and ')} above ${lvp.visibilityMinimaM} m / ${lvp.ceilingMinimaFt} ft`
  }

  return (
    <div className={tone}>
      <span>
        <i>i</i> Low visibility — <b>{headline}</b> — {detail}
      </span>
      <button
        type="button"
        disabled
        title="The full low-visibility view — approach category against the aerodrome minima — is the LVP module, not yet wired"
      >
        Open LVP
      </button>
    </div>
  )
}

function AirportCard({ icao, role }) {
  const detail = useAirportDetail(icao)
  const airport = detail.data?.airport
  if (!icao) return null
  return (
    <div className="fl__apt">
      <div className="fl__apt-head">
        {role} · {icao}
      </div>
      {detail.isLoading ? <div className="fl__note">Reading the aerodrome…</div> : null}
      {airport ? (
        <div className="fl__facts">
          <span>Name</span>
          <b>{airport.name}</b>
          <span>City</span>
          <b>{airport.city ?? EMPTY}</b>
          <span>Elevation</span>
          <b>{airport.elevationFt != null ? `${airport.elevationFt} ft` : EMPTY}</b>
          <span>Longest runway</span>
          <b>{airport.longestRunwayFt != null ? `${airport.longestRunwayFt} ft` : EMPTY}</b>
          <span>RFFS</span>
          <b>{airport.rffsCategory ?? EMPTY}</b>
          <span>Time zone</span>
          <b>{airport.timeZone ?? EMPTY}</b>
        </div>
      ) : null}
      {detail.data?.runways?.length ? (
        <div className="fl__rwy">
          {detail.data.runways.map((runway) => (
            <span key={runway.designator ?? runway.id}>
              {runway.designator} · {runway.lengthFt ?? '?'} ft · {runway.surface ?? '—'}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  )
}

function FindingList({ items, empty }) {
  if (!items || items.length === 0) return <div className="fl__note">{empty}</div>
  return (
    <div className="finding-group">
      {items.map((item) => (
        <div className={`finding finding--${item.severity?.toLowerCase() ?? 'info'}`} key={`${item.check}-${item.message}`}>
          <div className="finding__check">{item.check}</div>
          <p className="finding__message">{item.message}</p>
          <div className="finding__rule">{item.rule}</div>
        </div>
      ))}
    </div>
  )
}
