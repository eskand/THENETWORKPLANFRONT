import { useMemo, useState } from 'react'
import TopBar from '../../components/TopBar'
import { ErrorState, LoadingState } from '../../components/States'
import { useDispatchBoard } from '../../hooks/useDispatchBoard'
import { useCrewExpiries } from '../../hooks/useCrew'
import { useStationWeather } from '../../hooks/useWeather'
import { hhmm, isoDate } from '../../lib/format'
import FlightFile from '../../components/flightfile/FlightFile'
import CrewAlertsPanel from './components/CrewAlertsPanel'
import DeparturesPanel from './components/DeparturesPanel'
import OccHero from './components/OccHero'
import OccKpiStrip from './components/OccKpiStrip'
import StatusBoard from './components/StatusBoard'
import WeatherPanel from './components/WeatherPanel'
import { deriveOcc } from './deriveOcc'

/**
 * OCC Dashboard — la vue d'ensemble du centre operationnel.
 *
 * Un seul appel API alimente tout l'ecran (GET /v1/dispatch/board), comme le
 * Dispatch : c'est le meme modele de lecture, mis en cache vingt secondes cote
 * serveur, donc ouvrir les deux ecrans ne double pas la charge.
 */
export default function OccPage() {
  const [selected, setSelected] = useState(null)

  const date = useMemo(() => isoDate(new Date()), [])
  const filters = useMemo(
    () => ({ date, tab: 'ALL_FLIGHTS', fleet: '', base: '' }),
    [date],
  )

  const board = useDispatchBoard(filters)
  // Licence, medical, recurrent training and qualifications lapsing within
  // ninety days — the same endpoint the Crew Management expiry wall uses.
  const expiries = useCrewExpiries(90)

  const occ = useMemo(() => deriveOcc(board.data), [board.data])

  // The stations the day actually touches, from the board — the weather panel
  // never asks for a list of its own.
  const weather = useStationWeather(occ.bases)

  const updatedAt = board.dataUpdatedAt
    ? `${hhmm(new Date(board.dataUpdatedAt).toISOString())}Z`
    : '—'

  let body
  if (board.isError) {
    body = (
      <main className="page">
        <ErrorState error={board.error} onRetry={() => board.refetch()} />
      </main>
    )
  } else if (!board.data) {
    body = (
      <main className="page">
        <LoadingState label="Loading the operating picture…" />
      </main>
    )
  } else {
    body = (
      <>
        <OccHero
          activeFlights={occ.activeFlights}
          tailsAirborne={occ.tailsAirborne}
        />

        <OccKpiStrip occ={occ} expiries={expiries.data ?? []} />

        <div className="dash-grid">
          <StatusBoard occ={occ} weather={weather.data} updatedAt={updatedAt} />

          <div className="dash-col">
            <DeparturesPanel occ={occ} onSelect={setSelected} />
          </div>

          <div className="dash-col">
            <WeatherPanel occ={occ} weather={weather.data} loading={weather.isLoading} />
            <CrewAlertsPanel
              occ={occ}
              expiries={expiries.data ?? []}
              loading={expiries.isLoading}
            />
          </div>
        </div>
      </>
    )
  }

  return (
    <>
      <TopBar
        title="Operations Dashboard"
        subtitle="The Network Plan · Live OCC overview · UTC timezone"
        inbox={occ.kpi?.needsAction ?? null}
      />

      <div className="shell__scroll">{body}</div>

      <FlightFile row={selected} onClose={() => setSelected(null)} />
    </>
  )
}
