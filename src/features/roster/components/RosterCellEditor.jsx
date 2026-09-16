import { useMemo, useState } from 'react'
import {
  Armchair,
  Circle,
  CircleDot,
  Clock,
  GraduationCap,
  HeartPulse,
  MonitorPlay,
  Lock,
  Palmtree,
  Plane,
  PlaneTakeoff,
  Trash2,
  X,
} from 'lucide-react'
import { useSchedulingBoard } from '../../../hooks/useCrewScheduling'
import { ROSTER_CODES, codeLabel, shortRole } from '../../../lib/rosterCodes'
import { dayMonthYear, hhmm } from '../../../lib/format'

/**
 * L'editeur d'une case — la modale `openCellModal` du prototype (l. 24780).
 *
 * On en garde la forme et l'enchainement : la grille des types de vacation en
 * gros boutons, les secteurs composes en dessous quand c'est un vol, la plage
 * de dates pour le reste, et Clear / Cancel / Save aux memes places.
 *
 * <b>Les secteurs se choisissent, ils ne se saisissent pas.</b> Le prototype
 * laissait taper un numero de vol, une route et des horaires dans la case : il
 * n'avait pas de programme des vols, donc il fallait bien inventer le vol au
 * moment de l'affecter. Ici le vol existe — c'est une etape de {@code ops.legs},
 * avec son avion, ses horaires et sa route — et la liste propose les etapes du
 * jour sur la flotte dont la personne est qualifiee. Deux endroits pour saisir
 * le meme vol finiraient par ne plus dire la meme chose, et c'est la Dispatch
 * qui cree un vol qui n'est pas encore programme.
 *
 * <b>Ce que Save ecrit.</b> Deux choses, dans cet ordre : le siege sur chaque
 * etape choisie (POST /crew/scheduling/legs/{id}/assignments), puis la cellule
 * de roster. Le serveur refuse un siege deja pris, une personne non qualifiee,
 * absente ou dont les papiers ont expire — l'editeur n'a pas a rejuger, il
 * affiche le refus.
 *
 * <b>Une journee publiee s'ouvre quand meme.</b> En lecture seule : on voit ce
 * qui est pose sans pouvoir l'ecraser. Refuser d'ouvrir la case laisserait
 * croire qu'il n'y a rien dedans.
 */

/** La grille de types, dans l'ordre du prototype : le repos, puis le travail. */
const TYPE_MENU = [
  { code: 'OFF', Icon: Circle },
  { code: 'RES', Icon: CircleDot },
  { code: 'SBY', Icon: Clock },
  { code: 'FLT', Icon: Plane },
  { code: 'POS', Icon: PlaneTakeoff },
  { code: 'DH', Icon: Armchair },
  { code: 'TRG', Icon: GraduationCap },
  { code: 'SIM', Icon: MonitorPlay },
  { code: 'LVE', Icon: Palmtree },
  { code: 'SICK', Icon: HeartPulse },
]

/** Les codes qui se composent en secteurs. */
const FLYING = new Set(['FLT', 'POS', 'DH'])

/**
 * Un vol s'affecte sur une etape, pas sur une plage de jours. Le prototype
 * masquait deja la plage pour les types de vol : « TNP101 du 3 au 17 » ne veut
 * rien dire.
 */
const RANGEABLE = new Set(['OFF', 'RES', 'SBY', 'TRG', 'SIM', 'LVE', 'SICK'])

/**
 * Le siege, dit dans le vocabulaire du prototype.
 *
 * « Function on this sector : PIC / SIC » est la fonction exercee ; le serveur,
 * lui, tient un siege (CPT / FO / CABIN_1…). Les deux disent la meme chose pour
 * un equipage de conduite, et l'etiquette garde le mot du planificateur.
 */
const SEATS = {
  CAPTAIN: [['CPT', 'PIC — commander']],
  FIRST_OFFICER: [['FO', 'SIC — co-pilot']],
  PURSER: [['CABIN_1', 'Purser'], ['CABIN_2', 'Cabin 2']],
  CABIN: [['CABIN_1', 'Cabin 1'], ['CABIN_2', 'Cabin 2']],
  ENGINEER: [['ENGINEER', 'Engineer']],
}

