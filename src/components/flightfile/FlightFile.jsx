import { useEffect, useRef, useState } from 'react'
import {
  BarChart3, CircleCheck, Clock, FileText, Fuel, Globe, Pencil, Plane, Send, TriangleAlert,
  Users, UserRound, Wrench,
} from 'lucide-react'
import { LoadingState } from '../States'
import { useDispatchLeg, useLegReadiness } from '../../hooks/useDispatchBoard'
import { useAirportDetail } from '../../hooks/useOperations'
import { useRecordMovement, useSendMvt } from '../../hooks/useOperations'
import { useStationWeather } from '../../hooks/useWeather'
import { useFlightFileLvp, useFlightNote, useTripFolder } from '../../hooks/useFlightFile'
import { EMPTY, hhmm, isoDate, titleCase } from '../../lib/format'
import { documentHref } from '../../api/flightfile'
import AirportBlock from './AirportBlock'
import FlightHero, { nature } from './FlightHero'
import { vigilFor } from './vigil'
import CrewTab from './CrewTab'
import FuelTab from './FuelTab'
import HeaderMenu, { FlightDataModal, NoteModal } from './HeaderMenu'
import OccTimelineModal from './OccTimelineModal'
import LvpModal from './LvpModal'
import MvtModal from './MvtModal'
import OvfTab from './OvfTab'
import PaxTab from './PaxTab'
import ServicesTab from './ServicesTab'
import TripFolderTab from './TripFolderTab'
import '../../styles/flightfile.css'
import '../../styles/flightpanel.css'

/**
 * The flight file — ONE panel, opened from the Dispatch board and from the
 * Flight Timeline.
 *
 * <b>One panel, because the annexe has one.</b> The prototype picks the host
 * element and calls the same {@code showDetail()} either way (l. 9389):
 * {@code dispatchDetailPanel} on the dispatch desk, {@code detailPanel} on the
 * timeline, same markup, same eight tabs, same handlers. Two components would
 * drift — and the day they disagree, one screen tells a dispatcher a leg is
 * ready while the other says the crew is short.
 *
 * <b>One shape of data, for the same reason.</b> Dispatch already holds the row
 * (it is on the board it just drew); the Timeline holds only an identifier and
 * reads {@code GET /v1/dispatch/legs/&#123;id&#125;}, which assembles the row
 * through the very same code path as the board.
 *
 * <b>Two stylesheets, both the annexe's, both copied verbatim.</b>
 * {@code flightfile.css} is the panel's base block; {@code flightpanel.css} is
 * the annexe's « FLIGHT LABEL · MASTER DESIGN », which the prototype switched on
 * by adding one class — {@code panel.classList.add('fl-master')} — without
 * touching a single element. That is the point of the design: the DOM below is
 * the panel's ordinary DOM, and the premium look comes from the sheet.
 * Rebuilding the markup to chase the screenshot would produce something that
 * resembles it and drifts from it at the first correction.
 *
 * <b>What the JSX does add</b> is what {@code TNPFL.decorate()} injected on the
 * prototype side and nothing else: the route hero on the FLIGHT tab, and the
 * section banner on each of the others.
 *
 * <b>Eight tabs, the annexe's, in its order and its groups.</b> Plan, then
 * ground, then load, then documents — the order a dispatcher works a departure,
 * with a rule drawn at each change of group.
 */
const TABS = [
  ['flight', 'Flight', Plane, 'plan'],
  ['airport', 'Airport Info', Wrench, 'plan'],
  ['services', 'Services', Users, 'ground'],
  ['ovf', 'OVF Permit', Globe, 'ground'],
  ['fuel', 'Fuel', Fuel, 'ground'],
  ['crew', 'Crew', UserRound, 'load'],
  ['pax', 'Pax', Users, 'load'],
  ['tripfolder', 'Trip Folder', FileText, 'docs'],
]

/**
 * La pastille de statut de l'en-tete — statusLabel() de l'annexe (l. 12588) et
 * la classe que sa feuille colore (l. 1487-1492), par ton de statut.
 */
const STATUS_PILL = {
  SCHEDULED: ['scheduled', 'Scheduled'],
  ENROUTE: ['enroute', 'In flight'],
  DELAYED: ['delayed', 'Delayed'],
  AOG: ['aog', 'AOG'],
  MAINTENANCE: ['maint', 'Maintenance'],
  CANCELLED: ['cancelled', 'Cancelled'],
}

/** Les bandeaux de section de l'annexe (TNPFL.ASSETS.banner_*), par onglet. */
const BANNERS = {
  airport: 'banner-airport',
  services: 'banner-services',
  ovf: 'banner-ovf',
  fuel: 'banner-fuel',
  crew: 'banner-crew',
  pax: 'banner-pax',
}

