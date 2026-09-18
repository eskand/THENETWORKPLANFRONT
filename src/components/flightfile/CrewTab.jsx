import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ClipboardList, Clock, FileText, MapPin, Plane, Settings2, SlidersHorizontal, Users,
} from 'lucide-react'
import { LoadingState } from '../States'
import { useCrewList } from '../../hooks/useCrew'
import { useRecordCheckTimes, useSchedulingBoard } from '../../hooks/useCrewScheduling'
import { hhmm, isoDate } from '../../lib/format'

/**
 * L'onglet CREW — tabCrew() de l'annexe (prototype l. 16180).
 *
 * <b>La forme est la sienne</b>, de haut en bas : les quatre heures de tete
 * (prise de service poste de pilotage, prise de service cabine, STD, ETD) et la
 * phrase qui dit d'ou court le temps de service ; « Assigned Crew » ; une carte
 * {@code .flc} par siege, remplie ou non, avec son avatar a galons, ses
 * pastilles, ses trois statistiques et ses trois panneaux — Duty Details,
 * Options, Check-in / Check-out ; le bouton GENDEC en pied.
 *
 * <b>Les heures de prise de service sont calculees comme chez elle</b> : STD
 * moins le preavis (60 min poste de pilotage, 90 min cabine), et sur le STD, pas
 * sur l'ETD — un retard ne deplace pas la prise de service planifiee.
 *
 * <b>Ce qui change.</b> L'annexe garde les heures reelles dans
 * {@code flight._crewCheckTimes}, un objet du navigateur, et calcule le FDP dans
 * le navigateur aussi. Ici la prise et la fin de service sont deux colonnes de
 * {@code crew.leg_assignments} ecrites par
 * {@code PATCH /crew/scheduling/assignments/&#123;id&#125;/check-times}, et le
 * verdict FTL est celui du serveur — {@code ftlVerdict} / {@code ftlReason}.
 *
 * <b>Et les deux bascules d'extension FTL restent inertes</b>, comme chez elle
 * quand aucun roster n'est publie : la discretion du commandant et le service
 * fractionne modifient un FDP maximal que notre moteur ne calcule pas encore.
 * Les afficher desactivees avec la raison est plus honnete que de les cacher —
 * ou, pire, de les laisser cliquables sans effet.
 */

/** Le preavis de l'annexe (TNPDuty.cfg), en minutes. */
const SHOW_TIME_MIN = { deck: 60, cabin: 90 }

/** Les sieges dans l'ordre de l'annexe, avec le libelle qu'elle ecrit. */
const SEATS = [
  { seat: 'CPT', label: 'Captain', stripes: 4 },
  { seat: 'FO', label: 'First Officer', stripes: 3 },
  { seat: 'CABIN_1', label: 'Cabin Crew', stripes: 2 },
  { seat: 'CABIN_2', label: 'Cabin Crew', stripes: 2 },
  { seat: 'ENGINEER', label: 'Engineer', stripes: 2 },
]

