import { useState } from 'react'
import { LoadingState } from '../States'
import {
  useLegEvents, useOccTimeline, useSetSlot, useSignRelease,
} from '../../hooks/useFlightFile'
import { hhmm, titleCase } from '../../lib/format'
import Modal from './Modal'

/**
 * « OCC Dispatch » — la frise du cycle de dispatch, de la creation du vol a sa
 * cloture.
 *
 * <b>Le dessin est celui de l'annexe</b>, au caractere pres :
 * {@code renderOccDispatchModalContent()} (prototype l. 14086) pose un en-tete
 * {@code .occ-modal-hdr}, un titre de section « Flight Creation -> Flight
 * Closed », un resume STD/STA · ETD/ETA · Status, puis dix lignes
 * {@code .occ-event} sur un filet vertical, chacune avec sa pastille, son
 * libelle, sa pastille d'etat, sa fenetre horaire en chasse fixe et, quand elle
 * en a un, son bouton.
 *
 * <b>Ce qui change est d'ou viennent les etats.</b> Chez elle, les dix statuts
 * sont deduits de l'heure qu'il est : un vol dont personne n'a commande
 * l'avitaillement affichait « Refueling · Completed » parce que la fenetre
 * etait passee. Ici chaque ligne lit un fait enregistre — la signature de la
 * release, le statut de la demande de service, le verdict FTL pose a
 * l'affectation, le CTOT, l'escale reelle de la rotation, l'heure d'envoi du
 * MVT. Le serveur rend aussi l'instant du calcul, donc « dans 1h20 » ne depend
 * pas de l'horloge du poste.
 *
 * <b>Les deux boutons agissent vraiment.</b> « Confirm release » signe la mise
 * en ligne et peut etre refuse — c'est le point : chez elle il posait un
 * booleen qui ne pouvait pas echouer. « Set CTOT / Slot ref » enregistre le
 * creneau, repousse l'estimation quand le creneau est plus tard, et laisse la
 * cascade de rotation faire son travail.
 *
 * <p>Le journal de l'etape est ajoute EN DESSOUS de la frise, jamais au milieu :
 * l'annexe n'en a pas, et il repond a l'autre question — non pas « ou en est-on »
 * mais « qui a change quoi ».
 */
export default function OccTimelineModal({ row, onClose }) {
  const timeline = useOccTimeline(row.legId)
  const data = timeline.data

  const subtitle = [
    row.flightNo ?? row.registration,
    row.registration,
    `${row.depCode ?? row.depIcao} → ${row.arrCode ?? row.arrIcao}`,
  ].filter(Boolean).join(' · ')

  return (
    <Modal onClose={onClose}>
      <div className="occ-modal-hdr">
        <div>
          <h3>OCC Dispatch</h3>
          <span>{subtitle}</span>
        </div>
      </div>

      {!row.legId ? (
        <div className="fd-banner warn">
          This aircraft is on the ground with no leg open — there is no dispatch cycle to follow.
        </div>
      ) : null}

      {timeline.isLoading ? <LoadingState label="Reading the dispatch cycle…" /> : null}
      {timeline.isError ? (
        <div className="fd-banner warn">Timeline unavailable — {timeline.error.message}</div>
      ) : null}

      {data ? <Timeline row={row} data={data} /> : null}

      {row.legId ? <History legId={row.legId} /> : null}
    </Modal>
  )
}

function Timeline({ row, data }) {
  const now = new Date(data.now).getTime()

  return (
    <>
      <div className="fd-section">Flight Creation → Flight Closed</div>

      <div className="occ-summary">
        <div><span>STD/STA</span><b>{utc(data.std)} – {utc(data.sta)}</b></div>
        <div><span>ETD/ETA</span><b>{utc(data.etd)} – {utc(data.eta)}</b></div>
        <div><span>Status</span><b>{titleCase(data.status)}</b></div>
      </div>

      {/* Le bandeau de retard de l'annexe (l. 14039). Il ne parait que lorsqu'il
          y a un retard, et il porte sa raison quand le journal en a une. */}
      {data.delayMinutes > 0 ? (
        <div className="fd-banner warn">
          ⚠ {data.delayMinutes} min accumulated delay
          {data.delayReason ? ` — ${data.delayReason}` : ''}
        </div>
      ) : null}

      <div className="occ-timeline-list">
        {data.events.map((event) => (
          <EventRow key={event.key} row={row} event={event} now={now} />
        ))}
      </div>
    </>
  )
}

