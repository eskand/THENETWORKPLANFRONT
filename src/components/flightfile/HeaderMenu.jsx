import { useEffect, useRef, useState } from 'react'
import { CloudFog, Clock, FileText, Pencil, Send, ShieldCheck } from 'lucide-react'
import { LoadingState } from '../States'
import { useRecordMovement, useSendMvt } from '../../hooks/useOperations'
import { useSchedulingBoard } from '../../hooks/useCrewScheduling'
import {
  useFlightFileLvp, useFlightNote, useLegEvents, useSaveFlightNote,
} from '../../hooks/useFlightFile'
import { hhmm, isoDate, titleCase } from '../../lib/format'
import LvpModal from './LvpModal'
import MvtModal from './MvtModal'
import { vigilFor } from './vigil'

/**
 * Le menu ⋮ de l'en-tete du dossier de vol — {@code TNPFL.headerMenuHtml()}
 * (prototype l. 77315).
 *
 * <b>Le DOM et la feuille sont ceux de l'annexe</b> : {@code .fl-more} porte le
 * caractere ⋮ et contient {@code .fl-menu}, qui s'ouvre par une classe et se
 * pose en {@code position:absolute; top:46px; z-index:30} — c'est-a-dire
 * PAR-DESSUS le bandeau de date et la barre d'onglets, pas au-dessus d'eux dans
 * le flux. Le panneau ne bouge donc pas quand le menu s'ouvre.
 *
 * <b>Cinq entrees, dans son ordre.</b> L'annexe n'affiche une entree que si
 * l'action existe reellement dans l'application ({@code typeof root.xxx ===
 * 'function'}) — c'est sa propre regle, et elle est bonne : un menu qui propose
 * ce qui n'existe pas apprend a ne plus ouvrir le menu. Les quatre premieres
 * entrees ont ici une action derriere ; la cinquieme, « Open VIGIL », est
 * rendue desactivee avec la raison, parce que le module VIGIL n'est pas encore
 * porte et que le masquer ferait croire que l'annexe n'en a que quatre.
 */