export default function CrewTab({ row }) {
  const board = useSchedulingBoard(
    row.std ? { date: isoDate(new Date(row.std)), role: '' } : undefined)
  // L'annuaire equipage porte l'anciennete, la qualification de type et la base
  // — trois colonnes que la ligne d'affectation ne transporte pas. Une seule
  // requete, mise en cache, partagee avec Crew Management.
  const people = useCrewList({ activeOnly: true })
  const checkTimes = useRecordCheckTimes()

  if (board.isLoading) return <LoadingState label="Reading the crew roster…" />
  if (board.isError) {
    return <div className="fd-banner warn">Crew unavailable — {board.error.message}</div>
  }

  const leg = (board.data?.legs ?? []).find((candidate) => candidate.legId === row.legId)
  const crew = leg?.crew ?? []
  const minimumSeats = leg?.minimumSeats ?? 2

  const std = row.std ? new Date(row.std) : null
  const etd = row.etd ?? row.atd ?? row.std
  const deckShow = std ? new Date(std.getTime() - SHOW_TIME_MIN.deck * 60_000) : null
  const cabinShow = std ? new Date(std.getTime() - SHOW_TIME_MIN.cabin * 60_000) : null

  const directory = people.data?.rows ?? people.data ?? []
  const personById = new Map(
    (Array.isArray(directory) ? directory : []).map((person) => [person.id, person]))

  // Les sieges affiches : ceux que le type exige, plus tout siege deja occupe
  // au-dela (un troisieme membre embarque reste visible).
  const filledSeats = new Set(crew.map((member) => member.seat))
  const shown = SEATS.filter((definition, index) =>
    index < minimumSeats || filledSeats.has(definition.seat))
  const filled = shown.filter((definition) => filledSeats.has(definition.seat)).length

  return (
    <>
      <div className="fd-showing-time">
        <div className="fst-item">
          <span className="fst-label">✈ FD Check-in — planned (UTC)</span>
          <span className="fst-val">{deckShow ? hhmm(deckShow.toISOString()) : '—'}</span>
        </div>
        <div className="fst-item">
          <span className="fst-label">👤 CC Check-in — planned (UTC)</span>
          <span className="fst-val">{cabinShow ? hhmm(cabinShow.toISOString()) : '—'}</span>
        </div>
        <div className="fst-item">
          <span className="fst-label">STD (UTC)</span>
          <span className="fst-val">{row.std ? hhmm(row.std) : '—'}</span>
        </div>
        <div className="fst-item">
          <span className="fst-label">ETD (UTC)</span>
          <span className="fst-val">{etd ? hhmm(etd) : '—'}</span>
        </div>
      </div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', margin: '2px 0 8px' }}>
        Duty/FDP runs CHECK-IN → CHECK-OUT (actual &gt; estimated &gt; planned) — never from
        STD/ETD/off-block. Block time is tracked separately and never feeds duty.
      </div>

      {/* L'en-tete que TNPFL.decorate('crew') pose autour de la section (l. 77583-
          77600) : le compte reel dans le titre — « (n) » quand tout est pourvu,
          « (n/N) » sinon — et le lien « Crew Roster » dans la barre. Les deux
          boutons Auto Assign / Add Crew de l'annexe appellent des moteurs du
          module Crew (crewAutoAssign, crewAddCrew) non encore specifies ici. */}
      <div className="fl-crew-hd">
        <div className="fd-section"
             title={`${filled} assigned of ${shown.length} required for this aircraft type`}>
          <i className="flc-hdico"><Users size={16} /></i>
          <span>
            Assigned Crew ({filled === shown.length ? filled : `${filled}/${shown.length}`})
          </span>
          <div className="flc-hdacts">
            <Link className="fl-lnk" to="/roster" title="Open the Roster module">
              <Users size={15} />Crew Roster
            </Link>
          </div>
        </div>
      </div>

      {shown.map((definition) => (
        <CrewCard
          key={definition.seat}
          definition={definition}
          member={crew.find((candidate) => candidate.seat === definition.seat)}
          person={personById.get(
            crew.find((candidate) => candidate.seat === definition.seat)?.personId)}
          row={row}
          plannedCheckIn={definition.seat === 'CPT' || definition.seat === 'FO'
            ? deckShow : cabinShow}
          onCheckTimes={(assignmentId, times) =>
            checkTimes.mutate({ assignmentId, ...times })}
          busy={checkTimes.isPending}
        />
      ))}

      <div className="action-btn fl-gendec-btn"
           style={{ width: '100%', justifyContent: 'center', marginTop: 14 }}
           role="button" tabIndex={0}>
        <FileText size={15} />Generate GENDEC
      </div>
    </>
  )
}