function daysBetween(from, to) {
  const start = from <= to ? from : to
  const end = from <= to ? to : from
  const days = []
  const cursor = new Date(`${start}T00:00:00Z`)
  const last = new Date(`${end}T00:00:00Z`)
  while (cursor <= last) {
    days.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return days
}

export default function RosterCellEditor({
  row,
  day,
  cells,
  periodStart,
  periodEnd,
  readOnly,
  busy,
  error,
  onSave,
  onClear,
  onClose,
}) {
  const existing = cells?.[0]
  const [code, setCode] = useState(existing?.code ?? 'OFF')
  const [remark, setRemark] = useState(existing?.remark ?? '')
  const [rangeEnd, setRangeEnd] = useState(day)
  const seats = SEATS[row?.mainRole] ?? SEATS.CABIN
  const [legs, setLegs] = useState([{ legId: '', seat: seats[0][0] }])

  // Le programme du jour n'est demande que lorsqu'il sert : ouvrir une case
  // pour y poser un OFF ne doit pas aller chercher les etapes de la journee.
  const board = useSchedulingBoard(FLYING.has(code) ? { date: day, role: '' } : undefined)

  const flights = useMemo(() => {
    const family = row?.typeRating ?? null
    return (board.data?.legs ?? [])
      .filter((leg) => !family || !leg.typeFamily || leg.typeFamily === family)
      .sort((a, b) => String(a.std).localeCompare(String(b.std)))
  }, [board.data, row?.typeRating])

  const rangeDays = useMemo(
    () => (periodStart && periodEnd ? daysBetween(periodStart, periodEnd) : [day]),
    [periodStart, periodEnd, day],
  )

  if (!row) return null

  const flying = FLYING.has(code)
  const rangeable = !flying && RANGEABLE.has(code)
  const targetDays = rangeable ? daysBetween(day, rangeEnd) : [day]
  const chosen = legs.filter((leg) => leg.legId)

  function setLeg(index, patch) {
    setLegs((current) => current.map((leg, i) => (i === index ? { ...leg, ...patch } : leg)))
  }

  return (
    <>
      <div className="rmodal__backdrop" onClick={onClose} />
      <div className="rmodal rmodal--wide" role="dialog" aria-modal="true" aria-label="Edit roster cell">
        <div className="rmodal__head">
          <div>
            <h3>
              {row.fullName} — {dayMonthYear(day)}
            </h3>
            {/* « CITATION CAP · Flight Crew » : la maquette nomme la
                SECTION, pas le matricule. Celui-ci reste en infobulle. */}
            <p title={row.staffNo}>
              {[row.typeRating, shortRole(row.mainRole)].filter(Boolean).join(' ')} ·{' '}
              {row.mainRole === 'CABIN' || row.mainRole === 'PURSER' ? 'Cabin Crew' : 'Flight Crew'}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close">
            <X size={15} />
          </button>
        </div>

        <div className="rmodal__body">
          {readOnly ? (
            <div className="rmodal__frozen">
              <Lock size={14} />
              <span>
                This day belongs to a published version. Its cells are frozen — a published roster
                is superseded by a new version, never amended. Open a draft to write on it.
              </span>
            </div>
          ) : null}

          <span className="rmodal__label">Duty type</span>
          <div className="rmodal__types">
            {TYPE_MENU.map(({ code: value, Icon }) => (
              <button
                key={value}
                type="button"
                disabled={readOnly}
                className={value === code ? 'rmodal__type rmodal__type--on' : 'rmodal__type'}
                onClick={() => setCode(value)}
              >
                <Icon size={17} />
                {codeLabel(value)}
              </button>
            ))}
          </div>

          {flying ? (
            <>
              {legs.map((leg, index) => {
                const picked = flights.find((flight) => flight.legId === leg.legId)
                const usedElsewhere = new Set(
                  legs.filter((other, i) => i !== index).map((other) => other.legId),
                )
                return (
                  <div className="rmodal__leg" key={index}>
                    <div className="rmodal__leg-head">
                      <span>Leg {index + 1}</span>
                      {legs.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => setLegs((current) => current.filter((_, i) => i !== index))}
                        >
                          Remove
                        </button>
                      ) : null}
                    </div>

                    <label className="rmodal__label" htmlFor={`leg-${index}`}>
                      Flight{row.typeRating ? ` (${row.typeRating} fleet only)` : ''}
                    </label>
                    <select
                      id={`leg-${index}`}
                      value={leg.legId}
                      disabled={readOnly || board.isLoading}
                      onChange={(event) => setLeg(index, { legId: event.target.value })}
                    >
                      <option value="">
                        {board.isLoading ? '— reading the day —' : '— choose a scheduled flight —'}
                      </option>
                      {flights.map((flight) => {
                        const taken = (flight.crew ?? []).some((member) => member.seat === leg.seat)
                        return (
                          <option
                            key={flight.legId}
                            value={flight.legId}
                            disabled={usedElsewhere.has(flight.legId)}
                          >
                            {flight.flightNo} {flight.depIcao}→{flight.arrIcao} (
                            {hhmm(flight.std)}–{hhmm(flight.sta)}) · {flight.registration}
                            {taken ? ' — seat already filled' : ''}
                            {usedElsewhere.has(flight.legId) ? ' — already in this duty' : ''}
                          </option>
                        )
                      })}
                    </select>

                    {picked ? (
                      <div className="rmodal__leg-facts">
                        <span>Route</span>
                        <b>
                          {picked.depIcao} → {picked.arrIcao}
                        </b>
                        <span>Time</span>
                        <b>
                          {hhmm(picked.std)}–{hhmm(picked.sta)}Z
                        </b>
                        <span>Aircraft</span>
                        <b>
                          {picked.registration} · {picked.icaoType}
                        </b>
                      </div>
                    ) : null}

                    {seats.length > 1 || row.mainRole === 'CAPTAIN' || row.mainRole === 'FIRST_OFFICER' ? (
                      <>
                        <label className="rmodal__label" htmlFor={`seat-${index}`}>
                          Function on this sector
                        </label>
                        <select
                          id={`seat-${index}`}
                          value={leg.seat}
                          disabled={readOnly}
                          onChange={(event) => setLeg(index, { seat: event.target.value })}
                        >
                          {seats.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </>
                    ) : null}
                  </div>
                )
              })}

              {!readOnly ? (
                <button
                  type="button"
                  className="rmodal__addleg"
                  onClick={() => setLegs((current) => [...current, { legId: '', seat: seats[0][0] }])}
                >
                  + Add another leg (same duty day)
                </button>
              ) : null}

              {flights.length === 0 && !board.isLoading ? (
                <p className="rmodal__hint">
                  No flight is scheduled on {dayMonthYear(day)}
                  {row.typeRating ? ` for the ${row.typeRating} fleet` : ''}. A flight that does not
                  exist yet is created in Dispatch, not here.
                </p>
              ) : (
                <p className="rmodal__hint">
                  Saving fills the seat on each leg chosen, then writes {codeLabel(code)} on{' '}
                  {dayMonthYear(day)}. The server refuses a seat already taken, or a crew member who
                  is not rated, absent, or out of currency.
                </p>
              )}
            </>
          ) : null}

          {rangeable ? (
            <>
              <label className="rmodal__label" htmlFor="rmodal-range">
                Apply to date range (optional)
              </label>
              <div className="rmodal__row">
                <input value={dayMonthYear(day)} readOnly />
                <select
                  id="rmodal-range"
                  value={rangeEnd}
                  disabled={readOnly}
                  onChange={(event) => setRangeEnd(event.target.value)}
                >
                  {rangeDays.map((value) => (
                    <option key={value} value={value}>
                      {dayMonthYear(value)}
                    </option>
                  ))}
                </select>
              </div>
              <p className="rmodal__hint">
                {targetDays.length === 1
                  ? `Leave both on ${dayMonthYear(day)} to affect only this day.`
                  : `${codeLabel(code)} will be written on ${targetDays.length} days.`}
              </p>
            </>
          ) : null}

          <label className="rmodal__label" htmlFor="rmodal-remark">
            Remark
          </label>
          <input
            id="rmodal-remark"
            value={remark}
            maxLength={200}
            disabled={readOnly}
            placeholder="Why this day is written as it is"
            onChange={(event) => setRemark(event.target.value)}
          />

          <div className="rmodal__already">
            <span className="rmodal__label">Already on this day</span>
            {cells?.length ? (
              cells.map((cell) => (
                <span key={cell.entryId} className="rmodal__chip">
                  <i style={{ background: ROSTER_CODES[cell.code]?.colour ?? 'var(--text-faint)' }} />
                  {codeLabel(cell.code)}
                  {cell.draft ? ' · draft' : ' · published'}
                  {cell.backed ? ' · recorded duty' : ' · planned only'}
                  {cell.remark ? ` · ${cell.remark}` : ''}
                </span>
              ))
            ) : (
              <span className="rmodal__chip rmodal__chip--none">Nothing — the day is blank</span>
            )}
          </div>

          {error ? <div className="rmodal__error">{error}</div> : null}
        </div>

        <div className="rmodal__actions">
          <button
            type="button"
            className="rmodal__btn rmodal__btn--danger"
            disabled={readOnly || busy || !cells?.some((cell) => cell.draft)}
            title={
              readOnly
                ? 'A published day cannot be cleared'
                : cells?.some((cell) => cell.draft)
                  ? 'Clear the draft codes written on this day'
                  : 'There is no draft cell to clear on this day'
            }
            onClick={() => onClear(cells)}
          >
            <Trash2 size={13} /> Clear
          </button>

          <div className="rmodal__actions-right">
            <button type="button" className="rmodal__btn" disabled={busy} onClick={onClose}>
              {readOnly ? 'Close' : 'Cancel'}
            </button>
            {!readOnly ? (
              <button
                type="button"
                className="rmodal__btn rmodal__btn--primary"
                disabled={busy || (flying && chosen.length === 0)}
                title={
                  flying && chosen.length === 0
                    ? 'Choose at least one flight, or pick another duty type'
                    : undefined
                }
                onClick={() =>
                  onSave({
                    days: targetDays,
                    code,
                    remark: remark.trim() || null,
                    legs: flying ? chosen : [],
                  })
                }
              >
                {busy ? 'Saving…' : targetDays.length > 1 ? `Save ${targetDays.length} days` : 'Save'}
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  )
}
