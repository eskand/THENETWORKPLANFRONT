import { useMemo, useState } from 'react'
import { Plane } from 'lucide-react'
import TopBar from '../../components/TopBar'
import Badge from '../../components/Badge'
import { ErrorState, LoadingState } from '../../components/States'
import {
  useAircraftCamo,
  useCamoFleet,
  useDirectives,
  useLifeLimitedParts,
} from '../../hooks/useMaintenance'
import { EMPTY, dayMonthYear } from '../../lib/format'
import AirworthinessFile from './components/AirworthinessFile'
import CamoDocumentModal from './components/CamoDocumentModal'
import '../../styles/camo.css'

const ARC_LABEL = {
  VALID: 'Valid',
  DUE_SOON: 'Due soon',
  CRITICAL: 'Renewal due',
  EXPIRED: 'Expired',
  NONE: 'None on file',
}

const DIRECTIVE_TONE = { OPEN: 'PENDING', DEFERRED: 'PENDING', COMPLIED: 'READY', NOT_APPLICABLE: 'NEUTRAL' }

const LLP_LABEL = { CRITICAL: 'Critical', WATCH: 'Monitor', OK: 'Healthy' }
const LLP_TONE = { CRITICAL: 'ATTENTION', WATCH: 'PENDING', OK: 'READY' }

/**
 * CAMO — navigabilite continue.
 *
 * <b>La forme vient de l'annexe A4</b> (viewCAMO, l. 7909-7975) : six tuiles,
 * trois onglets, trois filtres, une legende a trois pastilles, un tableau dont
 * la colonne d'immatriculation reste visible, et le dossier de navigabilite
 * ouvert a droite avec ses trois boutons.
 *
 * <b>Ce qui n'en vient pas.</b> Les chiffres. Le prototype lit un tableau
 * ecrit a la main dans son propre fichier ; ici chaque tuile est comptee sur ce
 * que la base contient au moment ou l'ecran s'ouvre. Deux consequences
 * assumees : les valeurs ne seront pas celles de la capture d'ecran du
 * prototype si la flotte differe, et elles bougent quand la flotte bouge —
 * ce qui est le but.
 *
 * <b>Un seuil au lieu de deux.</b> Le prototype compte les pieces critiques a
 * moins de 10 % mais les colore a moins de 15 % : une piece a 12 % y est rouge
 * sans etre comptee. On garde 15 % partout, qui est le seuil visible.
 */