export default function FlightFile({ row: given, legId, onClose }) {
  const [tab, setTab] = useState('flight')
  const [flightData, setFlightData] = useState(false)
  const [occTimeline, setOccTimeline] = useState(false)
  // Le tableau de dispatch tient deja la ligne ; la timeline n'a que
  // l'identifiant. La requete ne part donc que dans le second cas.
  const fetched = useDispatchLeg(given ? null : legId)
  const row = given ?? fetched.data

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  if (!given && !legId) return null

  if (!row) {
    return (
      <>
        <div className="drawer-backdrop drawer-backdrop--file" onClick={onClose} />
        <aside className="drawer fd-root fl-master" role="dialog" aria-label="Flight file">
          {fetched.isError
            ? <div className="fd-banner warn">{fetched.error?.message}</div>
            : <LoadingState label="Opening the flight file…" />}
        </aside>
      </>
    )
  }

  const ground = row.kind === 'GROUND'

  return (
    <>
      <div className="drawer-backdrop drawer-backdrop--file" onClick={onClose} />
      {/* UN SEUL PANNEAU, pour toutes les lignes du tableau. L'annexe ouvre le
          meme dossier sur un avion immobilise que sur un vol : sa ligne « sol »
          est un vol fictif dont le depart et l'arrivee sont l'escale ou
          l'appareil se trouve (l. 22755), et elle passe par le meme
          showDetail() — donc le meme .fl-master, les memes huit onglets. */}
      <aside className="drawer fd-root fl-master" role="dialog" aria-label="Flight file">

        <div className="detail-head">
          <button type="button" className="detail-close-btn" onClick={onClose}
                  title="Fermer" aria-label="Fermer">✕</button>
          <div className="flight-id">{ground ? row.registration : (row.flightNo ?? row.label)}</div>
          {/* La pastille de l'en-tete ouvre la MEME frise que l'entree du menu :
              l'annexe appelle openOccDispatchModal() depuis les deux. */}
          <button type="button" className="occ-dispatch-btn"
                  title="OCC Dispatch — full event timeline"
                  onClick={() => setOccTimeline(true)}>
            <Clock size={14} /><span>OCC Dispatch</span>
          </button>
          <div className={`status-pill ${
            (STATUS_PILL[row.statusTone] ?? [String(row.status ?? '').toLowerCase()])[0]}`}>
            {(STATUS_PILL[row.statusTone] ?? [null, titleCase(row.status)])[1]}
          </div>
          {/* Le menu de l'annexe (TNPFL.headerMenuHtml, l. 77315) : cinq actions,
              deroulees PAR-DESSUS le bandeau de date et la barre d'onglets. */}
          <HeaderMenu row={row} />
        </div>

        <div className="fd-sub">
          {[
            row.std ? longDate(row.std) : null,
            row.registration,
            row.model ?? row.icaoType,
            /* L'annexe ecrit toujours « depart → arrivee », y compris sur une
               ligne « sol » ou les deux sont l'escale : c'est le tableau qui
               ecrit « TUN (ground) », pas le dossier. */
            `${row.depCode ?? row.depIcao} → ${row.arrCode ?? row.arrIcao}`,
          ].filter(Boolean).join(' · ')}
        </div>

        <RiskBanner row={row} />

        <div className="fd-tabs">
          {TABS.map(([key, label, Icon, group], index) => (
            <Group key={key}>
              {index > 0 && TABS[index - 1][3] !== group
                ? <span className="fd-tab-sep" aria-hidden="true" /> : null}
              <div className={`fd-tab${tab === key ? ' active' : ''}`}
                   data-group={group} title={label}
                   onClick={() => setTab(key)} role="button" tabIndex={0}
                   onKeyDown={(event) => { if (event.key === 'Enter') setTab(key) }}>
                <span className="fd-tab-ico"><Icon size={17} /></span>
                <span className="lbl">{label}</span>
              </div>
            </Group>
          ))}
        </div>

        <div className="fd-body">
          <TabBody row={row} tab={tab} />
        </div>

        {/* Le pied de l'annexe — fdFooterHtml(), l. 16605. Deux boutons et deux
            seulement : « Open Flight Data » sur FLIGHT, « Flight Brief » sur
            SERVICES. Les six autres onglets n'ont pas de pied. */}
        {tab === 'flight' ? (
          <div className="fd-footer">
            {/* Le meme ecran que l'entree « Open Flight Data » du menu ⋮ :
                l'annexe appelle openFlightDataModal() depuis les deux endroits,
                et deux fiches differentes finiraient par ne plus s'accorder. */}
            <div className="fd-btn-solid" style={{ width: '100%' }} role="button" tabIndex={0}
                 onClick={() => setFlightData(true)}
                 onKeyDown={(event) => { if (event.key === 'Enter') setFlightData(true) }}>
              Open Flight Data
            </div>
          </div>
        ) : null}
        {tab === 'services' ? (
          <div className="fd-footer">
            <div className="fd-btn-brief" style={{ width: '100%' }} role="button" tabIndex={0}
                 title="Generate the pre-filled Flight Brief for this leg and save it as PDF">
              <FileText size={15} />
              Flight Brief<span className="kbd">PDF</span>
            </div>
          </div>
        ) : null}

        {/* L'annexe insere la bande JUSTE APRES le pied, sur tous les onglets. */}
        <VigilStrip row={row} tab={tab} />
      </aside>

      {flightData ? <FlightDataModal row={row} onClose={() => setFlightData(false)} /> : null}
      {occTimeline
        ? <OccTimelineModal row={row} onClose={() => setOccTimeline(false)} /> : null}
    </>
  )
}

/**
 * Un fragment nomme : `<>…</>` n'accepte pas de clef, et la barre d'onglets doit
 * pouvoir porter un separateur et un onglet sous la meme clef.
 */
function Group({ children }) {
  return <>{children}</>
}

/**
 * Le corps de l'onglet ouvert — renderTab() de l'annexe (l. 17443).
 *
 * <b>Un aiguillage, pas un composant fourre-tout.</b> Chaque onglet de l'annexe
 * a sa fonction de rendu (FD_TABS, l. 16590) ; ici chacun a son composant, et
 * le bandeau de section que {@code TNPFL.decorate()} injectait au-dessus est
 * pose une seule fois, ici, plutot que dans chacun d'eux.
 *
 * <b>Les onglets qui n'ont pas encore leur ecran</b> retombent sur la vue des
 * constats de mise en ligne : elle ne pretend pas etre l'onglet de l'annexe,
 * elle dit ce que le serveur sait deja de cette partie du dossier.
 */
function TabBody({ row, tab }) {
  if (tab === 'flight') return <FlightTab row={row} />

  const banner = <SectionBanner tab={tab} row={row} />

  // Tout ce que ces onglets portent appartient a une ETAPE : les services, les
  // permis, le carburant, les passagers, le dossier documentaire. Un appareil
  // immobilise n'en a pas, et une liste vide laisserait croire que tout est
  // fait. Seul AIRPORT INFO reste lisible — l'escale ou l'appareil se trouve
  // est une escale comme une autre.
  if (!row.legId && tab !== 'airport') {
    return (
      <>
        {banner}
        <div className="fd-banner warn">
          {row.registration} has no scheduled leg — services, permits, fuel, passengers and the
          trip folder all belong to a leg, and there is nothing to open until this aircraft is
          programmed again.
        </div>
      </>
    )
  }

  if (tab === 'services') return <>{banner}<ServicesTab row={row} /></>
  if (tab === 'ovf') return <>{banner}<OvfTab row={row} /></>
  if (tab === 'fuel') return <>{banner}<FuelTab row={row} /></>
  if (tab === 'crew') return <>{banner}<CrewTab row={row} /></>
  if (tab === 'pax') return <>{banner}<PaxTab row={row} /></>
  if (tab === 'tripfolder') return <>{banner}<TripFolderTab row={row} /></>

  return <ReadinessTab row={row} tab={tab} />
}

/* ─────────────────────────────── le bandeau de risque ──────────────────── */

/** L'encre de chaque niveau, telle que l'annexe la fixe (l. 67271). */
const RISK_INK = { LOW: '#14713a', MEDIUM: '#7a6300', HIGH: '#9a4d00', CRITICAL: '#96201a' }
const RISK_RULE = { LOW: '#2e8b57', MEDIUM: '#E0C22A', HIGH: '#E67E22', CRITICAL: '#C8202F' }

