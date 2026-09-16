import { useMemo, useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useFleetRegister } from '../../../hooks/usePlatform'
import { EMPTY } from '../../../lib/format'

const COLUMNS = [
  'Reg.', 'Type', 'Engines', 'MTOW (kg)', 'Pax', 'Range (nm)',
  'Cruise (kt)', 'Min rwy (m)', 'Crew (deck/cabin)', 'Status',
]

const STATUS = {
  SERVICEABLE: { label: 'Serviceable', colour: 'var(--ready-fg)' },
  MAINTENANCE: { label: 'Maintenance', colour: 'var(--pending-fg)' },
  AOG: { label: 'AOG', colour: 'var(--attention-fg)' },
}

const num = (value) => (value == null ? EMPTY : value.toLocaleString('en-US'))

/** Ce que la colonne Pax veut dire, et ce que la cabine porte réellement. */
function paxTitle(row) {
  const parts = ['Certified maximum persons on board (ICAO Doc 8643)']
  if (row.cabinSeats != null) parts.push(`operator cabin: ${row.cabinSeats} seats`)
  else if (row.seats != null) parts.push(`${row.seats} seats installed`)
  return parts.join(' · ')
}

/**
 * Le registre de flotte.
 *
 * <b>La forme vient de l'annexe A4</b> (dbRenderTable, l. 27910-27965) : un
 * bloc par famille avec son compte d'appareils, dix colonnes, la masse et les
 * distances alignées à droite, la pastille de statut à la fin.
 *
 * <b>D'où viennent les chiffres.</b> De la fiche de référence du TYPE, pas
 * d'une valeur saisie contre l'immatriculation. Deux appareils du même type ne
 * peuvent donc pas se contredire sur la longueur de piste dont ils ont besoin
 * — ce qui arrivait avant, la table de l'exploitant portant 19 414 kg pour un
 * F2TH que la référence donne à 16 783.
 *
 * <b>Pax et sièges ne disent pas la même chose.</b> La colonne Pax est le
 * maximum de personnes à bord du Doc 8643 ; l'infobulle donne les sièges
 * installés, qui sont dix là où le Doc en autorise dix-neuf.
 */
export default function FleetRegister() {
  const register = useFleetRegister()
  const [search, setSearch] = useState('')
  const [family, setFamily] = useState('')

  const data = register.data
  const families = data?.families ?? []

  const visible = useMemo(() => {
    const needle = search.trim().toLowerCase()
    return families
      .filter((block) => !family || block.family === family)
      .map((block) => ({
        ...block,
        aircraft: block.aircraft.filter((row) => !needle || [
          row.registration, row.icaoType, row.model, row.engines, row.crewCertification,
        ].filter(Boolean).join(' ').toLowerCase().includes(needle)),
      }))
      .filter((block) => block.aircraft.length > 0)
  }, [families, family, search])

  const shown = visible.reduce((total, block) => total + block.aircraft.length, 0)

  if (register.isError) return <ErrorState error={register.error} onRetry={() => register.refetch()} />
  if (!data) return <LoadingState label="Reading the fleet register…" />

  return (
    <>
      <div className="db-filterbar">
        <input className="db-search" type="search" value={search}
               placeholder="Search reg / type / family…"
               onChange={(event) => setSearch(event.target.value)} />
        <select className="db-select" value={family} onChange={(event) => setFamily(event.target.value)}>
          <option value="">All families</option>
          {families.map((block) => (
            <option key={block.family} value={block.family}>{block.label}</option>
          ))}
        </select>
        <div className="db-counts">
          {shown} of {data.total} aircraft · {data.serviceable} serviceable · {data.outOfService} out of service
        </div>
      </div>

      <div className="db-body">
        {visible.length === 0 ? (
          <div className="state">
            <h3>No aircraft match the current filter</h3>
            <p>Clear the search or the family filter to see the whole fleet.</p>
          </div>
        ) : null}

        {visible.map((block) => (
          <section className="db-family" key={block.family}>
            <div className="db-family__head">
              <span className="db-family__name">{block.label}</span>
              <span className="db-family__count">
                {block.aircraft.length} aircraft
              </span>
            </div>

            <div className="db-table-wrap">
              <table className="db-table">
                <thead>
                  <tr>
                    {COLUMNS.map((column) => (
                      <th key={column}
                          className={['MTOW (kg)', 'Pax', 'Range (nm)', 'Cruise (kt)', 'Min rwy (m)'].includes(column)
                            ? 'db-table__num' : undefined}>
                        {column}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {block.aircraft.map((row) => {
                    const status = STATUS[row.status] ?? { label: row.status, colour: 'var(--text-faint)' }
                    return (
                      <tr key={row.aircraftId}>
                        <td className="db-table__reg">{row.registration}</td>
                        {/* Le code OACI en clair, le modèle en infobulle — c'est le
                            code qu'on lit sur un plan de vol. */}
                        <td title={row.referenceModel ?? row.model ?? undefined}>{row.icaoType ?? EMPTY}</td>
                        <td className="db-table__muted">{row.engines ?? EMPTY}</td>
                        <td className="db-table__num">{num(row.mtowKg)}</td>
                        {/* Le maximum certifié, pas la cabine : un Falcon 2000 est
                            certifié pour dix-neuf et celui-ci en emporte dix.
                            L'infobulle porte les deux, sinon la colonne est juste
                            et inutilisable à la fois. */}
                        <td className="db-table__num" title={paxTitle(row)}>
                          {num(row.maxPersons)}
                        </td>
                        <td className="db-table__num">{num(row.rangeNm)}</td>
                        <td className="db-table__num">{num(row.cruiseTasKt)}</td>
                        <td className="db-table__num">{num(row.minRunwayM)}</td>
                        <td>
                          <span className="db-crew" title={row.crewCertification ?? undefined}>
                            {row.crewConfig ?? EMPTY}
                          </span>
                        </td>
                        <td>
                          <span className="db-status" title={row.statusReason ?? undefined}>
                            <span className="db-status__dot" style={{ background: status.colour }} />
                            <span style={{ color: status.colour }}>{status.label}</span>
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </>
  )
}
