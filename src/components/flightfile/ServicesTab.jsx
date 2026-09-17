import { useState } from 'react'
import { LoadingState } from '../States'
import { useSuppliers } from '../../hooks/useOperations'
import {
  useCreateLegService,
  useDeleteServiceRequest,
  useLegServices,
  useUpdateServiceDetails,
  useUpdateServiceRequest,
} from '../../hooks/useTripSupport'
import ProgressRing from './ProgressRing'
import RequestRow from './RequestRow'
import StationBlock from './StationBlock'
import { SUPPLIERS_BY_SERVICE, serviceTypesFor } from './tripSupportVocabulary'

/**
 * L'onglet SERVICES du dossier de vol — tabServices() de l'annexe
 * (prototype l. 14880).
 *
 * <b>La forme est la sienne</b> : l'anneau de progression, puis le bandeau de
 * l'escale de depart et ses lignes, puis « + Add service », puis l'escale
 * d'arrivee et les siennes. Un agent travaille un depart escale par escale, et
 * melanger les deux bouts de l'etape dans une seule liste l'obligerait a lire
 * le code de terrain de chaque ligne.
 *
 * <b>Les huit lignes par defaut sont les siennes aussi</b> — knownDefaults,
 * l. 14886 : handling, carburant, douane, commissariat et stationnement au
 * depart ; handling, carburant et douane a l'arrivee. Elles s'affichent sans
 * rien ecrire, exactement comme chez elle : {@code getSvcState()} ne cree l'etat
 * d'une ligne qu'au premier geste. Ici c'est la meme regle, avec une base
 * derriere — la ligne devient une demande le jour ou l'agent y touche, jamais a
 * la simple ouverture de l'onglet. Un dossier ne doit pas ecrire parce qu'on
 * l'a regarde.
 *
 * <b>La difference est ce qui tient les lignes une fois ecrites.</b> L'annexe
 * les garde dans {@code flight._svcState}, un objet du navigateur : le decompte
 * « 8 services awaiting action » s'evaporait avec l'onglet, et deux agents sur
 * deux postes ne voyaient pas le meme dossier. Ici chaque ligne actionnee est
 * une demande en base ({@code tripsupport.service_requests}), le cycle de vie est
 * celui que le serveur fait respecter, et l'anneau compte ce que la base
 * contient plus ce que l'ecran propose — comme chez elle, ou l'anneau compte
 * ses huit lignes des l'ouverture.
 */

/** knownDefaults de l'annexe (l. 14886), par bout d'etape. */
const DEFAULT_TYPES = {
  dep: ['HANDLING', 'FUEL', 'CUSTOMS', 'CATERING', 'PARKING'],
  arr: ['HANDLING', 'FUEL', 'CUSTOMS'],
}

export default function ServicesTab({ row }) {
  const legId = row.legId
  const services = useLegServices(legId)
  const create = useCreateLegService(legId)
  const details = useUpdateServiceDetails(legId)
  const status = useUpdateServiceRequest(legId)
  const remove = useDeleteServiceRequest(legId)

  // Les lignes proposees vivent ici et non dans la section : l'anneau doit les
  // compter, et il est au-dessus des deux escales.
  //   dismissed — celles que l'agent a ecartees d'un clic sur la croix ;
  //   added     — celles que « + Add service » a ouvertes et que rien n'engage.
  // Ni les unes ni les autres n'existent en base : il n'y a rien a supprimer,
  // seulement a ne plus proposer.
  const [dismissed, setDismissed] = useState({})
  const [added, setAdded] = useState({})

  const busy = create.isPending || details.isPending || status.isPending || remove.isPending

  if (services.isLoading) return <LoadingState label="Reading the services of this leg…" />
  if (services.isError) {
    return <div className="fd-banner warn">Services unavailable — {services.error.message}</div>
  }

  const requests = services.data?.requests ?? []
  const stations = [
    { kind: 'dep', icao: row.depIcao, iata: row.depCode, name: row.depName },
    { kind: 'arr', icao: row.arrIcao, iata: row.arrCode, name: row.arrName },
  ].filter((station) => station.icao)

  // Une ligne peut exister sur une escale qui n'est ni le depart ni l'arrivee —
  // un deroutement enregistre avant que l'etape ne soit reecrite. L'annexe ne
  // les montrait pas ; les cacher reviendrait a dire qu'un service demande n'a
  // pas ete demande.
  const known = new Set(stations.map((station) => station.icao))
  const extra = [...new Set(requests.map((request) => request.stationIcao))]
    .filter((icao) => !known.has(icao))
    .map((icao) => ({ kind: 'dep', icao, iata: icao, name: null, orphan: true }))

  const sections = [...stations, ...extra].map((station) => {
    const own = requests.filter((request) => request.stationIcao === station.icao)
    const taken = new Set(own.map((request) => request.serviceType))
    const proposed = station.orphan ? [] : [
      ...(DEFAULT_TYPES[station.kind] ?? []),
      ...(added[station.icao] ?? []),
    ]
      .filter((type, index, all) => all.indexOf(type) === index)
      .filter((type) => !taken.has(type) && !(dismissed[station.icao] ?? []).includes(type))
    return { station, requests: own, proposed }
  })

  // L'anneau compte les lignes ecrites ET les lignes proposees, parce que
  // l'agent en voit huit : un anneau qui annoncerait « aucun service » sous huit
  // lignes ne serait pas lu deux fois.
  const counted = [
    ...requests,
    ...sections.flatMap((section) => section.proposed.map(() => ({ status: 'DRAFT' }))),
  ]

  function patch(setter, icao, mutate) {
    setter((current) => ({ ...current, [icao]: mutate(current[icao] ?? []) }))
  }

  return (
    <>
      <ProgressRing requests={counted} noun="service" />

      {sections.map(({ station, requests: own, proposed }) => (
        <StationSection
          key={station.icao}
          station={station}
          requests={own}
          proposed={proposed}
          busy={busy}
          onCreate={(command) => create.mutateAsync(command)}
          onDetails={(requestId, command) => details.mutateAsync({ requestId, ...command })}
          onStatus={(requestId, command) => status.mutateAsync({ requestId, ...command })}
          onDelete={(requestId) => remove.mutateAsync(requestId)}
          onPropose={(type) => patch(setAdded, station.icao, (list) => [...list, type])}
          onUnpropose={(type) => patch(setAdded, station.icao,
            (list) => list.filter((value) => value !== type))}
          onDismiss={(type) => patch(setDismissed, station.icao, (list) => [...list, type])}
        />
      ))}
    </>
  )
}