/**
 * Le bandeau de risque — sdRiskBanner() de l'annexe (l. 67262), avec sa classe
 * .fl-riskbanner et ses deux variables d'encre.
 *
 * <b>Silencieux en LOW</b>, comme chez elle : un bandeau permanent apprend a ne
 * plus regarder le bandeau.
 *
 * <b>L'indice est affiche a cote du niveau</b> parce que la matrice de l'ICAO
 * Doc 9859 est severite x probabilite : MEDIUM a 6 et MEDIUM a 12 n'appellent
 * pas la meme reponse, et c'est la cellule que le dirigeant responsable lit.
 * Le facteur dominant suit, pour qu'on sache ce qui porte l'indice sans avoir a
 * ouvrir le dossier.
 *
 * <b>Sur une ligne « sol », le bandeau dit l'aptitude au vol.</b> Il occupe la
 * meme place, porte la meme classe et la meme encre critique, mais annonce ce
 * que la ligne a de vrai : l'appareil n'est pas remis en service, et voici
 * pourquoi. La matrice score un vol ; quand il n'y en a pas, elle n'a rien a
 * dire et un bandeau vide aurait ete pire qu'un bandeau juste.
 */
function RiskBanner({ row }) {
  const level = String(row.riskLevel ?? '').toUpperCase()
  if (!level || level === 'LOW') return null

  return (
    <div className="fl-riskbanner"
         style={{ '--rk': RISK_RULE[level] ?? '#E67E22', '--rki': RISK_INK[level] ?? '#9a4d00' }}>
      <b><TriangleAlert size={13} /> {level} RISK</b>
      {row.riskIndex ? ' · INDEX ' + row.riskIndex : ''}
      {row.riskTop ? ' · ' + row.riskTop : ''}
      {/* LA PHRASE DE L'ANNEXE, telle quelle (sdRiskBanner, l. 67275).
          Elle est fixe chez elle, et c'est voulu : le bandeau du dossier dit
          le niveau et renvoie aux deux onglets qui portent les mitigations. La
          consigne detaillee par niveau — « Monitor and reassess : track trend… »
          — existe bien dans le prototype, mais l. 23080, dans le panneau
          d'evaluation SMS du Flight Following. La poser ici faisait tenir au
          bandeau quatre lignes de prose la ou l'annexe en tient une, et
          repoussait la barre d'onglets hors de l'ecran. */}
      <div className="sub">See Weather / NOTAMs below for mitigation.</div>
    </div>
  )
}

/**
 * La bande VIGIL au pied du dossier — vigilHtml() de l'annexe (l. 77518),
 * posee juste apres le pied sur chaque onglet, avec ses trois zones : le
 * message, sa pastille de niveau, et l'action.
 *
 * <b>Elle parle de l'ONGLET ouvert, pas du vol en general.</b> C'est le point
 * que j'avais manque : l'annexe recalcule la phrase a chaque onglet
 * (vigilFor(key, …), l. 77469) — le risque SMS sur FLIGHT, les services
 * confirmes sur SERVICES, les sieges armes sur CREW. Une phrase unique
 * repetee huit fois ne dit rien de l'onglet qu'on regarde, et on cesse de la
 * lire.
 *
 * <b>Les phrases sont celles de l'annexe</b>, mot pour mot la ou nos sources
 * repondent a la meme question. Ce qui change est d'ou vient le chiffre :
 * l'annexe interroge son assistant VIGIL, nous lisons les moteurs qui
 * produisent deja ces constats ailleurs — l'evaluation SMS, les services, le
 * FTL. Recopier « Risk 76/100 » inventerait un deuxieme score sur une echelle
 * que rien ne calcule ; l'indice de la matrice ICAO Doc 9859 va de 1 a 25, et
 * c'est celui-la qui est affiche.
 */
function VigilStrip({ row, tab }) {
  const verdict = vigilFor(tab, row)

  return (
    <div className="fl-vigil">
      <div className="msg" title={`${verdict.title} ${verdict.sub ?? ''}`}>
        <b>{verdict.title}</b>
        {verdict.sub ? <span>{verdict.sub}</span> : null}
        <i className={verdict.level} />
      </div>
      <div className="act" role="button" tabIndex={0} title={verdict.actionHint}>
        <BarChart3 size={13} /><span>{verdict.action}</span>
      </div>
    </div>
  )
}


/**
 * Le terrain tel que le bandeau de route le lit.
 *
 * <p>L'annexe le resout par {@code FL.station()}, qui interroge quatre registres
 * du prototype ; ici la ligne du tableau porte deja le nom, la ville et le code
 * pays, parce que le tableau de bord les a lus dans {@code refdata.airports}. Le
 * champ {@code given} existe pour la meme raison que chez elle : quand aucun
 * registre ne connait le terrain, on affiche le code saisi plutot que rien.
 */
function station(icao, code, name, city, iso2) {
  return {
    given: icao ?? code ?? '',
    icao: icao ?? '',
    iata: code && code.length === 3 ? code : '',
    name: name ?? '',
    city: city ?? '',
    iso2: iso2 ?? '',
    country: iso2 ?? '',
  }
}

