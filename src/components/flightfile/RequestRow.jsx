import { useEffect, useRef, useState } from 'react'
import { ChevronDown, Phone, RotateCcw } from 'lucide-react'
import { flagSvg } from '../../lib/flabelPlaces'
import {
  PERMIT_COUNTRIES,
  PERMIT_KINDS,
  SUPPLIERS_BY_SERVICE,
  countryName,
  serviceIconKey,
  serviceTypesFor,
  statusMeta,
  statusOptionsFrom,
} from './tripSupportVocabulary'

/**
 * UNE ligne des onglets SERVICES et OVF PERMIT — interactiveServiceRow() et
 * interactivePermitRow() de l'annexe (prototype l. 13001 et l. 13062).
 *
 * <b>Une seule ligne pour les deux onglets, parce que l'annexe en dessine une
 * seule.</b> Les deux fonctions du prototype sont le meme DOM a deux details
 * pres : la premiere liste deroulante (un pays au lieu d'un type de service) et
 * le drapeau qui remplace l'icone de gauche sur un permis. Tout le reste — les
 * deux {@code .fd-row-line}, le bouton Request, le contact, la revision, la
 * croix, la liste de statut coloree — est identique, et les separer ferait
 * deriver l'une des deux a la premiere correction.
 *
 * <b>Le DOM est celui de l'annexe, a la classe pres</b>, parce que c'est la
 * feuille qui dessine la ligne : {@code .fd-row.interactive[data-key]} pose
 * l'icone de gauche, {@code .fd-status-select-wrap.status-green} la couleur du
 * statut, {@code .fd-send-btn.sent} le bouton vert.
 *
 * <b>Ce que le portage ajoute, et pourquoi.</b> Une confirmation exige ici la
 * reference donnee par le destinataire — le serveur la refuse sans
 * (RequestStatusTransition). L'annexe basculait la liste sur « Confirmed » sans
 * rien demander, et le dossier ne gardait aucune trace de ce sur quoi la
 * confirmation reposait. La ligne ouvre donc un champ le temps de la saisir.
 */
