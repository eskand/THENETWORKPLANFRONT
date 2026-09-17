import { useRef, useState } from 'react'
import { FileText } from 'lucide-react'
import { LoadingState } from '../States'
import {
  useAddPassenger,
  useDeletePassenger,
  useImportPassengers,
  useLegPassengers,
  useSavePassenger,
} from '../../hooks/useFlightFile'

/**
 * L'onglet PAX — tabPax() de l'annexe (prototype l. 16499) et son tableau
 * editable (module TNPPaxDocs, l. 71534).
 *
 * <b>La forme est la sienne</b> : trois compteurs, les demandes particulieres,
 * puis « Pax List & Travel Documents » — une ligne par passager portant son
 * document de voyage, avec la pastille verte ou rouge en tete de ligne, le
 * decompte a droite, et le manifeste en pied.
 *
 * <b>La regle de validite est la sienne aussi</b> (PX.check, l. 71573) : un
 * document est acceptable s'il porte un numero, un type et une expiration
 * posterieure au jour du vol. Elle est appliquee par le serveur, qui connait la
 * date du vol, et non recalculee dans le navigateur.
 *
 * <b>Ce qui change : ou vont les lignes.</b> L'annexe les garde dans
 * {@code flight._paxDocs} ; un manifeste saisi sur un poste n'existait pas sur
 * l'autre, et l'import CSV se perdait au premier rafraichissement. Ici chaque
 * ligne est une ecriture, et l'import est lu par le serveur.
 */

/** DOC_TYPES de l'annexe, avec la valeur stockee en regard. */
const DOC_TYPES = [
  { value: 'PASSPORT', label: 'Passport' },
  { value: 'NATIONAL_ID', label: 'National ID card' },
  { value: 'RESIDENCE_PERMIT', label: 'Residence permit' },
  { value: 'VISA', label: 'Visa' },
  { value: 'CREW_CERTIFICATE', label: 'Crew member certificate' },
  { value: 'LAISSEZ_PASSER', label: 'Laissez-passer' },
  { value: 'OTHER', label: 'Other' },
]

export default function PaxTab({ row }) {
  const legId = row.legId
  const pax = useLegPassengers(legId)
  const add = useAddPassenger(legId)
  const save = useSavePassenger(legId)
  const remove = useDeletePassenger(legId)
  const load = useImportPassengers(legId)

  const fileInput = useRef(null)
  const [error, setError] = useState(null)

  if (pax.isLoading) return <LoadingState label="Reading the passenger manifest…" />
  if (pax.isError) {
    return <div className="fd-banner warn">Manifest unavailable — {pax.error.message}</div>
  }

  const data = pax.data
  const rows = data.passengers ?? []
  const notValid = data.documentsNotValid ?? 0

  function onError(failure) { setError(failure.message) }

  return (
    <>
      <div className="fd-pax-kpis">
        <div className="fd-pax-kpi"><div className="n">{data.totalPax}</div><div className="t">Total Pax</div></div>
        <div className="fd-pax-kpi"><div className="n">{data.checkedIn}</div><div className="t">Checked In</div></div>
        <div className="fd-pax-kpi px-kpi-manifest">
          <div className="n">{data.onManifest}</div><div className="t">On Manifest</div>
        </div>
      </div>

      {/* L'annexe compare les deux nombres sans rien en dire. Un manifeste
          incomplet est pourtant ce qui fait refuser un vol a la douane. */}
      {data.onManifest < data.totalPax ? (
        <div className="fd-banner warn">
          {data.totalPax - data.onManifest} of {data.totalPax} passengers are not on the manifest yet.
        </div>
      ) : null}

      <div className="fd-section"><span>Special Requests</span></div>
      {data.specialRequests?.length
        ? data.specialRequests.map((request) => (
          <div className="fd-row" key={request}>
            <div className="fdl" style={{ width: 'auto', flex: 1 }}>{request}</div>
            <span className="fd-badge amber">To Action</span>
          </div>
        ))
        : (
          <div className="fd-row">
            <div className="fdl" style={{ width: 'auto', flex: 1, color: 'var(--text-faint)' }}>
              No special requests
            </div>
          </div>
        )}

      <div className="fd-section"><span>Pax List &amp; Travel Documents</span></div>

      {error ? <div className="fd-banner warn">{error}</div> : null}

      <div className="px-wrap">
        <div className="px-head">
          <span className="px-h-pill" />
          <span className="px-h px-last">Surname</span>
          <span className="px-h px-first">Given name</span>
          <span className="px-h px-doc">Document N°</span>
          <span className="px-h px-type">Type</span>
          <span className="px-h px-val">Validity</span>
          <span className="px-h px-del" />
        </div>

        <div>
          {rows.length
            ? rows.map((passenger) => (
              <PassengerRow
                key={passenger.id}
                passenger={passenger}
                onSave={(command) => save.mutate({ passengerId: passenger.id, ...command }, { onError })}
                onDelete={() => remove.mutate(passenger.id, { onError })}
              />
            ))
            : (
              <div className="px-empty">
                No passenger on this leg. Add a row, or import a list.
              </div>
            )}
        </div>

        <div className="px-actions">
          <div className="px-btn" role="button" tabIndex={0}
               onClick={() => add.mutate(newPassenger(), { onError })}
               onKeyDown={(event) => { if (event.key === 'Enter') add.mutate(newPassenger(), { onError }) }}>
            + Add passenger
          </div>

          <input
            ref={fileInput}
            type="file"
            accept=".csv,.txt"
            style={{ display: 'none' }}
            onChange={(event) => {
              const file = event.target.files?.[0]
              setError(null)
              if (file) load.mutate(file, { onError })
              event.target.value = ''
            }}
          />
          {/* « Import CSV / Excel » chez l'annexe, qui refusait tout de meme les
              .xls/.xlsx faute de bibliotheque. Le libelle dit ce que l'import
              accepte reellement. */}
          <div className="px-btn" role="button" tabIndex={0}
               title="Import a CSV whose first line names the columns"
               onClick={() => fileInput.current?.click()}
               onKeyDown={(event) => { if (event.key === 'Enter') fileInput.current?.click() }}>
            ⬆ Import CSV
          </div>

          <span className={`px-count${notValid ? ' bad' : ''}`}>
            {rows.length} passenger{rows.length === 1 ? '' : 's'}
            {notValid
              ? ` · ${notValid} document${notValid === 1 ? '' : 's'} not valid`
              : ' · all documents valid'}
          </span>
        </div>

        <div className="px-btn manifest" role="button" tabIndex={0}
             title="Generate the crew and passenger manifest for this leg">
          <FileText size={15} />
          Crew &amp; Passenger Manifest<span className="kbd">PDF</span>
        </div>
      </div>
    </>
  )
}