function FlightTab({ row }) {
  const now = useMinuteClock()
  const ground = row.kind === 'GROUND'

  return (
    <>
      <LowVisibilityBanner row={row} />

      <FlightNoteBlock row={row} />

      {/* Pas de type de vol pour un appareil immobilise : la pastille du
          bandeau porte le motif, comme FL.nature() qui lit flight.label avant
          toute autre chose. */}
      <FlightHero
        from={station(row.depIcao, row.depCode, row.depName, row.depCity, row.depCountry)}
        to={station(row.arrIcao, row.arrCode, row.arrName, row.arrCity, row.arrCountry)}
        flightType={ground ? row.label : row.flightType}
        commercialType={ground ? null : row.commercialType}
      />

      {/* Le theme master masque cette route en texte (.fl-master .route-visual
          { display:none }) parce que le heros la porte deja. Elle reste dans le
          DOM pour la fiche sans theme et pour l'impression. */}
      <div className="route-visual">
        <div className="route-pt">
          <div className="code">{row.depCode ?? row.depIcao}</div>
          <div className="name">{row.depName ?? row.depIcao}</div>
        </div>
        <div className="route-line"><Plane className="route-icon-plane" size={26} /></div>
        <div className="route-pt">
          <div className="code">{row.arrCode ?? row.arrIcao}</div>
          <div className="name">{row.arrName ?? row.arrIcao}</div>
        </div>
      </div>

      {/* SIX CELLULES, DANS L'ORDRE DE L'ANNEXE, sur toutes les lignes.
          J'avais remplace la sixieme et retire les deux lignes ATD/ATA sur un
          appareil au sol : la grille perdait deux rangees, les cartes
          changeaient de hauteur, et le panneau ne ressemblait plus au sien.
          L'annexe garde ses six cellules quoi qu'il arrive et ecrit « — » la
          ou elle n'a rien : c'est la grille qui donne au dossier sa forme, et
          elle ne doit pas dependre de ce que la ligne porte. */}
      <div className="detail-grid">
        <div className="detail-cell">
          <div className="lbl">Departure</div>
          <div className={`val${overdue(row.std, row.atd, row.status, now) ? ' time-overdue' : ''}`}
               title={overdue(row.std, row.atd, row.status, now)
                 ? 'Departure overdue — log the ATD' : undefined}>
            {row.std ? `${hhmm(row.std)} UTC` : EMPTY}
            {/* Une heure revisee s'affiche a cote de l'heure programmee, jamais
                a sa place : le dispatcher doit voir qu'elle a bouge. */}
            {row.etd && row.etd !== row.std
              ? <span className="revised-time">→ {hhmm(row.etd)}</span> : null}
          </div>
          <div className="atd-row">
            <span className="atd-lbl">ATD</span>
            {/* Les champs restent en place sur un appareil au sol — la rangee
                fait la hauteur de la carte — mais ils n'ecrivent nulle part :
                il n'y a pas d'etape a horodater. */}
            <TimeMask legId={row.legId} kind="OUT" day={row.std} value={row.atd}
                      title={row.legId ? 'Actual Time of Departure (UTC, HH:MM)'
                        : 'No leg to record a movement against'} />
          </div>
        </div>

        <div className="detail-cell">
          <div className="lbl">Arrival</div>
          <div className={`val${overdue(row.sta, row.ata, row.status, now) ? ' time-overdue' : ''}`}
               title={overdue(row.sta, row.ata, row.status, now)
                 ? 'Arrival overdue — log the ATA' : undefined}>
            {row.sta ? `${hhmm(row.sta)} UTC` : EMPTY}
            {row.eta && row.eta !== row.sta
              ? <span className="revised-time">→ {hhmm(row.eta)}</span> : null}
          </div>
          <div className="atd-row">
            <span className="atd-lbl">ATA</span>
            <TimeMask legId={row.legId} kind="IN" day={row.sta} value={row.ata}
                      title={row.legId ? 'Actual Time of Arrival (UTC, HH:MM)'
                        : 'No leg to record a movement against'} />
            <SendMvtButton row={row} legId={row.legId} sentAt={row.mvtSentAt} />
          </div>
        </div>

        <div className="detail-cell">
          <div className="lbl">Flight time</div>
          <div className="val">{blockTime(row)}</div>
        </div>
        <div className="detail-cell">
          <div className="lbl">Date</div>
          <div className="val">{row.std ? shortDate(row.std) : EMPTY}</div>
        </div>
        <div className="detail-cell">
          <div className="lbl">Registration</div>
          <div className="val">{(row.registration ?? '').replace('-', '')}</div>
        </div>
        <div className="detail-cell">
          <div className="lbl">Type of flight</div>
          {/* LA LETTRE VIENT DU SERVEUR. C'est la case 8 du plan de vol, donc
              une regle : elle se derive de la nature commerciale et de ce que
              l'etape transporte, et cette regle a un seul domicile
              (CommercialType.flightPlanLetter). La deduire ici d'un libelle
              affiche en ferait une deuxieme, qui deriverait de la premiere. */}
          <div className="val"
               title={[row.commercialType, row.flightType].filter(Boolean).join(' · ')
                 || 'Not set from Sales'}>
            {row.flightPlanLetter ?? EMPTY}
          </div>
        </div>
      </div>

      {/* LES QUATRE TUILES DE L'ANNEXE, et ce qu'il y a derriere chacune.
          Aucune n'avait de gestionnaire : quatre tuiles mortes. */}
      <ActionTiles row={row} />

    </>
  )
}

/**
 * Le bloc « Flight note » de l'onglet FLIGHT — tabFlight() de l'annexe
 * (l. 14747-14757) : rendu seulement quand la note existe, avec l'horodatage
 * ecrit comme elle l'ecrit (l. 12090 : « YYYY-MM-DD HH:MMZ ») et « Edit », qui
 * ouvre la meme modale que l'entree « Flight note » du menu.
 */
function FlightNoteBlock({ row }) {
  const note = useFlightNote(row.legId, Boolean(row.legId))
  const [editing, setEditing] = useState(false)
  const text = note.data?.note
  if (!text) return null
  const stamp = note.data.noteAt
    ? `${new Date(note.data.noteAt).toISOString().slice(0, 16).replace('T', ' ')}Z`
    : null

  return (
    <>
      <div className="fd-note">
        <div className="fd-note-hd">
          <Pencil size={12} />
          <span>Flight note</span>
          {stamp ? <span className="fd-note-ts">{stamp}</span> : null}
          <span className="fd-note-edit" role="button" tabIndex={0} title="Edit this note"
                onClick={() => setEditing(true)}
                onKeyDown={(event) => { if (event.key === 'Enter') setEditing(true) }}>
            Edit
          </span>
        </div>
        <div className="fd-note-body">{text}</div>
      </div>
      {editing ? <NoteModal row={row} onClose={() => setEditing(false)} /> : null}
    </>
  )
}

/**
 * Les quatre tuiles du bas de l'onglet FLIGHT — {@code action-row} de l'annexe
 * (l. 14795).
 *
 * <b>Chacune ouvre ce que le produit sait, ou dit qu'il ne sait pas.</b> Une
 * tuile qui ne repond pas au clic est ce qu'il y a de pire : elle se lit comme
 * un defaut, et on cesse d'essayer les autres.
 */