export default function CamoPage() {
  const [tab, setTab] = useState('FLEET')
  const [family, setFamily] = useState('All')
  const [statusFilter, setStatusFilter] = useState('All')
  const [horizon, setHorizon] = useState(90)
  const [selected, setSelected] = useState(null)
  const [document, setDocument] = useState(null)

  const fleet = useCamoFleet()
  const parts = useLifeLimitedParts()
  const directives = useDirectives(false)
  const file = useAircraftCamo(selected?.aircraftId)

  const rows = fleet.data ?? []
  const partRows = parts.data ?? []
  const directiveRows = directives.data ?? []

  /* Les familles viennent des donnees, pas d'une liste ecrite : un type ajoute
     a refdata apparait dans le filtre sans que personne y pense. */
  const families = useMemo(
    () => [...new Set(rows.map((row) => row.typeFamily).filter(Boolean))].sort(),
    [rows],
  )

  const visible = useMemo(() => rows.filter((row) => {
    if (family !== 'All' && row.typeFamily !== family) return false
    if (statusFilter === 'All') return true
    if (statusFilter === 'ok') return row.arcVerdict === 'VALID' && row.status === 'SERVICEABLE'
    if (statusFilter === 'warn') return row.arcVerdict === 'DUE_SOON' || row.arcVerdict === 'CRITICAL'
    return row.arcVerdict === 'EXPIRED' || row.arcVerdict === 'NONE' || row.status === 'AOG'
  }), [rows, family, statusFilter])

  const visibleIds = useMemo(() => new Set(visible.map((row) => row.aircraftId)), [visible])

  const visibleParts = useMemo(
    () => partRows.filter((part) => visibleIds.has(part.aircraftId)),
    [partRows, visibleIds],
  )

  /* Une consigne s'applique a un appareil ; le filtre de flotte porte donc sur
     l'appareil concerne, pas sur la consigne elle-meme. */
  const visibleDirectives = useMemo(
    () => directiveRows.flatMap((directive) => (directive.applications ?? [])
      .filter((application) => visibleIds.has(application.aircraftId))
      .map((application) => ({ directive, application }))),
    [directiveRows, visibleIds],
  )

  const tiles = useMemo(() => {
    const total = rows.length
    const families = new Set(rows.map((row) => row.typeFamily).filter(Boolean)).size
    const validArc = rows.filter((row) => row.arcVerdict === 'VALID' || row.arcVerdict === 'DUE_SOON'
      || row.arcVerdict === 'CRITICAL').length
    const openDirectives = rows.reduce((sum, row) => sum + row.openDirectives, 0)
    const arcCritical = rows.filter((row) => row.arcVerdict === 'CRITICAL' || row.arcVerdict === 'EXPIRED').length

    /* « Checks <30d » du prototype : les visites dont la limite calendaire tombe
       dans le mois. Son propre commentaire admet qu'il les mesurait contre une
       date ecrite en dur, « so it could never move ». */
    const soon = rows.filter((row) => row.nextDueInDays != null && row.nextDueInDays >= 0
      && row.nextDueInDays < 30)
    const byCode = {}
    soon.forEach((row) => { byCode[row.nextDueCode] = (byCode[row.nextDueCode] ?? 0) + 1 })

    const criticalParts = rows.reduce((sum, row) => sum + row.criticalLlps, 0)

    /* L'indice composite du prototype : 60 % la validite des ARC, 40 % la part
       de la flotte dispatchable. Sa formule est reprise telle quelle pour que le
       chiffre soit le meme ; ce qui est ajoute, c'est de dire ce qu'il pese. */
    const dispatchable = rows.filter((row) => row.status === 'SERVICEABLE').length
    const compliance = total === 0 ? 0
      : (validArc / total) * 60 + (dispatchable / total) * 40

    return [
      {
        label: 'Fleet managed',
        value: total,
        hint: `${families} ${families === 1 ? 'family' : 'families'}`,
        accent: 'var(--accent-orange)',
      },
      {
        label: 'Valid ARC',
        value: `${validArc} / ${total}`,
        hint: total === 0 ? 'no aircraft on file' : `${Math.round((validArc / total) * 100)}%`,
        accent: 'var(--ready-fg)',
        valueColor: arcCritical > 0 ? 'var(--pending-fg)' : undefined,
      },
      {
        label: 'Open AD / SB',
        value: openDirectives,
        hint: 'outstanding on a tail',
        accent: 'var(--pending-fg)',
        valueColor: openDirectives > 0 ? 'var(--pending-fg)' : undefined,
      },
      {
        label: 'Checks < 30 d',
        value: soon.length,
        hint: Object.entries(byCode).map(([code, count]) => `${count}×${code}`).join(', ')
          || 'none upcoming',
        accent: 'var(--info-fg)',
      },
      {
        label: 'Critical LLPs',
        value: criticalParts,
        hint: 'under 15% life remaining',
        accent: 'var(--attention-fg)',
        valueColor: criticalParts > 0 ? 'var(--attention-fg)' : undefined,
      },
      {
        label: 'Overall compliance',
        value: `${compliance.toFixed(1)}%`,
        hint: '60% ARC validity · 40% dispatchable',
        accent: 'var(--gold)',
      },
    ]
  }, [rows])

  return (
    <>
      <TopBar
        title="CAMO"
        subtitle="Continuing airworthiness · review certificates, directives and life-limited parts"
      />

      <div className="shell__scroll">
        <main className="page">
          {fleet.isError ? (
            <ErrorState error={fleet.error} onRetry={() => fleet.refetch()} />
          ) : !fleet.data ? (
            <LoadingState label="Reading the fleet…" />
          ) : (
            <>
              <div className="kpi-strip">
                {tiles.map((tile) => (
                  <div className="kpi" key={tile.label}
                       style={{ '--kpi-accent': tile.accent, '--kpi-value': tile.valueColor }}>
                    <span className="kpi__corners" />
                    <div className="eyebrow">{tile.label}</div>
                    <div className="kpi__value">{tile.value}</div>
                    <div className="kpi__hint">{tile.hint}</div>
                  </div>
                ))}
              </div>

              <div className="toolbar">
                <div className="tabs">
                  <button type="button" className={tab === 'FLEET' ? 'tab tab--active' : 'tab'}
                          onClick={() => setTab('FLEET')}>
                    Fleet<span className="tab__count">{visible.length}</span>
                  </button>
                  <button type="button" className={tab === 'ADSB' ? 'tab tab--active' : 'tab'}
                          onClick={() => setTab('ADSB')}>
                    AD / SB<span className="tab__count">{visibleDirectives.length}</span>
                  </button>
                  <button type="button" className={tab === 'LLP' ? 'tab tab--active' : 'tab'}
                          onClick={() => setTab('LLP')}>
                    Life-Limited Parts<span className="tab__count">{visibleParts.length}</span>
                  </button>
                </div>

                <label className="select-field">
                  <span>Fleet:</span>
                  <select value={family} onChange={(event) => setFamily(event.target.value)}>
                    <option value="All">All</option>
                    {families.map((item) => <option key={item} value={item}>{item}</option>)}
                  </select>
                </label>

                <label className="select-field">
                  <span>Status:</span>
                  <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
                    <option value="All">All</option>
                    <option value="ok">Compliant</option>
                    <option value="warn">Due soon</option>
                    <option value="aog">Non-compliant</option>
                  </select>
                </label>

                <label className="select-field">
                  <span>Horizon:</span>
                  <select value={horizon} onChange={(event) => setHorizon(Number(event.target.value))}>
                    <option value={30}>30 days</option>
                    <option value={60}>60 days</option>
                    <option value={90}>90 days</option>
                    <option value={180}>180 days</option>
                    <option value={99999}>All</option>
                  </select>
                </label>

                <div className="legend">
                  <span><i style={{ background: 'var(--ready-fg)' }} />Compliant</span>
                  <span><i style={{ background: 'var(--pending-fg)' }} />Due soon</span>
                  <span><i style={{ background: 'var(--attention-fg)' }} />Non-compliant</span>
                </div>
              </div>

              <div className="camo-split">
                <div className="board">
                  {tab === 'FLEET' ? (
                    <FleetTable rows={visible} horizon={horizon} selected={selected}
                                onSelect={setSelected} />
                  ) : tab === 'ADSB' ? (
                    <DirectiveTable rows={visibleDirectives} loading={directives.isLoading}
                                    fleet={rows} selected={selected} onSelect={setSelected} />
                  ) : (
                    <PartsTable rows={visibleParts} loading={parts.isLoading}
                                fleet={rows} selected={selected} onSelect={setSelected} />
                  )}
                </div>

                <AirworthinessFile row={selected} file={file}
                                   onOpenDocument={(kind) => setDocument(kind)} />
              </div>
            </>
          )}
        </main>
      </div>

      <CamoDocumentModal kind={document} row={selected} file={file.data}
                         onClose={() => setDocument(null)} />
    </>
  )
}

