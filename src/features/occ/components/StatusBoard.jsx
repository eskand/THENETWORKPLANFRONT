import { useNavigate } from 'react-router-dom'

const ARROW = (
  <svg
    className="osb-arrow"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M5 12h14M13 6l6 6-6 6" />
  </svg>
)

const REFRESH = (
  <svg
    className="osb-refresh"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.9"
    strokeLinecap="round"
  >
    <path d="M21 12a9 9 0 1 1-3-6.7" />
    <path d="M21 4v5h-5" />
  </svg>
)

/**
 * La carte basse visibilite, en mots.
 *
 * Trois etats du serveur et trois phrases, sans quatrieme cas implicite :
 * ACTIVE nomme les stations concernees, CLEAR dit sur combien de stations le
 * verdict repose, NO_OBSERVATION dit qu'il n'y a rien a evaluer. Les stations
 * dont le message ne parle ni de visibilite ni de plafond sont comptees a
 * part et jamais lues comme degagees.
 */
function lvpDetail(lvp) {
  if (!lvp) return 'Weather not loaded'
  if (lvp.state === 'NO_OBSERVATION') return 'No live observation to assess'
  if (lvp.state === 'ACTIVE') {
    return `${lvp.stations.join(', ')} at or below ${lvp.visibilityMinimaM} m / ${lvp.ceilingMinimaFt} ft`
  }
  return `All ${lvp.assessed} station${lvp.assessed === 1 ? '' : 's'} above minima`
}

function lvpFoot(lvp) {
  if (!lvp) return 'Weather not loaded'
  if (lvp.state === 'NO_OBSERVATION') return 'No METAR source connected'
  if (lvp.notAssessable > 0) {
    return `${lvp.notAssessable} station${lvp.notAssessable === 1 ? '' : 's'} not assessable`
  }
  return `Minima ${lvp.visibilityMinimaM} m / ${lvp.ceilingMinimaFt} ft — open Airports Data`
}

/**
 * Operational Status Board.
 *
 * Le fond est l'artwork approuve d'un seul tenant ; les quatre cartes sont
 * posees dessus aux zones mesurees (voir .osb-c1..c4 dans occ.css), d'ou les
 * positions en pourcentage et les tailles en cqw plutot qu'en pixels.
 *
 * Trois modes sont deduits des donnees : IROPS depuis les AOG et les retards,
 * les creneaux depuis les CTOT du tableau, la basse visibilite depuis les
 * observations METAR des bases. Le quatrieme ne l'est pas : l'ERP n'a pas de
 * console, et sa carte le dit au lieu d'afficher un etat invente.
 *
 * La basse visibilite n'est pas evaluee ici : le serveur la calcule
 * (LowVisibilityRule, minima de l'exploitant) sur les memes observations que
 * le panneau meteo affiche, et renvoie l'etat. Le navigateur ne redecide pas
 * d'une procedure operationnelle.
 */
export default function StatusBoard({ occ, weather, updatedAt }) {
  const navigate = useNavigate()

  const iropsActive = occ.disruptions.length > 0
  const slotActive = occ.withCtot.length > 0

  const lvp = weather?.lvp ?? null
  const lvpActive = lvp?.state === 'ACTIVE'

  const tiles = [
    {
      key: 'erp',
      label: 'Emergency Response Plan',
      detail: 'Armed — no active emergency. Open the console to assess a situation.',
      active: false,
      foot: 'Open ERP to assess and activate',
      onOpen: () => navigate('/erp'),
    },
    {
      key: 'lvp',
      label: 'Low Visibility Procedures',
      detail: lvpDetail(lvp),
      active: lvpActive,
      foot: lvpFoot(lvp),
      onOpen: lvp && lvp.state !== 'NO_OBSERVATION' ? () => navigate('/airports') : null,
    },
    {
      key: 'irops',
      label: 'IROPS Mode',
      detail: iropsActive
        ? `${occ.disruptions.length} active · ${occ.aog} AOG · ${occ.delayed} delayed`
        : 'No disruption on the board today',
      active: iropsActive,
      foot: iropsActive ? 'View impact' : 'Open the dispatch board',
      onOpen: () => navigate('/dispatch'),
    },
    {
      key: 'slot',
      label: 'Slot Restrictions',
      detail: slotActive
        ? `${occ.withCtot.length} flight${occ.withCtot.length === 1 ? '' : 's'} holding a CTOT`
        : 'No active restrictions — no CTOT on the board',
      active: slotActive,
      foot: 'Open the dispatch board',
      onOpen: () => navigate('/dispatch'),
    },
  ]

  return (
    <div className="dash-card osb-host">
      <div className="osb">
        <div className="osb-head">
          <div className="osb-title">Operational Status Board</div>
          <div className="osb-sub">
            Monitor critical operational modes and system status
          </div>
        </div>

        <div className="osb-upd">
          Last updated <b>{updatedAt}</b>
          {REFRESH}
        </div>

        {tiles.map((tile, index) => {
          const classes = [
            'osb-card',
            `osb-c${index + 1}`,
            tile.active ? 'active' : '',
            tile.onOpen ? 'clickable' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div
              key={tile.key}
              className={classes}
              onClick={tile.onOpen ?? undefined}
              role={tile.onOpen ? 'button' : undefined}
              tabIndex={tile.onOpen ? 0 : undefined}
              onKeyDown={
                tile.onOpen
                  ? (event) => {
                      if (event.key === 'Enter' || event.key === ' ') tile.onOpen()
                    }
                  : undefined
              }
            >
              <div className="osb-body">
                <div className="osb-label">{tile.label}</div>
                <div className="osb-detail">{tile.detail}</div>
                <span className="osb-pill">{tile.active ? 'Active' : 'Standby'}</span>
              </div>
              <div className="osb-foot">
                {tile.foot}
                {tile.onOpen ? ARROW : null}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
