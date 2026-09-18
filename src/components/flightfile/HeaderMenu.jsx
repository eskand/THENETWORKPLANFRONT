import { useEffect, useRef, useState } from 'react'
import { CloudFog, Clock, FileText, Pencil, Send, ShieldCheck } from 'lucide-react'
import { LoadingState } from '../States'
import { useRecordMovement, useSendMvt } from '../../hooks/useOperations'
import { useSchedulingBoard } from '../../hooks/useCrewScheduling'
import {
  useFlightFileLvp, useFlightNote, useLegFuel, useLegPassengers, useSaveFlightNote,
} from '../../hooks/useFlightFile'
import { hhmm, isoDate } from '../../lib/format'
import { statusLabel } from './statusLabel'
import LvpModal from './LvpModal'
import Modal from './Modal'
import OccTimelineModal from './OccTimelineModal'
import MvtModal from './MvtModal'
import { useVigil } from '../vigil/VigilContext'

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
 * ce qui n'existe pas apprend a ne plus ouvrir le menu. Les cinq entrees ont
 * ici une action derriere ; « Open VIGIL » ouvre le panneau VIGIL de
 * l'application, le meme que le bouton de l'en-tete.
 */
export default function HeaderMenu({ row }) {
  const [open, setOpen] = useState(false)
  const [modal, setModal] = useState(null)
  const [mvtError, setMvtError] = useState(null)
  const host = useRef(null)
  const { openPanel: openVigil } = useVigil()

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

          {/* Le panneau VIGIL de l'annexe — TNPVIGIL.openPanel() (l. 99436) :
              le meme panneau que le bouton de l'en-tete, fixe en haut a
              droite, avec les alertes du balayage serveur. */}
          <div onClick={() => choose(openVigil)}
               title="VIGIL — Continuous Operational Intelligence">
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

      {modal === 'events'
        ? <OccTimelineModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'note' ? <NoteModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'data' ? <FlightDataModal row={row} onClose={() => setModal(null)} /> : null}
      {modal === 'lvp'
        ? <LvpModal verdict={lvp.data} onClose={() => setModal(null)} /> : null}
      {modal === 'mvt' ? <MvtModal row={row} onClose={() => setModal(null)} /> : null}
    </>
  )
}


/**
 * « Flight note » — la consigne d'exploitation portee par l'etape.
 *
 * <p>Distincte de la remarque du TRIP FOLDER, comme chez l'annexe : celle-ci se
 * lit avant le depart, l'autre s'ecrit apres. Elle laisse un evenement au
 * journal, ce que l'annexe ne pouvait pas faire.
 */