function EventRow({ row, event, now }) {
  const meta = STATUS_META[event.status] ?? STATUS_META.PENDING
  const window = event.start === event.end
    ? utc(event.start)
    : `${utc(event.start)}–${utc(event.end)}`

  return (
    <div className={`occ-event occ-${event.status.toLowerCase()}`}>
      <div className="occ-icon">{meta.icon}</div>
      <div className="occ-body">
        <div className="occ-row-top">
          <span className="occ-label">{event.label}</span>
          <span className={`fd-badge ${meta.cls}`}>{meta.label}</span>
        </div>
        <div className="occ-window">{window} UTC · {remaining(event.start, now)}</div>
        {event.note ? <div className="occ-note">{event.note}</div> : null}
        {event.action === 'CONFIRM_RELEASE' ? <ConfirmRelease legId={row.legId} /> : null}
        {event.action === 'SET_SLOT' ? <SetSlot row={row} /> : null}
      </div>
    </div>
  )
}

/**
 * « Confirm release ».
 *
 * <p>Le refus du serveur s'affiche tel quel : il nomme les constats bloquants,
 * et c'est exactement ce qu'un dispatcher a besoin de lire. Quand le seul
 * obstacle est derogeable, la boite demande la raison — une derogation sans
 * motif n'est pas une derogation.
 */
function ConfirmRelease({ legId }) {
  const sign = useSignRelease(legId)
  const [error, setError] = useState(null)
  const [needsReason, setNeedsReason] = useState(false)
  const [reason, setReason] = useState('')

  function submit(derogation) {
    setError(null)
    sign.mutate(
      { derogation, derogationReason: derogation ? reason : null },
      {
        onError: (failure) => {
          const message = failure.message ?? 'Release refused'
          setError(message)
          if (/derogation/i.test(message) && !/reason/i.test(message)) setNeedsReason(true)
        },
      },
    )
  }

  if (!legId) return null

  return (
    <>
      <div className="occ-confirm-btn" role="button" tabIndex={0}
           onClick={() => submit(needsReason)}>
        {sign.isPending ? 'Signing…' : needsReason ? 'Release with derogation' : 'Confirm release'}
      </div>
      {needsReason ? (
        <input
          className="occ-inline-input"
          value={reason}
          placeholder="Reason for the derogation — required"
          onChange={(event) => setReason(event.target.value)}
        />
      ) : null}
      {error ? <div className="occ-note">{error}</div> : null}
    </>
  )
}

/**
 * « Set CTOT / Slot ref ».
 *
 * <p>L'annexe ouvre deux {@code window.prompt} l'un apres l'autre. Ici les deux
 * champs se posent sous la ligne : meme geste, mais on voit ce qu'on tape et on
 * peut corriger le premier apres avoir lu le second.
 */