/** La cellule d'identite : l'icone, l'immatriculation, le type en dessous. */
function TailCell({ row }) {
  return (
    <span className="tail-cell">
      <span className="tail-cell__icon"><Plane size={13} strokeWidth={1.9} /></span>
      <span>
        <span className="tail-cell__reg">{row.registration}</span>
        <span className="tail-cell__type" title={row.model ?? undefined} style={{ display: 'block' }}>
          {row.icaoType}
        </span>
      </span>
    </span>
  )
}

const FLEET_COLUMNS = ['Aircraft', 'ARC — due date', 'Next check', 'Hours / cycles since new', 'AD / SB', 'Status']

function FleetTable({ rows, horizon, selected, onSelect }) {
  /* L'horizon filtre la colonne « prochaine visite », pas les lignes : masquer
     un appareil parce que sa visite est lointaine le ferait disparaitre de la
     flotte, ce qui n'est pas ce que le filtre promet. */
  const inHorizon = (days) => days != null && days <= horizon

  return (
    <table className="camo-table">
      <thead>
        <tr>{FLEET_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.aircraftId}
              className={selected?.aircraftId === row.aircraftId ? 'row--selected' : undefined}
              onClick={() => onSelect(row)}>
            <td><TailCell row={row} /></td>
            <td>
              <span className={`arc-badge arc-badge--${row.arcVerdict}`}>
                {row.arcExpiresOn ? dayMonthYear(row.arcExpiresOn) : ARC_LABEL.NONE}
              </span>
              <div className="camo-sub">
                {row.arcDaysLeft == null ? 'no certificate on file'
                  : row.arcDaysLeft < 0 ? `${Math.abs(row.arcDaysLeft)} days expired`
                    : `${row.arcDaysLeft} days remaining`}
              </div>
            </td>
            <td>
              {row.nextDueCode ?? EMPTY}
              {row.nextDueOn ? (
                <div className="camo-sub">
                  {dayMonthYear(row.nextDueOn)}
                  {inHorizon(row.nextDueInDays) ? '' : ' · beyond horizon'}
                </div>
              ) : null}
            </td>
            <td className="cell--time">
              {row.hoursSinceNew ?? EMPTY} h
              <div className="camo-sub">{row.cyclesSinceNew ?? EMPTY} cycles</div>
            </td>
            <td>
              <Badge tone={row.openDirectives > 0 ? 'PENDING' : 'READY'}>
                {row.openDirectives > 0 ? `${row.openDirectives} open` : 'clear'}
              </Badge>
            </td>
            <td>
              <Badge tone={row.arcVerdict === 'EXPIRED' || row.status === 'AOG' ? 'ATTENTION'
                : row.status === 'MAINTENANCE' || row.arcVerdict === 'CRITICAL' ? 'PENDING' : 'READY'}
                     warn={row.arcVerdict === 'EXPIRED' || row.status === 'AOG'}
                     title={row.statusReason ?? undefined}>
                {row.arcVerdict === 'EXPIRED' ? 'ARC expired'
                  : row.status === 'AOG' ? 'Non-compliant'
                    : row.status === 'MAINTENANCE' ? 'In maintenance' : 'Compliant'}
              </Badge>
            </td>
          </tr>
        ))}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={FLEET_COLUMNS.length}>
              <div className="state">
                <h3>No aircraft match the current filters</h3>
                <p>Clear the fleet or status filter to see the whole fleet again.</p>
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