function CrewCard({ definition, member, person, row, plannedCheckIn, onCheckTimes, busy }) {
  const [notesOpen, setNotesOpen] = useState(false)
  const [docsOpen, setDocsOpen] = useState(false)

  if (!member) {
    return (
      <div className="flc" data-role={definition.label.toLowerCase()} data-filled="0">
        <div className="flc-hd">
          <div className="flc-id">
            <div className="flc-av">
              <Stripes count={definition.stripes} label={definition.label} />
              <span>?</span>
              <i className="flc-av-badge"><Plane size={11} /></i>
            </div>
            <div className="flc-who">
              <div className="flc-rank">{definition.label}</div>
              <div className="flc-name">— Unassigned —</div>
            </div>
          </div>
          <div className="flc-badges"><span className="fd-badge gray">Unassigned</span></div>
        </div>
        <div className="flc-assign">
          {/* L'annexe ouvre ici sa modale d'affectation. Le portage renvoie a
              l'ecran qui fait reellement l'affectation, avec ses regles de
              disponibilite et de qualification — refaire un choix de personne
              dans le dossier de vol serait un deuxieme endroit ou la meme regle
              peut diverger. */}
          <Link className="occ-confirm-btn" to="/crew-scheduling"
                title="Crew Scheduling assigns the seat, with availability and qualification checked">
            Assign in Crew Scheduling
          </Link>
        </div>
      </div>
    )
  }

  const verdict = String(member.ftlVerdict ?? 'UNKNOWN').toUpperCase()
  const tone = verdict === 'OK' ? 'ok' : verdict === 'BREACH' ? 'crit' : 'warn'
  const pillText = verdict === 'OK' ? 'FIT TO FLY'
    : verdict === 'BREACH' ? '⛔ NOT LEGAL' : '⚠ REVIEW'

  const flightDay = row.std ? new Date(row.std) : new Date()
  const initials = (member.fullName ?? '')
    .split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()

  const plannedDuty = member.dutyStart && member.dutyEnd
    ? minutesBetween(member.dutyStart, member.dutyEnd) : null
  const actualDuty = member.checkedInAt && member.checkedOutAt
    ? minutesBetween(member.checkedInAt, member.checkedOutAt) : null
  const blockMinutes = row.std && row.sta ? minutesBetween(row.std, row.sta) : null

  const closed = Boolean(member.checkedOutAt)
  const onDuty = Boolean(member.checkedInAt) && !closed

  return (
    <div className="flc" data-role={definition.label.toLowerCase()} data-filled="1">
      <div className="flc-hd">
        <div className="flc-id">
          <div className="flc-av">
            <Stripes count={definition.stripes} label={definition.label} />
            <span>{initials || '?'}</span>
            <i className="flc-av-badge"><Plane size={11} /></i>
          </div>
          <div className="flc-who">
            <div className="flc-rank">{definition.label}</div>
            <div className="flc-name">{member.fullName}</div>
          </div>
        </div>

        <div className="flc-badges">
          <ExpiryBadge label="License" date={member.licenceExpiry} on={flightDay} />
          <ExpiryBadge label="Medical" date={member.medicalExpiry} on={flightDay} />
          <ExpiryBadge label="Training" date={member.trainingExpiry} on={flightDay} />
          <span className={`crew-status-pill ${tone}`}
                onClick={() => setNotesOpen((open) => !open)}
                role={member.ftlReason ? 'button' : undefined}>
            <span className="csp-dot" />{pillText}
          </span>
          {plannedDuty != null ? (
            <span className="crew-duty-pill ok"
                  title="Planned duty, from the assignment's duty window. The maximum FDP is the FTL engine's, not this panel's.">
              <span className="cdp-dot" />⏱ {formatMinutes(plannedDuty)} planned
            </span>
          ) : (
            <span className="crew-duty-pill" style={{ background: '#6b7280', color: '#fff' }}
                  title="No duty window on this assignment — no figure is invented">
              ⏱ Data Missing
            </span>
          )}
          <button type="button" className="flc-docbtn" title={`Documents of ${member.fullName}`}
                  onClick={() => setDocsOpen(true)}>
            <FileText size={14} /><span>Crew Doc</span>
          </button>
        </div>

        <div className="flc-stats">
          <div>
            <i><Plane size={15} /></i>
            <u>
              <span>Total Flight Time</span>
              <b>{person?.blockMinutes365d
                ? `${Math.round(person.blockMinutes365d / 60).toLocaleString('en-US')} h`
                : '—'}</b>
            </u>
          </div>
          <div title={person?.typeRatings?.join(', ') ?? 'No type rating on file'}>
            <i><Settings2 size={15} /></i>
            <u>
              <span>Type Rating</span>
              <b>{person?.typeRatings?.[0]?.toUpperCase() ?? '—'}</b>
            </u>
          </div>
          <div>
            <i><MapPin size={15} /></i>
            <u><span>Base</span><b>{person?.baseIcao ?? '—'}</b></u>
          </div>
        </div>
      </div>

      <div className={`crew-notes-panel${notesOpen ? ' open' : ''}`}>
        <div className="cn-item">
          {member.ftlReason
            ? `${verdict === 'BREACH' ? '⛔' : '⚠'} ${member.ftlReason}`
            : 'No notes.'}
        </div>
        {member.documentStatus && member.documentStatus !== 'VALID' ? (
          <div className="cn-item">⚠ Documents: {member.documentStatus.toLowerCase()}</div>
        ) : null}
      </div>

      <div className="flc-body">
        <section className="flc-panel flc-p-duty">
          <h5><ClipboardList size={13} />Duty Details<i>
            {closed ? 'Closed' : onDuty ? 'On duty' : 'Planned'}
          </i></h5>
          <div className="flc-pbody">
            {closed
              ? <>
                <DutyRow label="Final Duty" value={formatMinutes(actualDuty)} />
                <DutyRow label="Check-in (Actual)" value={hhmm(member.checkedInAt)} />
                <DutyRow label="Check-out (Actual)" value={hhmm(member.checkedOutAt)} />
              </>
              : <>
                <DutyRow label="Planned Duty" value={formatMinutes(plannedDuty)} />
                <DutyRow
                  label={member.checkedInAt ? 'Check-in (Actual)' : 'Check-in (Planned)'}
                  value={member.checkedInAt
                    ? hhmm(member.checkedInAt)
                    : (plannedCheckIn ? hhmm(plannedCheckIn.toISOString()) : null)}
                  hint={member.checkedInAt ? 'logged' : 'STD − show time'}
                />
                <DutyRow label="Check-out (Estimated)"
                         value={member.dutyEnd ? hhmm(member.dutyEnd) : null}
                         hint="end of the assignment's duty window" />
                <DutyRow label="ETA (Effective)"
                         value={row.ata ?? row.eta ?? row.sta
                           ? `${hhmm(row.ata ?? row.eta ?? row.sta)} UTC` : null} />
              </>}
            <DutyRow label="Block Time (Scheduled)" value={formatMinutes(blockMinutes)}
                     hint="never counts as duty" />
          </div>
        </section>

        <section className="flc-panel flc-p-opt">
          <h5><SlidersHorizontal size={13} />Options</h5>
          <div className="flc-pbody">
            <FtlToggle
              label="Captain's Discretion"
              hint="ORO.FTL.205(f) · +2h/+3h"
              enabled={definition.seat === 'CPT'}
            />
            <FtlToggle
              label="Split Duty"
              hint="ORO.FTL.205(e) · up to +50% of break"
              enabled
            />
          </div>
        </section>

        <section className="flc-panel flc-cio flc-p-cio">
          <h5><Clock size={13} />Check-in / Check-out</h5>
          <div className="flc-pbody">
            <div className="flc-cio-grid">
              <CheckBox
                label="Check-in"
                value={member.checkedInAt}
                day={row.std}
                busy={busy}
                onChange={(value) => onCheckTimes(member.assignmentId, {
                  checkInAt: value, checkOutAt: member.checkedOutAt ?? null,
                })}
              />
              <CheckBox
                label="Check-out"
                value={member.checkedOutAt}
                day={row.sta ?? row.std}
                busy={busy}
                onChange={(value) => onCheckTimes(member.assignmentId, {
                  checkInAt: member.checkedInAt ?? null, checkOutAt: value,
                })}
              />
            </div>
          </div>
        </section>
      </div>

      {docsOpen ? (
        <CrewDocsModal member={member} flightDay={flightDay} onClose={() => setDocsOpen(false)} />
      ) : null}
    </div>
  )
}