function SetSlot({ row }) {
  const save = useSetSlot(row.legId)
  const [open, setOpen] = useState(false)
  const [time, setTime] = useState(() => hhmm(row.etd ?? row.std) ?? '')
  const [reference, setReference] = useState('')
  const [error, setError] = useState(null)

  if (!row.legId) return null

  function submit() {
    setError(null)
    const match = /^(\d{1,2}):?(\d{2})$/.exec(time.trim())
    if (!match) {
      setError('Invalid format — use HH:MM UTC (e.g. 14:35).')
      return
    }
    // Le creneau porte sur le jour du depart prevu : un CTOT saisi le lendemain
    // d'un vol de nuit porterait sinon la mauvaise date.
    const base = new Date(row.etd ?? row.std ?? Date.now())
    const ctot = new Date(Date.UTC(
      base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(),
      Number(match[1]), Number(match[2]), 0, 0,
    ))
    save.mutate(
      { ctot: ctot.toISOString(), reference: reference.trim() || null },
      { onSuccess: () => setOpen(false), onError: (failure) => setError(failure.message) },
    )
  }

  return (
    <>
      <div className="occ-confirm-btn" role="button" tabIndex={0}
           onClick={() => setOpen((current) => !current)}>
        {row.ctot ? 'Revise CTOT' : 'Set CTOT / Slot ref'}
      </div>
      {open ? (
        <div className="occ-slot-form">
          <input className="occ-inline-input" value={time} placeholder="CTOT — HH:MM UTC"
                 onChange={(event) => setTime(event.target.value)} />
          <input className="occ-inline-input" value={reference}
                 placeholder="Slot reference — CFMU / EUROCONTROL"
                 onChange={(event) => setReference(event.target.value)} />
          <div className="occ-confirm-btn" role="button" tabIndex={0} onClick={submit}>
            {save.isPending ? 'Saving…' : 'Save slot'}
          </div>
        </div>
      ) : null}
      {error ? <div className="occ-note">{error}</div> : null}
    </>
  )
}

/**
 * Le journal de l'etape, sous la frise.
 *
 * <p>Il n'est pas dans l'annexe — il ne pouvait pas y etre, son etat vivait dans
 * {@code localStorage} et se purgeait a 4,2 Mo. Une ligne par changement
 * reellement enregistre, avec son heure et sa raison.
 */
function History({ legId }) {
  const events = useLegEvents(legId)

  return (
    <>
      <div className="fd-section">Recorded history</div>
      {events.isLoading ? <LoadingState label="Reading the leg history…" /> : null}
      {events.isError
        ? <div className="fd-banner warn">History unavailable — {events.error.message}</div>
        : null}
      {events.data?.length === 0 ? (
        <div className="fd-banner">
          Nothing has been changed on this leg since it entered the programme.
        </div>
      ) : null}
      {(events.data ?? []).map((event) => (
        <div className="occ-evt" key={event.id}>
          <span className={`occ-evt-kind kind-${event.kind.toLowerCase()}`}>
            {titleCase(event.kind.replace(/_/g, ' '))}
          </span>
          <div className="occ-evt-body">
            <b>{event.reason ?? '—'}</b>
          </div>
          <span className="occ-evt-at" title={event.at}>
            {new Date(event.at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', timeZone: 'UTC',
            })} {hhmm(event.at)}Z
          </span>
        </div>
      ))}
    </>
  )
}

/** OCC_STATUS_META de l'annexe (l. 13137) — memes libelles, memes glyphes. */
const STATUS_META = {
  PENDING: { label: 'Pending', cls: 'gray', icon: '○' },
  SCHEDULED: { label: 'Scheduled', cls: 'blue', icon: '◔' },
  IN_PROGRESS: { label: 'In Progress', cls: 'amber', icon: '●' },
  COMPLETED: { label: 'Completed', cls: 'green', icon: '✓' },
  DELAYED: { label: 'Delayed', cls: 'red', icon: '⚠' },
  CANCELLED: { label: 'Cancelled', cls: 'gray', icon: '✕' },
}

/** HH:MM UTC, la chasse fixe de la frise. */
function utc(iso) {
  if (!iso) return '—:—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—:—'
  return `${String(date.getUTCHours()).padStart(2, '0')}:${String(date.getUTCMinutes()).padStart(2, '0')}`
}

/** occTimeRemainingLabel() de l'annexe (l. 14005) : « in 1h20 », « 45m overdue ». */
function remaining(iso, now) {
  if (!iso) return '—'
  const target = new Date(iso).getTime()
  if (Number.isNaN(target)) return '—'
  const minutes = Math.round((target - now) / 60_000)
  if (Math.abs(minutes) < 1) return 'now'
  const span = format(Math.abs(minutes))
  return minutes > 0 ? `in ${span}` : `${span} overdue`
}

function format(minutes) {
  const hours = Math.floor(minutes / 60)
  const rest = minutes % 60
  return hours > 0 ? `${hours}h${String(rest).padStart(2, '0')}` : `${rest}m`
}
