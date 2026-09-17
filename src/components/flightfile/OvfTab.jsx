import { LoadingState } from '../States'
import {
  useCreateLegPermit,
  useDeletePermitRequest,
  useLegPermits,
  useUpdatePermitDetails,
  useUpdatePermitRequest,
} from '../../hooks/useTripSupport'
import ProgressRing from './ProgressRing'
import RequestRow from './RequestRow'
import { PERMIT_COUNTRIES, countryName } from './tripSupportVocabulary'

/**
 * L'onglet OVF PERMIT — tabOvfPermit() de l'annexe (prototype l. 14856).
 *
 * <b>La forme est la sienne</b> : l'anneau, l'en-tete de section « OVF Permit —
 * Overflight / Traffic Permits », les lignes, « + Add permit ».
 *
 * <b>Ce que le portage AJOUTE, et pourquoi.</b> Le serveur ne se contente pas
 * de garder les demandes : il rend aussi, pour chaque pays de la route, un
 * verdict — permis requis, non requis, ou <i>aucun instrument connu</i>. Ce
 * troisieme cas est le point de l'audit DOM2 : le produit ne doit jamais
 * affirmer qu'un permis n'est pas requis quand il ne le sait pas. L'annexe, qui
 * n'avait que des lignes, ne pouvait pas le dire. Le bandeau au-dessus des
 * lignes nomme donc les pays qui attendent une demande, et ceux pour lesquels le
 * produit ne sait pas.
 */
export default function OvfTab({ row }) {
  const legId = row.legId
  const permits = useLegPermits(legId)
  const create = useCreateLegPermit(legId)
  const details = useUpdatePermitDetails(legId)
  const status = useUpdatePermitRequest(legId)
  const remove = useDeletePermitRequest(legId)

  const busy = create.isPending || details.isPending || status.isPending || remove.isPending

  if (permits.isLoading) return <LoadingState label="Reading the permits of this leg…" />
  if (permits.isError) {
    return <div className="fd-banner warn">Permits unavailable — {permits.error.message}</div>
  }

  const requests = permits.data?.requests ?? []
  const countries = permits.data?.countries ?? []
  const requested = new Set(requests.map((request) => request.countryIso2))

  const missing = countries.filter(
    (country) => country.status === 'PERMIT_REQUIRED' && !requested.has(country.countryIso2))
  const unknown = countries.filter((country) => country.status === 'NO_INSTRUMENT_KNOWN')

  /**
   * « + Add permit ». L'annexe ouvrait une ligne sur le premier pays de sa
   * liste ; ici elle s'ouvre de preference sur un pays que la route traverse et
   * qui attend encore sa demande — c'est celui que l'agent allait choisir.
   */
  function addPermit() {
    const country = missing[0]?.countryIso2
      ?? countries.find((entry) => !requested.has(entry.countryIso2))?.countryIso2
      ?? PERMIT_COUNTRIES.find((entry) => !requested.has(entry.iso2))?.iso2
    if (!country) return
    create.mutate({ countryIso2: country, kind: 'OVERFLIGHT', recipient: null })
  }

  return (
    <>
      <ProgressRing requests={requests} noun="permit" />

      {missing.length ? (
        <div className="fd-banner warn">
          ⚠ Permit required and not yet requested — {missing.map(
            (country) => countryName(country.countryIso2)).join(' · ')}
        </div>
      ) : null}

      {unknown.length ? (
        <div className="fd-banner vigilance">
          {/* Le verdict que l'annexe ne pouvait pas rendre. « Aucun instrument
              connu » n'est pas « pas de permis » : c'est une question ouverte,
              et elle se pose au bureau de briefing, pas au dossier. */}
          ⚠ No instrument on file — {unknown.map(
            (country) => countryName(country.countryIso2)).join(' · ')}. The product does not
          know whether a permit is required: confirm with the briefing office.
        </div>
      ) : null}

      <div className="fd-section"><span>OVF Permit — Overflight / Traffic Permits</span></div>

      {requests.map((request) => (
        <RequestRow
          key={request.id}
          kind="permit"
          request={request}
          suppliers={null}
          busy={busy}
          onDetails={(command) => details.mutateAsync({ requestId: request.id, ...command })}
          onStatus={(command) => status.mutateAsync({ requestId: request.id, ...command })}
          onDelete={() => remove.mutateAsync(request.id)}
        />
      ))}

      <div
        className="fd-add-service-btn"
        role="button"
        tabIndex={0}
        onClick={() => { if (!busy) addPermit() }}
        onKeyDown={(event) => { if (event.key === 'Enter' && !busy) addPermit() }}
      >
        + Add permit
      </div>
    </>
  )
}
