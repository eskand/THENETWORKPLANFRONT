import { useEffect, useRef, useState } from 'react'
import { Check, Upload } from 'lucide-react'
import { LoadingState } from '../States'
import { documentHref } from '../../api/flightfile'
import {
  useCloseLeg,
  useDeleteDocument,
  useSaveTripRemark,
  useTripFolder,
  useUploadDocument,
} from '../../hooks/useFlightFile'

/**
 * L'onglet TRIP FOLDER — tabTripFolder() de l'annexe (prototype l. 16524), avec
 * le bloc de remarques et la cloture que TNPFlightPanel lui ajoutait
 * (tripExtrasHtml, l. 72380).
 *
 * <b>Les cinq lignes sont les siennes</b>, dans son ordre : plan de vol, OFP,
 * devis de masse et centrage, NOTOC, bon d'avitaillement.
 *
 * <b>Mais les pastilles ne sont plus ecrites en dur.</b> L'annexe affichait
 * « Flight Plan — On File » sur un vol dont personne n'avait depose de plan de
 * vol : deux vertes et trois ambre, les memes sur toutes les etapes. Ici une
 * ligne est « On File » parce que le document existe, et « Pending » parce
 * qu'il n'existe pas. Le bouton Upload depose reellement le fichier, et le nom
 * de la ligne devient un lien vers lui.
 *
 * <b>La cloture est celle du serveur.</b> POST /v1/legs/&#123;id&#125;/close
 * refuse une etape dont les heures reelles ne sont pas enregistrees ; le
 * bandeau annonce ce qui manque avant le clic, comme l'annexe, mais la regle
 * n'est plus dans le navigateur.
 */

/** Les cinq lignes de l'annexe, avec la nature stockee en regard. */
const DOCUMENTS = [
  { kind: 'FPL', label: 'Flight Plan (FPL)' },
  { kind: 'OFP', label: 'OFP — Operational Flight Plan' },
  { kind: 'WEIGHT_BALANCE', label: 'Weight & Balance' },
  { kind: 'NOTOC', label: 'NOTOC' },
  { kind: 'FUEL_RECEIPT', label: 'Fuel Receipt / Uplift Slip' },
]

export default function TripFolderTab({ row }) {
  const legId = row.legId
  const folder = useTripFolder(legId)
  const upload = useUploadDocument(legId)
  const remove = useDeleteDocument(legId)
  const saveRemark = useSaveTripRemark(legId)
  const close = useCloseLeg(legId)

  const [error, setError] = useState(null)

  // Le titre et la sous-ligne de l'annexe (l. 16537-16538), rendus avant
  // meme que le dossier soit lu : chez elle ils font partie de l'onglet.
  const heading = (
    <>
      <div className="fd-section">{row.flightNo ?? row.registration} — Trip Folder</div>
      <div style={{ fontSize: 10.5, color: 'var(--text-faint)', margin: '-4px 0 10px' }}>
        Flight documents uploaded by the crew ahead of / during this trip.
      </div>
    </>
  )

  if (folder.isLoading) return <>{heading}<LoadingState label="Opening the trip folder…" /></>
  if (folder.isError) {
    return (
      <>
        {heading}
        <div className="fd-banner warn">Trip folder unavailable — {folder.error.message}</div>
      </>
    )
  }

  const data = folder.data
  const closed = data.closed
  const blockers = data.closureBlockers ?? []

  function byKind(kind) {
    return (data.documents ?? []).find((document) => document.kind === kind)
  }

  return (
    <>
      {heading}
      {error ? <div className="fd-banner warn">{error}</div> : null}

      {DOCUMENTS.map(({ kind, label }) => (
        <DocumentRow
          key={kind}
          label={label}
          kind={kind}
          document={byKind(kind)}
          closed={closed}
          busy={upload.isPending || remove.isPending}
          onUpload={(file) => {
            setError(null)
            upload.mutate({ kind, file }, { onError: (failure) => setError(failure.message) })
          }}
          onRemove={(documentId) => {
            setError(null)
            remove.mutate(documentId, { onError: (failure) => setError(failure.message) })
          }}
        />
      ))}

      <TripExtras
        remark={data.remark}
        closed={closed}
        blockers={blockers}
        onSaveRemark={(value) => saveRemark.mutate(value, {
          onError: (failure) => setError(failure.message),
        })}
        onClose={() => {
          setError(null)
          close.mutate(undefined, { onError: (failure) => setError(failure.message) })
        }}
        closing={close.isPending}
      />
    </>
  )
}