function ActionTiles({ row }) {
  const [open, setOpen] = useState(null)
  const folder = useTripFolder(row.legId)
  const lvp = useFlightFileLvp({ legId: row.legId, stations: [row.depIcao, row.arrIcao] })

  const ofp = (folder.data?.documents ?? []).find((document) => document.kind === 'OFP')

  return (
    <>
      <div className="action-row">
        {/* L'OFP est une piece du dossier de vol : la tuile ouvre le fichier
            quand il est depose, et amene au TRIP FOLDER quand il ne l'est pas. */}
        <a className="action-btn" href={ofp ? documentHref(ofp.id) : undefined}
           target={ofp ? '_blank' : undefined} rel="noreferrer"
           title={ofp ? `${ofp.fileName} — open the operational flight plan`
             : 'No OFP on file yet — upload it on the TRIP FOLDER tab'}
           onClick={(event) => { if (!ofp) { event.preventDefault(); setOpen('ofp') } }}>
          <FileText size={15} />OFP
        </a>

        <div className="action-btn" role="button" tabIndex={0}
             title="NOTAM coverage for this route"
             onClick={() => setOpen('notam')}>
          <TriangleAlert size={15} />NOTAMs
        </div>

        {/* La meteo des deux terrains est exactement ce que le panneau LVP
            montre — METAR brut, visibilite, plafond, age. Une seconde fenetre
            meteo finirait par ne plus dire la meme chose. */}
        <div className="action-btn" role="button" tabIndex={0}
             title="Current observation at both aerodromes"
             onClick={() => setOpen('wx')}>
          <Globe size={15} />Weather
        </div>

        <div className="action-btn" role="button" tabIndex={0}
             title="General declaration"
             onClick={() => setOpen('gendec')}>
          <Send size={15} />GENDEC
        </div>
      </div>

      {open === 'wx' && lvp.data
        ? <LvpModal verdict={lvp.data} onClose={() => setOpen(null)} /> : null}

      {open === 'ofp' ? (
        <NoticeModal title={`OFP — ${row.flightNo ?? row.registration}`}
                     onClose={() => setOpen(null)}>
          No operational flight plan has been deposited on this leg. Upload it on the
          TRIP FOLDER tab — the tile then opens the file itself.
        </NoticeModal>
      ) : null}

      {open === 'notam' ? (
        <NoticeModal title={`NOTAMs — ${row.depIcao} / ${row.arrIcao}`}
                     onClose={() => setOpen(null)}>
          {/* L'annexe interroge AVWX depuis le navigateur, avec une cle d'API
              saisie a l'ecran. Aucun service NOTAM n'est branche cote serveur,
              et afficher « aucun NOTAM » reviendrait a dire qu'on a verifie. */}
          No NOTAM source is connected. The product cannot tell you whether this route is
          affected: check the pre-flight information bulletin with the briefing office.
        </NoticeModal>
      ) : null}

      {open === 'gendec' ? (
        <NoticeModal title={`GENDEC — ${row.flightNo ?? row.registration}`}
                     onClose={() => setOpen(null)}>
          The general declaration is a printable document built from the crew list and the
          passenger manifest. Both are now stored — the document itself is not generated yet.
        </NoticeModal>
      ) : null}
    </>
  )
}

/** Une boite d'information courte, dans la meme coque que les autres. */
function NoticeModal({ title, children, onClose }) {
  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  return (
    <div className="tnp-modal-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tnp-modal-box">
        <div className="tnp-modal-close" role="button" tabIndex={0} onClick={onClose}>✕</div>
        <div className="tnp-modal-title">{title}</div>
        <div className="fd-banner vigilance" style={{ marginTop: 12 }}>{children}</div>
        <div className="tnp-modal-actions">
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Close</div>
        </div>
      </div>
    </div>
  )
}

/**
 * « En retard de bloc » — TNPPaxDocs.isDepOverdue / isArrOverdue de l'annexe
 * (l. 72042+), avec sa tolerance de cinq minutes.
 *
 * <p>Un vol dont l'heure programmee est passee de plus de cinq minutes sans
 * qu'aucune heure reelle ait ete saisie passe au rouge : ce n'est pas le vol
 * qui est en retard, c'est le releve qui manque, et c'est au dispatcher de le
 * combler. Un vol annule ou immobilise n'est jamais en retard de releve — il
 * n'y a pas d'heure a saisir.
 */
const OVERDUE_MINUTES = 5

function overdue(scheduled, actual, status, now) {
  if (!scheduled || actual) return false
  const state = String(status ?? '').toUpperCase()
  if (state === 'CANCELLED' || state === 'MAINTENANCE' || state === 'AOG') return false
  return (now - new Date(scheduled)) / 60000 > OVERDUE_MINUTES
}

/**
 * L'horloge du panneau, au pas de la demi-minute.
 *
 * <p>L'annexe rafraichissait le panneau en place par un setInterval pour la
 * meme raison : l'alerte de releve doit apparaitre d'elle-meme quand les cinq
 * minutes tombent, sur un panneau que personne n'a retouche.
 */
function useMinuteClock() {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])
  return now
}

/**
 * Le bandeau de basse visibilite en tete de l'onglet FLIGHT — celui que
 * TNPLVP.ui.flightBannerHtml() posait la (annexe l. 74774).
 *
 * <b>Sa regle de silence est celle de l'annexe : rien quand c'est vert.</b> Un
 * bandeau permanent apprend a ne plus regarder le bandeau, et c'est le jour ou
 * il passe au rouge qu'on ne le voit pas. Il n'apparait donc que lorsqu'un des
 * deux terrains est au niveau ou sous les minima, ou lorsqu'aucune observation
 * ne permet de le dire — ce deuxieme cas etant lui aussi une decision a prendre.
 *
 * <b>La verite vient du serveur, pas du navigateur.</b> Le prototype relisait le
 * METAR dans la page ; ici c'est la meme regle LowVisibilityRule que la Flight
 * Timeline et le tableau OCC interrogent, pour que les trois ecrans ne puissent
 * pas annoncer trois minima differents sur le meme vol.
 */