export function NoteModal({ row, onClose }) {
  const note = useFlightNote(row.legId)
  const save = useSaveFlightNote(row.legId)
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (note.data && !loaded) { setText(note.data.note ?? ''); setLoaded(true) }
  }, [note.data, loaded])

  /* Le sous-titre de l'annexe : vol · route · date, pas une phrase.
     openFlightNoteModal(), l. 12053. */
  const subtitle = [
    row.flightNo ?? row.registration,
    `${row.depCode ?? row.depIcao} → ${row.arrCode ?? row.arrIcao}`,
    row.std ? new Date(row.std).toISOString().slice(0, 10) : null,
  ].filter(Boolean).join(' · ')

  return (
    <Modal title="Flight note" subtitle={subtitle} onClose={onClose}
      actions={(
        <>
          <div className="fd-btn-outline" role="button" tabIndex={0} onClick={onClose}>Cancel</div>
          {/* Le bouton d'enregistrement de l'annexe est OR, pas bleu : c'est sa
              couleur d'action sur un formulaire, et elle le distingue ainsi du
              bouton primaire de navigation. */}
          <div
            className="fd-btn-gold"
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
        className="fd-note-ta"
        rows={5}
        value={text}
        onChange={(event) => setText(event.target.value)}
        placeholder="Anything the next shift should know about this flight — handling, crew, ATC, customer request…"
      />
      {/* La phrase de l'annexe, mot pour mot : elle dit OU la note reapparait,
          ce qu'aucune zone de texte ne dit d'elle-meme. */}
      <div className="fd-note-hint">
        The note appears on the Flight tab of the flight tag and is kept with the flight.
        {note.data?.noteAt
          ? ` Last written ${new Date(note.data.noteAt).toISOString().slice(0, 16).replace('T', ' ')} UTC.`
          : ''}
      </div>
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
  const leg = (board.data?.legs ?? []).find((candidate) => candidate.legId === row.legId)
  const crew = leg?.crew ?? []
  const pax = useLegPassengers(row.legId)
  const fuel = useLegFuel(row.legId)
  const label = row.flightNo ?? row.registration

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  // buildFlightData() de l'annexe (l. 14275-14277) : blockHrs = e − s,
  // flightHrs = max(0.25, blockHrs − 0.33), fmtDur → « 2h40 ».
  const blockHrs = row.std && row.sta ? (new Date(row.sta) - new Date(row.std)) / 3_600_000 : null
  const flightHrs = blockHrs != null ? Math.max(0.25, blockHrs - 0.33) : null

  // Les sieges de l'annexe (crewJobs) : chaque siege requis a sa ligne, pourvu
  // ou « Unassigned » ; un siege occupe au-dela des requis reste visible.
  const minimumSeats = leg?.minimumSeats ?? 2
  const seats = SEAT_JOBS.filter(([seat], index) =>
    index < minimumSeats || crew.some((member) => member.seat === seat))

  const symbol = fuel.data?.currency === 'EUR' ? '€' : '$'
  const fuelUnit = fuel.data?.unit === 'LITER' ? 'L' : 'USG'

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
              {/* Les cinq rangees de l'annexe (l. 16695-16699), dans son ordre. */}
              <tr>
                <td>Aircraft</td>
                <td>{[row.registration, row.model ?? row.icaoType].filter(Boolean).join(' · ')}</td>
                <td>Status</td><td>{statusLabel(row)}</td>
              </tr>
              <tr>
                <td>Route</td>
                <td>{row.depCode ?? row.depIcao ?? '—'} → {row.arrCode ?? row.arrIcao ?? '—'}</td>
                <td>Registration</td><td>{row.registration ?? '—'}</td>
              </tr>
              <tr>
                <td>Departure</td><td>{row.std ? `${hhmm(row.std)} UTC` : '—'}</td>
                <td>Arrival</td><td>{row.sta ? `${hhmm(row.sta)} UTC` : '—'}</td>
              </tr>
              <tr>
                <td>Flight time</td><td>{fmtDur(flightHrs)}</td>
                <td>Block time</td><td>{fmtDur(blockHrs)}</td>
              </tr>
              <tr>
                <td>Passengers</td>
                <td>{pax.data ? `${pax.data.checkedIn}/${pax.data.totalPax} checked in` : EMPTY_DASH}</td>
                <td>Fuel price</td>
                <td>{fuel.data?.price != null ? `${symbol}${fuel.data.price}/${fuelUnit}` : EMPTY_DASH}</td>
              </tr>
            </tbody>
          </table>

          <div className="gendec-section-title">Crew</div>
          <table className="gendec-crew">
            <tbody>
              {/* crewLines de l'annexe (l. 16685) : le poste, puis le nom ou « Unassigned ». */}
              {seats.map(([seat, job]) => {
                const member = crew.find((candidate) => candidate.seat === seat)
                return (
                  <tr key={seat}>
                    <td>{job}</td>
                    <td>{member?.fullName ?? 'Unassigned'}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
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

/** Les postes de l'annexe (crewJobs, l. 14330-14335), etendus aux sieges que la cible connait. */
const SEAT_JOBS = [
  ['CPT', 'Captain'],
  ['FO', 'First Officer'],
  ['CABIN_1', 'Cabin Crew'],
  ['CABIN_2', 'Cabin Crew'],
  ['ENGINEER', 'Engineer'],
]

/** fmtDur de l'annexe (l. 14277) : heures decimales → « 2h40 ». */
function fmtDur(hours) {
  if (hours == null || !Number.isFinite(hours)) return EMPTY_DASH
  const hh = Math.floor(hours)
  const mm = Math.round((hours - hh) * 60)
  return `${hh}h${String(mm).padStart(2, '0')}`
}
