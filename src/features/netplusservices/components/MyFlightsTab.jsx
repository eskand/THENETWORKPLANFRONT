import { useState } from 'react'
import { ErrorState, LoadingState } from '../../../components/States'
import { useSuppliers, useTripSupportBoard } from '../../../hooks/useOperations'
import { hhmm, isoDate, titleCase } from '../../../lib/format'

/**
 * MY FLIGHTS — les etapes du jour et l'etat de leur dossier.
 *
 * Le prototype affichait ici un journal local (`localStorage.tnp_flight_log`) :
 * les analyses lancees sur CE poste, perdues au vidage du navigateur. Cet
 * onglet lit GET /v1/netplus-services/board : les vraies etapes de la journee,
 * les memes pour tout le monde.
 *
 * La colonne qui compte est « Not requested » — les services attendus a
 * l'escale pour lesquels AUCUNE demande n'existe. C'est une difference entre
 * deux ensembles stockes, que le prototype ne pouvait pas calculer.
 */

const BOARD_COLUMNS = [
  'Flight', 'Tail', 'Route', 'STD', 'Services', 'Requested', 'Not requested', 'Permits', 'Lead time',
]
const SUPPLIER_COLUMNS = [
  'Station', 'Service', 'Supplier', 'Contract', 'Lead time', 'E-mail', 'Phone', 'SITA',
]

const READINESS_PILL = { READY: 'nps__pill--ok', PENDING: 'nps__pill--warn', ATTENTION: 'nps__pill--bad' }

export default function MyFlightsTab() {
  const [date, setDate] = useState(() => isoDate(new Date()))
  const [view, setView] = useState('BOARD')
  const [station, setStation] = useState('')

  const board = useTripSupportBoard(date)
  const suppliers = useSuppliers(station)
  const data = board.data
  const stations = [...new Set((suppliers.data ?? []).map((row) => row.stationIcao))].sort()

  return (
    <div className="nps__col-main">
      <div className="nps__panel-head">
        <span className="nps__panel-title nps__panel-title--plain">
          {view === 'BOARD' ? 'Flights of the day' : 'Suppliers'}
        </span>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div className="nps__seg" style={{ width: 230 }}>
            <button
              type="button"
              className={view === 'BOARD' ? 'is-on' : undefined}
              onClick={() => setView('BOARD')}
            >
              Board {data ? `(${data.rows.length})` : ''}
            </button>
            <button
              type="button"
              className={view === 'SUPPLIERS' ? 'is-on' : undefined}
              onClick={() => setView('SUPPLIERS')}
            >
              Suppliers {suppliers.data ? `(${suppliers.data.length})` : ''}
            </button>
          </div>
          {view === 'BOARD' ? (
            <input
              type="date"
              value={date}
              style={{ width: 160 }}
              onChange={(event) => setDate(event.target.value)}
            />
          ) : (
            <select
              value={station}
              style={{ width: 160 }}
              onChange={(event) => setStation(event.target.value)}
            >
              <option value="">All stations</option>
              {stations.map((code) => (
                <option key={code} value={code}>{code}</option>
              ))}
            </select>
          )}
        </div>
      </div>

      <div className="nps__scroll">
        {board.isError ? (
          <ErrorState error={board.error} onRetry={() => board.refetch()} />
        ) : !data ? (
          <LoadingState label="Loading the trip support board…" />
        ) : view === 'BOARD' ? (
          <table className="nps__table">
            <thead>
              <tr>{BOARD_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {data.rows.length === 0 ? (
                <tr><td colSpan={BOARD_COLUMNS.length} className="nps__empty">No leg on {date}</td></tr>
              ) : (
                data.rows.map((row) => (
                  <tr key={row.legId}>
                    <td className="nps__mono">{row.flightNo}</td>
                    <td className="nps__mono">{row.registration}</td>
                    <td className="nps__mono">{row.depIcao}–{row.arrIcao}</td>
                    <td className="nps__mono">{hhmm(row.std)}Z</td>
                    <td>
                      <span className={`nps__pill ${READINESS_PILL[row.servicesReadiness] ?? ''}`}>
                        {row.servicesConfirmed}/{row.servicesTotal} {titleCase(row.servicesReadiness)}
                      </span>
                    </td>
                    <td>
                      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                        {row.services.slice(0, 4).map((service) => (
                          <span
                            key={service.id}
                            className={`nps__pill ${service.status === 'CONFIRMED' ? 'nps__pill--ok' : 'nps__pill--warn'}`}
                            title={`${service.stationIcao} · ${service.supplierName ?? ''} · ${service.status}`}
                          >
                            {service.serviceType.slice(0, 4)}
                          </span>
                        ))}
                        {row.services.length > 4 ? (
                          <span className="nps__pill">+{row.services.length - 4}</span>
                        ) : null}
                      </span>
                    </td>
                    <td>
                      {row.missingServices.length === 0 ? (
                        <span className="nps__pill nps__pill--ok">None</span>
                      ) : (
                        <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap' }}>
                          {row.missingServices.map((type) => (
                            <span key={type} className="nps__pill nps__pill--bad">{titleCase(type)}</span>
                          ))}
                        </span>
                      )}
                    </td>
                    <td>
                      {row.permitsTotal === 0 ? (
                        <span className="nps__pill">none required</span>
                      ) : (
                        <span className={`nps__pill ${row.permitsOutstanding > 0 ? 'nps__pill--warn' : 'nps__pill--ok'}`}>
                          {row.permitsTotal - row.permitsOutstanding}/{row.permitsTotal}
                        </span>
                      )}
                    </td>
                    <td>
                      {row.leadTimeAtRisk ? (
                        <span
                          className="nps__pill nps__pill--bad"
                          title="Une demande manquante est deja dans le delai de prevenance du fournisseur"
                        >
                          Late
                        </span>
                      ) : (
                        <span className="nps__pill nps__pill--ok">In time</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        ) : (
          <table className="nps__table">
            <thead>
              <tr>{SUPPLIER_COLUMNS.map((column) => <th key={column}>{column}</th>)}</tr>
            </thead>
            <tbody>
              {(suppliers.data ?? []).length === 0 ? (
                <tr><td colSpan={SUPPLIER_COLUMNS.length} className="nps__empty">No supplier</td></tr>
              ) : (
                (suppliers.data ?? []).map((supplier) => (
                  <tr key={supplier.id}>
                    <td className="nps__mono">{supplier.stationIcao}</td>
                    <td>{titleCase(supplier.serviceType)}</td>
                    <td>
                      {supplier.name}{' '}
                      {supplier.preferred ? <span className="nps__pill nps__pill--ok">Preferred</span> : null}
                    </td>
                    <td className="nps__mono">{supplier.contractRef ?? ''}</td>
                    <td className="nps__mono">{supplier.leadTimeHours ? `${supplier.leadTimeHours} h` : ''}</td>
                    <td>{supplier.email ?? ''}</td>
                    <td className="nps__mono">{supplier.phone ?? ''}</td>
                    <td className="nps__mono">{supplier.sita ?? ''}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