/**
 * « Crew Doc » — les pieces du membre d'equipage.
 *
 * <b>Le bouton n'ouvrait rien.</b> L'annexe ouvre ici les documents de CE
 * membre (crewDocsFor, l. 16340). Les trois echeances que le serveur rend —
 * licence, aptitude medicale, entrainement — sont ce que le produit sait, et
 * elles sont jugees AU JOUR DU VOL, pas au jour d'aujourd'hui : une licence qui
 * expire demain est valable pour ce vol-ci et ne l'est pas pour celui de la
 * semaine prochaine.
 *
 * <p>Le depot des pieces elles-memes appartient au dossier equipage, dans Crew
 * Management — ce panneau ne fait pas semblant de les porter.
 */
function CrewDocsModal({ member, flightDay, onClose }) {
  const documents = [
    ['Licence', member.licenceExpiry],
    ['Medical certificate', member.medicalExpiry],
    ['Training / recurrent', member.trainingExpiry],
  ]

  return (
    <div className="tnp-modal-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tnp-modal-box">
        <div className="tnp-modal-close" role="button" tabIndex={0} onClick={onClose}>✕</div>
        <div className="tnp-modal-title">Crew documents — {member.fullName}</div>
        <div className="tnp-modal-sub">
          {member.staffNo} · checked against the flight date, not today
        </div>

        {documents.map(([label, date]) => {
          const days = date ? Math.round((new Date(date) - flightDay) / 86_400_000) : null
          const tone = days == null ? 'gray' : days < 0 ? 'red' : days <= 30 ? 'amber' : 'green'
          return (
            <div className="fd-doc-row" key={label}>
              <div className="dn">{label}</div>
              <span style={{ fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text-dim)' }}>
                {date ?? 'not recorded'}
              </span>
              <span className={`fd-badge ${tone}`}>
                {days == null ? 'No date'
                  : days < 0 ? 'Expired'
                    : days <= 30 ? `${days} d left` : 'Valid'}
              </span>
            </div>
          )
        })}

        <div className="lvp-thresholds">
          The files themselves live in the crew record — Crew Management holds the scans.
          This panel reads the expiry dates the roster and the FTL engine act on.
        </div>

        <div className="tnp-modal-actions">
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Close</div>
        </div>
      </div>
    </div>
  )
}

/** Les galons de l'avatar — crewStripesHtml() de l'annexe (l. 16164). */
function Stripes({ count, label }) {
  return (
    <span className="flc-stripes" data-n={count}
          title={`${label} — ${count} stripe${count > 1 ? 's' : ''}`}>
      {Array.from({ length: count }, (unused, index) => <i key={index} />)}
    </span>
  )
}

/**
 * crewLicenseBadge() / crewTrainingBadge() de l'annexe, generalises : la meme
 * regle de bandes — echu, echeant sous trente jours, valide — s'applique aux
 * trois echeances, et elle est jugee au JOUR DU VOL. Une licence qui expire
 * demain est valable aujourd'hui et ne l'est pas pour l'etape de la semaine
 * prochaine.
 */
function ExpiryBadge({ label, date, on }) {
  if (!date) return null
  const days = Math.round((new Date(date) - on) / 86_400_000)
  if (days < 0) return <span className="fd-badge red">{label} Expired</span>
  if (days <= 30) return <span className="fd-badge amber">{label} Expiring</span>
  return <span className="fd-badge green">{label} Valid</span>
}

/** crewDutyRow() de l'annexe (l. 16118) : une ligne, la source en infobulle. */
function DutyRow({ label, value, hint }) {
  return (
    <div className="flc-dr" title={hint ? `${label} — ${hint}` : undefined}>
      <span>{label}</span><b>{value ?? '—'}</b>
    </div>
  )
}

/**
 * Les deux bascules d'extension FTL. Elles sont dessinees et desactivees, comme
 * chez l'annexe quand aucun roster n'est publie, parce qu'elles modifient un FDP
 * maximal que notre moteur ne calcule pas encore. L'infobulle dit pourquoi.
 */
function FtlToggle({ label, hint, enabled }) {
  const why = enabled
    ? 'Inactive: the FTL engine does not compute a maximum FDP yet, so extending it would change nothing'
    : "Inactive: commander's discretion applies to the commander's seat"

  return (
    <>
      <div className="fd-ftl-toggle-row" title={why}>
        <label className="fd-ftl-switch">
          <input type="checkbox" disabled readOnly />
          <span className="fd-ftl-slider" />
        </label>
        <span className="fd-ftl-toggle-label">{label}</span>
        <span className="fd-ftl-toggle-hint">{hint}</span>
      </div>
      {/* LA RAISON EST ECRITE, pas seulement en infobulle. L'annexe grise ces
          deux bascules quand aucun roster n'est publie et n'explique rien ;
          une bascule morte et muette se lit comme un defaut du logiciel. */}
      <div className="flc-ftl-why">{why}</div>
    </>
  )
}

/**
 * Une des deux boites d'heure — cioBox() de l'annexe (l. 16279), avec ses deux
 * commandes : saisie libre et « Now », qui pose l'heure UTC courante.
 */
function CheckBox({ label, value, day, busy, onChange }) {
  const time = value ? hhmm(value) : ''

  /** Une heure HH:MM devient un instant du JOUR de l'etape, en UTC. */
  function atDay(hhmmText) {
    if (!hhmmText) return null
    const base = day ? new Date(day) : new Date()
    const [hours, minutes] = hhmmText.split(':').map(Number)
    const stamp = new Date(Date.UTC(
      base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(), hours, minutes, 0, 0))
    return stamp.toISOString()
  }

  return (
    <div className="flc-cio-box">
      <div className="flc-cio-l">{label}</div>
      <div className="flc-cio-t">
        <input type="time" value={time} aria-label={label} disabled={busy}
               onChange={(event) => onChange(atDay(event.target.value))} />
      </div>
      <div className="flc-cio-a">
        <button type="button" className="now" disabled={busy}
                title="Log the current UTC time"
                onClick={() => onChange(new Date().toISOString())}>
          Now
        </button>
        <button type="button" disabled={busy || !value} title={`Clear the ${label.toLowerCase()}`}
                onClick={() => onChange(null)}>
          Clear
        </button>
      </div>
    </div>
  )
}

function minutesBetween(from, to) {
  return Math.round((new Date(to) - new Date(from)) / 60_000)
}

function formatMinutes(minutes) {
  if (minutes == null) return null
  const sign = minutes < 0 ? '-' : ''
  const absolute = Math.abs(minutes)
  return `${sign}${Math.floor(absolute / 60)}h${String(absolute % 60).padStart(2, '0')}`
}