const ADSB_COLUMNS = ['Aircraft', 'Reference', 'Type / authority', 'Title', 'Due', 'Status']

function DirectiveTable({ rows, loading, fleet, selected, onSelect }) {
  const byId = useMemo(() => new Map(fleet.map((row) => [row.aircraftId, row])), [fleet])

  return (
    <table className="camo-table">
      <thead>
        <tr>{ADSB_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map(({ directive, application }) => {
          const row = byId.get(application.aircraftId)
          return (
            <tr key={application.id}
                className={selected?.aircraftId === application.aircraftId ? 'row--selected' : undefined}
                onClick={() => row && onSelect(row)}>
              <td>{row ? <TailCell row={row} /> : application.registration}</td>
              <td className="camo-doc__num">{directive.reference}</td>
              <td>
                {directive.kind}
                <div className="camo-sub">{directive.issuedBy ?? EMPTY}</div>
              </td>
              <td>
                {directive.subject}
                <div className="camo-sub">
                  {/* L'intervalle : une consigne recurrente ne se solde pas une fois. */}
                  {directive.recurringMonths ? `every ${directive.recurringMonths} months` : 'one-time'}
                </div>
              </td>
              <td className="cell--time">
                {dayMonthYear(directive.complianceByDate)}
                {directive.complianceByHours ? (
                  <div className="camo-sub">or {directive.complianceByHours} h</div>
                ) : null}
              </td>
              <td>
                <Badge tone={DIRECTIVE_TONE[application.status] ?? 'NEUTRAL'}
                       warn={application.status === 'OPEN'}>
                  {application.status.replace('_', ' ')}
                </Badge>
              </td>
            </tr>
          )
        })}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={ADSB_COLUMNS.length}>
              <div className="state">
                <h3>{loading ? 'Reading the directives…' : 'No AD/SB items match the current filters'}</h3>
                {loading ? null : <p>Directives are owned by CAMO Admin; this tab reads them there.</p>}
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}

const LLP_COLUMNS = ['Aircraft', 'Life-limited part', 'Position', 'Cycles', 'Life remaining', 'Status']

function PartsTable({ rows, loading, fleet, selected, onSelect }) {
  const byId = useMemo(() => new Map(fleet.map((row) => [row.aircraftId, row])), [fleet])

  return (
    <table className="camo-table">
      <thead>
        <tr>{LLP_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
      </thead>
      <tbody>
        {rows.map((part) => {
          const row = byId.get(part.aircraftId)
          return (
            <tr key={part.id}
                className={selected?.aircraftId === part.aircraftId ? 'row--selected' : undefined}
                onClick={() => row && onSelect(row)}>
              <td>{row ? <TailCell row={row} /> : part.registration}</td>
              <td>
                {part.name}
                {part.partNo ? <div className="camo-sub">{part.partNo} · {part.serialNo ?? EMPTY}</div> : null}
              </td>
              <td>{part.position ?? EMPTY}</td>
              <td className="cell--time">
                {part.cyclesRemaining ?? EMPTY}
                <div className="camo-sub">of {part.limitCycles ?? EMPTY}</div>
              </td>
              <td>
                <div className="gauge-cell">
                  <div className="mini-bar">
                    <div className={`mini-bar__fill mini-bar__fill--${part.severity}`}
                         style={{ width: `${part.percentRemaining}%` }} />
                  </div>
                  <span className="gauge-cell__value">{part.percentRemaining}%</span>
                </div>
                {/* Ce qui gouverne : cycles, heures ou calendrier. Voler moins
                    ne repousse pas une limite calendaire. */}
                {part.governedBy ? <div className="camo-sub">{part.governedBy.toLowerCase()}</div> : null}
              </td>
              <td>
                <Badge tone={LLP_TONE[part.severity] ?? 'NEUTRAL'} warn={part.severity === 'CRITICAL'}>
                  {LLP_LABEL[part.severity] ?? part.severity}
                </Badge>
              </td>
            </tr>
          )
        })}
        {rows.length === 0 ? (
          <tr>
            <td colSpan={LLP_COLUMNS.length}>
              <div className="state">
                <h3>{loading ? 'Reading the parts…' : 'No life-limited parts match the current filters'}</h3>
              </div>
            </td>
          </tr>
        ) : null}
      </tbody>
    </table>
  )
}
