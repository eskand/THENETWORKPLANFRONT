import { useMemo, useState } from 'react'
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  CopyPlus,
  Download,
  Lock,
  RotateCcw,
  Rocket,
  SlidersHorizontal,
  Zap,
} from 'lucide-react'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import { useCrewExpiries } from '../../hooks/useCrew'
import { useAssignSeat } from '../../hooks/useCrewScheduling'
import {
  useCreateRosterVersion,
  useDeleteRosterEntry,
  usePublishRoster,
  useRosterMonth,
  useSaveRosterDays,
} from '../../hooks/useRoster'
import { ROSTER_CODES } from '../../lib/rosterCodes'
import ComplianceAlerts from './components/ComplianceAlerts'
import RosterCellEditor from './components/RosterCellEditor'
import RosterGrid from './components/RosterGrid'
import '../../styles/crewops.css'

/**
 * Roster — le planning MENSUEL, dans la mise en page du prototype.
 *
 * <b>Le mois est l'unite, la version est la comptabilite.</b> Une premiere
 * version de cet ecran naviguait de version en version, parce que c'est ainsi
 * que le serveur range les cellules. C'etait exact et inutilisable : personne
 * ne planifie « la version 3 », on planifie septembre. Les fleches parcourent
 * donc les mois, et le serveur assemble le mois a partir de toutes les versions
 * qui le recouvrent (GET /v1/roster/month).
 *
 * <b>Ce que la version continue de decider.</b> Toute case s'ouvre, y compris
 * celles d'un mois publie : on voit ce qu'elles portent. Mais l'immuabilite
 * reste entiere — une journee que seule une version publiee couvre s'ouvre en
 * LECTURE SEULE, et le bouton « New draft » est le chemin pour la corriger.
 *
 * <b>Un vol s'affecte sur son etape.</b> Choisir « Flight » dans l'editeur ne
 * pose pas un code dans le vide : il remplit un siege sur une etape reelle du
 * jour (POST /crew/scheduling/legs/{id}/assignments), puis ecrit la cellule.
 * Les deux vont ensemble — une case FLT sans siege serait un planning que
 * l'operation ne connait pas.
 *
 * <b>Ce qui reste desactive et pourquoi.</b> Generate roster, FTL Calculator et
 * l'equilibrage d'heures reposent sur ORO.FTL et sur un algorithme
 * d'affectation : c'est le sprint S7. Un bouton actif qui produirait un
 * planning qu'aucune regle relue n'a valide est plus dangereux qu'un bouton
 * grise ; chacun porte la raison dans son infobulle.
 */

/**
 * La legende du prototype, dans son ordre et avec ses libelles.
 *
 * Elle groupe ce que la base distingue : « Reserve/Standby » couvre RES et SBY,
 * « Training/Sim » couvre TRG. C'est le vocabulaire du planificateur, et la
 * grille garde ses codes — un code par cellule, une etiquette par famille.
 *
 * « Dead Head » figure chez le prototype mais pas ici : la contrainte
 * ck_roster_code ne connait pas ce code, et l'annoncer dans la legende ferait
 * chercher une couleur qu'aucune cellule ne peut porter.
 */
const PROTO_LEGEND = [
  ['Flight', 'FLT'],
  ['Reserve/Standby', 'RES', 'RES and SBY'],
  ['Off', 'OFF'],
  ['Leave', 'LVE'],
  ['Sick', 'SICK'],
  ['Training', 'TRG'],
  ['Simulator', 'SIM'],
  ['Positioning', 'POS'],
  ['Dead Head', 'DH'],
]

/** « September 2026 ». */
function monthLabel(month) {
  if (!month) return '—'
  const date = new Date(`${month}-01T00:00:00Z`)
  return `${date.toLocaleString('en-GB', { month: 'long', timeZone: 'UTC' })} ${date.getUTCFullYear()}`
}

function shiftMonth(month, delta) {
  const [year, index] = month.split('-').map(Number)
  const date = new Date(Date.UTC(year, index - 1 + delta, 1))
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
}