function DocumentRow({ label, kind, document: onFile, closed, busy, onUpload, onRemove }) {
  const input = useRef(null)

  return (
    <div className="fd-doc-row">
      <div className="dn">
        {onFile
          ? (
            <a href={documentHref(onFile.id)} target="_blank" rel="noreferrer"
               title={`${onFile.fileName} · ${Math.max(1, Math.round(onFile.sizeBytes / 1024))} kB`}>
              {label}
            </a>
          )
          : label}
      </div>

      <input
        ref={input}
        type="file"
        style={{ display: 'none' }}
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) onUpload(file)
          event.target.value = ''
        }}
      />

      <div
        className="fd-upload-btn"
        role="button"
        tabIndex={0}
        title={closed
          ? 'The trip folder is closed — reopen the leg to change it'
          : (onFile ? `Replace ${onFile.fileName}` : `Upload the ${label}`)}
        onClick={() => { if (!closed && !busy) input.current?.click() }}
        onKeyDown={(event) => {
          if (event.key === 'Enter' && !closed && !busy) input.current?.click()
        }}
      >
        <Upload size={13} /> Upload
      </div>

      <span className={`fd-badge ${onFile ? 'green' : 'amber'}`}
            onClick={() => { if (onFile && !closed) onRemove(onFile.id) }}
            title={onFile && !closed ? 'Remove this document' : undefined}
            role={onFile && !closed ? 'button' : undefined}>
        {onFile ? 'On File' : 'Pending'}
      </span>
    </div>
  )
}

/** tripExtrasHtml() de l'annexe (l. 72380) : remarques libres, puis cloture. */
function TripExtras({ remark, closed, blockers, onSaveRemark, onClose, closing }) {
  const [text, setText] = useState(remark ?? '')

  useEffect(() => { setText(remark ?? '') }, [remark])

  return (
    <div className="fd-trip-extras">
      <div className="fd-trip-lbl">Remarks</div>
      <textarea
        className="fd-trip-remarks"
        rows={3}
        readOnly={closed}
        value={text}
        onChange={(event) => setText(event.target.value)}
        // Enregistre a la sortie du champ : une ecriture par frappe ferait
        // partir trente requetes pour une phrase.
        onBlur={() => { if (!closed && text !== (remark ?? '')) onSaveRemark(text) }}
        placeholder="Free-text notes on this trip — handling, crew, delays, anything the next shift should know."
      />

      {closed ? (
        <div className="fd-trip-closed">
          <span className="fd-trip-closed-dot" />
          <span>
            <b>Flight closed</b>
            <span className="s">The trip folder is read-only.</span>
          </span>
        </div>
      ) : (
        <>
          <button
            type="button"
            className={`fd-trip-close-btn${blockers.length ? ' blocked' : ''}`}
            disabled={blockers.length > 0 || closing}
            title={blockers.length
              ? `Missing ${blockers.join(' and ')} — log them on the Flight tab first`
              : 'Close this flight and lock its trip folder'}
            onClick={() => { if (!blockers.length) onClose() }}
          >
            <Check size={15} />
            Close Flight
          </button>
          {blockers.length
            ? <div className="fd-trip-hint">Requires {blockers.join(' and ')}.</div>
            : null}
        </>
      )}
    </div>
  )
}