export default function HeaderMenu({ row }) {
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [mvtError, setMvtError] = useState(null)
  const host = useRef(null)

  const sendMvt = useSendMvt()
  // Le verdict de faible visibilite, pour l'entree « Open LVP ». Le bandeau de
  // l'onglet FLIGHT le lit aussi : c'est la meme clef de cache, donc une seule
  // requete pour les deux.
  const lvp = useFlightFileLvp({ legId: row.legId, stations: [row.depIcao, row.arrIcao] })

  // Le clic ailleurs ferme le menu — l'annexe pose le meme ecouteur sur le
  // document (l. 77325), en epargnant le bouton lui-meme.
  useEffect(() => {
    if (!open) return undefined
    function onDocumentClick(event) {
      if (!host.current?.contains(event.target)) setOpen(false)
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [open])

  const legId = row.legId

  /**
   * MVT_TOO_EARLY, la regle du serveur, lue ici pour l'annoncer : un message de
   * mouvement annonce un mouvement, et il n'y en a pas tant que l'appareil n'a
   * pas quitte le bloc.
   */
  const offBlock = row.atd ?? row.outAt
  const canSendMvt = Boolean(legId) && Boolean(offBlock) && !sendMvt.isPending
  const mvtHint = !legId
    ? 'A grounded aircraft has no leg to report a movement on'
    : !offBlock
      ? 'Nothing to report yet — log the off-block time (ATD) on the FLIGHT tab first'
      : row.mvtSentAt
        ? 'Already sent — sending again re-issues the message'
        : 'Send the MVT movement message for this leg'

  function choose(action) {
    setOpen(false)
    action()
  }

  return (
    <>
      <div
        ref={host}
        className="fl-more"
        role="button"
        tabIndex={0}
        title="More actions"
        onClick={(event) => { event.stopPropagation(); setOpen((current) => !current) }}
        onKeyDown={(event) => { if (event.key === 'Enter') setOpen((current) => !current) }}
      >
        ⋮
        <div className={`fl-menu${open ? ' open' : ''}`}>
          <div onClick={() => choose(() => setModal('events'))}>
            <Clock size={15} />OCC Dispatch — event timeline
          </div>
          <div onClick={() => choose(() => setModal('note'))}>
            <Pencil size={15} />Flight note
          </div>

          {/* Ouvre le brouillon, comme chez elle — meme sans heure bloc :
              le message s'ecrit AD----/---- et l'agent le complete. */}
          <div title={mvtHint} onClick={() => choose(() => { if (legId) setModal('mvt') })}>
            <Send size={15} />{row.mvtSentAt ? 'MVT message sent' : 'Send MVT message'}
          </div>

          <div onClick={() => choose(() => setModal('data'))}>
            <FileText size={15} />Open Flight Data
          </div>

          {/* ACTIVE. Le module VIGIL de l'annexe n'est pas porte, mais la bande
              VIGIL du pied du dossier calcule deja un verdict par onglet
              (vigilFor) : risque SMS, aerodromes, services, permis, carburant,
              equipage, passagers, dossier. L'entree ouvre ces huit verdicts
              d'un coup, au lieu d'obliger a parcourir les huit onglets. */}
          <div onClick={() => choose(() => setModal('vigil'))}
               title="What VIGIL reads on each part of this file">
            <ShieldCheck size={15} />Open VIGIL
          </div>

          {/* LA SIXIEME, ET ELLE EST EN DERNIER POUR CETTE RAISON : l'annexe
              n'en a que cinq, et son ordre est le sien (l. 77317-77322). Ce
              qu'on ajoute se pose APRES, jamais au milieu — sinon la main de
              l'agent, qui connait la position de « Open VIGIL », tombe sur
              autre chose.

              Pourquoi l'ajouter : son bandeau de faible visibilite est visible
              sur tous les vols parce que son moteur meteo n'a jamais de METAR.
              Le notre en recoit, le bandeau se tait quand les deux terrains
              vont bien, et la fonction devenait introuvable. */}
          <div onClick={() => choose(() => setModal('lvp'))}
               title={legId
                 ? 'Low visibility assessment for both ends of this leg'
                 : `Low visibility assessment for ${row.depIcao ?? 'this aerodrome'}`}>
            <CloudFog size={15} />Open LVP
            {lvp.data && lvp.data.severity !== 'GREEN' ? (
              <i className={`fl-menu-dot sev-${String(lvp.data.severity).toLowerCase()}`} />
            ) : null}
          </div>
        </div>
      </div>

      {mvtError ? (
        <Modal title="MVT message refused" onClose={() => setMvtError(null)}
               actions={<div className="fd-btn-outline" role="button" tabIndex={0}
                             onClick={() => setMvtError(null)}>Close</div>}>
          <div className="fd-banner warn">{mvtError}</div>
        </Modal>
      ) : null}

      {modal === 'events' ? <EventsModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'note' ? <NoteModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'data' ? <FlightDataModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'lvp'
        ? <LvpModal verdict={lvp.data} onClose={() => setModal(null)} /> : null}
      {modal === 'mvt' ? <MvtModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'vigil' ? <VigilModal row={row} onClose={() => setModal(null)} /> : null}
    </>
  )
}

/** La boite de l'annexe — .tnp-modal-overlay / .tnp-modal-box (l. 2029). */
function Modal({ title, subtitle, children, actions, onClose }) {
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
        {subtitle ? <div className="tnp-modal-sub">{subtitle}</div> : null}
        {children}
        {actions ? <div className="tnp-modal-actions">{actions}</div> : null}
      </div>
    </div>
  )
}

/**
 * « OCC Dispatch — event timeline ».
 *
 * <b>Ce que l'annexe montre ici est faux, et c'est le point.</b> Son
 * {@code tabOccTimeline()} (l. 14009) dessine dix etapes d'un cycle de dispatch
 * — creation, mise en ligne, avitaillement, equipage, creneau, handling… — dont
 * les statuts sont deduits de l'heure qu'il est, pas de ce qui s'est produit.
 * Un vol dont personne n'a fait l'avitaillement affichait « Refueling ·
 * Completed » parce que l'heure etait passee.
 *
 * <b>Ici la frise est le journal.</b> Une ligne par evenement reellement
 * enregistre dans {@code ops.leg_events}, avec son horodatage, son auteur et sa
 * raison. Une etape sur laquelle rien ne s'est passe rend une liste vide.
 */
export function EventsModal({ row, onClose }) {
  const events = useLegEvents(row.legId)

  return (
    <Modal
      title={`OCC Dispatch — ${row.flightNo ?? row.registration}`}
      subtitle="Event timeline · every change recorded on this leg, most recent first"
      onClose={onClose}
    >
      {events.isLoading ? <LoadingState label="Reading the leg history…" /> : null}
      {events.isError
        ? <div className="fd-banner warn">History unavailable — {events.error.message}</div>
        : null}

      {events.data?.length === 0 ? (
        <div className="fd-banner ok">
          Nothing has happened to this leg yet — it was loaded with the programme and has not been
          moved, released, delayed or closed since.
        </div>
      ) : null}

      {(events.data ?? []).map((event) => (
        <div className="occ-evt" key={event.id}>
          <span className={`occ-evt-kind kind-${event.kind.toLowerCase()}`}>
            {titleCase(event.kind.replace(/_/g, ' '))}
          </span>
          <div className="occ-evt-body">
            <b>{event.reason ?? '—'}</b>
            {event.payloadAfter && event.payloadAfter !== '{}' ? (
              <span className="occ-evt-payload">{event.payloadAfter}</span>
            ) : null}
          </div>
          <span className="occ-evt-at" title={event.at}>
            {new Date(event.at).toLocaleDateString('en-GB', {
              day: '2-digit', month: 'short', timeZone: 'UTC',
            })} {hhmm(event.at)}Z
          </span>
        </div>
      ))}
    </Modal>
  )
}

/**
 * « Flight note » — la consigne d'exploitation portee par l'etape.
 *
 * <p>Distincte de la remarque du TRIP FOLDER, comme chez l'annexe : celle-ci se
 * lit avant le depart, l'autre s'ecrit apres. Elle laisse un evenement au
 * journal, ce que l'annexe ne pouvait pas faire.
 */
function NoteModal({ row, onClose }) {
  const note = useFlightNote(row.legId)
  const save = useSaveFlightNote(row.legId)
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (note.data && !loaded) { setText(note.data.note ?? ''); setLoaded(true) }
  }, [note.data, loaded])

  return (
    <Modal
      title={`Flight note — ${row.flightNo ?? row.registration}`}
      subtitle={note.data?.noteAt
        ? `Last written ${new Date(note.data.noteAt).toLocaleString('en-GB', { timeZone: 'UTC' })} UTC`
        : 'Nothing recorded on this leg yet'}
      onClose={onClose}
      actions={(
        <>
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Cancel</div>
          <div
            className="fd-btn-solid"
            role="button"
            tabIndex={0}
            onClick={() => save.mutate(text, {
              onSuccess: onClose,
              onError: (failure) => setError(failure.message),
            })}
          >
            {save.isPending ? 'Saving…' : 'Save note'}
          </div>
        </>
      )}
    >
      {note.isLoading ? <LoadingState label="Reading the note…" /> : null}
      {error ? <div className="fd-banner warn">{error}</div> : null}
      <textarea
        className="fd-trip-remarks"
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="What the next shift must know before this flight departs. Leave empty to clear the note."
      />
    </Modal>
  )
}