function LowVisibilityBanner({ row }) {
  // Une etape est interrogee par son identifiant ; un appareil immobilise, qui
  // n'en a pas, par l'escale ou il se trouve — l'annexe en fait un vol fictif
  // dont le depart et l'arrivee sont cette escale (l. 22755).
  const lvp = useFlightFileLvp({ legId: row.legId, stations: [row.depIcao, row.arrIcao] })
  const [open, setOpen] = useState(false)
  const verdict = lvp.data

  // Tant que le verdict n'est pas revenu il n'y a rien a dire. Une fois revenu,
  // LE BANDEAU RESTE, quel que soit son etat.
  //
  // ECART ASSUME AVEC L'ANNEXE. Elle cache le bandeau en GREEN (l. 74778), et
  // sa raison est bonne : un bandeau permanent finit par ne plus etre lu. Mais
  // sa regle a ete ecrite pour un prototype dont la source meteo ne repond
  // jamais — chez elle le bandeau est donc toujours la. Ici les METAR arrivent,
  // le verdict est vert presque tout le temps, et la fonction devenait
  // introuvable. La valeur d'alerte est conservee par la couleur et le
  // pictogramme, pas par l'absence.
  if (!verdict) return null

  const green = verdict.severity === 'GREEN'
  const ink = verdict.severity === 'RED' ? '#C8202F'
    : verdict.severity === 'AMBER' ? '#c98900'
      : green ? '#1f9d5c' : '#6b7280'
  const background = verdict.severity === 'RED' ? 'rgba(200,32,47,.08)'
    : verdict.severity === 'AMBER' ? 'rgba(240,165,0,.12)'
      : green ? 'rgba(31,157,92,.08)' : 'rgba(107,114,128,.12)'
  const mark = verdict.severity === 'RED' ? '⛔'
    : verdict.severity === 'AMBER' ? '⚠' : green ? '✓' : 'ℹ'

  // En vert le serveur n'a pas de phrase a rendre — il n'a rien a signaler. Le
  // bandeau doit quand meme dire SUR QUOI il s'est prononce, sinon un vert sans
  // objet ne vaut pas mieux qu'un vert invente.
  const named = (verdict.stations ?? []).map((station) => station.icao).join(' · ')
  const line = green
    ? `${named || 'Both stations'} reporting above the low-visibility thresholds`
    : [verdict.reason, verdict.detail].filter(Boolean).join(' · ')

  return (
    <>
      <div className="revision-banner"
           style={{ background, borderColor: ink + '55', color: ink }}>
        <span>
          {mark} <b>Low visibility — {verdict.operationalStatus.replace(/_/g, ' ')}</b>
          {line ? ` — ${line}` : null}
        </span>
        {/* LE LIBELLE DE L ANNEXE, et il ouvre quelque chose : le verdict par
            aerodrome, sa mesure, sa provenance, et ce qui n a pas ete evalue. */}
        <button type="button" className="rb-btn" style={{ background: ink, color: '#fff' }}
                title="Low visibility assessment for both ends of this leg"
                onClick={() => setOpen(true)}>
          Open LVP
        </button>
      </div>
      {open ? <LvpModal verdict={verdict} onClose={() => setOpen(false)} /> : null}
    </>
  )
}


/**
 * La saisie d'heure de l'annexe — tnpMaskedTimeHtml(), l. 14507 : deux champs
 * de deux chiffres, heures puis minutes, et non un champ « HH:MM » ou l'on se
 * trompe de deux-points a chaque saisie.
 *
 * <b>Ce qu'elle fait en plus du prototype.</b> L'annexe rangeait l'heure dans
 * son objet en memoire ; ici la saisie complete part dans ops.leg_movements par
 * POST /v1/legs/{id}/movements. Une ATD est un evenement date, pas une case du
 * panneau : elle change le retard, libere l'avion pour l'etape suivante et
 * compte dans le temps de service de l'equipage.
 *
 * <b>Sans etape, les champs restent mais n'ecrivent pas.</b> La rangee fait la
 * hauteur de la carte et l'annexe la garde sur toutes ses lignes ; en revanche
 * un appareil au sol n'a aucun mouvement a horodater, et une saisie qui
 * n'arriverait nulle part serait pire qu'un champ inerte.
 *
 * <b>Le jour vient de l'horaire programme, l'heure de la saisie.</b> Un dossier
 * ouvert a 23h55 et une ATD a 00:05 restent sur le meme jour d'exploitation :
 * c'est l'etape qui porte la date, pas la pendule du poste.
 */
function TimeMask({ legId, kind, day, value, title }) {
  const recorded = value ? hhmm(value) : ''
  const [hh, setHh] = useState(recorded.slice(0, 2))
  const [mm, setMm] = useState(recorded.slice(3, 5))
  const minutes = useRef(null)
  const record = useRecordMovement()

  // Quand le tableau se rafraichit, la valeur enregistree reprend la main sur
  // ce qui est a l'ecran : sans cela une saisie refusee resterait affichee.
  useEffect(() => {
    setHh(recorded.slice(0, 2))
    setMm(recorded.slice(3, 5))
  }, [recorded])

  function digits(text) {
    return String(text).replace(/[^0-9]/g, '').slice(0, 2)
  }

  function commit(hours, mins) {
    if (!legId || !day) return
    if (hours.length !== 2 || mins.length !== 2) return
    if (Number(hours) > 23 || Number(mins) > 59) return
    if (`${hours}:${mins}` === recorded) return
    const at = new Date(day)
    at.setUTCHours(Number(hours), Number(mins), 0, 0)
    record.mutate({ legId, kind, at: at.toISOString() })
  }

  return (
    <span className="tnp-time-mask">
      <input type="text" inputMode="numeric" maxLength={2} className="tnp-time-h"
             value={hh} placeholder="--" title={title} disabled={!legId}
             onChange={(event) => {
               const next = digits(event.target.value)
               setHh(next)
               if (next.length === 2) minutes.current?.focus()
             }}
             onBlur={() => commit(hh, mm)} />
      <span className="tnp-time-sep">:</span>
      <input type="text" inputMode="numeric" maxLength={2} className="tnp-time-m"
             ref={minutes} value={mm} placeholder="--" title={title} disabled={!legId}
             onChange={(event) => setMm(digits(event.target.value))}
             onBlur={() => commit(hh, mm)} />
      {value ? <CircleCheck className="tnp-time-ok" size={16} aria-label="Recorded" /> : null}
    </span>
  )
}

/**
 * Le message de mouvement, envoye pour de bon.
 *
 * <p>Le bouton de l'annexe ouvrait une fenetre de texte ; celui-ci appelle
 * POST /v1/legs/{id}/mvt, qui horodate l'envoi sur l'etape. Un MVT que l'on
 * croit parti et qui ne l'est pas laisse l'escale d'arrivee sans preavis :
 * l'horodatage est la seule preuve qu'il a eu lieu.
 */
/**
 * Le bouton MVT de la carte d'arrivee.
 *
 * <b>Il ne faisait rien de visible.</b> Il appelait l'envoi sans gestionnaire
 * d'erreur : quand le serveur refusait — ce qu'il fait tant que l'heure bloc
 * n'est pas enregistree (MVT_TOO_EARLY) — le clic partait dans le vide. Un
 * bouton qui ne repond pas passe pour casse, et il l'etait de fait.
 *
 * <p>Il fait maintenant ce que l'agent vient faire : enregistrer l'heure bloc
 * s'il le faut, puis envoyer. Et il montre le refus quand il y en a un.
 */