export default function RequestRow({
  kind,
  request,
  station,
  suppliers,
  onDetails,
  onStatus,
  onDelete,
  busy,
}) {
  const permit = kind === 'permit'
  const status = request.status
  const meta = statusMeta(status)
  const editable = status === 'DRAFT' || status === 'REFUSED'

  // Le champ de reference ne s'ouvre que sur le geste qui l'exige.
  const [confirming, setConfirming] = useState(false)
  const [reference, setReference] = useState('')
  const [error, setError] = useState(null)
  const [contactOpen, setContactOpen] = useState(false)
  const rowRef = useRef(null)

  // Le popup de contact se ferme au clic ailleurs, comme chez l'annexe
  // (l. 14923 : un ecouteur de document qui epargne le popup lui-meme).
  useEffect(() => {
    if (!contactOpen) return undefined
    function onDocumentClick(event) {
      if (!rowRef.current?.contains(event.target)) setContactOpen(false)
    }
    document.addEventListener('click', onDocumentClick)
    return () => document.removeEventListener('click', onDocumentClick)
  }, [contactOpen])

  function run(promise) {
    setError(null)
    promise?.catch((failure) => setError(failure.message))
  }

  /* ── premiere liste : le type de service, ou le pays du permis ─────────── */
  const typeOptions = permit
    ? PERMIT_COUNTRIES.map((country) => ({ value: country.iso2, label: country.name }))
    : serviceTypesFor(station).map((type) => ({ value: type.value, label: type.label }))

  const typeValue = permit ? request.countryIso2 : request.serviceType

  function changeType(value) {
    run(onDetails(permit
      ? { countryIso2: value, kind: request.kind, recipient: request.recipient }
      : { serviceType: value, supplierName: request.supplierName, remark: request.remark }))
  }

  /* ── seconde liste : le fournisseur / le destinataire ──────────────────── */
  const selected = permit ? request.recipient : request.supplierName
  const supplierOptions = supplierList(permit, request, suppliers, selected)

  function changeSupplier(value) {
    run(onDetails(permit
      ? { countryIso2: request.countryIso2, kind: request.kind, recipient: value }
      : { serviceType: request.serviceType, supplierName: value, remark: request.remark }))
  }

  /* ── le bouton Request : l'etat de la demande, pas celui de la reponse ─── */
  const sent = status !== 'DRAFT'
  const refused = status === 'REFUSED'
  const sendClass = refused ? 'revise' : (sent ? 'sent' : '')
  const sendText = refused ? 'Revise' : (sent ? 'Requested' : 'Request')
  const sendTitle = refused
    ? 'Refused — send this request again'
    : sent
      ? 'Already sent: the status below is where it stands'
      : 'Send this request'

  function clickSend() {
    if (status === 'DRAFT' || refused) run(onStatus({ status: 'SENT' }))
  }

  /* ── la liste de statut ────────────────────────────────────────────────── */
  function changeStatus(value) {
    if (value === status) return
    if (value === 'CONFIRMED') { setConfirming(true); return }
    run(onStatus({ status: value }))
  }

  function submitReference() {
    if (!reference.trim()) return
    run(onStatus({ status: 'CONFIRMED', reference: reference.trim() })
      ?.then(() => { setConfirming(false); setReference('') }))
  }

  const flag = permit ? flagSvg(request.countryIso2) : null
  const dataKey = permit ? 'permit' : serviceIconKey(request.serviceType)
  const contact = suppliers?.find((supplier) => supplier.name === selected)

  return (
    <div
      ref={rowRef}
      className={`fd-row interactive${flag ? ' has-ovf-flag' : ''}`}
      data-key={dataKey}
      data-airport={station ?? ''}
    >
      {flag
        ? <span className="fl-ovf-flag" title={countryName(request.countryIso2)}
                dangerouslySetInnerHTML={{ __html: flag }} />
        : null}

      <div className="fd-row-line">
        <div className="fd-fake-select fd-svc-select-wrap">
          <select
            className="fd-select"
            value={typeValue}
            disabled={!editable || busy}
            onChange={(event) => changeType(event.target.value)}
          >
            {typeOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={11} />
        </div>

        <div className={`fd-fake-select fd-supplier-select-wrap${selected ? ' has-selection' : ''}`}>
          <select
            className="fd-select fd-supplier-select"
            value={selected ?? ''}
            disabled={!editable || busy}
            onChange={(event) => changeSupplier(event.target.value)}
          >
            <option value="">{permit ? 'No recipient' : 'No supplier'}</option>
            {supplierOptions.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <ChevronDown size={11} />
        </div>

        <button
          type="button"
          className="fd-contact-btn"
          title={contact ? `${contact.name} — contact` : 'No contact on file for this supplier'}
          onClick={() => setContactOpen((open) => !open)}
        >
          <Phone size={16} />
        </button>

        {/* La revision de l'annexe rouvre la demande. Ici elle ne peut le faire
            que depuis un refus : le serveur n'ouvre aucun chemin de retour vers
            SENT depuis une confirmation, et il a raison — une confirmation
            annulee est un refus, pas un brouillon. */}
        <button
          type="button"
          className="fd-revise-btn"
          disabled={!refused || busy}
          title={refused
            ? 'Send this request again'
            : 'Nothing to revise: this request has not been refused'}
          onClick={() => refused && run(onStatus({ status: 'SENT' }))}
        >
          <RotateCcw size={14} />
        </button>

        <button
          type="button"
          className="fd-remove-btn"
          disabled={status !== 'DRAFT' || busy}
          title={status === 'DRAFT'
            ? 'Remove this line'
            : 'Already sent — mark it refused rather than deleting the trace'}
          onClick={() => run(onDelete())}
        >
          ✕
        </button>

        {contactOpen ? (
          <div className="fd-contact-pop">
            <div className="fd-contact-pop-name">{selected || '—'}</div>
            {contact ? (
              <>
                {contact.email ? <div className="fd-contact-pop-row">{contact.email}</div> : null}
                {contact.phone ? <div className="fd-contact-pop-row">{contact.phone}</div> : null}
                {contact.sita ? <div className="fd-contact-pop-row">SITA {contact.sita}</div> : null}
                {contact.contractRef
                  ? <div className="fd-contact-pop-row">Contract {contact.contractRef}</div> : null}
              </>
            ) : (
              <div className="fd-contact-pop-row">
                Not in the supplier directory for {station ?? 'this station'}.
              </div>
            )}
          </div>
        ) : null}
      </div>

      <div className="fd-row-line">
        <div
          className={`fd-send-btn ${sendClass}`}
          role="button"
          tabIndex={0}
          title={sendTitle}
          onClick={clickSend}
          onKeyDown={(event) => { if (event.key === 'Enter') clickSend() }}
        >
          {sendText}
        </div>

        <div className={`fd-fake-select fd-status-select-wrap status-${meta.cls}`}>
          <select
            className="fd-select fd-status-select"
            value={status}
            disabled={busy}
            onChange={(event) => changeStatus(event.target.value)}
          >
            {statusOptionsFrom(status).map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <ChevronDown size={11} />
        </div>
      </div>

      {confirming ? (
        <div className="fd-ref-line">
          <input
            className="fd-ref-input"
            autoFocus
            placeholder="Reference given by the recipient"
            value={reference}
            onChange={(event) => setReference(event.target.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') submitReference() }}
          />
          <div className="fd-send-btn" role="button" tabIndex={0}
               onClick={submitReference}
               onKeyDown={(event) => { if (event.key === 'Enter') submitReference() }}>
            Confirm
          </div>
          <button type="button" className="fd-remove-btn"
                  title="Cancel" onClick={() => { setConfirming(false); setReference('') }}>
            ✕
          </button>
        </div>
      ) : null}

      {request.reference && !confirming ? (
        <div className="fd-ref-line"><span className="fd-ref-hint">REF {request.reference}</span></div>
      ) : null}

      {error ? <div className="fd-row-error">{error}</div> : null}
    </div>
  )
}

/**
 * La liste des fournisseurs offerte a la ligne.
 *
 * <b>L'annuaire du locataire d'abord</b> — c'est le seul a savoir avec qui
 * l'exploitant a reellement un contrat a cette escale, et l'annexe suit la meme
 * regle (supplierOptionsHtml, l. 12842 : les groupes de « Airport Data » avant
 * la liste statique). La liste statique de l'annexe ne sert que de repli, pour
 * qu'une escale absente de l'annuaire n'offre pas une liste vide.
 *
 * <b>Le choix en cours reste visible</b> meme s'il n'est dans aucune des deux :
 * en changer doit etre un geste de l'agent, pas une disparition silencieuse.
 */
function supplierList(permit, request, suppliers, selected) {
  const fallbackKey = permit ? request.kind : request.serviceType
  const fallback = SUPPLIERS_BY_SERVICE[fallbackKey] ?? SUPPLIERS_BY_SERVICE.HANDLING
  const fromDirectory = (suppliers ?? []).map((supplier) => supplier.name)
  const merged = [...new Set([...fromDirectory, ...fallback])]
  if (selected && !merged.includes(selected)) merged.unshift(selected)
  return merged
}

export { PERMIT_KINDS }
