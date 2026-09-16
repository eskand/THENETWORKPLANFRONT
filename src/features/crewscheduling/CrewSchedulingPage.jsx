import { useMemo, useState } from 'react'
import { CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import TopBar from '../../components/TopBar'
import { ErrorState } from '../../components/States'
import {
  useAssignSeat,
  useSchedulingBoard,
  useSchedulingWeek,
  useUnassignSeat,
} from '../../hooks/useCrewScheduling'
import { useRosterGrid, useRosterVersions } from '../../hooks/useRoster'
import { ROSTER_CODES, codeLabel } from '../../lib/rosterCodes'
import { isoDate } from '../../lib/format'
import CrewPool from './components/CrewPool'
import CrewProfilePanel from './components/CrewProfilePanel'
import SchedulingLegs from './components/SchedulingLegs'
import WeekGrid from './components/WeekGrid'
import '../../styles/crewops.css'

/**
 * Crew Scheduling — la semaine du prototype (vue `viewCrewSchedule`, l. 8108),
 * reprise dans son ordre : les six compteurs, la barre de controle avec ses
 * filtres et sa legende, le bandeau roster, puis la grille et la fiche a droite.
 *
 * <b>D'ou vient ce qui s'affiche.</b> Rien n'est invente au rendu :
 *
 *   - les vols et leurs sieges viennent du plateau de la journee, sept fois,
 *     une par jour de la semaine ;
 *   - les etats sans vol — R, STBY, OFF, AL, SICK, TRG — viennent du roster
 *     publie qui recouvre la semaine ;
 *   - les compteurs se comptent sur ces deux sources, pour le jour choisi.
 *
 * Le prototype, lui, tenait ses 125/98/12/15/8 en dur dans le HTML : des
 * nombres qui ne bougeaient pas quand la grille changeait. Ceux d'ici comptent
 * ce que la grille montre, et tombent a zero quand il n'y a rien a compter —
 * c'est moins impressionnant, et c'est vrai.
 *
 * <b>Ce que le prototype n'avait pas et qui reste.</b> La journee depliable en
 * bas, avec ses etapes et son vivier : c'est le seul chemin d'ecriture de
 * l'ecran — un clic sur une personne, un clic sur un siege. Le prototype ne
 * savait pas affecter ; la supprimer pour lui ressembler couterait la seule
 * chose que cet ecran fait reellement.
 */

const DEPARTMENTS = [
  { id: '', label: 'Department: All' },
  { id: 'CAPTAIN', label: 'Captains' },
  { id: 'FIRST_OFFICER', label: 'First officers' },
  { id: 'CABIN', label: 'Cabin crew' },
]

/** La legende du prototype (l. 8129-8137), dans son ordre. */
const LEGEND = ['FLT', 'POS', 'RES', 'OFF', 'LVE', 'SICK', 'TRG']

/** Le lundi de la semaine qui contient cette date, en UTC. */
function mondayOf(iso) {
  const date = new Date(`${iso}T00:00:00Z`)
  const shift = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - shift)
  return isoDate(date)
}