function newPassenger() {
  return {
    surname: 'New passenger',
    givenName: null,
    documentType: 'PASSPORT',
    documentNumber: null,
    documentExpiry: null,
    nationality: null,
    dateOfBirth: null,
    checkedIn: false,
    specialRequest: null,
  }
}

/**
 * Une ligne du manifeste.
 *
 * <b>La saisie est locale, l'enregistrement est au blur</b> — l'annexe ecrit sur
 * {@code input} et enregistre sur {@code change} pour la meme raison : une
 * requete par frappe ferait partir vingt ecritures pour un nom de famille.
 */
function PassengerRow({ passenger, onSave, onDelete }) {
  const [draft, setDraft] = useState(passenger)

  function field(name, value) {
    setDraft((current) => ({ ...current, [name]: value }))
  }

  function commit(next = draft) {
    const changed = ['surname', 'givenName', 'documentType', 'documentNumber', 'documentExpiry']
      .some((name) => (next[name] ?? '') !== (passenger[name] ?? ''))
    if (!changed) return
    onSave({
      surname: next.surname || passenger.surname,
      givenName: next.givenName,
      documentType: next.documentType,
      documentNumber: next.documentNumber,
      documentExpiry: next.documentExpiry || null,
      nationality: next.nationality,
      dateOfBirth: next.dateOfBirth,
      checkedIn: next.checkedIn,
      specialRequest: next.specialRequest,
    })
  }

  return (
    <div className="px-row">
      <span
        className={`px-pill ${passenger.documentValid ? 'ok' : 'bad'}`}
        title={passenger.documentValid
          ? 'Document valid for this flight'
          : 'Number, type and an expiry after the flight date are all required'}
      />
      <input className="px-in px-last" placeholder="Surname" value={draft.surname ?? ''}
             onChange={(event) => field('surname', event.target.value)} onBlur={() => commit()} />
      <input className="px-in px-first" placeholder="Given name" value={draft.givenName ?? ''}
             onChange={(event) => field('givenName', event.target.value)} onBlur={() => commit()} />
      <input className="px-in px-doc" placeholder="Document N°" value={draft.documentNumber ?? ''}
             onChange={(event) => field('documentNumber', event.target.value)} onBlur={() => commit()} />
      <select className="px-in px-type" value={draft.documentType ?? 'PASSPORT'}
              onChange={(event) => {
                const next = { ...draft, documentType: event.target.value }
                setDraft(next)
                commit(next)
              }}>
        {DOC_TYPES.map((type) => (
          <option key={type.value} value={type.value}>{type.label}</option>
        ))}
      </select>
      <input className="px-in px-val" type="date" title="Document expiry date"
             value={draft.documentExpiry ?? ''}
             onChange={(event) => {
               const next = { ...draft, documentExpiry: event.target.value }
               setDraft(next)
               commit(next)
             }} />
      <button type="button" className="px-del" title="Remove this passenger" onClick={onDelete}>
        ✕
      </button>
    </div>
  )
}