function StationSection({
  station, requests, proposed, busy,
  onCreate, onDetails, onStatus, onDelete, onPropose, onUnpropose, onDismiss,
}) {
  // L'annuaire est une donnee de reference : une requete par escale, mise en
  // cache cinq minutes, et partagee avec l'ecran NetPlus Services.
  const directory = useSuppliers(station.icao)
  const suppliers = directory.data ?? []

  const catalogue = serviceTypesFor(station.icao)
  const taken = new Set(requests.map((request) => request.serviceType))
  const exhausted = catalogue.every(
    (type) => taken.has(type.value) || proposed.includes(type.value))

  function addService() {
    const free = catalogue.find(
      (type) => !taken.has(type.value) && !proposed.includes(type.value))
    if (free) onPropose(free.value)
  }

  /**
   * Le fournisseur qu'une ligne proposee affiche — onServiceTypeChange() de
   * l'annexe (l. 14943) : le prestataire prefere de l'escale pour ce type, a
   * defaut le premier qu'elle a sur ce type, a defaut la tete de sa liste
   * statique. Il n'est ecrit que le jour ou la ligne l'est.
   */
  function defaultSupplier(type) {
    const onFile = suppliers.filter((supplier) => supplier.serviceType === type)
    const preferred = onFile.find((supplier) => supplier.preferred) ?? onFile[0]
    return preferred?.name ?? SUPPLIERS_BY_SERVICE[type]?.[0] ?? null
  }

  /**
   * Un geste sur une ligne proposee la fait naitre, puis lui applique le geste.
   * Deux ecritures, une seule intention : c'est l'ordre qu'impose une ligne qui
   * n'existait pas encore, et l'agent ne voit qu'un clic.
   */
  async function materialise(type, then) {
    const created = await onCreate({
      stationIcao: station.icao,
      serviceType: type,
      supplierName: defaultSupplier(type),
      remark: null,
    })
    onUnpropose(type)
    if (then) await then(created)
    return created
  }

  return (
    <>
      <StationBlock kind={station.kind} iata={station.iata} icao={station.icao} name={station.name} />

      {requests.map((request) => (
        <RequestRow
          key={request.id}
          kind="service"
          request={request}
          station={station.icao}
          suppliers={suppliers}
          busy={busy}
          onDetails={(command) => onDetails(request.id, command)}
          onStatus={(command) => onStatus(request.id, command)}
          onDelete={() => onDelete(request.id)}
        />
      ))}

      {proposed.map((type) => (
        <RequestRow
          key={`proposed-${type}`}
          kind="service"
          request={{
            id: null, serviceType: type, supplierName: defaultSupplier(type), status: 'DRAFT',
          }}
          station={station.icao}
          suppliers={suppliers}
          busy={busy}
          onDetails={(command) => (command.serviceType !== type
            // Changer le type d'une ligne qui n'existe pas revient a proposer
            // l'autre type : rien n'est ecrit tant que rien n'est engage.
            ? Promise.resolve(onUnpropose(type)).then(() => onPropose(command.serviceType))
            : materialise(type, (created) => onDetails(created.id, command)))}
          onStatus={(command) => materialise(type, (created) => onStatus(created.id, command))}
          onDelete={() => Promise.resolve(onDismiss(type))}
        />
      ))}

      <div
        className="fd-add-service-btn"
        role="button"
        tabIndex={0}
        title={exhausted
          ? 'Every service type is already on this station'
          : `Add a service at ${station.icao}`}
        onClick={() => { if (!exhausted && !busy) addService() }}
        onKeyDown={(event) => { if (event.key === 'Enter' && !exhausted && !busy) addService() }}
      >
        + Add service
      </div>
    </>
  )
}
