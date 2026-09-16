import { useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useAircraftReference } from '../../../hooks/usePlatform'
import { EMPTY } from '../../../lib/format'

const COLUMNS = [
  'ICAO', 'Manufacturer', 'Model', 'Desc.', 'Wake', 'MTOW (kg)', 'MZFW (kg)',
  'Seats', 'POB', 'Range (nm)', 'Mach', 'Cruise (kt)', 'TODA (m)', 'RFFS', 'ETOPS',
]

const num = (value) => (value == null ? EMPTY : value.toLocaleString('en-US'))

/**
 * La base avion unique : 308 fiches.
 *
 * <b>Pourquoi elle est ici.</b> Le prototype l'appelle « la base avion unique
 * de l'application » et la fait lire par tout le monde — Timeline, Dispatch,
 * Sales, CAMO, Reports. Une étude de faisabilité sur un type qu'on ne possède
 * pas doit bien la trouver quelque part, et un contrôle d'aptitude de terrain
 * aussi.
 *
 * <b>La recherche est faite par le serveur.</b> Trois cents lignes tiendraient
 * dans le navigateur, mais c'est la seule table qui va grandir, et un champ de
 * recherche ne devrait pas avoir à la télécharger pour répondre.
 */
export default function AircraftReference() {
  const [search, setSearch] = useState('')
  const reference = useAircraftReference(search)

  if (reference.isError) return <ErrorState error={reference.error} onRetry={() => reference.refetch()} />

  const rows = reference.data ?? []

  return (
    <>
      <div className="db-filterbar">
        <input className="db-search" type="search" value={search}
               placeholder="Search designator / manufacturer / model…"
               onChange={(event) => setSearch(event.target.value)} />
        <div className="db-counts">
          {rows.length} shown{rows.length === 100 ? ' · refine the search to see more' : ''}
        </div>
      </div>

      <div className="db-body">
        <p className="db-ref__note">
          Reconciled field by field between ICAO Doc 8643 — descriptor, wake category and persons
          on board — and manufacturer data for masses, range, Mach, true airspeed and take-off
          distance. The minimum runway of a type is its take-off distance at MTOW.
        </p>

        {!reference.data ? <LoadingState label="Reading the reference…" /> : null}

        <div className="db-table-wrap">
          <table className="db-table">
            <thead>
              <tr>
                {COLUMNS.map((column) => (
                  <th key={column}
                      className={column.includes('(') || column === 'Seats' || column === 'Mach' || column === 'RFFS'
                        ? 'db-table__num' : undefined}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td className="db-table__reg">{row.icaoType ?? EMPTY}</td>
                  <td className="db-table__muted">{row.manufacturer}</td>
                  <td>{row.model}</td>
                  <td className="db-table__muted">{row.descriptor ?? EMPTY}</td>
                  <td>
                    {row.wakeCategory ?? EMPTY}
                    {/* Publiée ou calculée de la masse : le lecteur a le droit de
                        savoir laquelle des deux il regarde. */}
                    <span className="db-ref__wake">{row.wakeSource ?? ''}</span>
                  </td>
                  <td className="db-table__num">{num(row.mtowKg)}</td>
                  <td className="db-table__num">{num(row.mzfwKg)}</td>
                  <td className="db-table__num">{num(row.seats)}</td>
                  <td className="db-table__num" title={row.maxPersons == null ? undefined : `max ${row.maxPersons}`}>
                    {row.pob ?? EMPTY}
                  </td>
                  <td className="db-table__num">{num(row.rangeNm)}</td>
                  <td className="db-table__num">{row.mach ?? EMPTY}</td>
                  <td className="db-table__num">{num(row.cruiseTasKt)}</td>
                  <td className="db-table__num">{num(row.takeoffDistanceM)}</td>
                  <td className="db-table__num">{row.rffsCategory ?? EMPTY}</td>
                  <td className="db-table__muted">
                    {row.etopsMinutes?.length ? row.etopsMinutes.join(' / ') : EMPTY}
                  </td>
                </tr>
              ))}
              {reference.data && rows.length === 0 ? (
                <tr>
                  <td colSpan={COLUMNS.length}>
                    <div className="state">
                      <h3>Nothing matches that search</h3>
                      <p>Try a designator (F2TH), a manufacturer (Dassault) or a model (Falcon 2000).</p>
                    </div>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </>
  )
}