function addDays(iso, count) {
  const date = new Date(`${iso}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() + count)
  return isoDate(date)
}

/** « Week of Sep 14, 2026 (current week) », l'etiquette du prototype. */
function weekLabel(monday) {
  const date = new Date(`${monday}T00:00:00Z`)
  const shown = date.toLocaleDateString('en-US', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return `Week of ${shown}${monday === mondayOf(isoDate(new Date())) ? ' (current week)' : ''}`
}

export default function CrewSchedulingPage() {
  const [day, setDay] = useState(() => isoDate(new Date()))
  const [role, setRole] = useState('')
  const [fleet, setFleet] = useState('')
  const [base, setBase] = useState('')
  const [picked, setPicked] = useState(null)
  const [profile, setProfile] = useState(null)
  const [dayOpen, setDayOpen] = useState(false)

  const monday = mondayOf(day)
  const days = useMemo(
    () => Array.from({ length: 7 }, (unused, index) => addDays(monday, index)),
    [monday],
  )

  const filters = useMemo(() => ({ date: day, role }), [day, role])
  const board = useSchedulingBoard(filters)
  const week = useSchedulingWeek(days, role)
  const assign = useAssignSeat()
  const unassign = useUnassignSeat()
  const versions = useRosterVersions()

  const data = board.data

  /**
   * Le roster publie qui recouvre la semaine affichee.
   *
   * Trois etats, pas deux : couverte en entier, couverte en partie, pas
   * couverte. Une version publiee qui commence le mercredi ne couvre pas le
   * lundi, et dire « aucun roster publie » serait faux pour la moitie de la
   * semaine — comme dire « roster publie » le serait pour l'autre moitie.
   */
  const publishedVersions = (versions.data ?? []).filter(
    (version) =>
      version.status === 'PUBLISHED' &&
      version.periodStart <= days[6] &&
      version.periodEnd >= monday,
  )
  const published = publishedVersions[0]
  const fullyCovered = publishedVersions.some(
    (version) => version.periodStart <= monday && version.periodEnd >= days[6],
  )

  /**
   * Le brouillon qui recouvre la semaine, quand il y en a un.
   *
   * Le prototype le disait lui-meme dans son bandeau : « this weekly view shows
   * the draft/recurring pattern only, not an operational commitment ». Une
   * semaine qui n'est pas encore publiee n'est pas une semaine vide — le
   * planning existe, il n'est simplement pas encore engage vis-a-vis de
   * l'equipage. Le montrer est le travail de cet ecran ; le montrer comme s'il
   * etait publie serait une faute, et c'est le pointille qui fait la difference.
   */
  const draft = (versions.data ?? []).find(
    (version) =>
      version.status === 'DRAFT' &&
      version.periodStart <= days[6] &&
      version.periodEnd >= monday,
  )

  // Les journees sans vol viennent du roster. Deux versions sont lues : la
  // publiee, qui engage, et le brouillon, qui ne fait que proposer.
  const rosterGrid = useRosterGrid(published?.id)
  const draftGrid = useRosterGrid(draft?.id)

  /**
   * personId -> jour -> { code, draft }.
   *
   * Le publie l'emporte partout ou il couvre : une journee engagee ne se laisse
   * pas repeindre par un brouillon qui la contredit. Le brouillon ne remplit
   * donc que les journees que le publie ne dit pas.
   */
  const rosterCodes = useMemo(() => {
    const index = new Map()
    const inWeek = new Set(days)

    const lay = (grid, isDraft) => {
      for (const row of grid?.rows ?? []) {
        for (const cell of row.cells ?? []) {
          if (!inWeek.has(cell.day)) continue
          const perPerson = index.get(row.personId) ?? new Map()
          // Une journee qui porte deux codes garde le premier ecrit : la case
          // de la semaine n'a la place que d'un etat, et l'editeur du Roster
          // est le seul endroit ou l'on voit la journee entiere.
          if (!perPerson.has(cell.day)) {
            perPerson.set(cell.day, { code: cell.code, draft: isDraft })
          }
          index.set(row.personId, perPerson)
        }
      }
    }

    if (published) lay(rosterGrid.data, false)
    if (draft) lay(draftGrid.data, true)
    return index
  }, [rosterGrid.data, draftGrid.data, published, draft, days])

  /** personId -> qualification de type, lue sur la ligne du roster. */
  const typeRatings = useMemo(() => {
    const index = new Map()
    for (const grid of [rosterGrid.data, draftGrid.data]) {
      for (const row of grid?.rows ?? []) {
        if (row.typeRating) index.set(row.personId, row.typeRating)
      }
    }
    return index
  }, [rosterGrid.data, draftGrid.data])

  /** Les minutes de vol affectees dans la semaine, par personne. */
  const weekMinutes = useMemo(() => {
    const total = new Map()
    for (const [personId, perDay] of week.duties) {
      let minutes = 0
      for (const entries of perDay.values()) {
        for (const { leg } of entries) {
          if (!leg.std || !leg.sta) continue
          minutes += Math.max(0, (new Date(leg.sta) - new Date(leg.std)) / 60000)
        }
      }
      total.set(personId, Math.round(minutes))
    }
    return total
  }, [week.duties])

  /** Les lignes, une fois les filtres de la barre appliques. */
  const people = useMemo(
    () =>
      week.people
        .map((person) => ({ ...person, typeRating: typeRatings.get(person.personId) ?? null }))
        .filter((person) => {
          if (base && person.baseIcao !== base) return false
          if (!fleet) return true
          // La flotte se lit sur la qualification de type : « FALCON » couvre
          // le 7X comme le 900LX, c'est la maille a laquelle on change de tail.
          const family = person.typeRating ?? person.typeRatings?.[0] ?? null
          return String(family ?? '').toUpperCase().startsWith(fleet)
        }),
    [week.people, typeRatings, base, fleet],
  )

  /** Les valeurs des deux listes deroulantes, tirees de ce qui existe. */
  const fleets = useMemo(() => {
    const found = new Set()
    for (const person of week.people) {
      const family = typeRatings.get(person.personId) ?? person.typeRatings?.[0]
      if (family) found.add(String(family).toUpperCase())
    }
    return [...found].sort()
  }, [week.people, typeRatings])

  const bases = useMemo(
    () => [...new Set(week.people.map((person) => person.baseIcao).filter(Boolean))].sort(),
    [week.people],
  )

  /**
   * Les six compteurs du prototype, comptes sur le jour choisi.
   *
   * « Assigned » compte les personnes qui tiennent au moins un siege ce jour-la,
   * pas les sieges : quelqu'un qui enchaine trois etapes est une personne
   * affectee, pas trois.
   */
  const counters = useMemo(() => {
    const position = days.indexOf(day)
    const codesOfDay = (personId) => rosterCodes.get(personId)?.get(day)?.code ?? null

    let assigned = 0
    let reserve = 0
    let off = 0
    let leave = 0
    for (const person of people) {
      const flying = (week.duties.get(person.personId)?.get(day) ?? []).length > 0
      if (flying) assigned += 1
      const code = codesOfDay(person.personId)
      if (!flying && (code === 'RES' || code === 'SBY')) reserve += 1
      if (!flying && code === 'OFF') off += 1
      if (!flying && (code === 'LVE' || code === 'TRG')) leave += 1
    }

    // Une alerte FTL est un verdict du serveur qui n'est pas « legal ». Un
    // verdict absent compte comme une alerte : « on ne sait pas » n'est pas
    // « c'est bon », et c'est precisement ce qu'un planificateur doit regarder.
    let ftlAlerts = 0
    for (const leg of week.boards[position]?.legs ?? []) {
      for (const member of leg.crew ?? []) {
        if (member.ftlVerdict !== 'OK' && member.ftlVerdict !== 'LEGAL') ftlAlerts += 1
      }
    }

    const share = people.length > 0 ? Math.round((assigned / people.length) * 100) : 0
    return { total: people.length, assigned, share, reserve, off, leave, ftlAlerts }
  }, [people, week.duties, week.boards, rosterCodes, day, days])

  const tiles = [
    {
      label: 'Total crew',
      value: counters.total,
      hint: 'flight + cabin',
      accent: 'var(--tnp-gold)',
      valueColor: 'var(--tnp-gold)',
    },
    {
      label: 'Assigned',
      value: counters.assigned,
      hint: `${counters.share}% of crew, on ${day}`,
      accent: 'var(--ready-fg)',
      valueColor: 'var(--ready-fg)',
    },
    {
      label: 'Reserve',
      value: counters.reserve,
      hint: published || draft ? 'RES / STBY today' : 'needs a roster',
      accent: 'var(--c-RES)',
      valueColor: 'var(--c-RES)',
    },
    {
      label: 'Off duty',
      value: counters.off,
      hint: published || draft ? 'days OFF' : 'needs a roster',
      accent: 'var(--c-OFF)',
    },
    {
      label: 'On leave',
      value: counters.leave,
      hint: published || draft ? 'AL / Training' : 'needs a roster',
      accent: 'var(--c-LVE)',
    },
    {
      label: 'FTL alerts',
      value: counters.ftlAlerts,
      hint: 'exceedance / short rest',
      accent: 'var(--attention-fg)',
      valueColor: counters.ftlAlerts > 0 ? 'var(--attention-fg)' : undefined,
    },
  ]

  const handleAssign = (leg, seat) => {
    if (!picked) return
    assign.mutate(
      { legId: leg.legId, personId: picked.personId, seat },
      { onSuccess: () => setPicked(null) },
    )
  }

  return (
    <>
      <TopBar
        title="Crew Scheduling"
        subtitle="Weekly crew roster · flight and cabin crew"
      />

      <div className="csw">
        <div className="crewkpis">
          {tiles.map((tile) => (
            <div
              className="crewkpi"
              key={tile.label}
              style={{ '--kpi-accent': tile.accent, '--kpi-value': tile.valueColor }}
            >
              <div className="crewkpi__k">{tile.label}</div>
              <div className="crewkpi__v">{tile.value}</div>
              <div className="crewkpi__h">{tile.hint}</div>
            </div>
          ))}
        </div>

        <div className="crewbar">
          <span className="crewbar__mark">
            <CalendarRange size={17} strokeWidth={1.9} />
          </span>
          <span>
            <span className="crewbar__title">Weekly Roster</span>
            <span className="crewbar__sub">The Network Plan · OCC crew planning</span>
          </span>

          <div className="crewbar__nav">
            <button type="button" title="Previous week" onClick={() => setDay(addDays(monday, -7))}>
              <ChevronLeft size={15} />
            </button>
            <span className="crewbar__period">{weekLabel(monday)}</span>
            <button type="button" title="Next week" onClick={() => setDay(addDays(monday, 7))}>
              <ChevronRight size={15} />
            </button>
          </div>

          <button type="button" className="crewbar__btn" onClick={() => setDay(isoDate(new Date()))}>
            Today
          </button>

          <select
            value={fleet}
            onChange={(event) => setFleet(event.target.value)}
            title="Filter by aircraft family, read from each person's type rating"
          >
            <option value="">Fleet: All</option>
            {fleets.map((value) => (
              <option key={value} value={value}>
                Fleet: {value}
              </option>
            ))}
          </select>

          <select
            value={base}
            onChange={(event) => setBase(event.target.value)}
            title="Filter by home base"
          >
            <option value="">Base: All</option>
            {bases.map((value) => (
              <option key={value} value={value}>
                Base: {value}
              </option>
            ))}
          </select>

          <select value={role} onChange={(event) => setRole(event.target.value)}>
            {DEPARTMENTS.map((entry) => (
              <option key={entry.id || 'ALL'} value={entry.id}>
                {entry.label}
              </option>
            ))}
          </select>

          <span className="crewbar__spacer" />

          <input
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
            title="Jump to a day"
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(255,255,255,0.18)',
              borderRadius: 6,
              color: '#eaf0fb',
              fontFamily: 'var(--mono)',
              fontSize: 11,
              padding: '7px 9px',
              colorScheme: 'dark',
            }}
          />
        </div>

        <div className="crewlegend">
          <span className="crewlegend__label">Legend</span>
          {LEGEND.map((code) => (
            <span key={code} title={code}>
              <i style={{ background: ROSTER_CODES[code].colour }} />
              {codeLabel(code)}
            </span>
          ))}
          <span title="A day drawn in outline comes from a draft roster: planned, not yet published to the crew">
            <i style={{ border: '1px dashed var(--text-dim)', background: 'transparent' }} />
            Draft, not published
          </span>
        </div>

        {published && fullyCovered ? (
          <div className="crewbanner crewbanner--ok">
            <span>
              <b>Published roster — {published.label}.</b> This week is covered by a published
              version: what the grid shows is what the crew reads.
            </span>
          </div>
        ) : published ? (
          <div className="crewbanner">
            <span>
              <b>Partly covered — {published.label}</b> runs {published.periodStart} →{' '}
              {published.periodEnd}. The days outside that window show recorded assignments,
              which are real but carry no published commitment to the crew.
            </span>
            <Link to="/roster">Open in Roster →</Link>
          </div>
        ) : (
          <div className="crewbanner">
            <span>
              <b>No published roster covers this week.</b>{' '}
              {draft
                ? `The grid shows ${draft.label} — a draft pattern drawn in outline, not an operational commitment to the crew.`
                : 'The grid shows the assignments recorded on each leg. Days with nothing written on them stay blank.'}
            </span>
            <Link to="/roster">Publish in Roster →</Link>
          </div>
        )}

        <div className="csw__layout">
          <div className="csw__week">
            <WeekGrid
              days={days}
              people={people}
              duties={week.duties}
              rosterCodes={rosterCodes}
              weekMinutes={weekMinutes}
              selectedDay={day}
              selectedPersonId={profile?.personId ?? null}
              onSelectDay={setDay}
              onSelectPerson={setProfile}
              loading={week.loading}
              error={week.error}
            />
          </div>

          <CrewProfilePanel
            person={profile}
            weekMinutes={profile ? weekMinutes.get(profile.personId) : null}
            onClose={() => setProfile(null)}
          />
        </div>

        <section className="crewday">
          <div className="crewday__head">
            {/* La semaine et le jour se disputent la hauteur de l'ecran. Plutot
                que d'arbitrer a la place du planificateur, on lui donne le
                bouton : la semaine tient l'ecran, le jour s'ouvre pour affecter. */}
            <button
              type="button"
              className="crewbar__btn"
              style={{ borderColor: 'var(--line)', background: 'transparent', color: 'var(--text-dim)' }}
              onClick={() => setDayOpen((open) => !open)}
              title={dayOpen ? 'Collapse the day and show more of the week' : 'Open the day to assign seats'}
            >
              {dayOpen ? '▾' : '▸'} Day · {day} · seats and pool
            </button>
            {picked && dayOpen ? (
              <span className="badge-group">
                <span className="status-text">Selected: {picked.fullName}</span>
                <button type="button" className="toolbar__button" onClick={() => setPicked(null)}>
                  Clear
                </button>
              </span>
            ) : (
              <span className="status-text">
                {dayOpen ? 'Pick a crew member, then a seat' : 'Open to assign seats on this day'}
              </span>
            )}
          </div>

          {!dayOpen ? null : board.isError ? (
            <div style={{ padding: 16 }}>
              <ErrorState error={board.error} onRetry={() => board.refetch()} />
            </div>
          ) : (
            <>
              {assign.isError ? (
                <div className="crewbanner">
                  <span>
                    <b>The seat was not filled.</b> {assign.error?.message}
                  </span>
                </div>
              ) : null}

              <div className="crewday__cols">
                <SchedulingLegs
                  legs={data?.legs ?? []}
                  picked={picked}
                  pending={assign.isPending}
                  onAssign={handleAssign}
                  onUnassign={(assignmentId) => unassign.mutate(assignmentId)}
                />
                <CrewPool
                  pool={data?.pool ?? []}
                  picked={picked}
                  disabled={assign.isPending}
                  onPick={setPicked}
                />
              </div>
            </>
          )}
        </section>
      </div>
    </>
  )
}