/**
 * « Send MVT message » sur une etape encore au bloc.
 *
 * <b>Pourquoi ce panneau existe.</b> Le serveur refuse le message de mouvement
 * tant que l'heure bloc n'est pas enregistree (MVT_TOO_EARLY), et il a raison :
 * un message de mouvement annonce un mouvement. L'entree du menu etait donc
 * grisee, ce qui laissait l'agent devant une impasse — le geste qu'il voulait
 * faire existait, mais il fallait deviner qu'il commencait ailleurs.
 *
 * <p>Le panneau enchaine les deux ecritures dans l'ordre que la regle impose :
 * l'heure bloc d'abord (POST /legs/&#123;id&#125;/movements, OUT), le message
 * ensuite. Si la premiere echoue, la seconde ne part pas.
 */
export function OffBlockModal({ row, onClose }) {
  const record = useRecordMovement()
  const sendMvt = useSendMvt()
  const [time, setTime] = useState(hhmmNow())
  const [error, setError] = useState(null)
  const [step, setStep] = useState(null)

  /** L'heure saisie, posee sur le JOUR de l'etape, en UTC. */
  function atDay(value) {
    if (!value) return null
    const base = row.std ? new Date(row.std) : new Date()
    const [hours, minutes] = value.split(':').map(Number)
    return new Date(Date.UTC(base.getUTCFullYear(), base.getUTCMonth(), base.getUTCDate(),
      hours, minutes, 0, 0)).toISOString()
  }

  function run() {
    const at = atDay(time)
    if (!at) return
    setError(null)
    setStep('Recording the off-block time…')
    record.mutate({ legId: row.legId, kind: 'OUT', at }, {
      onError: (failure) => { setStep(null); setError(failure.message) },
      onSuccess: () => {
        setStep('Sending the MVT message…')
        sendMvt.mutate(row.legId, {
          onError: (failure) => { setStep(null); setError(failure.message) },
          onSuccess: onClose,
        })
      },
    })
  }

  return (
    <Modal
      title={`Send MVT — ${row.flightNo ?? row.registration}`}
      subtitle="The movement message reports a movement: the off-block time is recorded first"
      onClose={onClose}
      actions={(
        <>
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Cancel</div>
          <div className="fd-btn-solid" role="button" tabIndex={0} onClick={run}>
            {step ?? 'Log ATD and send'}
          </div>
        </>
      )}
    >
      {error ? <div className="fd-banner warn">{error}</div> : null}
      <div className="fd-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <div className="fd-card">
          <div className="lbl">Scheduled departure</div>
          <div className="val">{row.std ? `${hhmm(row.std)} UTC` : '—'}</div>
        </div>
        <div className="fd-card">
          <div className="lbl">Off-block time (ATD, UTC)</div>
          <div className="val">
            <input type="time" className="fd-ref-input" value={time}
                   onChange={(event) => setTime(event.target.value)} />
          </div>
        </div>
      </div>
    </Modal>
  )
}