function SendMvtButton({ row, legId, sentAt }) {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button type="button" className="fd-mvt" disabled={!legId}
              onClick={() => { if (legId) setOpen(true) }}
              title={!legId ? 'No leg to report a movement for'
                : sentAt ? `MVT sent at ${hhmm(sentAt)} UTC — draft it again`
                  : 'Draft the MVT movement message'}>
        ✈ {sentAt ? 'MVT sent' : 'Send MVT'}
      </button>
      {open ? <MvtModal row={row} onClose={() => setOpen(false)} /> : null}
    </>
  )
}

/* ────────────────── les autres onglets : ce que la release exige ───────── */

/** Le bandeau de section de l'annexe, en tete de chaque onglet sauf FLIGHT. */
function SectionBanner({ tab, row }) {
  if (tab === 'tripfolder') {
    return (
      <div className="fl-bnwrap-trip">
        <div className="fl-banner split">
          <div>
            <b>Trip folder <i>{row.flightNo ?? row.label}</i></b>
            <small>Flight documents uploaded by the crew ahead of / during this trip.</small>
          </div>
          <img src="/flabel/banner-trip.jpg" alt="" />
        </div>
      </div>
    )
  }
  const image = BANNERS[tab]
  if (!image) return null
  return (
    <div className="fl-banner" role="presentation"
         style={{ backgroundImage: `url(/flabel/${image}.jpg)`, backgroundSize: '100% 100%' }} />
  )
}

/**
 * Les checks de mise en ligne, filtres par l'onglet ouvert.
 *
 * <b>Un seul moteur.</b> Services, permis, carburant, equipage et passagers sont
 * les memes constats que la release endpoint applique ; les afficher par onglet
 * plutot que par un deuxieme calcul garantit que le panneau ne peut pas dire
 * « pret » sur un vol que la release refusera.
 */
function ReadinessTab({ row, tab }) {
  const { data, isLoading, error } = useLegReadiness(row.legId)

  const banner = <SectionBanner tab={tab} row={row} />
  /* L'onglet AIRPORT INFO porte ses propres en-tetes — « Departure — LFMN »,
     « Arrival — DTTA » — comme l'annexe. Un bandeau « AIRPORT INFO » au-dessus
     ne repeterait que le nom de l'onglet deja allume dans la barre. */
  const heading = tab === 'airport'
    ? null
    : <div className="fd-section">{TABS.find(([key]) => key === tab)?.[1]}</div>

  // Les checks de mise en ligne portent sur une ETAPE. Un appareil immobilise
  // n'en a pas : il n'y a ni service a confirmer, ni permis a obtenir, ni
  // equipage a armer. Dire « rien en attente » laisserait croire que le
  // dossier est pret, ce qui est exactement le contraire.
  if (!row.legId) {
    return (
      <>
        {banner}
        {heading}
        <div className="fd-banner warn">
          {row.registration} has no scheduled leg — the release checks run on a leg, and there is
          nothing to check until this aircraft is programmed again.
        </div>
      </>
    )
  }

  if (isLoading) return <>{banner}<LoadingState label="Running the readiness checks…" /></>
  if (error) {
    return <>{banner}<div className="fd-banner warn">Readiness unavailable — {error.message}</div></>
  }
  if (!data) return banner

  const wanted = {
    services: ['SERVICE', 'HANDLING', 'GROUND'],
    ovf: ['PERMIT', 'OVERFLIGHT'],
    fuel: ['FUEL'],
    crew: ['CREW'],
    pax: ['PAX', 'DOCUMENT'],
    airport: ['AIRPORT', 'RUNWAY', 'AERODROME'],
    tripfolder: ['DOCUMENT', 'FOLDER'],
  }[tab] ?? []

  const all = [
    ...data.blocking.map((item) => ({ ...item, variant: 'blocking' })),
    ...data.derogable.map((item) => ({ ...item, variant: 'derogable' })),
    ...data.info.map((item) => ({ ...item, variant: 'info' })),
  ]
  const items = all.filter((item) =>
    wanted.some((needle) => String(item.check ?? '').toUpperCase().includes(needle)))

  return (
    <>
      {banner}

      {heading}

      {tab === 'airport' ? <AirportPanels row={row} findings={all} /> : null}

      <Summary row={row} tab={tab} />

      {items.length === 0 ? (
        <div className="fd-banner ok">
          ✓ Nothing outstanding on this part of the file.
        </div>
      ) : items.map((item) => (
        <div className={`fd-finding fd-finding--${item.variant}`} key={item.check + item.message}>
          <div className="fd-finding__check">{item.check}</div>
          <p className="fd-finding__message">{item.message}</p>
          <div className="fd-finding__rule">{item.rule}</div>
        </div>
      ))}

      {/* Le verdict global reste visible sur chaque onglet : un dispatcher qui
          regarde le carburant doit quand meme savoir que l'equipage bloque. */}
      <div className={data.releasable ? 'fd-verdict is-ok' : 'fd-verdict is-blocked'}>
        {data.releasable ? <CircleCheck size={14} /> : <TriangleAlert size={14} />}
        {data.releasable
          ? 'No blocking finding on the whole file: this leg can be released'
          : `${data.blocking.length} blocking finding${
            data.blocking.length === 1 ? '' : 's'} across the file`}
      </div>
    </>
  )
}

/**
 * Les deux terrains de l'etape — l'onglet AIRPORT INFO de l'annexe.
 *
 * <p>Pour chaque cote : l'en-tete de section, la carte d'identite avec sa
 * meteo, puis la rangee de quatre cellules que l'annexe appelle
 * {@code .fl-arow} — horaires, RFFS, categorie, piste la plus longue. Les
 * chiffres viennent de {@code refdata.airports}, le METAR du serveur ; aucun
 * n'est deduit dans le navigateur.
 */