function thisMonth() {
  const now = new Date()
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`
}

function toCsv(month) {
  const days = month?.days ?? []
  const header = ['Staff', 'Name', 'Role', 'Type', ...days, 'Working days', 'Days off', 'Block']
  const lines = [header.join(',')]
  for (const row of month?.rows ?? []) {
    const byDay = new Map()
    for (const cell of row.cells) {
      // Le CSV porte le code ET la nature du fait : « FLT » planifie et « FLT »
      // enregistre ne sont pas la meme information.
      const mark = cell.backed ? cell.code : `${cell.code}?`
      byDay.set(cell.day, [...(byDay.get(cell.day) ?? []), mark].join(' '))
    }
    lines.push(
      [
        row.staffNo,
        `"${row.fullName}"`,
        row.mainRole ?? '',
        row.typeRating ?? '',
        ...days.map((day) => byDay.get(day) ?? ''),
        row.workingDays,
        row.daysOff,
        row.blockMinutes ?? 0,
      ].join(','),
    )
  }
  return lines.join('\n')
}

export default function RosterPage() {
  const [month, setMonth] = useState(thisMonth)
  const [fleet, setFleet] = useState('')
  const [editing, setEditing] = useState(null)

  const grid = useRosterMonth(month)
  const publish = usePublishRoster()
  const createVersion = useCreateRosterVersion()
  const saveDays = useSaveRosterDays()
  const removeEntry = useDeleteRosterEntry()
  const assignSeat = useAssignSeat()
  const expiries = useCrewExpiries(365)

  const versions = grid.data?.versions ?? []
  const days = grid.data?.days ?? []

  /** Le brouillon qui couvre une journee : le seul endroit ou l'on peut ecrire. */
  function draftCovering(day) {
    return versions.find(
      (version) => version.editable && version.periodStart <= day && version.periodEnd >= day,
    )
  }

  const draft = versions.find((version) => version.editable)
  const published = versions.filter((version) => version.status === 'PUBLISHED')

  /** Les flottes presentes, tirees des qualifications de type des lignes. */
  const fleets = useMemo(
    () => [...new Set((grid.data?.rows ?? []).map((row) => row.typeRating).filter(Boolean))].sort(),
    [grid.data],
  )

  const rows = useMemo(
    () => (grid.data?.rows ?? []).filter((row) => !fleet || row.typeRating === fleet),
    [grid.data, fleet],
  )

  function exportCsv() {
    const blob = new Blob([toCsv({ ...grid.data, rows })], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `roster-${month}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  /**
   * Ouvrir un brouillon sur le mois affiche.
   *
   * C'est le seul chemin pour corriger un mois publie : on ne modifie pas une
   * version publiee, on en ouvre une nouvelle qui la reprend et qui la
   * remplacera a la publication.
   */
  function openDraft() {
    const first = days[0] ?? `${month}-01`
    const last = days[days.length - 1] ?? `${month}-28`
    const source = published.find((version) => version.periodStart <= last && version.periodEnd >= first)
    createVersion.mutate({
      label: `${monthLabel(month)} draft`,
      periodStart: first,
      periodEnd: last,
      copyFromVersionId: source?.id ?? null,
    })
  }

  /**
   * Enregistrer la case.
   *
   * Le code choisi REMPLACE ce qui etait pose, il ne s'y ajoute pas : le serveur
   * tient une cellule par (version, personne, jour, CODE), et sans le retrait
   * prealable, passer un OFF en LVE laisserait les deux cote a cote.
   *
   * Seules les cellules du brouillon sont retirees. Une cellule publiee sur la
   * meme journee n'est pas touchee — elle ne peut pas l'etre — et la grille la
   * montrera toujours : c'est le fait, pas l'intention.
   */
  async function saveCell({ days: target, code, remark, legs }) {
    const version = draftCovering(editing.day)
    if (!version) return
    const wanted = new Set(target)
    const line = (grid.data?.rows ?? []).find((row) => row.personId === editing.row.personId)
    const stale = (line?.cells ?? []).filter(
      (cell) => cell.draft && wanted.has(cell.day) && cell.code !== code,
    )
    try {
      // Les sieges d'abord. Si le serveur refuse — siege pris, personne non
      // qualifiee, absente, papiers expires — la cellule n'est pas ecrite : un
      // roster qui annonce un vol que l'operation a refuse serait un mensonge
      // en deux endroits au lieu d'un.
      for (const leg of legs ?? []) {
        await assignSeat.mutateAsync({
          legId: leg.legId,
          personId: editing.row.personId,
          seat: leg.seat,
        })
      }
      for (const cell of stale) {
        await removeEntry.mutateAsync(cell.entryId)
      }
      await saveDays.mutateAsync({
        versionId: version.id,
        days: target.filter((day) => version.periodStart <= day && version.periodEnd >= day),
        command: { personId: editing.row.personId, code, remark },
      })
      setEditing(null)
    } catch {
      // cellError l'affiche.
    }
  }

  /** Vider la case : seules les cellules d'un brouillon peuvent partir. */
  async function clearCell(cells) {
    try {
      for (const cell of (cells ?? []).filter((cell) => cell.draft)) {
        await removeEntry.mutateAsync(cell.entryId)
      }
      setEditing(null)
    } catch {
      // cellError l'affiche.
    }
  }

  const cellBusy = saveDays.isPending || removeEntry.isPending || assignSeat.isPending
  const cellError =
    assignSeat.error?.message ?? saveDays.error?.message ?? removeEntry.error?.message ?? null
  const canPublish = Boolean(draft) && (draft?.entryCount ?? 0) > 0

  return (
    <>
      <TopBar
        title="Roster"
        subtitle="Monthly crew roster · manual assignment or automatic generation · ORO.FTL / CS FTL.1"
      />

      <div className="rst">
        <div className="crewbar">
          <span className="crewbar__mark">
            <CalendarDays size={17} strokeWidth={1.9} />
          </span>
          <span>
            <span className="crewbar__title">Monthly Roster</span>
            <span className="crewbar__sub">The Network Plan · OCC crew planning</span>
          </span>

          <div className="crewbar__nav">
            <button type="button" title="Previous month" onClick={() => setMonth(shiftMonth(month, -1))}>
              <ChevronLeft size={15} />
            </button>
            <span className="crewbar__period">{monthLabel(month)}</span>
            <button type="button" title="Next month" onClick={() => setMonth(shiftMonth(month, 1))}>
              <ChevronRight size={15} />
            </button>
          </div>

          <select
            value={fleet}
            onChange={(event) => setFleet(event.target.value)}
            title="Filter by aircraft family, read from each crew member's type rating"
          >
            <option value="">All fleets</option>
            {fleets.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>

          {/* Ce que le mois contient, en versions : c'est la seule chose que le
              prototype ne disait pas, et c'est ce qui decide de ce qu'on peut
              ecrire. */}
          {versions.length > 0 ? (
            <span className="crewbar__btn" style={{ cursor: 'default' }} title={
              versions.map((v) => `${v.label} · ${v.status} · ${v.periodStart} → ${v.periodEnd}`).join('\n')
            }>
              {published.length > 0 ? <Lock size={12} /> : null}
              {published.length} published · {draft ? '1 draft' : 'no draft'}
            </span>
          ) : null}

          <span className="crewbar__spacer" />

          <label
            className="crewbar__switch"
            title="Hour balancing belongs to the assignment algorithm — sprint S7. There is nothing to ignore yet."
          >
            <i />
            Ignore hour balancing
          </label>

          <button
            type="button"
            className="crewbar__btn crewbar__btn--danger"
            disabled
            title="No endpoint clears a month: a published roster is superseded by a new version, never wiped."
          >
            <RotateCcw size={12} /> Reset month
          </button>

          <button
            type="button"
            className="crewbar__btn"
            disabled={!grid.data}
            title="Export the month as CSV, codes and all"
            onClick={exportCsv}
          >
            <Download size={12} /> Export CSV
          </button>

          <button
            type="button"
            className="crewbar__btn"
            disabled
            title="Automatic generation needs the ORO.FTL engine and the assignment algorithm — sprint S7."
          >
            <Zap size={12} /> Generate roster
          </button>

          <button
            type="button"
            className="crewbar__btn"
            disabled
            title="The FTL calculator needs Tables 1 to 4 of ORO.FTL server-side — sprint S7."
          >
            <SlidersHorizontal size={12} /> FTL calculator
          </button>

          <button
            type="button"
            className="crewbar__btn"
            disabled={createVersion.isPending || Boolean(draft)}
            title={
              draft
                ? `${draft.label} is already open over this month — write in it`
                : 'Open a draft over this month, cells copied from the published version'
            }
            onClick={openDraft}
          >
            <CopyPlus size={12} /> {createVersion.isPending ? 'Opening…' : 'New draft'}
          </button>

          <button
            type="button"
            className="crewbar__btn crewbar__btn--gold"
            disabled={!canPublish || publish.isPending}
            title={
              !draft
                ? 'There is no draft over this month to publish'
                : (draft.entryCount ?? 0) === 0
                  ? 'An empty draft is not published'
                  : `Publish ${draft.label} — it becomes the roster the crew reads`
            }
            onClick={() => publish.mutate(draft.id)}
          >
            <Rocket size={12} /> {publish.isPending ? 'Publishing…' : 'Launch roster'}
          </button>
        </div>

        <div className="crewlegend crewlegend--proto">
          <span className="crewlegend__label">Legend</span>
          {PROTO_LEGEND.map(([label, code, covers]) => (
            <span key={label} title={covers ?? code}>
              <i style={{ borderColor: ROSTER_CODES[code].colour }} />
              {label}
            </span>
          ))}
        </div>

        {publish.isError ? (
          <div className="crewbanner">
            <span>
              <b>The roster was not published.</b> {publish.error?.message}
            </span>
          </div>
        ) : null}

        {createVersion.isError ? (
          <div className="crewbanner">
            <span>
              <b>No draft was opened.</b> {createVersion.error?.message}
            </span>
          </div>
        ) : null}

        {!draft && published.length > 0 ? (
          <div className="crewbanner">
            <span>
              <b>This month is published and frozen.</b> A published roster is superseded by a new
              version, never amended — open a draft to write on it.
            </span>
          </div>
        ) : null}

        <div className="crewbody">
          <div className="crewbody__grid">
            {grid.isError ? (
              <div style={{ padding: 16 }}>
                <ErrorState error={grid.error} onRetry={() => grid.refetch()} />
              </div>
            ) : (
              <RosterGrid
                grid={{ days, rows }}
                loading={grid.isLoading}
                // Toute case s'ouvre : une journee publiee montre ce qu'elle
                // porte, sans pouvoir etre ecrasee. Ne pas ouvrir laisserait
                // croire que la case est vide.
                onCellClick={setEditing}
                editableDay={() => true}
              />
            )}
          </div>

          <ComplianceAlerts
            expiries={expiries.data}
            loading={expiries.isLoading}
            rows={rows}
            monthLabel={monthLabel(month)}
          />
        </div>

        {editing ? (
          <RosterCellEditor
            key={`${editing.row.personId}-${editing.day}`}
            row={editing.row}
            day={editing.day}
            cells={editing.cells}
            periodStart={draftCovering(editing.day)?.periodStart}
            periodEnd={draftCovering(editing.day)?.periodEnd}
            readOnly={!draftCovering(editing.day)}
            busy={cellBusy}
            error={cellError}
            onSave={saveCell}
            onClear={clearCell}
            onClose={() => setEditing(null)}
          />
        ) : null}
      </div>
    </>
  )
}
