import { useEffect, useState } from 'react'
import { useSendMvt } from '../../hooks/useOperations'

/**
 * Le brouillon du message de mouvement — {@code __tnpSendMvt()} de l'annexe
 * (prototype l. 67380).
 *
 * <b>Le message est le sien, au caractere pres.</b> Type B, quatre lignes :
 * <pre>
 * MVT
 * TNP526/17.TS-NPD.TUN
 * AD----/---- EA1100 CAI
 * SI TNP OCC
 * </pre>
 * La deuxieme ligne porte le vol, le jour, l'immatriculation et l'escale de
 * depart ; la troisieme le depart (AD) ou l'arrivee (AA) ; la quatrieme
 * l'expediteur. Une heure inconnue s'ecrit {@code ----}, et le brouillon
 * s'ouvre quand meme : c'est le point du modele — l'agent le complete a la
 * main avant de l'envoyer.
 *
 * <b>Le texte est modifiable</b>, comme chez elle : un message Type B se
 * corrige a la main, et le figer obligerait a le recopier ailleurs.
 *
 * <b>Deux differences, toutes deux du cote du serveur.</b> Le bouton de
 * l'annexe ne fait que copier dans le presse-papier : rien n'est envoye, rien
 * n'est trace — c'est exactement ce que l'audit lui reproche. Ici il copie ET
 * enregistre l'envoi ({@code POST /legs/&#123;id&#125;/mvt}), donc le dossier
 * sait desormais qu'un MVT est parti et quand. Et le serveur refuse l'envoi
 * tant que l'heure bloc n'est pas enregistree : le refus s'affiche, avec la
 * marche a suivre.
 *
 * <p>Le jour de la deuxieme ligne est celui du DEPART de l'etape, pas celui
 * d'aujourd'hui comme chez elle : un MVT redige le lendemain d'un vol de nuit
 * porterait sinon la mauvaise date.
 */
export default function MvtModal({ row, onClose }) {
  const send = useSendMvt()
  const [kind, setKind] = useState(row.ata ? 'AA' : 'AD')
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const [copied, setCopied] = useState(false)

  const hasDeparture = Boolean(row.atd ?? row.outAt)
  const hasArrival = Boolean(row.ata ?? row.inAt)

  useEffect(() => { setText(draft(row, kind)) }, [row, kind])

  useEffect(() => {
    function onKey(event) { if (event.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  function submit() {
    setError(null)
    // Le presse-papier d'abord : c'est le geste que l'annexe offre, et le
    // message doit pouvoir partir dans un terminal Type B meme si
    // l'enregistrement echoue.
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(
        () => { setCopied(true); setTimeout(() => setCopied(false), 2000) },
        () => {},
      )
    }
    if (!row.legId) return
    send.mutate(row.legId, {
      onSuccess: onClose,
      onError: (failure) => setError(failure.message),
    })
  }

  return (
    <div className="mvt-overlay"
         onClick={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <div className="mvt-box">
        <div className="mvt-hd">
          ✈ MVT — {row.flightNo ?? row.registration} / {row.registration}
        </div>

        {/* Le selecteur n'apparait que lorsque les deux heures existent —
            regle de l'annexe : sans elles il n'y a qu'un message possible. */}
        {hasDeparture && hasArrival ? (
          <div className="mvt-sel">
            <button type="button" className={kind === 'AD' ? 'on' : ''}
                    onClick={() => setKind('AD')}>↗ Departure (AD)</button>
            <button type="button" className={kind === 'AA' ? 'on' : ''}
                    onClick={() => setKind('AA')}>↘ Arrival (AA)</button>
          </div>
        ) : null}

        <textarea className="mvt-ta" value={text}
                  onChange={(event) => setText(event.target.value)} />

        {error ? <div className="mvt-err">{error}</div> : null}

        <div className="mvt-row">
          <button type="button" className="mvt-send" onClick={submit}
                  disabled={send.isPending}
                  title="Copy the message and record that the MVT has been sent">
            {copied ? 'Copied ✓' : send.isPending ? 'Sending…' : '✈ Send'}
          </button>
          <button type="button" className="mvt-close" onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}

/** HHMM, ou ---- quand l'heure n'est pas connue — decToHHMM() de l'annexe. */
function hhmmOrDashes(iso) {
  if (!iso) return '----'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '----'
  return `${String(date.getUTCHours()).padStart(2, '0')}${String(date.getUTCMinutes()).padStart(2, '0')}`
}

/** Le message, dans la forme de l'annexe (mvtDep / mvtArr, l. 67405). */
function draft(row, kind) {
  const flight = row.flightNo ?? row.registration ?? '???'
  const registration = row.registration ?? '?'
  const departure = row.depCode ?? row.depIcao ?? '????'
  const arrival = row.arrCode ?? row.arrIcao ?? '????'
  const day = row.std
    ? String(new Date(row.std).getUTCDate()).padStart(2, '0')
    : String(new Date().getUTCDate()).padStart(2, '0')

  const head = `MVT\n${flight}/${day}.${registration}.${departure}`

  if (kind === 'AA') {
    const ata = hhmmOrDashes(row.ata ?? row.inAt)
    return `${head}\nAA${ata}/${ata}\nSI TNP OCC`
  }
  const atd = hhmmOrDashes(row.atd ?? row.outAt)
  const eta = hhmmOrDashes(row.eta ?? row.sta)
  return `${head}\nAD${atd}/${atd} EA${eta} ${arrival}\nSI TNP OCC`
}