function hhmmNow() {
  const now = new Date()
  return `${String(now.getUTCHours()).padStart(2, '0')}:${String(now.getUTCMinutes()).padStart(2, '0')}`
}

/**
 * « Open VIGIL » — les huit verdicts, d'un coup.
 *
 * <b>Ce que ce panneau est, et ce qu'il n'est pas.</b> Le module VIGIL de
 * l'annexe est une scene a lui seul, qui n'est pas portee. Mais la bande VIGIL
 * du pied du dossier calcule deja un verdict par onglet — risque SMS,
 * aerodromes, services, permis, carburant, equipage, passagers, dossier — et
 * l'agent devait parcourir les huit onglets pour les lire. Le panneau les pose
 * les uns sous les autres. C'est la meme fonction ({@code vigilFor}), donc les
 * deux ne peuvent pas se contredire.
 */
function VigilModal({ row, onClose }) {
  const parts = [
    ['flight', 'Flight'],
    ['airport', 'Airport Info'],
    ['services', 'Services'],
    ['ovf', 'OVF Permit'],
    ['fuel', 'Fuel'],
    ['crew', 'Crew'],
    ['pax', 'Pax'],
    ['tripfolder', 'Trip Folder'],
  ]

  return (
    <Modal
      title={`VIGIL — ${row.flightNo ?? row.registration}`}
      subtitle="What the operations assistant reads on each part of this file"
      onClose={onClose}
      actions={<div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Close</div>}
    >
      {parts.map(([key, label]) => {
        const verdict = vigilFor(key, row)
        return (
          <div className={`vigil-row lvl-${verdict.level}`} key={key}>
            <span className="vigil-row-tab">{label}</span>
            <div className="vigil-row-body">
              <b>{verdict.title}</b>
              {verdict.sub ? <span>{verdict.sub}</span> : null}
            </div>
            <i className={`vigil-row-dot ${verdict.level}`} />
          </div>
        )
      })}

      {/* Le panneau ne se fait pas passer pour le module. */}
      <div className="lvp-thresholds">
        These are the same verdicts the VIGIL strip shows one tab at a time. The full VIGIL
        module — its own screen, with the fleet-wide picture — is not ported.
      </div>
    </Modal>
  )
}

/**
 * « Open Flight Data » — le document de l'annexe (openFlightDataModal,
 * prototype l. 16682).
 *
 * <b>Ce n'est pas un panneau, c'est un document.</b> Elle reutilise ici la mise
 * en page de la GENDEC — en-tete a filet marine, table d'informations a deux
 * colonnes alternees, titre de section or, table d'equipage — et le rend
 * imprimable : son bloc {@code @media print} ne laisse visible que
 * {@code #gendecPrintArea}. Le bouton « Print / Save PDF » est le sien.
 *
 * <p>Les classes {@code .gendec-*} sont les siennes, copiees sans retouche. La
 * refaire avec des cartes {@code .fd-card} aurait donne un panneau de plus, pas
 * la feuille qu'un agent glisse dans le dossier.
 */