function AirportPanels({ row, findings }) {
  const stations = [row.depIcao, row.arrIcao].filter(Boolean)
  const weather = useStationWeather(stations)

  function observed(icao) {
    return (weather.data?.stations ?? []).find((station) => station.icao === icao)
  }

  /**
   * Le verdict d'aptitude d'un cote — computeAirportSuitability() de l'annexe
   * (l. 14806), rendue au serveur.
   *
   * <b>Ce qui change : qui juge.</b> L'annexe compare dans le navigateur la
   * longueur de piste a une table d'exigences ecrite a cote. Ici les memes
   * constats sont ceux des controles de mise en ligne — RUNWAY_TOO_SHORT,
   * RUNWAY_DATA — produits par le moteur qui decide aussi si l'etape peut
   * partir. Deux calculs de la meme regle finissent par ne plus dire la meme
   * chose, et c'est celui du serveur qui bloque le vol.
   */
  function verdict(icao) {
    const named = (findings ?? []).filter(
      (item) => String(item.message ?? '').includes(icao)
        && /RUNWAY|AIRPORT|AERODROME|SLOT/.test(String(item.check ?? '')))
    const blocking = named.filter((item) => item.variant === 'blocking')
    return {
      suitable: blocking.length === 0,
      reasons: named.map((item) => item.message),
    }
  }

  const depVerdict = verdict(row.depIcao ?? '')
  const arrVerdict = verdict(row.arrIcao ?? '')

  return (
    <>
      {/* Le bandeau de tete de l'annexe, aux memes mots (l. 14847). */}
      {!depVerdict.suitable || !arrVerdict.suitable ? (
        <div className="fd-banner warn">
          ⚠ Airport compatibility issue detected — see details below.
        </div>
      ) : null}

      <AirportSide
        role="Departure" icao={row.depIcao} iata={row.depCode}
        name={row.depName} city={row.depCity} iso2={row.depCountry}
        at={row.atd ?? row.etd ?? row.std} observed={observed(row.depIcao)}
        verdict={depVerdict}
      />
      <AirportSide
        role="Arrival" icao={row.arrIcao} iata={row.arrCode}
        name={row.arrName} city={row.arrCity} iso2={row.arrCountry}
        at={row.ata ?? row.eta ?? row.sta} observed={observed(row.arrIcao)}
        verdict={arrVerdict}
      />
    </>
  )
}

function AirportSide({ role, icao, iata, name, city, iso2, at, observed, verdict }) {
  const detail = useAirportDetail(icao)
  const airport = detail.data?.airport
  const longest = detail.data?.runways?.reduce(
    (best, runway) => Math.max(best, runway.lengthFt ?? 0), 0) || null

  if (!icao) return null

  return (
    <>
      {/* L'en-tete de section de l'annexe porte le verdict a droite (l. 14808) :
          un agent lit « Departure — LFPO · ✓ Suitable » d'un coup d'oeil,
          avant de descendre dans les chiffres. */}
      <div className="fd-section" style={{ justifyContent: 'space-between' }}>
        <span>{role} — {icao}</span>
        {verdict ? (
          <span className={`fd-badge ${verdict.suitable ? 'green' : 'red'}`}>
            {verdict.suitable ? '✓ Suitable' : '⚠ Not Suitable'}
          </span>
        ) : null}
      </div>

      {verdict && !verdict.suitable ? (
        <div className="fd-banner warn">⚠ {verdict.reasons.join(' · ')}</div>
      ) : null}

      <AirportBlock
        icao={icao} iata={iata} name={name ?? airport?.name} city={city ?? airport?.city}
        iso2={iso2 ?? airport?.countryIso2} at={at}
        observation={observed?.observation} state={observed?.state}
      />

      {/* LA LIGNE NOTAM DE L'ANNEXE, dans le seul etat qu'elle peut prendre
          ici. Le prototype interroge AVWX depuis le navigateur avec une cle
          d'API saisie a l'ecran, et ecrit lui-meme cette phrase quand la
          reponse ne couvre pas le terrain (l. 14818). Aucun service NOTAM
          n'est branche cote serveur : afficher « aucun NOTAM » serait dire
          qu'on a verifie. */}
      <div className="fd-banner vigilance">
        🛰 NOTAM check — no coverage for this location (Data Missing): verify with the
        briefing office.
      </div>

      {/* La rangee basse de la maquette : quatre cellules sur une ligne.
          « NO DATA » plutot qu'un tiret la ou l'annexe l'ecrit aussi — c'est
          le registre qui est muet, pas le terrain qui n'a pas d'horaires. */}
      <div className="fd-grid fl-arow">
        <div className="fd-card">
          <div className="lbl">Operating Hours</div>
          <div className="val">{airport?.operatingHours ?? 'NO DATA'}</div>
        </div>
        <div className="fd-card">
          <div className="lbl">RFFS Category</div>
          <div className="val">{airport?.rffsCategory ?? airport?.fireCategory ?? 'NO DATA'}</div>
        </div>
        <div className="fd-card">
          <div className="lbl">Airport CAT</div>
          <div className="val">
            <span className="fd-badge amber">{airport?.aerodromeCategory ?? 'NO DATA'}</span>
          </div>
        </div>
        <div className="fd-card">
          <div className="lbl">Longest RWY</div>
          <div className="val">
            {/* En PIEDS, parce que c'est l'unite dans laquelle le registre les
                tient et celle que lit un manuel de vol occidental. L'annexe
                ecrit « m » sur une valeur qu'elle stocke en pieds ; recopier
                l'etiquette sans la conversion aurait fait dire a la fiche
                qu'une piste de 10 800 ft en fait 10 800. */}
            {longest != null ? `${longest} ft` : 'NO DATA'}
          </div>
        </div>
      </div>
    </>
  )
}


/** Le chiffre que l'onglet resume, quand la ligne du tableau le porte. */
function Summary({ row, tab }) {
  const rows = {
    services: [['Confirmed', `${row.servicesConfirmed} of ${row.servicesTotal}`],
      ['Readiness', titleCase(row.servicesReadiness)]],
    ovf: [['Outstanding', String(row.permitsOutstanding)]],
    crew: [['Seats filled', `${row.crewSeatsFilled} of ${row.crewMinimumSeats}`],
      ['FTL', titleCase(row.crewFtlStatus)], ['Documents', titleCase(row.crewDocumentStatus)]],
    pax: [['On board', String(row.paxCount ?? 0)]],
  }[tab]

  if (!rows) return null
  return (
    <div className="fd-grid">
      {rows.map(([label, value]) => (
        <div className="fd-card" key={label}>
          <div className="lbl">{label}</div>
          <div className="val">{value}</div>
        </div>
      ))}
    </div>
  )
}

/* ─────────────────────────── un avion au sol ───────────────────────────── */

/* ───────────────────────────────── formats ─────────────────────────────── */

/** « Wed, 16 Sept 2026 » — la date en tete du dossier. */
function longDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    weekday: 'short', day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

function shortDate(iso) {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC',
  })
}

/** Le temps de vol programme, « 2h10 ». */
function blockTime(row) {
  if (!row.std || !row.sta) return EMPTY
  const minutes = Math.round((new Date(row.sta) - new Date(row.std)) / 60000)
  if (minutes <= 0) return EMPTY
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}