export function FlightDataModal({ row, onClose }) {
  const board = useSchedulingBoard(
    row.std ? { date: isoDate(new Date(row.std)), role: '' } : undefined)
  const crew = (board.data?.legs ?? []).find((leg) => leg.legId === row.legId)?.crew ?? []
  const label = row.flightNo ?? row.registration

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const block = row.std && row.sta
    ? duration(new Date(row.sta) - new Date(row.std)) : EMPTY_DASH
  const flown = (row.atd ?? row.outAt) && (row.ata ?? row.inAt)
    ? duration(new Date(row.ata ?? row.inAt) - new Date(row.atd ?? row.outAt))
    : block

  return (
    <div className="tnp-modal-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="tnp-modal-box">
        <div className="tnp-modal-close" role="button" tabIndex={0} onClick={onClose}>✕</div>

        <div className="gendec-doc" id="gendecPrintArea">
          <div className="gendec-head">
            <div>
              <div className="gendec-org">THE NETWORK PLAN</div>
              <div className="gendec-sub">Flight Data Summary</div>
            </div>
            <div className="gendec-meta-wrap">
              <div className="gendec-fn">{label}</div>
              <div className="gendec-meta">{new Date().toISOString().slice(0, 10)}</div>
            </div>
          </div>

          <table className="gendec-info">
            <tbody>
              <tr>
                <td>Aircraft</td>
                <td>{[row.registration, row.model ?? row.icaoType].filter(Boolean).join(' · ')}</td>
                <td>Status</td><td>{titleCase(row.status)}</td>
              </tr>
              <tr>
                <td>Route</td>
                <td>{row.depIcao ?? '—'} → {row.arrIcao ?? '—'}</td>
                <td>Nature</td>
                <td>{[row.commercialType, row.flightType].filter(Boolean).join(' · ') || '—'}</td>
              </tr>
              <tr>
                <td>Departure</td><td>{row.std ? `${hhmm(row.std)} UTC` : '—'}</td>
                <td>Arrival</td><td>{row.sta ? `${hhmm(row.sta)} UTC` : '—'}</td>
              </tr>
              <tr>
                <td>Off / On blocks</td>
                <td>
                  {row.atd ?? row.outAt ? hhmm(row.atd ?? row.outAt) : '—'}
                  {' / '}
                  {row.ata ?? row.inAt ? hhmm(row.ata ?? row.inAt) : '—'}
                </td>
                <td>Block time</td><td>{flown}</td>
              </tr>
              <tr>
                <td>Passengers</td><td>{row.paxCount ?? 0}</td>
                <td>Flight plan</td><td>{row.flightPlanLetter ?? '—'}</td>
              </tr>
              <tr>
                <td>Risk</td>
                <td>{row.riskLevel
                  ? `${row.riskLevel}${row.riskIndex ? ` · index ${row.riskIndex}` : ''}` : '—'}</td>
                <td>MVT</td>
                <td>{row.mvtSentAt ? `sent ${hhmm(row.mvtSentAt)} UTC` : 'not sent'}</td>
              </tr>
            </tbody>
          </table>

          <div className="gendec-section-title">Crew</div>
          <table className="gendec-crew">
            <tbody>
              {crew.length
                ? crew.map((member) => (
                  <tr key={member.assignmentId ?? member.personId}>
                    <td>{member.seat}</td>
                    <td>{member.fullName}</td>
                    <td>{member.staffNo}</td>
                  </tr>
                ))
                : <tr><td colSpan={3}>No crew assigned</td></tr>}
            </tbody>
          </table>

          {/* Ce que l'annexe n'ecrit pas et qui manque a toute feuille sortie
              d'un logiciel : d'ou viennent les chiffres, et a quelle heure. */}
          <div className="gendec-decl">
            Printed from the leg record at {new Date().toISOString().slice(11, 16)} UTC.
            Times are the stored scheduled and actual times; the crew list is the current
            roster assignment. This sheet is a summary, not an operational clearance.
          </div>
        </div>

        <div className="tnp-modal-actions">
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Close</div>
          <div className="fd-btn-solid" role="button" tabIndex={0}
               onClick={() => window.print()}>Print / Save PDF</div>
        </div>
      </div>
    </div>
  )
}

const EMPTY_DASH = '—'

/** hh h mm, la duree telle que le document la porte. */
function duration(milliseconds) {
  if (!Number.isFinite(milliseconds) || milliseconds < 0) return EMPTY_DASH
  const minutes = Math.round(milliseconds / 60_000)
  return `${Math.floor(minutes / 60)}h${String(minutes % 60).padStart(2, '0')}`
}
